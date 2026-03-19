import React from 'react';
import { Ship, Plane, MapPin, AlertTriangle, Shield } from 'lucide-react';
import InfoTooltip from './InfoTooltip';

function DataRow({ label, value }) {
  if (!value || value === 'N/D' || value === 'Non disponibile') return null;
  const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-white/5 last:border-0 gap-4">
      <span className="text-white/70 text-xs flex-shrink-0">{label}</span>
      <span className="text-white text-xs text-right font-medium">{display}</span>
    </div>
  );
}

export default function LogisticaDetailCard({ logistica, rischioPaese }) {
  if (!logistica && !rischioPaese) return null;

  const lp = logistica?.logistics_performance;
  const sr = logistica?.shipping_routes;
  const ec = logistica?.estimated_costs;
  const infra = logistica?.infrastructure_details;

  return (
    <div className="bg-slate-800/60 border border-white/5 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <Ship className="w-4 h-4 text-sky-400" />
        <span className="text-white font-bold text-sm flex items-center gap-1.5">
          Logistica Internazionale
          <InfoTooltip title="Logistica Internazionale">
            <p>Questa sezione analizza le infrastrutture logistiche, i tempi e costi di trasporto, e i rischi del paese di destinazione. I dati provengono dal Logistics Performance Index (World Bank), fonti di settore e analisi AI.</p>
          </InfoTooltip>
        </span>
      </div>
      <div className="px-4 pb-4 pt-3 space-y-4">
        {/* Performance logistica */}
        {lp && (
          <div>
            <p className="text-sky-400 text-[10px] font-bold uppercase tracking-wider mb-2">Performance logistica</p>
            <DataRow label="LPI Global Rank" value={lp.lpi_global_rank} />
            <DataRow label="Efficienza doganale" value={lp.customs_efficiency_score} />
            <DataRow label="Qualità infrastrutture" value={lp.infrastructure_quality} />
          </div>
        )}

        {/* Rotte e porti */}
        {sr && (
          <div>
            <p className="text-sky-400 text-[10px] font-bold uppercase tracking-wider mb-2">Rotte di spedizione</p>
            {sr.main_entry_ports?.length > 0 && (
              <div className="mb-2">
                <p className="text-white/50 text-[10px] mb-1 flex items-center gap-1"><Ship className="w-3 h-3" /> Porti principali</p>
                <div className="flex flex-wrap gap-1">
                  {sr.main_entry_ports.map((p, i) => (
                    <span key={i} className="bg-sky-500/10 text-sky-300 px-2 py-0.5 rounded-md text-[10px] border border-sky-500/20">{p}</span>
                  ))}
                </div>
              </div>
            )}
            {sr.main_cargo_airports?.length > 0 && (
              <div className="mb-2">
                <p className="text-white/50 text-[10px] mb-1 flex items-center gap-1"><Plane className="w-3 h-3" /> Aeroporti cargo</p>
                <div className="flex flex-wrap gap-1">
                  {sr.main_cargo_airports.map((a, i) => (
                    <span key={i} className="bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-md text-[10px] border border-indigo-500/20">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {sr.transit_ports?.length > 0 && (
              <div className="mb-2">
                <p className="text-white/50 text-[10px] mb-1">Porti di transito</p>
                <div className="flex flex-wrap gap-1">
                  {sr.transit_ports.map((p, i) => (
                    <span key={i} className="bg-white/5 text-white/70 px-2 py-0.5 rounded-md text-[10px]">{p}</span>
                  ))}
                </div>
              </div>
            )}
            <DataRow label="Transito mare" value={sr.transit_time_sea} />
            <DataRow label="Transito aereo" value={sr.transit_time_air} />
          </div>
        )}

        {/* Costi stimati */}
        {ec && (
          <div>
            <p className="text-sky-400 text-[10px] font-bold uppercase tracking-wider mb-2">Costi stimati</p>
            <DataRow label="Nolo marittimo" value={ec.sea_freight_range} />
            <DataRow label="Nolo aereo (/kg)" value={ec.air_freight_per_kg} />
            <DataRow label="Complessità ultimo miglio" value={ec.last_mile_complexity} />
          </div>
        )}

        {/* Infrastrutture */}
        {infra && (
          <div>
            <p className="text-sky-400 text-[10px] font-bold uppercase tracking-wider mb-2">Infrastrutture</p>
            <DataRow label="Collegamento ferroviario" value={infra.rail_connection} />
            {infra.major_logistics_hubs?.length > 0 && (
              <div className="mb-1.5">
                <p className="text-white/50 text-[10px] mb-1">Hub logistici</p>
                <div className="flex flex-wrap gap-1">
                  {infra.major_logistics_hubs.map((h, i) => (
                    <span key={i} className="bg-white/5 text-white/70 px-2 py-0.5 rounded-md text-[10px]">{h}</span>
                  ))}
                </div>
              </div>
            )}
            {infra.free_trade_zones?.length > 0 && (
              <div className="mb-1.5">
                <p className="text-white/50 text-[10px] mb-1">Zone franche</p>
                <div className="flex flex-wrap gap-1">
                  {infra.free_trade_zones.map((z, i) => (
                    <span key={i} className="bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded-md text-[10px] border border-emerald-500/20">{z}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Incoterms e rischi */}
        <DataRow label="Incoterms consigliati" value={logistica?.incoterms_consigliati} />
        {logistica?.logistics_risks?.length > 0 && (
          <div>
            <p className="text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Rischi logistici</p>
            <ul className="text-white/70 text-[10px] space-y-0.5">
              {logistica.logistics_risks.map((r, i) => <li key={i}>• {r}</li>)}
            </ul>
          </div>
        )}

        {/* Rischio Paese */}
        {rischioPaese && (
          <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2.5">
            <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Shield className="w-3 h-3" /> Rischio Paese
            </p>
            <DataRow label="Rischio politico" value={rischioPaese.rischio_politico} />
            <DataRow label="Rischio economico" value={rischioPaese.rischio_economico} />
            <DataRow label="Rischio cambio" value={rischioPaese.rischio_cambio} />
            <DataRow label="Rischio credito" value={rischioPaese.rischio_credito} />
          </div>
        )}

        {/* Fonti */}
        {logistica?.data_sources?.length > 0 && (
          <div className="pt-2 border-t border-white/5">
            <p className="text-white/30 text-[9px]">Fonti: {logistica.data_sources.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  );
}