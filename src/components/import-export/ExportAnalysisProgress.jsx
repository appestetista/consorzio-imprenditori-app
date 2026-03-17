import React, { useState, useEffect } from 'react';

const STEPS = [
  { key: 'fetching', label: 'Recupero dati ufficiali', icon: '🌐' },
  { key: 'computing', label: 'Calcolo metriche di mercato', icon: '📊' },
  { key: 'interpreting', label: 'Elaborazione analisi strategica', icon: '🧠' },
];

const PHRASES = [
  'Recupero dati ufficiali di mercato...',
  'Analisi flussi commerciali bilaterali...',
  'Calcolo metriche di crescita...',
  'Verifica tariffe doganali...',
  'Elaborazione intelligenza competitiva...',
  'Stima costi logistici...',
  'Analisi benchmark prezzi B2B...',
  'Confronto con competitor internazionali...',
  'Generazione strategia di ingresso...',
];

export default function ExportAnalysisProgress({ exportStep, countryName }) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  // Cicla le frasi
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex(prev => (prev + 1) % PHRASES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Progress bar che cresce in base allo step
  useEffect(() => {
    const stepValues = { fetching: 35, computing: 65, interpreting: 90 };
    const target = stepValues[exportStep] || 10;
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= target) return target;
        return prev + 1;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [exportStep]);

  const currentStepIdx = STEPS.findIndex(s => s.key === exportStep);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--app-gradient-card)', border: '1px solid var(--app-border)' }}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* Pulsing ring */}
            <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-1 rounded-full border-2 border-amber-400/50 animate-pulse" />
            <span className="text-2xl relative z-10">📡</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: 'var(--app-text-primary)' }}>Analisi in corso</p>
            {countryName && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--app-accent)' }}>Mercato: {countryName}</p>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-medium" style={{ color: 'var(--app-text-secondary)' }}>Progresso</span>
            <span className="text-xs font-bold" style={{ color: 'var(--app-accent)' }}>{progress}%</span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--app-bg-input)' }}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #d4af37 0%, #f0e68c 50%, #d4af37 100%)',
                boxShadow: '0 0 12px rgba(212,175,55,0.5)',
              }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2.5 mb-5">
          {STEPS.map((step, i) => {
            const isActive = step.key === exportStep;
            const isDone = currentStepIdx > i;
            return (
              <div
                key={step.key}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                style={{
                  background: isActive ? 'rgba(212,175,55,0.12)' : isDone ? 'rgba(34,197,94,0.08)' : 'transparent',
                  border: isActive ? '1px solid rgba(212,175,55,0.3)' : '1px solid transparent',
                }}
              >
                {isDone ? (
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-400 text-xs">✓</span>
                  </div>
                ) : isActive ? (
                  <div className="w-6 h-6 relative flex items-center justify-center flex-shrink-0">
                    <div className="absolute inset-0 rounded-full border-2 border-amber-400/40 animate-spin" style={{ borderTopColor: 'transparent', animationDuration: '1s' }} />
                    <span className="text-xs">{step.icon}</span>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ border: '1.5px solid var(--app-text-muted)' }}>
                    <span className="text-[10px]" style={{ color: 'var(--app-text-muted)' }}>{i + 1}</span>
                  </div>
                )}
                <span className={`text-xs font-medium ${isActive ? 'text-amber-300' : isDone ? 'text-green-400' : ''}`}
                  style={!isActive && !isDone ? { color: 'var(--app-text-muted)' } : {}}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Frase animata */}
        <div className="text-center py-3 rounded-xl" style={{ background: 'var(--app-bg-input)' }}>
          <p
            key={phraseIndex}
            className="text-xs font-medium animate-pulse"
            style={{ color: 'var(--app-text-secondary)' }}
          >
            {PHRASES[phraseIndex]}
          </p>
        </div>
      </div>
    </div>
  );
}