import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ShieldCheck, ShieldAlert, Shield, Star, AlertTriangle, Globe, X, Loader2 } from 'lucide-react';

function ScoreBar({ value, max = 100, color = 'bg-cyan-400' }) {
  if (value === null || value === undefined) return <span className="text-slate-500 text-[10px] italic">N/D</span>;
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-white text-[10px] font-mono w-10 text-right">{typeof value === 'number' ? value.toFixed(1) : value}</span>
    </div>
  );
}

function getRatingColor(rating) {
  if (!rating) return 'text-slate-500';
  if (/^(AAA|Aaa)/.test(rating)) return 'text-green-400';
  if (/^(AA|Aa)/.test(rating)) return 'text-lime-400';
  if (/^(A[^a])/.test(rating)) return 'text-yellow-400';
  if (/^(BBB|Baa)/.test(rating)) return 'text-amber-400';
  if (/^(BB|Ba)/.test(rating)) return 'text-orange-400';
  if (/^(B[^a])/.test(rating)) return 'text-red-400';
  return 'text-red-500';
}

function getReliabilityColor(level) {
  if (level === 'Eccellente') return 'bg-green-500/15 text-green-400 border-green-500/30';
  if (level === 'Buono') return 'bg-lime-500/15 text-lime-400 border-lime-500/30';
  if (level === 'Medio') return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
  if (level === 'Basso') return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
  return 'bg-red-500/15 text-red-400 border-red-500/30';
}

function getCPIColor(score) {
  if (score === null) return 'bg-slate-500';
  if (score >= 70) return 'bg-green-400';
  if (score >= 50) return 'bg-yellow-400';
  if (score >= 30) return 'bg-orange-400';
  return 'bg-red-400';
}

function getWGIBarColor(pctile) {
  if (pctile >= 75) return 'bg-green-400';
  if (pctile >= 50) return 'bg-lime-400';
  if (pctile >= 25) return 'bg-yellow-400';
  return 'bg-red-400';
}

function WGIRow({ label, estimate, percentile, year }) {
  if (percentile === null && estimate === null) return null;
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-slate-400 text-[10px] w-28 truncate">{label}</span>
      <ScoreBar value={percentile} max={100} color={getWGIBarColor(percentile)} />
      {year && <span className="text-slate-600 text-[9px]">{year}</span>}
    </div>
  );
}

export default function CountryRiskProfileCard({ data, loading }) {
  const [showGovernance, setShowGovernance] = useState(false);
  const [showMacro, setShowMacro] = useState(false);
  const [showDemographics, setShowDemographics] = useState(false);
  const [showInfoPopup, setShowInfoPopup] = useState(false);

  if (loading) {
    return (
      <div className="bg-slate-800/40 border border-white/5 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span className="text-slate-400 text-xs">Caricamento profilo rischio paese...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const fri = data.financial_reliability_index;
  const sr = data.sovereign_rating;
  const gov = data.governance;
  const cor = data.corruption;
  const frag = data.fragility;
  const macro = data.macro;
  const demo = data.demographics;
  const eu = data.eurostat;

  return (
    <div className="bg-slate-800/50 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
      {/* Header: Financial Reliability Index */}
      {fri?.score !== null && (
        <div className="px-4 py-3 border-b border-white/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 text-[10px] font-semibold uppercase tracking-wider">Indice Affidabilità Paese</span>
              <button onClick={() => setShowInfoPopup(true)}
                className="w-3.5 h-3.5 rounded-full border border-slate-600 flex items-center justify-center hover:border-cyan-400">
                <span className="text-slate-400 text-[8px] font-bold">?</span>
              </button>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getReliabilityColor(fri.level)}`}>
              {fri.score}/100 — {fri.level}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                fri.score >= 75 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                fri.score >= 60 ? 'bg-gradient-to-r from-lime-500 to-lime-400' :
                fri.score >= 45 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                fri.score >= 30 ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
                'bg-gradient-to-r from-red-500 to-red-400'
              }`}
              style={{ width: `${fri.score}%` }}
            />
          </div>
          {/* Components */}
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[
              { label: 'Rating', value: fri.components.rating_normalized },
              { label: 'Governance', value: fri.components.wgi_average },
              { label: 'CPI', value: fri.components.cpi_score },
              { label: 'Stabilità', value: fri.components.fsi_normalized },
            ].map(c => (
              <div key={c.label} className="text-center">
                <p className="text-slate-600 text-[9px]">{c.label}</p>
                <p className={`text-[11px] font-bold ${c.value !== null ? 'text-white' : 'text-slate-600'}`}>
                  {c.value !== null ? c.value : 'N/D'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rating Sovrano */}
      {sr && (sr.sp?.rating || sr.moodys?.rating) && (
        <div className="px-4 py-2.5 border-b border-white/5">
          <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-1.5">🏦 Rating Sovrano</p>
          <div className="grid grid-cols-2 gap-3">
            {sr.sp?.rating && (
              <div>
                <p className="text-slate-600 text-[9px]">S&P</p>
                <p className={`text-sm font-bold ${getRatingColor(sr.sp.rating)}`}>{sr.sp.rating}</p>
                <p className="text-slate-500 text-[9px]">{sr.sp.outlook || ''} {sr.sp.last_update ? `· ${sr.sp.last_update}` : ''}</p>
              </div>
            )}
            {sr.moodys?.rating && (
              <div>
                <p className="text-slate-600 text-[9px]">Moody's</p>
                <p className={`text-sm font-bold ${getRatingColor(sr.moodys.rating)}`}>{sr.moodys.rating}</p>
                <p className="text-slate-500 text-[9px]">{sr.moodys.outlook || ''} {sr.moodys.last_update ? `· ${sr.moodys.last_update}` : ''}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CPI + FSI compatti */}
      {(cor || frag) && (
        <div className="px-4 py-2.5 border-b border-white/5 grid grid-cols-2 gap-3">
          {cor?.cpi_score !== null && (
            <div>
              <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-1">🔍 Corruzione (CPI)</p>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  cor.cpi_score >= 70 ? 'bg-green-500/20' : cor.cpi_score >= 50 ? 'bg-yellow-500/20' : cor.cpi_score >= 30 ? 'bg-orange-500/20' : 'bg-red-500/20'
                }`}>
                  <span className={`text-sm font-bold ${
                    cor.cpi_score >= 70 ? 'text-green-400' : cor.cpi_score >= 50 ? 'text-yellow-400' : cor.cpi_score >= 30 ? 'text-orange-400' : 'text-red-400'
                  }`}>{cor.cpi_score}</span>
                </div>
                <div>
                  <p className="text-white text-[10px] font-semibold">#{cor.rank}{cor.total_countries ? `/${cor.total_countries}` : ''}</p>
                  <p className="text-slate-600 text-[9px]">{cor.year} · TI</p>
                </div>
              </div>
            </div>
          )}
          {frag?.fsi_score !== null && (
            <div>
              <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-1">⚠️ Fragilità (FSI)</p>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  frag.fsi_score <= 40 ? 'bg-green-500/20' : frag.fsi_score <= 70 ? 'bg-yellow-500/20' : frag.fsi_score <= 90 ? 'bg-orange-500/20' : 'bg-red-500/20'
                }`}>
                  <span className={`text-sm font-bold ${
                    frag.fsi_score <= 40 ? 'text-green-400' : frag.fsi_score <= 70 ? 'text-yellow-400' : frag.fsi_score <= 90 ? 'text-orange-400' : 'text-red-400'
                  }`}>{frag.fsi_score}</span>
                </div>
                <div>
                  <p className="text-white text-[10px] font-semibold">{frag.category || `#${frag.rank || 'N/D'}`}</p>
                  <p className="text-slate-600 text-[9px]">{frag.year} · FSI</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Governance WGI — collapsible */}
      {gov && gov.wgi_average_percentile !== null && (
        <div className="border-b border-white/5">
          <button onClick={() => setShowGovernance(!showGovernance)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02]">
            <div className="flex items-center gap-1.5">
              {gov.wgi_average_percentile >= 60 ? 
                <ShieldCheck className="w-3.5 h-3.5 text-green-400" /> : 
                <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />}
              <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Governance (WGI)</span>
              <span className="text-white text-[10px] font-bold ml-1">{gov.wgi_average_percentile}/100</span>
            </div>
            {showGovernance ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
          </button>
          {showGovernance && (
            <div className="px-4 pb-3 space-y-0.5">
              <WGIRow label="Gov. Effectiveness" estimate={gov.government_effectiveness?.estimate} percentile={gov.government_effectiveness?.percentile} year={gov.government_effectiveness?.year} />
              <WGIRow label="Rule of Law" estimate={gov.rule_of_law?.estimate} percentile={gov.rule_of_law?.percentile} year={gov.rule_of_law?.year} />
              <WGIRow label="Anti-Corruzione" estimate={gov.control_of_corruption?.estimate} percentile={gov.control_of_corruption?.percentile} year={gov.control_of_corruption?.year} />
              <WGIRow label="Stabilità Politica" estimate={gov.political_stability?.estimate} percentile={gov.political_stability?.percentile} year={gov.political_stability?.year} />
              <WGIRow label="Voice & Account." estimate={gov.voice_accountability?.estimate} percentile={gov.voice_accountability?.percentile} year={gov.voice_accountability?.year} />
              <WGIRow label="Regulatory Quality" estimate={gov.regulatory_quality?.estimate} percentile={gov.regulatory_quality?.percentile} year={gov.regulatory_quality?.year} />
              <p className="text-slate-600 text-[9px] pt-1">Percentile 0-100 · Fonte: {gov.fonte}</p>
            </div>
          )}
        </div>
      )}

      {/* Macro — collapsible */}
      {macro && (
        <div className="border-b border-white/5">
          <button onClick={() => setShowMacro(!showMacro)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02]">
            <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">📊 Macro-Economici</span>
            {showMacro ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
          </button>
          {showMacro && (
            <div className="px-4 pb-3 space-y-1">
              {macro.crescita_pil_pct !== null && (
                <div className="flex justify-between"><span className="text-slate-400 text-[10px]">Crescita PIL</span>
                  <span className={`text-[10px] font-bold ${macro.crescita_pil_pct >= 2 ? 'text-green-400' : macro.crescita_pil_pct >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>{macro.crescita_pil_pct > 0 ? '+' : ''}{macro.crescita_pil_pct}% <span className="text-slate-600 font-normal">({macro.crescita_pil_anno})</span></span>
                </div>
              )}
              {macro.inflazione_pct !== null && (
                <div className="flex justify-between"><span className="text-slate-400 text-[10px]">Inflazione</span>
                  <span className={`text-[10px] font-bold ${macro.inflazione_pct < 3 ? 'text-green-400' : macro.inflazione_pct < 6 ? 'text-yellow-400' : 'text-red-400'}`}>{macro.inflazione_pct}% <span className="text-slate-600 font-normal">({macro.inflazione_anno})</span></span>
                </div>
              )}
              {macro.disoccupazione_pct !== null && (
                <div className="flex justify-between"><span className="text-slate-400 text-[10px]">Disoccupazione</span>
                  <span className={`text-[10px] font-bold ${macro.disoccupazione_pct < 5 ? 'text-green-400' : macro.disoccupazione_pct < 10 ? 'text-yellow-400' : 'text-red-400'}`}>{macro.disoccupazione_pct}% <span className="text-slate-600 font-normal">({macro.disoccupazione_anno})</span></span>
                </div>
              )}
              {macro.debito_pil_pct !== null && (
                <div className="flex justify-between"><span className="text-slate-400 text-[10px]">Debito/PIL</span>
                  <span className={`text-[10px] font-bold ${macro.debito_pil_pct < 60 ? 'text-green-400' : macro.debito_pil_pct < 100 ? 'text-yellow-400' : 'text-red-400'}`}>{macro.debito_pil_pct}% <span className="text-slate-600 font-normal">({macro.debito_pil_anno})</span></span>
                </div>
              )}
              {macro.partite_correnti_pil_pct !== null && (
                <div className="flex justify-between"><span className="text-slate-400 text-[10px]">Saldo C/C su PIL</span>
                  <span className={`text-[10px] font-bold ${macro.partite_correnti_pil_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>{macro.partite_correnti_pil_pct > 0 ? '+' : ''}{macro.partite_correnti_pil_pct}% <span className="text-slate-600 font-normal">({macro.partite_correnti_pil_anno})</span></span>
                </div>
              )}
              {/* Eurostat UE */}
              {eu && eu.pil_meur && (
                <div className="flex justify-between pt-1 border-t border-white/5">
                  <span className="text-blue-400 text-[10px]">🇪🇺 PIL (Eurostat)</span>
                  <span className="text-white text-[10px] font-bold">€{(eu.pil_meur / 1000).toFixed(0)}B <span className="text-slate-600 font-normal">({eu.pil_meur_anno})</span></span>
                </div>
              )}
              {eu && eu.disoccupazione_pct !== null && (
                <div className="flex justify-between">
                  <span className="text-blue-400 text-[10px]">🇪🇺 Disoccup. (Eurostat)</span>
                  <span className="text-white text-[10px] font-bold">{eu.disoccupazione_pct}% <span className="text-slate-600 font-normal">({eu.disoccupazione_anno})</span></span>
                </div>
              )}
              <p className="text-slate-600 text-[9px] pt-1">Fonte: {macro.fonte}{eu ? ' + Eurostat' : ''}</p>
            </div>
          )}
        </div>
      )}

      {/* Demographics — collapsible */}
      {demo && (
        <div className="border-b border-white/5">
          <button onClick={() => setShowDemographics(!showDemographics)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.02]">
            <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">👥 Demografici</span>
            {showDemographics ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
          </button>
          {showDemographics && (
            <div className="px-4 pb-3 space-y-1">
              {demo.speranza_vita !== null && (
                <div className="flex justify-between"><span className="text-slate-400 text-[10px]">Speranza di vita</span>
                  <span className="text-white text-[10px] font-bold">{demo.speranza_vita} anni <span className="text-slate-600 font-normal">({demo.speranza_vita_anno})</span></span>
                </div>
              )}
              {demo.tasso_natalita !== null && (
                <div className="flex justify-between"><span className="text-slate-400 text-[10px]">Tasso natalità</span>
                  <span className="text-white text-[10px] font-bold">{demo.tasso_natalita}‰ <span className="text-slate-600 font-normal">({demo.tasso_natalita_anno})</span></span>
                </div>
              )}
              {demo.tasso_mortalita !== null && (
                <div className="flex justify-between"><span className="text-slate-400 text-[10px]">Tasso mortalità</span>
                  <span className="text-white text-[10px] font-bold">{demo.tasso_mortalita}‰ <span className="text-slate-600 font-normal">({demo.tasso_mortalita_anno})</span></span>
                </div>
              )}
              {demo.popolazione_urbana_pct !== null && (
                <div className="flex justify-between"><span className="text-slate-400 text-[10px]">Popolazione urbana</span>
                  <span className="text-white text-[10px] font-bold">{demo.popolazione_urbana_pct}% <span className="text-slate-600 font-normal">({demo.popolazione_urbana_anno})</span></span>
                </div>
              )}
              {demo.eta_lavorativa_pct !== null && (
                <div className="flex justify-between"><span className="text-slate-400 text-[10px]">Pop. in età lavorativa</span>
                  <span className="text-white text-[10px] font-bold">{demo.eta_lavorativa_pct}% <span className="text-slate-600 font-normal">({demo.eta_lavorativa_anno})</span></span>
                </div>
              )}
              <p className="text-slate-600 text-[9px] pt-1">Fonte: {demo.fonte}</p>
            </div>
          )}
        </div>
      )}

      {/* Footer: timestamp + fonti */}
      <div className="px-4 py-2">
        <p className="text-slate-600 text-[9px]">
          Ultimo aggiornamento: {new Date(data.timestamp).toLocaleString('it-IT')} · 
          Fonti: World Bank WGI, S&P, Moody's, Transparency Int., Fund for Peace{data.is_eu ? ', Eurostat' : ''}
        </p>
      </div>

      {/* Info Popup */}
      {showInfoPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowInfoPopup(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">Indice Affidabilità Paese</h3>
              <button onClick={() => setShowInfoPopup(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 text-slate-300 text-xs leading-relaxed">
              <p>L'indice è calcolato come <strong className="text-white">media aritmetica</strong> di 4 componenti normalizzate 0-100:</p>
              <div className="bg-slate-800 rounded-lg p-3 space-y-1.5">
                <div><strong className="text-cyan-400">Rating</strong> — Rating sovrano S&P/Moody's normalizzato (AAA=100, D=0)</div>
                <div><strong className="text-cyan-400">Governance</strong> — Media 6 indicatori WGI World Bank (percentile 0-100)</div>
                <div><strong className="text-cyan-400">CPI</strong> — Corruption Perceptions Index (Transparency International, 0-100)</div>
                <div><strong className="text-cyan-400">Stabilità</strong> — Inverso Fragile States Index (Fund for Peace, 0-120 invertito)</div>
              </div>
              <div className="bg-slate-800 rounded-lg p-3 mt-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-2">Come leggere</p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between"><span className="text-green-400">≥ 75</span><span className="text-slate-400">Eccellente</span></div>
                  <div className="flex justify-between"><span className="text-lime-400">60 – 74</span><span className="text-slate-400">Buono</span></div>
                  <div className="flex justify-between"><span className="text-yellow-400">45 – 59</span><span className="text-slate-400">Medio</span></div>
                  <div className="flex justify-between"><span className="text-orange-400">30 – 44</span><span className="text-slate-400">Basso</span></div>
                  <div className="flex justify-between"><span className="text-red-400">&lt; 30</span><span className="text-slate-400">Critico</span></div>
                </div>
              </div>
              <p className="text-slate-500 text-[10px] mt-2">Se un componente non è disponibile viene escluso dalla media. Servono almeno 2 componenti.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}