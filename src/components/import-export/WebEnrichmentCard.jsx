import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Globe, ShieldCheck, BarChart3, Flag, ExternalLink, AlertCircle } from 'lucide-react';

function Section({ title, icon: Icon, iconColor, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/5 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-3 py-2 text-left bg-white/[0.02] hover:bg-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
          <span className="text-white font-semibold text-[11px]">{title}</span>
        </div>
        {open ? <ChevronUp className="w-3 h-3 text-slate-500" /> : <ChevronDown className="w-3 h-3 text-slate-500" />}
      </button>
      {open && <div className="px-3 pb-3 pt-2 border-t border-white/5">{children}</div>}
    </div>
  );
}

function DataItem({ label, value, warning }) {
  if (!value || value === 'Non trovato' || value === 'N/D') return null;
  return (
    <div className="flex justify-between items-start py-1 gap-3">
      <span className="text-slate-500 text-[10px] flex-shrink-0">{label}</span>
      <span className={`text-[10px] text-right ${warning ? 'text-amber-400' : 'text-slate-300'}`}>{value}</span>
    </div>
  );
}

export default function WebEnrichmentCard({ webData, countryName }) {
  if (!webData) return null;

  const { access2markets, trade_map, ice_italia, data_quality } = webData;
  const hasData = access2markets || trade_map || ice_italia;
  if (!hasData) return null;

  return (
    <div className="bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border border-blue-500/15 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 mb-1">
        <Globe className="w-4 h-4 text-blue-400" />
        <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">Web Intelligence — {countryName}</span>
        {data_quality?.affidabilita && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
            data_quality.affidabilita === 'alta' ? 'bg-green-500/15 text-green-400' :
            data_quality.affidabilita === 'media' ? 'bg-amber-500/15 text-amber-400' :
            'bg-red-500/15 text-red-400'
          }`}>{data_quality.affidabilita}</span>
        )}
      </div>

      {/* Access2Markets */}
      {access2markets && (
        <Section title="Access2Markets (EU)" icon={ShieldCheck} iconColor="text-blue-400">
          <DataItem label="Dazio convenzionale" value={access2markets.dazio_convenzionale} />
          <DataItem label="Dazio preferenziale" value={access2markets.dazio_preferenziale} />
          <DataItem label="IVA locale" value={access2markets.iva_locale} />
          <DataItem label="Regole di origine" value={access2markets.regole_origine} />
          <DataItem label="Restrizioni" value={access2markets.restrizioni} warning={access2markets.restrizioni && access2markets.restrizioni !== 'Nessuna'} />
          {access2markets.certificazioni_obbligatorie?.length > 0 && (
            <div className="mt-1.5">
              <p className="text-slate-500 text-[10px] mb-1">Certificazioni obbligatorie</p>
              <div className="flex flex-wrap gap-1">
                {access2markets.certificazioni_obbligatorie.map((c, i) => (
                  <span key={i} className="bg-blue-500/10 text-blue-300 px-1.5 py-0.5 rounded text-[9px] border border-blue-500/20">{c}</span>
                ))}
              </div>
            </div>
          )}
          {access2markets.documenti_doganali?.length > 0 && (
            <div className="mt-1.5">
              <p className="text-slate-500 text-[10px] mb-1">Documenti doganali</p>
              {access2markets.documenti_doganali.map((d, i) => (
                <div key={i} className="flex items-center gap-1 py-0.5">
                  <span className="w-1 h-1 rounded-full bg-blue-400/50" />
                  <span className="text-slate-300 text-[10px]">{d}</span>
                </div>
              ))}
            </div>
          )}
          {access2markets.fonte && <p className="text-slate-600 text-[9px] mt-1.5 italic">Fonte: {access2markets.fonte}</p>}
        </Section>
      )}

      {/* Trade Map */}
      {trade_map && (
        <Section title="Trade Map (ITC)" icon={BarChart3} iconColor="text-cyan-400">
          <DataItem label="Import totale" value={trade_map.import_totale_usd} />
          <DataItem label="Export Italia" value={trade_map.export_italia_usd} />
          <DataItem label="Trend" value={trade_map.trend} />
          <DataItem label="Anno dati" value={trade_map.anno_dati} />
          {trade_map.top_esportatori?.length > 0 && (
            <div className="mt-1.5">
              <p className="text-slate-500 text-[10px] mb-1">Top esportatori</p>
              <div className="flex flex-wrap gap-1">
                {trade_map.top_esportatori.map((e, i) => (
                  <span key={i} className="bg-cyan-500/10 text-cyan-300 px-1.5 py-0.5 rounded text-[9px] border border-cyan-500/20">
                    {e.paese} {e.quota}
                  </span>
                ))}
              </div>
            </div>
          )}
          {trade_map.fonte && <p className="text-slate-600 text-[9px] mt-1.5 italic">Fonte: {trade_map.fonte}</p>}
        </Section>
      )}

      {/* ICE Italia */}
      {ice_italia && (
        <Section title="ICE — Agenzia Commercio Estero" icon={Flag} iconColor="text-green-400">
          <DataItem label="Opportunità" value={ice_italia.opportunita} />
          <DataItem label="Ufficio ICE" value={ice_italia.ufficio_ice_locale} />
          <DataItem label="Guide paese" value={ice_italia.guide_paese} />
          {ice_italia.fiere_rilevanti?.length > 0 && (
            <div className="mt-1.5">
              <p className="text-slate-500 text-[10px] mb-1">Fiere settoriali</p>
              <div className="flex flex-wrap gap-1">
                {ice_italia.fiere_rilevanti.map((f, i) => (
                  <span key={i} className="bg-green-500/10 text-green-300 px-1.5 py-0.5 rounded text-[9px] border border-green-500/20">{f}</span>
                ))}
              </div>
            </div>
          )}
          {ice_italia.fonte && <p className="text-slate-600 text-[9px] mt-1.5 italic">Fonte: {ice_italia.fonte}</p>}
        </Section>
      )}

      {/* Data Quality note */}
      {data_quality?.note && (
        <div className="flex items-start gap-1.5 pt-1 border-t border-white/5 mt-1">
          <AlertCircle className="w-3 h-3 text-slate-500 mt-0.5 flex-shrink-0" />
          <p className="text-slate-500 text-[9px]">{data_quality.note}</p>
        </div>
      )}
      {data_quality?.fonti_consultate?.length > 0 && (
        <p className="text-slate-600 text-[9px]">Fonti consultate: {data_quality.fonti_consultate.join(', ')}</p>
      )}
    </div>
  );
}