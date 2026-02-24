import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, GeoJSON, TileLayer, useMap } from 'react-leaflet';
import { Card, CardContent } from '@/components/ui/card';
import { X, Globe, Loader2, MapPin, Lock, Unlock, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import 'leaflet/dist/leaflet.css';

const GEOJSON_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/main/data/countries.geojson';

// Stili mappa
const defaultStyle = {
  fillColor: '#1e293b',
  fillOpacity: 0.6,
  color: '#475569',
  weight: 1,
};

const hoverStyle = {
  fillColor: '#334155',
  fillOpacity: 0.8,
  color: '#94a3b8',
  weight: 2,
};

const selectedStyle = {
  fillColor: '#065f46',
  fillOpacity: 0.7,
  color: '#34d399',
  weight: 2.5,
};

// Componente che gestisce lo zoom sulla feature selezionata
function FitBoundsOnSelect({ selectedLayer }) {
  const map = useMap();
  useEffect(() => {
    if (selectedLayer) {
      const bounds = selectedLayer.getBounds();
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 5, duration: 0.5 });
    }
  }, [selectedLayer, map]);
  return null;
}

// Componente per bloccare/sbloccare drag su mobile
function MapInteractionLock({ locked }) {
  const map = useMap();
  useEffect(() => {
    if (locked) {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
    }
  }, [locked, map]);
  return null;
}

// Controlli zoom custom
function CustomZoomControls({ onReset }) {
  const map = useMap();
  return (
    <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-1">
      <button onClick={() => map.zoomIn()} className="w-8 h-8 bg-slate-800/90 backdrop-blur-sm border border-slate-600/50 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700/90 transition-colors">
        <ZoomIn className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => map.zoomOut()} className="w-8 h-8 bg-slate-800/90 backdrop-blur-sm border border-slate-600/50 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700/90 transition-colors">
        <ZoomOut className="w-3.5 h-3.5" />
      </button>
      <button onClick={onReset} className="w-8 h-8 bg-slate-800/90 backdrop-blur-sm border border-slate-600/50 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700/90 transition-colors">
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function WorldMapExplorer() {
  const [geoData, setGeoData] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedLayerRef, setSelectedLayerRef] = useState(null);
  const [countryData, setCountryData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const geoJsonRef = useRef(null);
  const previousLayerRef = useRef(null);

  // Carica GeoJSON
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingGeo(true);
      const res = await fetch(GEOJSON_URL);
      const data = await res.json();
      if (!cancelled) {
        setGeoData(data);
        setLoadingGeo(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Fetch dati paese al click
  useEffect(() => {
    if (!selectedCountry) {
      setCountryData(null);
      return;
    }
    let cancelled = false;
    const fetchData = async () => {
      setLoadingData(true);
      setCountryData(null);
      const code = selectedCountry.iso_a2 && selectedCountry.iso_a2 !== '-99'
        ? selectedCountry.iso_a2
        : selectedCountry.iso_a3;
      
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Fornisci dati economici sintetici per il paese con codice ISO "${code}" (nome: "${selectedCountry.name}").
REGOLE: usa SOLO dati che conosci con certezza. Se un dato non è disponibile scrivi "N/D". NON inventare.
Rispondi in italiano.`,
          response_json_schema: {
            type: "object",
            properties: {
              country_name: { type: "string" },
              kpis: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    value: { type: "string" }
                  }
                }
              },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    value: { type: "string" },
                    url: { type: "string" }
                  }
                }
              }
            }
          }
        });
        if (!cancelled) setCountryData(result);
      } catch {
        if (!cancelled) setCountryData({ country_name: selectedCountry.name, kpis: [], items: [] });
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [selectedCountry]);

  const onEachFeature = useCallback((feature, layer) => {
    const name = feature.properties?.ADMIN || feature.properties?.name || '';
    if (name) {
      layer.bindTooltip(name, { sticky: true, className: 'leaflet-tooltip-country' });
    }

    layer.on({
      mouseover: (e) => {
        const l = e.target;
        if (l !== previousLayerRef.current) {
          l.setStyle(hoverStyle);
          l.bringToFront();
        }
      },
      mouseout: (e) => {
        const l = e.target;
        if (l !== previousLayerRef.current) {
          l.setStyle(defaultStyle);
        }
      },
      click: (e) => {
        // Deseleziona precedente
        if (previousLayerRef.current) {
          previousLayerRef.current.setStyle(defaultStyle);
        }
        const l = e.target;
        l.setStyle(selectedStyle);
        l.bringToFront();
        previousLayerRef.current = l;
        setSelectedLayerRef(l);

        const props = feature.properties || {};
        setSelectedCountry({
          name: props.ADMIN || props.name || 'Sconosciuto',
          iso_a2: props.ISO_A2 || props.iso_a2 || '-99',
          iso_a3: props.ISO_A3 || props.iso_a3 || '-99',
        });
      }
    });
  }, []);

  const closePanel = () => {
    if (previousLayerRef.current) {
      previousLayerRef.current.setStyle(defaultStyle);
      previousLayerRef.current = null;
    }
    setSelectedCountry(null);
    setSelectedLayerRef(null);
    setCountryData(null);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <Globe className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm">Mappa Stati</h3>
          <p className="text-slate-500 text-[10px]">Clicca su uno Stato per esplorare</p>
        </div>
      </div>

      <Card className="bg-slate-800/60 border-white/5 overflow-hidden">
        <CardContent className="p-0 relative">
          {loadingGeo ? (
            <div className="flex items-center justify-center h-[300px] bg-slate-900/50">
              <div className="text-center">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-2" />
                <p className="text-slate-400 text-xs">Caricamento mappa...</p>
              </div>
            </div>
          ) : (
            <div className="relative">
              <style>{`
                .leaflet-tooltip-country {
                  background: rgba(15,23,42,0.9) !important;
                  color: #e2e8f0 !important;
                  border: 1px solid rgba(100,116,139,0.4) !important;
                  border-radius: 6px !important;
                  padding: 4px 8px !important;
                  font-size: 11px !important;
                  font-weight: 600 !important;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
                }
                .leaflet-tooltip-country::before {
                  border-top-color: rgba(15,23,42,0.9) !important;
                }
                .world-map-container .leaflet-container {
                  background: #0f172a !important;
                }
                .world-map-container .leaflet-control-zoom a {
                  background: #1e293b !important;
                  color: #94a3b8 !important;
                  border-color: #334155 !important;
                }
                .world-map-container .leaflet-control-attribution {
                  display: none !important;
                }
              `}</style>
              <div className="world-map-container" style={{ height: 300 }}>
                <MapContainer
                  center={[20, 0]}
                  zoom={2}
                  minZoom={2}
                  maxZoom={7}
                  style={{ height: '100%', width: '100%', background: '#0f172a' }}
                  scrollWheelZoom={true}
                  zoomControl={true}
                >
                  {geoData && (
                    <GeoJSON
                      ref={geoJsonRef}
                      data={geoData}
                      style={defaultStyle}
                      onEachFeature={onEachFeature}
                    />
                  )}
                  <FitBoundsOnSelect selectedLayer={selectedLayerRef} />
                </MapContainer>
              </div>
            </div>
          )}

          {/* Pannello dati paese */}
          {selectedCountry && (
            <>
              {/* Desktop: pannello laterale */}
              <div className="hidden md:block absolute top-0 right-0 w-72 h-full bg-slate-900/95 backdrop-blur-sm border-l border-slate-700/50 overflow-y-auto z-[1000]">
                <CountryPanel
                  country={selectedCountry}
                  data={countryData}
                  loading={loadingData}
                  onClose={closePanel}
                />
              </div>
              {/* Mobile: bottom sheet */}
              <div className="md:hidden">
                <CountryPanel
                  country={selectedCountry}
                  data={countryData}
                  loading={loadingData}
                  onClose={closePanel}
                  isMobile
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CountryPanel({ country, data, loading, onClose, isMobile = false }) {
  return (
    <div className={isMobile
      ? 'bg-slate-900/95 backdrop-blur-sm border-t border-slate-700/50 p-4 max-h-[50vh] overflow-y-auto'
      : 'p-4'
    }>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <h4 className="text-white font-bold text-sm truncate">{country.name}</h4>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="text-slate-500 text-[10px] mb-3 flex gap-3">
        {country.iso_a2 && country.iso_a2 !== '-99' && (
          <span>ISO2: <span className="text-slate-300 font-mono">{country.iso_a2}</span></span>
        )}
        {country.iso_a3 && country.iso_a3 !== '-99' && (
          <span>ISO3: <span className="text-slate-300 font-mono">{country.iso_a3}</span></span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-slate-500 text-xs text-center py-6">Dati non disponibili</p>
      ) : (
        <div className="space-y-3">
          {/* KPIs */}
          {data.kpis?.length > 0 && (
            <div className="space-y-1.5">
              {data.kpis.map((kpi, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-800/60 rounded-lg px-3 py-2">
                  <span className="text-slate-400 text-[11px]">{kpi.label}</span>
                  <span className="text-white text-[11px] font-semibold">{kpi.value || 'N/D'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Items */}
          {data.items?.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-slate-500 text-[10px] uppercase tracking-wider font-medium">Dettagli</p>
              {data.items.map((item, i) => (
                <div key={i} className="bg-slate-800/60 rounded-lg px-3 py-2">
                  <p className="text-slate-400 text-[10px]">{item.title}</p>
                  <p className="text-white text-[11px] font-medium">{item.value || 'N/D'}</p>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer"
                       className="text-emerald-400 text-[10px] hover:underline truncate block mt-0.5">
                      {item.url}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {(!data.kpis || data.kpis.length === 0) && (!data.items || data.items.length === 0) && (
            <p className="text-slate-500 text-xs text-center py-4">Nessun dato disponibile per questo paese</p>
          )}
        </div>
      )}
    </div>
  );
}