import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Ship, Truck, Package, Trophy, AlertTriangle, ArrowRight, Scale, Box, Clock, DollarSign, Check, Brain, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PalletAdvisor from './PalletAdvisor';

function ScenarioCard({ scenario, isBest }) {
  const available = scenario.available;
  const isContainer = scenario.scenario_id !== 'lcl' && scenario.scenario_id !== 'truck';
  const isTruck = scenario.scenario_id === 'truck';

  const bgColor = isBest && available
    ? 'bg-amber-500/10 border-amber-500/30'
    : available
    ? 'bg-slate-800/60 border-white/10'
    : 'bg-slate-800/30 border-white/5 opacity-60';

  return (
    <div className={`rounded-2xl border p-4 relative ${bgColor}`}>
      {isBest && available && (
        <div className="absolute -top-2.5 left-4 bg-amber-500 text-black text-[9px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <Trophy className="w-3 h-3" /> MIGLIOR OPZIONE
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          scenario.scenario_id.includes('20') ? 'bg-green-500/20' :
          scenario.scenario_id.includes('40') ? 'bg-blue-500/20' :
          scenario.scenario_id === 'lcl' ? 'bg-purple-500/20' : 'bg-violet-500/20'
        }`}>
          {isTruck ? <Truck className="w-5 h-5 text-violet-400" /> : <Ship className="w-5 h-5 text-blue-400" />}
        </div>
        <div className="flex-1">
          <p className="text-white font-bold text-sm">{scenario.scenario_label}</p>
          {scenario.calc && (
            <p className="text-slate-400 text-[10px]">
              Fattore limitante: {scenario.calc.limiting_factor === 'volume' ? '📦 Volume' : '⚖️ Peso'}
            </p>
          )}
        </div>
      </div>

      {/* Prezzo */}
      {available ? (
        <>
          <div className="bg-slate-900/60 rounded-xl p-3 mb-3">
            <p className="text-slate-500 text-[10px] mb-1">
              <DollarSign className="w-3 h-3 inline" /> Prezzo totale stimato
            </p>
            <p className="text-white text-2xl font-black">
              ${scenario.total_price_min?.toLocaleString('en-US')}
              {scenario.total_price_max && scenario.total_price_max !== scenario.total_price_min && (
                <span className="text-slate-400 text-base font-normal"> — ${scenario.total_price_max?.toLocaleString('en-US')}</span>
              )}
            </p>
            <p className="text-slate-500 text-[10px]">{scenario.currency}</p>
            {scenario.units_needed > 1 && (
              <p className="text-slate-400 text-[10px] mt-1">
                (${scenario.price_per_unit_min?.toLocaleString('en-US')}
                {scenario.price_per_unit_max && ` — $${scenario.price_per_unit_max?.toLocaleString('en-US')}`} per unità × {scenario.units_needed})
              </p>
            )}
          </div>

          {/* Transit time */}
          {scenario.transit_days_min && (
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300 text-xs">
                {scenario.transit_days_min}{scenario.transit_days_max ? `–${scenario.transit_days_max}` : ''} giorni
              </span>
            </div>
          )}

          {/* Fill stats */}
          {scenario.calc && (
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-700/40 rounded-lg p-2">
                <p className="text-slate-500 text-[9px]">Riempimento vol.</p>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${Math.min(scenario.calc.fill_percent, 100)}%` }}
                    />
                  </div>
                  <span className="text-amber-400 text-[10px] font-bold">{scenario.calc.fill_percent}%</span>
                </div>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-2">
                <p className="text-slate-500 text-[9px]">Riempimento peso</p>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 bg-slate-600 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-400"
                      style={{ width: `${Math.min(scenario.calc.weight_percent, 100)}%` }}
                    />
                  </div>
                  <span className="text-blue-400 text-[10px] font-bold">{scenario.calc.weight_percent}%</span>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-start gap-2 p-3 bg-slate-700/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-slate-400 text-xs">{scenario.error || 'Prezzo non disponibile per questa rotta'}</p>
        </div>
      )}

      <p className="text-slate-600 text-[9px] mt-2">Fonte: {scenario.source}</p>
    </div>
  );
}

function UnitsCalculationTable({ unitsCalc, volumeM3, weightKg }) {
  return (
    <div className="bg-slate-800/40 border border-white/5 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Scale className="w-4 h-4 text-cyan-400" />
        <p className="text-white font-bold text-sm">Calcolo Ingombri</p>
      </div>
      <p className="text-slate-400 text-[10px] mb-3">
        Carico: <strong className="text-white">{volumeM3} m³</strong> • <strong className="text-white">{(weightKg / 1000).toFixed(1)} t</strong>
      </p>
      <div className="space-y-2">
        {unitsCalc.map(u => (
          <div key={u.vehicle_id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              u.vehicle_id === 'container20' ? 'bg-green-500/15' :
              u.vehicle_id === 'container40' ? 'bg-blue-500/15' : 'bg-violet-500/15'
            }`}>
              {u.vehicle_id === 'truck' ? <Truck className="w-4 h-4 text-violet-400" /> : <Box className="w-4 h-4 text-blue-400" />}
            </div>
            <div className="flex-1">
              <p className="text-white text-xs font-semibold">{u.vehicle_label}</p>
              <p className="text-slate-500 text-[10px]">{u.vehicle_volume} m³ / {(u.vehicle_max_weight / 1000).toFixed(1)} t per unità</p>
            </div>
            <div className="text-right">
              <p className="text-amber-400 text-lg font-black">{u.units_needed}</p>
              <p className="text-slate-500 text-[9px]">{u.units_needed === 1 ? 'unità' : 'unità'}</p>
            </div>
            <div className="text-right min-w-[60px]">
              <p className="text-slate-400 text-[10px]">
                {u.limiting_factor === 'volume' ? '📦 Vol.' : '⚖️ Peso'}
              </p>
              <p className="text-slate-500 text-[9px]">Residuo: {u.residual_volume_m3} m³</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ShippingComparator({ formData }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await base44.functions.invoke('freightosEstimate', {
        origin_city: formData.origin_city,
        origin_country: formData.origin_country,
        origin_locode: formData.origin_locode,
        dest_city: formData.dest_city,
        dest_country: formData.dest_country,
        dest_locode: formData.dest_locode,
        weight_kg: formData.weight_kg,
        volume_m3: formData.volume_m3,
        container_type: formData.container_type,
      });
      setResult(resp.data);
    } catch (err) {
      console.error('[ShippingComparator] Error:', err);
      setError(err?.message || 'Errore di comunicazione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-cyan-400" />
        <p className="text-white font-bold text-sm">Simulatore Spedizione Reale</p>
      </div>

      <p className="text-slate-400 text-[10px] mb-3">
        Calcola ingombri e confronta prezzi di mercato reali (Freightos + indici Xeneta/Drewry via AI).
      </p>

      <Button
        onClick={handleFetch}
        disabled={loading}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold h-11 rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 disabled:opacity-50 mb-4"
      >
        {loading ? (
          <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analisi prezzi di mercato...</>
        ) : (
          <><Ship className="w-5 h-5 mr-2" /> Calcola Ingombri e Confronta Prezzi</>
        )}
      </Button>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-200 text-xs">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Rotta */}
          <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3 flex items-center gap-2 text-sm">
            <span className="text-white font-semibold">{result.origin}</span>
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <span className="text-white font-semibold">{result.destination}</span>
          </div>

          {/* Consulente Pallet */}
          <PalletAdvisor
            volumeM3={result.cargo?.volume_m3 || 0}
            weightKg={result.cargo?.weight_kg || 0}
            destCountry={result.destination || ''}
          />

          {/* Tabella ingombri */}
          {result.units_calculation && (
            <UnitsCalculationTable
              unitsCalc={result.units_calculation}
              volumeM3={result.cargo?.volume_m3 || 0}
              weightKg={result.cargo?.weight_kg || 0}
            />
          )}

          {/* Scenari con prezzi */}
          <div className="space-y-3">
            <p className="text-slate-300 text-xs font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-amber-400" />
              Confronto Prezzi Spedizione
            </p>
            {result.scenarios?.map(sc => (
              <ScenarioCard
                key={sc.scenario_id}
                scenario={sc}
                isBest={sc.scenario_id === result.best_scenario}
              />
            ))}
          </div>

          {/* AI Source info */}
          {result.ai_source && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <span className="text-purple-300 text-xs font-bold">Stime basate su dati di mercato</span>
                <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  result.ai_source.confidence === 'high' ? 'bg-green-500/20 text-green-400' :
                  result.ai_source.confidence === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {result.ai_source.confidence === 'high' ? 'Alta affidabilità' :
                   result.ai_source.confidence === 'medium' ? 'Media affidabilità' : 'Bassa affidabilità'}
                </span>
              </div>
              {result.ai_source.sources_used && (
                <p className="text-purple-200/70 text-[10px] flex items-center gap-1">
                  <Globe className="w-3 h-3" /> {result.ai_source.sources_used}
                </p>
              )}
              {result.ai_source.notes && (
                <p className="text-slate-400 text-[10px]">{result.ai_source.notes}</p>
              )}
            </div>
          )}

          {/* Disclaimer */}
          {result.disclaimer && (
            <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-blue-200 text-[10px] leading-relaxed">{result.disclaimer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}