import React from 'react';
import { motion } from 'framer-motion';
import { TrendingDown, PiggyBank, Receipt, Percent, ArrowRight } from 'lucide-react';

const floatingIcons = [
  { Icon: Receipt, color: '#ef4444', x: '10%', y: '15%', delay: 0, label: 'IRES' },
  { Icon: Percent, color: '#f59e0b', x: '75%', y: '10%', delay: 0.3, label: 'INPS' },
  { Icon: TrendingDown, color: '#8b5cf6', x: '85%', y: '55%', delay: 0.6, label: 'IRAP' },
  { Icon: PiggyBank, color: '#22c55e', x: '5%', y: '60%', delay: 0.9, label: 'Netto' },
];

export default function SimulatoreHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-5" style={{
      background: 'linear-gradient(135deg, #0c1a2e 0%, #1a2d4a 40%, #0d2240 70%, #071428 100%)',
      border: '1px solid rgba(212,175,55,0.15)',
    }}>
      {/* Cerchi decorativi di sfondo */}
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #d4af37, transparent 70%)' }} />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full opacity-8"
        style={{ background: 'radial-gradient(circle, #22c55e, transparent 70%)' }} />

      {/* Icone flottanti animate */}
      {floatingIcons.map(({ Icon, color, x, y, delay, label }, i) => (
        <motion.div
          key={i}
          className="absolute flex flex-col items-center"
          style={{ left: x, top: y }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{ delay: 0.3 + delay, duration: 0.5, type: 'spring' }}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ repeat: Infinity, duration: 2.5 + i * 0.3, ease: 'easeInOut' }}
            className="w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-sm"
            style={{ backgroundColor: color + '18', border: `1px solid ${color}30` }}
          >
            <Icon className="w-4 h-4" style={{ color }} />
          </motion.div>
          <span className="text-[9px] font-bold mt-0.5 tracking-wider" style={{ color: color + 'aa' }}>{label}</span>
        </motion.div>
      ))}

      {/* Contenuto principale */}
      <div className="relative z-10 px-5 py-6 text-center">
        {/* Grafico a barre animato decorativo */}
        <div className="flex items-end justify-center gap-1.5 mb-4 h-14">
          {[65, 40, 85, 55, 30, 70, 45].map((h, i) => (
            <motion.div
              key={i}
              className="w-3 rounded-t-sm"
              style={{
                backgroundColor: i === 2 ? '#d4af37' : i === 6 ? '#22c55e' : 'rgba(148,163,184,0.25)',
                border: i === 2 ? '1px solid rgba(212,175,55,0.4)' : 'none',
              }}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: 0.1 * i, duration: 0.6, ease: 'easeOut' }}
            />
          ))}
        </div>

        <motion.h2
          className="text-white text-lg font-bold mb-1.5 tracking-tight"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Quanto ti resta davvero in tasca?
        </motion.h2>
        <motion.p
          className="text-slate-400 text-xs leading-relaxed max-w-[280px] mx-auto mb-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          Inserisci il tuo fatturato e scopri in tempo reale imposte, contributi e il netto che ti rimane. Confronta regimi e scenari.
        </motion.p>

        {/* Indicatore visivo "flow" */}
        <motion.div
          className="flex items-center justify-center gap-2 text-[11px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <span className="px-2.5 py-1 rounded-full font-semibold" style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.25)' }}>
            Fatturato
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="px-2.5 py-1 rounded-full font-semibold" style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            Imposte
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="px-2.5 py-1 rounded-full font-semibold" style={{ backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
            In tasca
          </span>
        </motion.div>
      </div>
    </div>
  );
}