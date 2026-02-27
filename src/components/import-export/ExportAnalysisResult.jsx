import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Target, TrendingUp, Shield, Truck, 
  DollarSign, MapPin, AlertTriangle, Calendar, CheckCircle, 
  BarChart3, Package, ExternalLink, ArrowRight, HelpCircle, X 
} from 'lucide-react';
import { useState } from 'react';

import { 
  VerificaNormativaCard, StrutturaIngressoCard, CanaliVenditaCard, 
  StrutturaMarginiCard, LogisticaDoganeGTMCard, ValidazioneCommercialeCard, DatiMancantiCard 
} from './ExportPhaseCards';
import CustomsDutyGuideCard from './CustomsDutyGuideCard';

function OpenSection({ title, icon: Icon, iconColor, children }) {
  return (
    <div className="bg-slate-800/60 border border-white/5 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-white font-bold text-sm">{title}</span>
      </div>
      <div className="px-4 pb-4 pt-3">{children}</div>
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

export default function ExportAnalysisResult({ analysisResult, tradeMetrics, macroData, confirmedExportHS, tradeData, exportForm }) {
  if (!analysisResult || typeof analysisResult !== 'object') return null;

  const readinessScore = typeof analysisResult.readiness_score === 'number' ? analysisResult.readiness_score : 0;

  return (
    <div className="space-y-3">
      {/* Readiness Score */}
      <div className="relative rounded-2xl overflow-hidden">
        <div className={`absolute inset-0 ${
          readinessScore >= 7 ? 'bg-gradient-to-br from-green-600/80 to-emerald-700/80' :
          readinessScore >= 5 ? 'bg-gradient-to-br from-amber-600/80 to-yellow-700/80' : 'bg-gradient-to-br from-red-600/80 to-rose-700/80'
        }`} />
        <div className="relative p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider font-medium">Export Readiness</p>
              <p className="text-white/90 text-sm mt-1 max-w-[200px]">{analysisResult.readiness_commento || ''}</p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-black text-white drop-shadow-lg">{readinessScore}</div>
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
      {Array.isArray(analysisResult.mercati_analisi) && analysisResult.mercati_analisi.map((m, idx) => (
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
              <OpenSection title="Market Screening" icon={BarChart3} iconColor="text-lime-400">
                <DataRow label="Import totale" value={m.market_screening.import_totale} />
                <DataRow label="CAGR" value={m.market_screening.cagr} />
                <DataRow label="Dazi" value={m.market_screening.dazi} />
                <DataRow label="Barriere non tariffarie" value={m.market_screening.barriere_non_tariffarie} />
                <DataRow label="Ranking" value={m.market_screening.ranking_motivazione} />
              </OpenSection>
            )}

            {/* Flussi Commerciali */}
            {m.flussi_commerciali && (
              <OpenSection title="Flussi Commerciali" icon={TrendingUp} iconColor="text-cyan-400">
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
              </OpenSection>
            )}

            {/* Domanda Locale & Market Sizing */}
            {m.domanda_locale && (
              <OpenSection title="Domanda Locale & Market Sizing" icon={Target} iconColor="text-purple-400">
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
              </OpenSection>
            )}

            {/* Analisi Competitiva — Competitive Intelligence */}
            {m.analisi_competitiva && (
              <CompetitiveIntelligenceSection m={m} />
            )}

            {/* STRATEGIA EXPORT — FASI */}
            <VerificaNormativaCard data={m.verifica_normativa} />

            <StrutturaIngressoCard data={m.canali_ingresso} countryCode={m.paese_code} countryName={m.paese_nome || m.mercato} hsCode={confirmedExportHS?.hs_code} productDescription={exportForm?.prodotto} />
            <CanaliVenditaCard data={m.canali_ingresso} />

            <LogisticaDoganeGTMCard data={m.logistica_dogane_gtm} />

            {confirmedExportHS?.hs_code && (
              <CustomsDutyGuideCard
                countryCode={m.paese_code}
                countryName={m.paese_nome || m.mercato}
                hsCode={confirmedExportHS.hs_code}
                productDescription={exportForm?.prodotto || confirmedExportHS?.description}
              />
            )}

            <ValidazioneCommercialeCard data={m.validazione_commerciale} />
            <DatiMancantiCard data={m.dati_mancanti} />

            {m.canali_ingresso?.strategic_recommendations?.length > 0 && (
              <OpenSection title="Raccomandazioni Strategiche" icon={CheckCircle} iconColor="text-lime-400">
                <ul className="text-slate-300 text-[10px] space-y-1">
                  {m.canali_ingresso.strategic_recommendations.map((r, i) => <li key={i}>• {r}</li>)}
                </ul>
              </OpenSection>
            )}

            {(m.opportunita?.length > 0 || m.sfide?.length > 0) && (
              <OpenSection title="Opportunità e Sfide" icon={TrendingUp} iconColor="text-lime-400">
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
              </OpenSection>
            )}

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
        <OpenSection title="Analisi Economica Export" icon={DollarSign} iconColor="text-lime-400">
          <DataRow label="Simulazione prezzo" value={analysisResult.analisi_economica.simulazione_prezzo} />
          <DataRow label="Margine lordo" value={analysisResult.analisi_economica.margine_lordo} />
          <DataRow label="Break even" value={analysisResult.analisi_economica.break_even} />
          <DataRow label="Investimento iniziale" value={analysisResult.analisi_economica.investimento_iniziale} />
          {analysisResult.analisi_economica.note && (
            <p className="text-slate-500 text-[10px] mt-2 italic">{analysisResult.analisi_economica.note}</p>
          )}
        </OpenSection>
      )}

      {analysisResult.roadmap_12_mesi?.length > 0 && (
        <OpenSection title="Roadmap Operativa 12 Mesi" icon={Calendar} iconColor="text-blue-400">
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
        </OpenSection>
      )}

      {analysisResult.mercati_prioritari?.length > 0 && (
        <div className="bg-slate-800/60 border border-white/5 rounded-2xl p-4">
          <p className="text-white font-bold text-sm mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-lime-400" />Mercati Prioritari</p>
          <div className="flex flex-wrap gap-2">
            {analysisResult.mercati_prioritari.map((mp, i) => (
              <span key={i} className="bg-lime-400/10 text-lime-400 px-3 py-1.5 rounded-lg text-xs font-semibold border border-lime-400/20">{mp}</span>
            ))}
          </div>
        </div>
      )}

      {analysisResult.rischi_principali?.length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/15 rounded-2xl p-4">
          <p className="text-orange-400 font-bold text-sm mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Rischi Principali</p>
          <ul className="text-orange-200/90 text-sm space-y-1.5">
            {analysisResult.rischi_principali.map((r, i) => <li key={i} className="leading-snug">• {r}</li>)}
          </ul>
        </div>
      )}

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

      {analysisResult.timeline_consigliata && (
        <div className="bg-slate-800/60 border border-white/5 rounded-2xl p-4">
          <p className="text-white font-bold text-sm mb-2 flex items-center gap-2"><ArrowRight className="w-4 h-4 text-blue-400" />Timeline Consigliata</p>
          <p className="text-slate-300 text-sm leading-relaxed">{analysisResult.timeline_consigliata}</p>
        </div>
      )}

      {analysisResult.risorse_utili?.length > 0 && (
        <div className="bg-slate-800/60 border border-white/5 rounded-2xl p-4">
          <p className="text-white font-bold text-sm mb-3">Risorse Utili</p>
          <div className="space-y-2">
            {analysisResult.risorse_utili.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-lime-400 hover:text-lime-300 text-sm bg-white/5 rounded-lg px-3 py-2 transition-colors">
                <ExternalLink className="w-4 h-4 flex-shrink-0" />{r.nome}
              </a>
            ))}
          </div>
        </div>
      )}

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

function CompetitiveIntelligenceSection({ m }) {
  const [showCIInfo, setShowCIInfo] = useState(false);
  
  return (
              <OpenSection title={
                <span className="flex items-center gap-2">
                  Competitive Intelligence
                  <button onClick={(e) => { e.stopPropagation(); setShowCIInfo(true); }}
                    className="w-5 h-5 rounded-full bg-white/10 border border-white/30 flex items-center justify-center hover:bg-white/20 transition-colors flex-shrink-0">
                    <span className="text-white text-[10px] font-bold leading-none">?</span>
                  </button>
                </span>
              } icon={Shield} iconColor="text-orange-400">

                {showCIInfo && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={() => setShowCIInfo(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-bold text-sm">Competitive Intelligence</h3>
                        <button onClick={() => setShowCIInfo(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="space-y-3 text-slate-300 text-xs leading-relaxed">
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                          <p className="text-orange-400 text-[10px] font-bold uppercase tracking-wider mb-1">Cos'è</p>
                          <p>La sezione Competitive Intelligence analizza il panorama competitivo del mercato target: chi sono i concorrenti principali, come si posizionano, quali prezzi praticano e quali canali distributivi utilizzano.</p>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-3">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Il punteggio opportunità (es. 7.5/10)</p>
                          <p className="text-slate-300 text-xs mb-2">Il numero che vedi accanto al nome del paese rappresenta il <strong className="text-white">Punteggio Opportunità</strong>: una valutazione sintetica da 0 a 10 che riassume quanto è favorevole quel mercato per il tuo prodotto.</p>
                          <div className="space-y-1 text-[11px]">
                            <div className="flex justify-between"><span className="text-green-400 font-bold">≥ 7</span><span className="text-slate-400">Opportunità elevata</span></div>
                            <div className="flex justify-between"><span className="text-yellow-400 font-bold">5 – 6.9</span><span className="text-slate-400">Opportunità moderata</span></div>
                            <div className="flex justify-between"><span className="text-red-400 font-bold">&lt; 5</span><span className="text-slate-400">Opportunità limitata / rischiosa</span></div>
                          </div>
                        </div>
                        <div className="bg-slate-800 rounded-lg p-3">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Fattori inclusi nel punteggio</p>
                          <div className="space-y-1 text-[11px] text-slate-400">
                            <div>• Volume e crescita della domanda</div>
                            <div>• Livello di concorrenza e concentrazione</div>
                            <div>• Barriere all'ingresso e dazi</div>
                            <div>• Rischio paese e stabilità economica</div>
                            <div>• Compatibilità logistica e normativa</div>
                          </div>
                        </div>
                        <p className="text-slate-500 text-[10px]">Fonte: elaborazione AI su dati UN Comtrade, World Bank, fonti settoriali</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Landscape & Concentrazione */}
                {m.analisi_competitiva.competitive_landscape && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">Concentrazione mercato</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        m.analisi_competitiva.competitive_landscape.market_concentration === 'High' ? 'bg-red-500/15 text-red-400' :
                        m.analisi_competitiva.competitive_landscape.market_concentration === 'Medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-green-500/15 text-green-400'
                      }`}>{m.analisi_competitiva.competitive_landscape.market_concentration}</span>
                    </div>
                    {m.analisi_competitiva.competitive_landscape.top_competitors?.length > 0 && (
                      <div className="space-y-1.5">
                        {m.analisi_competitiva.competitive_landscape.top_competitors.map((c, i) => (
                          <div key={i} className="bg-white/[0.03] border border-white/5 rounded-lg p-2">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-white text-xs font-medium">{c.name}</span>
                              <div className="flex gap-1">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded ${c.origin === 'Local' ? 'bg-blue-500/15 text-blue-400' : 'bg-purple-500/15 text-purple-400'}`}>{c.origin}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                  c.positioning === 'Premium' ? 'bg-amber-500/15 text-amber-400' :
                                  c.positioning === 'Value' ? 'bg-cyan-500/15 text-cyan-400' : 'bg-slate-500/15 text-slate-400'
                                }`}>{c.positioning}</span>
                              </div>
                            </div>
                            {c.value_proposition && <p className="text-slate-400 text-[10px]">{c.value_proposition}</p>}
                            {c.estimated_market_share && c.estimated_market_share !== 'N/D' && (
                              <p className="text-slate-500 text-[10px] mt-0.5">Quota: {c.estimated_market_share}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Pricing Intelligence */}
                {m.analisi_competitiva.pricing_intelligence && (
                  <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-2.5 mb-3">
                    <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Pricing Intelligence</p>
                    <div className="flex items-center gap-3 mb-1">
                      {m.analisi_competitiva.pricing_intelligence.local_price_range_min && (
                        <span className="text-white text-xs font-medium">
                          {m.analisi_competitiva.pricing_intelligence.local_price_range_min} — {m.analisi_competitiva.pricing_intelligence.local_price_range_max}
                          {m.analisi_competitiva.pricing_intelligence.price_unit && (
                            <span className="text-slate-400 text-[10px] font-normal ml-1">/{m.analisi_competitiva.pricing_intelligence.price_unit}</span>
                          )}
                          {m.analisi_competitiva.pricing_intelligence.currency && (
                            <span className="text-slate-400 text-[10px] font-normal ml-1">({m.analisi_competitiva.pricing_intelligence.currency})</span>
                          )}
                        </span>
                      )}
                    </div>
                    {m.analisi_competitiva.pricing_intelligence.price_unit && (
                      <p className="text-slate-500 text-[10px]">Unità di misura: {m.analisi_competitiva.pricing_intelligence.price_unit}</p>
                    )}
                    {m.analisi_competitiva.pricing_intelligence.benchmark_product && (
                      <p className="text-slate-400 text-[10px]">Rif: {m.analisi_competitiva.pricing_intelligence.benchmark_product}</p>
                    )}
                    {m.analisi_competitiva.pricing_intelligence.notes && (
                      <p className="text-slate-500 text-[10px] mt-1 italic">{m.analisi_competitiva.pricing_intelligence.notes}</p>
                    )}
                  </div>
                )}

                {/* Distribution Channels */}
                {m.analisi_competitiva.distribution_channels && (
                  <div className="mb-3">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Canali Distributivi</p>
                    {m.analisi_competitiva.distribution_channels.online_share && (
                      <DataRow label="Quota online" value={m.analisi_competitiva.distribution_channels.online_share} />
                    )}
                    {m.analisi_competitiva.distribution_channels.standard_trade_margin && (
                      <DataRow label="Margine trade" value={m.analisi_competitiva.distribution_channels.standard_trade_margin} />
                    )}
                    {m.analisi_competitiva.distribution_channels.primary_entry_mode && (
                      <DataRow label="Modalità ingresso" value={m.analisi_competitiva.distribution_channels.primary_entry_mode} />
                    )}
                    {m.analisi_competitiva.distribution_channels.offline_key_players?.length > 0 && (
                      <div className="mt-1.5">
                        <p className="text-slate-500 text-[10px] mb-1">Player offline</p>
                        <div className="flex flex-wrap gap-1">
                          {m.analisi_competitiva.distribution_channels.offline_key_players.map((p, i) => (
                            <span key={i} className="bg-white/5 text-slate-300 px-2 py-0.5 rounded-md text-[10px]">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Differentiation Factors */}
                {m.analisi_competitiva.differentiation_factors?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Leve Competitive</p>
                    <div className="flex flex-wrap gap-1">
                      {m.analisi_competitiva.differentiation_factors.map((f, i) => (
                        <span key={i} className="bg-lime-500/10 text-lime-400 px-2 py-0.5 rounded-md text-[10px] border border-lime-500/20">{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entry Barriers */}
                {m.analisi_competitiva.entry_barriers && (
                  <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2.5 mb-3">
                    <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Barriere all'Ingresso</p>
                    <DataRow label="Brand Loyalty" value={m.analisi_competitiva.entry_barriers.brand_loyalty_level} />
                    {m.analisi_competitiva.entry_barriers.required_certifications?.length > 0 && (
                      <div className="mt-1.5">
                        <p className="text-slate-500 text-[10px] mb-1">Certificazioni richieste</p>
                        <div className="flex flex-wrap gap-1">
                          {m.analisi_competitiva.entry_barriers.required_certifications.map((c, i) => (
                            <span key={i} className="bg-red-500/10 text-red-300 px-2 py-0.5 rounded-md text-[10px] border border-red-500/20">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {m.analisi_competitiva.entry_barriers.notes && (
                      <p className="text-slate-500 text-[10px] mt-1 italic">{m.analisi_competitiva.entry_barriers.notes}</p>
                    )}
                  </div>
                )}

                {/* Posizionamento Italia */}
                <DataRow label="Posizionamento Italia" value={m.analisi_competitiva.posizionamento_italia} />

                {/* SWOT */}
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

                {/* Fonti */}
                {m.analisi_competitiva.sources?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <p className="text-slate-600 text-[10px] mb-1">Fonti:</p>
                    <div className="space-y-0.5">
                      {m.analisi_competitiva.sources.map((s, i) => (
                        <p key={i} className="text-slate-500 text-[10px] truncate">{s}</p>
                      ))}
                    </div>
                  </div>
                )}
              </OpenSection>
  );
}