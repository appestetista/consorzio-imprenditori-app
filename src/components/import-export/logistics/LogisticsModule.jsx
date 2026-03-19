import React, { useState } from 'react';
import { Ship, Plane, ChevronDown, ChevronUp, Package, Truck, Lock, Unlock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LogisticsForm from './LogisticsForm';
import LogisticsResults from './LogisticsResults';
import Cargo3DVisualizer from './Cargo3DVisualizer';
import ShippingComparator from './ShippingComparator';
import CargoInputForm from './CargoInputForm';
import CargoResultPanel from './CargoResultPanel';
import InfoTooltipLogistics from './InfoTooltipLogistics';
import { Container20Icon, Container40Icon, TruckIcon, ShipIcon, PlaneIcon } from './VehicleIllustrations';

export default function LogisticsModule({ countryOrigin, countryDest, hsCode, productDescription }) {
  const [open, setOpen] = useState(false);
  const [operativeEnabled, setOperativeEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [lastFormData, setLastFormData] = useState(null);
  const [cargoData, setCargoData] = useState(null);
  const [activeTab, setActiveTab] = useState('dimensioni');
  const [dims, setDims] = useState({
    tipo_unita: '', numero_unita: '', peso_kg: '',
    lunghezza_cm: '', larghezza_cm: '', altezza_cm: ''
  });

  const handleSubmit = async (formData) => {
    setLoading(true);
    setResults(null);
    setLastFormData(formData);
    try {
      const response = await base44.functions.invoke('logisticsQuote', formData);
      setResults(response.data);
    } catch (err) {
      console.error('[LogisticsModule] Error:', err);
      setResults({
        request_id: 'error-' + Date.now(),
        timestamp_utc: new Date().toISOString(),
        inputs_normalized: formData,
        quotes: [],
        port_congestion: null,
        last_mile: null,
        errors: [{ area: 'system', message: 'Errore di comunicazione con il backend: ' + (err?.message || 'sconosciuto') }]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCargoValidated = (data) => {
    setCargoData(data);
  };

  const tabs = [
    { id: 'dimensioni', label: 'Peso & Volume', icon: Package },
    { id: 'ingombri', label: 'Calcolo Ingombri', icon: Truck },
    { id: 'quotazione', label: 'Quotazione', icon: Ship },
  ];

  // Calcoli volume inline per tab dimensioni
  const volCm3 = dims.lunghezza_cm && dims.larghezza_cm && dims.altezza_cm
    ? parseFloat(dims.lunghezza_cm) * parseFloat(dims.larghezza_cm) * parseFloat(dims.altezza_cm)
    : null;
  const volM3 = volCm3 ? volCm3 / 1000000 : null;
  const numUnita = parseInt(dims.numero_unita) || 0;
  const pesoTotale = dims.peso_kg && numUnita ? parseFloat(dims.peso_kg) * numUnita : null;
  const pesoVolumetrico = volM3 && numUnita ? (volM3 * numUnita * 1000000 / 6000) : null;

  return (
    <div className="mt-3">
      {/* Bottone apertura */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border transition-all ${
          open 
            ? 'bg-blue-500/15 border-blue-500/30 shadow-lg shadow-blue-500/10' 
            : 'bg-slate-700/30 border-white/10 hover:border-blue-500/30 hover:bg-blue-500/5'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <Ship className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-xs">Modulo Logistica</p>
            <p className="text-slate-400 text-[10px]">Dimensioni, Ingombri, Pallet, Quotazioni</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Plane className="w-4 h-4 text-purple-400" />
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {/* Pannello aperto */}
      {open && (
        <div className="mt-3 bg-slate-800/40 border border-white/5 rounded-xl p-4">

          {/* Illustrazioni mezzi di trasporto */}
          <div className="flex items-center justify-center gap-4 mb-4 py-3 bg-slate-900/40 rounded-xl">
            <div className="text-center">
              <Container20Icon className="w-14 h-8 mx-auto" />
              <p className="text-slate-500 text-[8px] mt-1">20'</p>
            </div>
            <div className="text-center">
              <Container40Icon className="w-16 h-8 mx-auto" />
              <p className="text-slate-500 text-[8px] mt-1">40' HC</p>
            </div>
            <div className="text-center">
              <TruckIcon className="w-16 h-10 mx-auto" />
              <p className="text-slate-500 text-[8px] mt-1">Camion</p>
            </div>
            <div className="text-center">
              <ShipIcon className="w-12 h-9 mx-auto" />
              <p className="text-slate-500 text-[8px] mt-1">Nave</p>
            </div>
            <div className="text-center">
              <PlaneIcon className="w-12 h-9 mx-auto" />
              <p className="text-slate-500 text-[8px] mt-1">Aereo</p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 mb-4 bg-slate-900/50 rounded-xl p-1">
            {tabs.map(t => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              // Quotazione bloccata se non attivato
              const locked = t.id === 'quotazione' && !operativeEnabled;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    if (locked) return;
                    setActiveTab(t.id);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[11px] font-semibold transition-all ${
                    locked ? 'text-slate-600 cursor-not-allowed' :
                    active 
                      ? 'bg-blue-500/20 text-blue-400 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {locked ? <Lock className="w-3 h-3" /> : <Icon className="w-3.5 h-3.5" />}
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab: Peso & Dimensioni prodotto */}
          {activeTab === 'dimensioni' && (
            <div className="space-y-3">
              <p className="text-slate-300 text-xs font-semibold flex items-center">
                📦 Dimensioni e peso del prodotto/confezione
                <InfoTooltipLogistics text="Inserisci le dimensioni di una singola confezione o bancale del tuo prodotto. Il volume viene calcolato automaticamente e serve a stimare gli ingombri in container o camion." />
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium mb-1 block text-slate-300 flex items-center">
                    Tipo unità
                    <InfoTooltipLogistics text="Seleziona se stai misurando una singola confezione (scatola, cartone) o un bancale/pallet già pronto. Se non sai, scegli 'Singola confezione'." />
                  </label>
                  <Select value={dims.tipo_unita || undefined} onValueChange={(v) => setDims({ ...dims, tipo_unita: v })}>
                    <SelectTrigger className="h-10 rounded-lg text-xs bg-slate-900 border-slate-700 text-white">
                      <SelectValue placeholder="Seleziona" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      <SelectItem value="confezione">Singola confezione</SelectItem>
                      <SelectItem value="bancale">Bancale / pallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-medium mb-1 block text-slate-300">
                    {dims.tipo_unita === 'bancale' ? 'N° bancali' : 'N° confezioni'}
                  </label>
                  <Input type="number" min="1" step="1" placeholder="Es. 10" value={dims.numero_unita}
                    onChange={(e) => setDims({ ...dims, numero_unita: e.target.value })}
                    className="h-10 rounded-lg bg-slate-900 border-slate-700 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-medium mb-1 block text-slate-300 flex items-center">
                    Peso per unità
                    <InfoTooltipLogistics text="Il peso lordo di una singola confezione o bancale, incluso l'imballaggio. È fondamentale per calcolare il peso totale della spedizione e confrontarlo con i limiti di carico dei mezzi." />
                  </label>
                  <div className="relative">
                    <Input type="number" step="0.01" min="0" placeholder="Es. 25" value={dims.peso_kg}
                      onChange={(e) => setDims({ ...dims, peso_kg: e.target.value })}
                      className="h-10 rounded-lg pr-10 bg-slate-900 border-slate-700 text-white" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">kg</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-medium mb-1 block text-slate-300">Lunghezza</label>
                  <div className="relative">
                    <Input type="number" step="0.1" min="0" placeholder="Es. 60" value={dims.lunghezza_cm}
                      onChange={(e) => setDims({ ...dims, lunghezza_cm: e.target.value })}
                      className="h-10 rounded-lg pr-10 bg-slate-900 border-slate-700 text-white" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">cm</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-medium mb-1 block text-slate-300">Larghezza</label>
                  <div className="relative">
                    <Input type="number" step="0.1" min="0" placeholder="Es. 40" value={dims.larghezza_cm}
                      onChange={(e) => setDims({ ...dims, larghezza_cm: e.target.value })}
                      className="h-10 rounded-lg pr-10 bg-slate-900 border-slate-700 text-white" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">cm</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-medium mb-1 block text-slate-300">Altezza</label>
                  <div className="relative">
                    <Input type="number" step="0.1" min="0" placeholder="Es. 30" value={dims.altezza_cm}
                      onChange={(e) => setDims({ ...dims, altezza_cm: e.target.value })}
                      className="h-10 rounded-lg pr-10 bg-slate-900 border-slate-700 text-white" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 pointer-events-none">cm</span>
                  </div>
                </div>
              </div>

              {/* Calcoli automatici visibili */}
              {volCm3 && (
                <div className="rounded-xl px-3 py-3 space-y-2 bg-slate-900/50 border border-white/5">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center">
                    📐 Calcoli
                    <InfoTooltipLogistics text="Il volume viene calcolato come Lunghezza × Larghezza × Altezza. Il peso volumetrico è usato dai corrieri per calcolare il costo: se la merce è voluminosa ma leggera, paghi il peso volumetrico (volume in cm³ / 6000 per aereo)." />
                  </p>

                  {/* Formula volume */}
                  <div className="bg-slate-800/60 rounded-lg p-2.5">
                    <p className="text-slate-500 text-[9px] mb-1">Volume per unità</p>
                    <p className="text-slate-400 text-[10px] font-mono">
                      {dims.lunghezza_cm} × {dims.larghezza_cm} × {dims.altezza_cm} cm
                    </p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-white font-bold text-sm">{volCm3.toLocaleString('it-IT')} cm³</span>
                      <span className="text-slate-500 text-[10px]">= {volM3.toFixed(4)} m³</span>
                    </div>
                  </div>

                  {/* Totali se più unità */}
                  {numUnita > 1 && (
                    <div className="bg-slate-800/60 rounded-lg p-2.5">
                      <p className="text-slate-500 text-[9px] mb-1">Totale ({numUnita} {dims.tipo_unita === 'bancale' ? 'bancali' : 'confezioni'})</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-slate-500 text-[9px]">Volume totale</p>
                          <p className="text-cyan-400 font-bold text-sm">{(volM3 * numUnita).toFixed(4)} m³</p>
                        </div>
                        {pesoTotale && (
                          <div>
                            <p className="text-slate-500 text-[9px]">Peso totale</p>
                            <p className="text-blue-400 font-bold text-sm">{pesoTotale.toFixed(1)} kg</p>
                            <p className="text-slate-600 text-[9px]">({(pesoTotale / 1000).toFixed(2)} t)</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Peso volumetrico */}
                  {numUnita > 0 && (
                    <div className="bg-slate-800/60 rounded-lg p-2.5">
                      <p className="text-slate-500 text-[9px] mb-1 flex items-center">
                        Peso volumetrico (aereo)
                        <InfoTooltipLogistics text="Le compagnie aeree calcolano il peso volumetrico dividendo il volume in cm³ per 6.000. Il costo si basa sul valore più alto tra peso reale e peso volumetrico." />
                      </p>
                      <p className="text-slate-400 text-[10px] font-mono mb-1">
                        ({volCm3.toLocaleString('it-IT')} cm³ × {numUnita}) ÷ 6.000
                      </p>
                      <p className="text-purple-400 font-bold text-sm">
                        {pesoVolumetrico ? pesoVolumetrico.toFixed(1) : '—'} kg vol.
                      </p>
                      {pesoTotale && pesoVolumetrico && (
                        <p className={`text-[10px] mt-1 font-semibold ${pesoVolumetrico > pesoTotale ? 'text-amber-400' : 'text-green-400'}`}>
                          {pesoVolumetrico > pesoTotale
                            ? `⚠️ Merce voluminosa: il corriere potrebbe tassare il peso volumetrico (${pesoVolumetrico.toFixed(0)} kg) invece del peso reale (${pesoTotale.toFixed(0)} kg)`
                            : `✅ Il peso reale (${pesoTotale.toFixed(0)} kg) è superiore al volumetrico: tariffa basata sul peso effettivo`
                          }
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab: Calcolo Ingombri */}
          {activeTab === 'ingombri' && (
            <div>
              <CargoInputForm onValidated={handleCargoValidated} />
              <CargoResultPanel data={cargoData} />
              
              {cargoData && (
                <button
                  onClick={() => { if (operativeEnabled) setActiveTab('quotazione'); }}
                  className={`w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${
                    operativeEnabled
                      ? 'border-blue-500/20 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10'
                      : 'border-slate-600 bg-slate-700/20 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {operativeEnabled ? <Ship className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  {operativeEnabled ? 'Passa alla Quotazione Logistica →' : 'Attiva il modulo operativo per le quotazioni'}
                </button>
              )}
            </div>
          )}

          {/* Tab: Quotazione Logistica */}
          {activeTab === 'quotazione' && operativeEnabled && (
            <div>
              <LogisticsForm
                onSubmit={handleSubmit}
                loading={loading}
                countryOrigin={countryOrigin}
                countryDest={countryDest}
                hsCode={hsCode}
                productDescription={productDescription}
              />
              <LogisticsResults results={results} />
              {lastFormData && (lastFormData.volume_m3 || lastFormData.weight_kg) && (
                <>
                  <ShippingComparator formData={lastFormData} />
                  {parseFloat(lastFormData.volume_m3) > 0 && (
                    <Cargo3DVisualizer volumeM3={lastFormData.volume_m3} weightKg={lastFormData.weight_kg} />
                  )}
                </>
              )}
            </div>
          )}

          {/* Pulsante attivazione modulo operativo */}
          <div className="mt-4 pt-3 border-t border-white/5">
            <button
              onClick={() => setOperativeEnabled(!operativeEnabled)}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border ${
                operativeEnabled
                  ? 'bg-green-500/15 border-green-500/30 text-green-400 shadow-lg shadow-green-500/10'
                  : 'bg-slate-700/30 border-white/10 text-slate-400 hover:border-amber-500/30 hover:text-amber-400'
              }`}
            >
              {operativeEnabled ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {operativeEnabled ? '✅ Modulo Operativo Attivo — Quotazioni abilitate' : '🔒 Attiva Modulo Operativo (Quotazioni reali)'}
            </button>
            <p className="text-slate-600 text-[9px] text-center mt-1.5">
              {operativeEnabled
                ? 'Le quotazioni interrogano API reali di carrier. I dati sono verificati.'
                : 'Attiva per accedere al tab Quotazione e ricevere preventivi reali via API carrier.'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}