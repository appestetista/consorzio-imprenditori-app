import React, { useState, useEffect } from 'react';
import { Scale, Trophy, Star, Globe, Landmark, BookOpen, Newspaper } from 'lucide-react';

const ROW_LABELS = {
  costo: { label: 'Costo stimato', icon: '💰' },
  roi: { label: 'ROI atteso', icon: '📈' },
  tempo: { label: 'Tempo', icon: '⏱️' },
  rischio: { label: 'Rischio', icon: '⚠️' },
  vantaggio: { label: 'Vantaggio', icon: '✅' },
  punteggio: { label: 'Punteggio', icon: '⭐' },
};

export default function CompareResult({ data }) {
  if (!data || !data.scenari || data.scenari.length < 2) return null;

  const scenarioA = data.scenari[0];
  const scenarioB = data.scenari[1];
  const consigliato = data.scenario_consigliato;
  const isAConsigliato = consigliato?.toUpperCase().includes('A');
  const isBConsigliato = consigliato?.toUpperCase().includes('B');

  const rows = ['costo', 'roi', 'tempo', 'rischio', 'vantaggio', 'punteggio'];

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Scale className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-[92%] space-y-3">
        {/* Header */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30">
          <Scale className="w-3 h-3 text-[#d4af37]" />
          <span className="text-[11px] font-semibold text-[#d4af37] uppercase tracking-wider">
            Confronto — {data.tema || 'Scenari'}
          </span>
        </div>

        {/* Tabella comparativa */}
        <div className="rounded-xl border border-slate-700/50 overflow-hidden">
          {/* Intestazione scenari */}
          <div className="grid grid-cols-[100px_1fr_1fr] bg-slate-800/80">
            <div className="p-2" />
            <div className={`p-2.5 text-center border-l border-slate-700/50 ${isAConsigliato ? 'border-t-2 border-t-[#d4af37] bg-[#d4af37]/5' : ''}`}>
              <p className="text-xs font-bold text-white">{scenarioA.nome || 'Scenario A'}</p>
              {isAConsigliato && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40">
                  <Trophy className="w-3 h-3 text-[#d4af37]" />
                  <span className="text-[9px] font-bold text-[#d4af37]">CONSIGLIATO</span>
                </span>
              )}
            </div>
            <div className={`p-2.5 text-center border-l border-slate-700/50 ${isBConsigliato ? 'border-t-2 border-t-[#d4af37] bg-[#d4af37]/5' : ''}`}>
              <p className="text-xs font-bold text-white">{scenarioB.nome || 'Scenario B'}</p>
              {isBConsigliato && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40">
                  <Trophy className="w-3 h-3 text-[#d4af37]" />
                  <span className="text-[9px] font-bold text-[#d4af37]">CONSIGLIATO</span>
                </span>
              )}
            </div>
          </div>

          {/* Righe */}
          {rows.map((key, idx) => {
            const { label, icon } = ROW_LABELS[key];
            const valA = key === 'punteggio' ? scenarioA[key]?.toString() : scenarioA[key];
            const valB = key === 'punteggio' ? scenarioB[key]?.toString() : scenarioB[key];
            const isScoreRow = key === 'punteggio';

            return (
              <div key={key} className={`grid grid-cols-[100px_1fr_1fr] ${idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-800/40'}`}>
                <div className="p-2 flex items-center gap-1.5">
                  <span className="text-xs">{icon}</span>
                  <span className="text-[10px] text-slate-400 font-medium">{label}</span>
                </div>
                <div className={`p-2 border-l border-slate-700/30 ${isAConsigliato ? 'bg-[#d4af37]/[0.02]' : ''}`}>
                  {isScoreRow ? (
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-3.5 h-3.5 text-[#d4af37]" fill="#d4af37" />
                      <span className="text-sm font-bold text-white">{valA || '-'}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-200 text-center">{valA || '-'}</p>
                  )}
                </div>
                <div className={`p-2 border-l border-slate-700/30 ${isBConsigliato ? 'bg-[#d4af37]/[0.02]' : ''}`}>
                  {isScoreRow ? (
                    <div className="flex items-center justify-center gap-1">
                      <Star className="w-3.5 h-3.5 text-[#d4af37]" fill="#d4af37" />
                      <span className="text-sm font-bold text-white">{valB || '-'}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-200 text-center">{valB || '-'}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Verdetto */}
        {data.verdetto && (
          <div className="rounded-xl border border-[#d4af37]/30 bg-[#d4af37]/5 px-4 py-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Trophy className="w-4 h-4 text-[#d4af37]" />
              <span className="text-xs font-bold text-[#d4af37] uppercase tracking-wider">Verdetto</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">{data.verdetto}</p>
          </div>
        )}

        {/* Barra affidabilità */}
        {data.affidabilita && <AffidabilitaBar affidabilita={data.affidabilita} />}

        {/* Fonti */}
        {data.fonti?.length > 0 && <FontiSection fonti={data.fonti} />}
      </div>
    </div>
  );
}

function AffidabilitaBar({ affidabilita }) {
  const punteggio = affidabilita.punteggio ?? 0;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(punteggio * 10), 50);
    return () => clearTimeout(t);
  }, [punteggio]);

  let barColor, label;
  if (punteggio >= 8) { barColor = '#22c55e'; label = 'Alta affidabilità — Dati verificati'; }
  else if (punteggio >= 5) { barColor = '#f59e0b'; label = 'Media affidabilità — Alcuni dati stimati'; }
  else { barColor = '#ef4444'; label = 'Bassa affidabilità — Verifica necessaria'; }

  return (
    <div className="rounded-xl bg-slate-800/50 border border-slate-700/40 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-300">{label}</span>
        <span className="text-xs font-bold" style={{ color: barColor }}>{punteggio}/10</span>
      </div>
      <div className="w-full h-2 bg-slate-700/60 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${width}%`, backgroundColor: barColor }} />
      </div>
      <div className="flex items-center gap-4 mt-2">
        {affidabilita.verificati != null && (
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> {affidabilita.verificati} verificati
          </span>
        )}
        {affidabilita.stimati != null && (
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> {affidabilita.stimati} stimati
          </span>
        )}
        {affidabilita.da_confermare != null && (
          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> {affidabilita.da_confermare} da confermare
          </span>
        )}
      </div>
    </div>
  );
}

function FontiSection({ fonti }) {
  const tipoIcon = (tipo) => {
    if (tipo === 'istituzionale') return <Landmark className="w-3.5 h-3.5 text-slate-400" />;
    if (tipo === 'specializzata') return <BookOpen className="w-3.5 h-3.5 text-slate-400" />;
    if (tipo === 'media') return <Newspaper className="w-3.5 h-3.5 text-slate-400" />;
    return <Globe className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <div className="rounded-xl bg-slate-800/40 border border-slate-700/40 px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Fonti consultate</span>
      </div>
      <div className="space-y-1.5">
        {fonti.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            {tipoIcon(f.tipo)}
            <span className="text-xs text-slate-300">{f.nome}</span>
            {f.url && (
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#d4af37] hover:underline truncate max-w-[180px]">
                {f.url}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}