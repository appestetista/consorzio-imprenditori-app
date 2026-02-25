import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ChevronDown, ChevronUp, Target, TrendingUp, Shield, Truck, 
  DollarSign, MapPin, AlertTriangle, Calendar, CheckCircle, 
  BarChart3, Package, ExternalLink, ArrowRight 
} from 'lucide-react';

function CollapsibleSection({ title, icon: Icon, iconColor, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-slate-800/60 border border-white/5 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-white font-bold text-sm">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-white/5 pt-3">{children}</div>}
    </div>
  );
}

function DataRow({ label, value, warning }) {
  if (!value || value === 'N/D' || value === 'Dato non disponibile da fonti ufficiali verificabili') {
    return (
      <div className="flex justify-between items-start py-1.5 border-b border-white/5 last:border-0">
        <span className="text-slate-500 text-xs">{label}</span>
        <span className="text-slate-600 text-xs italic">Non disponibile</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-white/5 last:border-0 gap-4">
      <span className="text-slate-400 text-xs flex-shrink-0">{label}</span>
      <span className={`text-xs text-right ${warning ? 'text-amber-400' : 'text-white'}`}>{value}</span>
    </div>
  );
}

export default function ExportAnalysisResult({ analysisResult, tradeMetrics, macroData, confirmedExportHS, tradeData }) {
  if (!analysisResult) return null;

  return (
    <div className="space-y-3">
      {/* Readiness Score */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className={`absolute inset-0 ${
          analysisResult.readiness_score >= 7 ? 'bg-gradient-to-br from-green-600/80 to-emerald-700/80' :
          analysisResult.readiness_score >= 5 ? 'bg-gradient-to-br from-amber-600/80 to-yellow-700/80' : 'bg-gradient-to-br from-red-600/80 to-rose-700/80'
        }`} />
        <div className="relative p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider font-medium">Export Readiness</p>
              <p className="text-white/90 text-sm mt-1 max-w-[200px]">{analysisResult.readiness_commento}</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black text-white drop-shadow-lg">{analysisResult.readiness_score}</div>
              <p className="text-white/50 text-xs font-medium">/10</p>
            </div>
          </div>
        </div>
      </div>

      {/* Raccomandazione generale */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">Raccomandazione</p>
            <p className="text-emerald-100 text-sm leading-relaxed">{analysisResult.raccomandazione_generale}</p>
          </div>
        </div>
      </div>

      {/* Per ogni mercato */}
      {analysisResult.mercati_analisi?.map((m, idx) => (
        <Card key={idx} className="bg-slate-800/60 border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h3 className="text-white font-bold text-sm">{m.mercato || m.paese_nome}</h3>
            {m.punteggio_opportunita != null && (
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm ${
                m.punteggio_opportunita >= 7 ? 'bg-green-500/20 text-green-400' :
                m.punteggio_opportunita >= 5 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
              }`}>{m.punteggio_opportunita}</div>
            )}
          </div>
          <CardContent className="p-0">
            {/* Market Screening */}
            {m.market_screening && (
              <CollapsibleSection title="Market Screening" icon={BarChart3} iconColor="text-lime-400" defaultOpen={true}>
                <DataRow label="Import totale" value={m.market_screening.import_totale} />
                <DataRow label="CAGR" value={m.market_screening.cagr} />
                <DataRow label="Dazi" value={m.market_screening.dazi} />
                <DataRow label="Barriere non tariffarie" value={m.market_screening.barriere_non_tariffarie} />
                <DataRow label="Ranking" value={m.market_screening.ranking_motivazione} />
              </CollapsibleSection>
            )}

            {/* Flussi Commerciali */}
            {m.flussi_commerciali && (
              <CollapsibleSection title="Flussi Commerciali" icon={TrendingUp} iconColor="text-cyan-400">
                <DataRow label="Import annuo" value={m.flussi_commerciali.valore_import_annuo} />
                <DataRow label="Export ITA→paese" value={m.flussi_commerciali.export_italia_verso_paese} />
                <DataRow label="Trend YoY" value={m.flussi_commerciali.trend_yoy_percentuale} />
                <DataRow label="Quota Italia" value={m.flussi_commerciali.quota_italia} />
                {m.flussi_commerciali.principali_fornitori?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <p className="text-slate-500 text-[10px] mb-1.5">Top fornitori</p>
                    <div className="flex flex-wrap gap-1">
                      {m.flussi_commerciali.principali_fornitori.slice(0, 5).map((f, i) => (
                        <span key={i} className="bg-white/5 text-slate-300 px-2 py-0.5 rounded-md text-[10px]">
                          {f.paese} {f.quota_percentuale}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CollapsibleSection>
            )}

            {/* Domanda Locale & Market Sizing */}
            {m.domanda_locale && (
              <CollapsibleSection title="Domanda Locale & Market Sizing" icon={Target} iconColor="text-purple-400" defaultOpen={true}>
                {/* Market Sizing quantitativo */}
                <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-2.5 mb-3">
                  <p className="text-purple-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Market Sizing (C = P + M − X)</p>
                  <DataRow label="Consumo Apparente (C)" value={m.domanda_locale.consumo_apparente} />
                  <DataRow label="Produzione Locale (P)" value={m.domanda_locale.produzione_locale} />
                  <DataRow label="Import (M)" value={m.domanda_locale.import_value} />
                  <DataRow label="Export (X)" value={m.domanda_locale.export_value} />
                  <DataRow label="Dipendenza Import" value={m.domanda_locale.dipendenza_import} />
                </div>
                {/* Indicatori domanda */}
                <DataRow label="Demand Score" value={m.domanda_locale.demand_score} />
                <DataRow label="Import pro capite" value={m.domanda_locale.import_pro_capite} />
                <DataRow label="Validazione coerenza" value={m.domanda_locale.validazione_coerenza} warning={m.domanda_locale.validazione_coerenza?.toLowerCase()?.includes('anomal')} />
                {/* Analisi qualitativa */}
                <div className="mt-2 pt-2 border-t border-white/5">
                  <DataRow label="Segmentazione" value={m.domanda_locale.segmentazione} />
                  <DataRow label="Volumi consumo" value={m.domanda_locale.volumi_consumo} />
                  <DataRow label="Trend" value={m.domanda_locale.trend} />
                  {m.domanda_locale.canali_distributivi?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-slate-500 text-[10px] mb-1">Canali distributivi</p>
                      <div className="flex flex-wrap gap-1">
                        {m.domanda_locale.canali_distributivi.map((c, i) => (
                          <span key={i} className="bg-white/5 text-slate-300 px-2 py-0.5 rounded-md text-[10px]">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Analisi Competitiva + SWOT */}
            {m.analisi_competitiva && (
              <CollapsibleSection title="Analisi Competitiva (SWOT)" icon={Shield} iconColor="text-orange-400">
                <DataRow label="Posizionamento Italia" value={m.analisi_competitiva.posizionamento_italia} />
                {m.analisi_competitiva.top_competitor?.length > 0 && (
                  <div className="mt-2 mb-2">
                    <p className="text-slate-500 text-[10px] mb-1">Competitor principali</p>
                    {m.analisi_competitiva.top_competitor.map((c, i) => (
                      <div key={i} className="flex justify-between text-xs py-0.5">
                        <span className="text-slate-300">{c.paese}</span>
                        <span className="text-white font-medium">{c.quota}</span>
                      </div>
                    ))}
                  </div>
                )}
                {m.analisi_competitiva.swot && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {[
                      { key: 'strengths', label: 'Punti di Forza', color: 'text-green-400', bg: 'bg-green-500/5' },
                      { key: 'weaknesses', label: 'Debolezze', color: 'text-red-400', bg: 'bg-red-500/5' },
                      { key: 'opportunities', label: 'Opportunità', color: 'text-cyan-400', bg: 'bg-cyan-500/5' },
                      { key: 'threats', label: 'Minacce', color: 'text-amber-400', bg: 'bg-amber-500/5' },
                    ].map(({ key, label, color, bg }) => (
                      m.analisi_competitiva.swot[key]?.length > 0 && (
                        <div key={key} className={`${bg} rounded-lg p-2 border border-white/5`}>
                          <p className={`${color} text-[10px] font-bold uppercase mb-1`}>{label}</p>
                          <ul className="text-slate-300 text-[10px] space-y-0.5">
                            {m.analisi_competitiva.swot[key].map((item, i) => <li key={i}>• {item}</li>)}
                          </ul>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </CollapsibleSection>
            )}

            {/* Dazi e Barriere */}
            {m.dazi_taric && (
              <CollapsibleSection title="Dazi e Barriere" icon={AlertTriangle} iconColor="text-amber-400">
                <DataRow label="Dazio MFN" value={m.dazi_taric.dazio_mfn} />
                <DataRow label="Preferenziale" value={m.dazi_taric.dazio_preferenziale} />
                <DataRow label="Anti-dumping" value={m.dazi_taric.anti_dumping} warning={m.dazi_taric.anti_dumping && m.dazi_taric.anti_dumping !== 'Nessuna'} />
                <DataRow label="Restrizioni" value={m.dazi_taric.restrizioni} warning={m.dazi_taric.restrizioni && m.dazi_taric.restrizioni !== 'Nessuna'} />
              </CollapsibleSection>
            )}

            {/* Requisiti Normativi */}
            {m.requisiti_normativi && (
              <CollapsibleSection title="Requisiti Normativi" icon={Package} iconColor="text-indigo-400">
                <DataRow label="Tempi autorizzazioni" value={m.requisiti_normativi.tempi_autorizzazioni} />
                <DataRow label="Costi" value={m.requisiti_normativi.costi} />
                {m.requisiti_normativi.certificazioni?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-slate-500 text-[10px] mb-1">Certificazioni obbligatorie</p>
                    <div className="flex flex-wrap gap-1">
                      {m.requisiti_normativi.certificazioni.map((c, i) => (
                        <span key={i} className="bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-md text-[10px] border border-indigo-500/20">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
              </CollapsibleSection>
            )}

            {/* Logistica */}
            {m.logistica && (
              <CollapsibleSection title="Analisi Logistica" icon={Truck} iconColor="text-blue-400">
                <DataRow label="Incoterms" value={m.logistica.incoterms_consigliati} />
                <DataRow label="Costo spedizione" value={m.logistica.costo_spedizione} />
                <DataRow label="Tempo transito" value={m.logistica.tempo_transito} />
                <DataRow label="LPI Score" value={m.logistica.lpi_score} />
              </CollapsibleSection>
            )}

            {/* Rischio Paese */}
            {m.rischio_paese && (
              <CollapsibleSection title="Rischio Paese" icon={Shield} iconColor="text-red-400">
                <DataRow label="Rischio politico" value={m.rischio_paese.rischio_politico} />
                <DataRow label="Rischio economico" value={m.rischio_paese.rischio_economico} />
                <DataRow label="Rischio cambio" value={m.rischio_paese.rischio_cambio} />
                <DataRow label="Rischio credito" value={m.rischio_paese.rischio_credito} />
              </CollapsibleSection>
            )}

            {/* Canali di Ingresso */}
            {m.canali_ingresso && (
              <CollapsibleSection title="Canali di Ingresso" icon={MapPin} iconColor="text-teal-400">
                <DataRow label="Importatori" value={m.canali_ingresso.importatori} />
                {m.canali_ingresso.fiere_settore?.length > 0 && (
                  <div className="mt-1.5">
                    <p className="text-slate-500 text-[10px] mb-1">Fiere di settore</p>
                    <ul className="text-slate-300 text-[10px] space-y-0.5">
                      {m.canali_ingresso.fiere_settore.map((f, i) => <li key={i}>• {f}</li>)}
                    </ul>
                  </div>
                )}
                {m.canali_ingresso.marketplace?.length > 0 && (
                  <div className="mt-1.5">
                    <p className="text-slate-500 text-[10px] mb-1">Marketplace</p>
                    <div className="flex flex-wrap gap-1">
                      {m.canali_ingresso.marketplace.map((mp, i) => (
                        <span key={i} className="bg-white/5 text-slate-300 px-2 py-0.5 rounded-md text-[10px]">{mp}</span>
                      ))}
                    </div>
                  </div>
                )}
              </CollapsibleSection>
            )}

            {/* Opportunità e Sfide */}
            {(m.opportunita?.length > 0 || m.sfide?.length > 0) && (
              <CollapsibleSection title="Opportunità e Sfide" icon={TrendingUp} iconColor="text-lime-400">
                <div className="grid grid-cols-2 gap-2">
                  {m.opportunita?.length > 0 && (
                    <div className="bg-green-500/5 rounded-lg p-2 border border-green-500/10">
                      <p className="text-green-400 text-[10px] font-bold uppercase mb-1">Opportunità</p>
                      <ul className="text-slate-300 text-[10px] space-y-0.5">
                        {m.opportunita.map((o, i) => <li key={i}>• {o}</li>)}
                      </ul>
                    </div>
                  )}
                  {m.sfide?.length > 0 && (
                    <div className="bg-orange-500/5 rounded-lg p-2 border border-orange-500/10">
                      <p className="text-orange-400 text-[10px] font-bold uppercase mb-1">Sfide</p>
                      <ul className="text-slate-300 text-[10px] space-y-0.5">
                        {m.sfide.map((s, i) => <li key={i}>• {s}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </CollapsibleSection>
            )}

            {/* Conclusione operativa */}
            {m.conclusione_operativa && (
              <div className="px-4 py-3 bg-white/[0.02] border-t border-white/5">
                <p className="text-lime-400 text-[10px] font-bold uppercase tracking-wider mb-1">Conclusione Operativa</p>
                <p className="text-slate-300 text-xs leading-relaxed">{m.conclusione_operativa}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Analisi Economica Export */}
      {analysisResult.analisi_economica && (
        <CollapsibleSection title="Analisi Economica Export" icon={DollarSign} iconColor="text-lime-400" defaultOpen={true}>
          <DataRow label="Simulazione prezzo" value={analysisResult.analisi_economica.simulazione_prezzo} />
          <DataRow label="Margine lordo" value={analysisResult.analisi_economica.margine_lordo} />
          <DataRow label="Break even" value={analysisResult.analisi_economica.break_even} />
          <DataRow label="Investimento iniziale" value={analysisResult.analisi_economica.investimento_iniziale} />
          {analysisResult.analisi_economica.note && (
            <p className="text-slate-500 text-[10px] mt-2 italic">{analysisResult.analisi_economica.note}</p>
          )}
        </CollapsibleSection>
      )}

      {/* Roadmap 12 mesi */}
      {analysisResult.roadmap_12_mesi?.length > 0 && (
        <CollapsibleSection title="Roadmap Operativa 12 Mesi" icon={Calendar} iconColor="text-blue-400" defaultOpen={false}>
          <div className="space-y-3">
            {analysisResult.roadmap_12_mesi.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-400 text-[10px] font-bold">{step.mese}</span>
                </div>
                <div className="flex-1">
                  <p className="text-white text-xs font-medium">{step.attivita}</p>
                  {step.kpi && <p className="text-slate-500 text-[10px]">KPI: {step.kpi}</p>}
                  {step.budget_stimato && <p className="text-slate-500 text-[10px]">Budget: {step.budget_stimato}</p>}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Mercati Prioritari */}
      {analysisResult.mercati_prioritari?.length > 0 && (
        <div className="bg-slate-800/60 border border-white/5 rounded-2xl p-4">
          <p className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-lime-400" />
            Mercati Prioritari
          </p>
          <div className="flex flex-wrap gap-2">
            {analysisResult.mercati_prioritari.map((m, i) => (
              <span key={i} className="bg-lime-400/10 text-lime-400 px-3 py-1.5 rounded-lg text-xs font-semibold border border-lime-400/20">{m}</span>
            ))}
          </div>
        </div>
      )}

      {/* Rischi Principali */}
      {analysisResult.rischi_principali?.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/15 rounded-2xl p-4">
          <p className="text-orange-400 font-bold text-sm mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Rischi Principali
          </p>
          <ul className="text-orange-200/90 text-sm space-y-1.5">
            {analysisResult.rischi_principali.map((r, i) => <li key={i} className="leading-snug">• {r}</li>)}
          </ul>
        </div>
      )}

      {/* Primi Passi */}
      {analysisResult.primi_passi?.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/15 rounded-2xl p-4">
          <p className="text-blue-400 font-bold text-sm mb-3">Primi Passi</p>
          <div className="space-y-2.5">
            {analysisResult.primi_passi.map((p, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-400 text-xs font-bold">{i + 1}</span>
                </div>
                <p className="text-blue-100 text-sm pt-0.5">{p}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {analysisResult.timeline_consigliata && (
        <div className="bg-slate-800/60 border border-white/5 rounded-2xl p-4">
          <p className="text-white font-bold text-sm mb-2 flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-blue-400" />
            Timeline Consigliata
          </p>
          <p className="text-slate-300 text-sm leading-relaxed">{analysisResult.timeline_consigliata}</p>
        </div>
      )}

      {/* Risorse Utili */}
      {analysisResult.risorse_utili?.length > 0 && (
        <div className="bg-slate-800/60 border border-white/5 rounded-2xl p-4">
          <p className="text-white font-bold text-sm mb-3">Risorse Utili</p>
          <div className="space-y-2">
            {analysisResult.risorse_utili.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-lime-400 hover:text-lime-300 text-sm bg-white/5 rounded-lg px-3 py-2 transition-colors">
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                {r.nome}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Trasparenza dati */}
      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
        <p className="text-slate-600 text-[10px] font-semibold uppercase tracking-wider mb-2">Trasparenza dati</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-500">
          <div><span className="text-slate-600">Fonte:</span> UN Comtrade</div>
          <div><span className="text-slate-600">Macro:</span> World Bank</div>
          <div><span className="text-slate-600">HS:</span> {confirmedExportHS?.hs_code}</div>
          <div><span className="text-slate-600">Esportatore:</span> {tradeData?._query_log?.exporter || 'IT'}</div>
          <div><span className="text-slate-600">Periodo:</span> {tradeData?._query_log?.periodo || `${new Date().getFullYear() - 5}-${new Date().getFullYear() - 1}`}</div>
          <div><span className="text-slate-600">Data:</span> {tradeData?._timestamp_recupero ? new Date(tradeData._timestamp_recupero).toLocaleString('it-IT') : 'N/D'}</div>
        </div>
        <p className="text-slate-600 text-[10px] mt-2 italic">Metodologia conforme a ICE, SACE, World Bank, International Trade Centre.</p>
      </div>
    </div>
  );
}