import React, { useState } from 'react';
import { FileText, Send } from 'lucide-react';
import WelfareOrdinaTab from './WelfareOrdinaTab';

// Normative specifiche per tipo di buono
function NormativaBuoniPasto() {
  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-white font-semibold text-sm mb-2">📋 Cosa sono i Buoni Pasto?</h3>
        <p className="text-slate-300 text-xs leading-relaxed">
          I <span className="text-pink-400 font-medium">buoni pasto</span> sono titoli di pagamento utilizzabili per acquistare pasti o generi alimentari presso esercizi convenzionati.
        </p>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-white font-semibold text-sm mb-2">💶 Limiti di esenzione giornalieri</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 rounded-lg p-3 text-center">
            <p className="text-slate-400 text-[10px] mb-1">Cartacei</p>
            <p className="text-white text-xl font-bold">€4,00</p>
            <p className="text-slate-500 text-[10px]">al giorno</p>
          </div>
          <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-lg p-3 text-center border border-pink-500/30">
            <p className="text-pink-300 text-[10px] mb-1">Elettronici</p>
            <p className="text-pink-400 text-xl font-bold">€10,00</p>
            <p className="text-pink-300/70 text-[10px]">al giorno (2026)</p>
          </div>
        </div>
      </div>
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
        <p className="text-slate-300 text-xs">✅ Entro questi limiti i buoni pasto sono <strong className="text-green-400">totalmente esenti</strong> da tassazione e contributi.</p>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-white font-semibold text-sm mb-2">✅ Vantaggi per l'azienda</h3>
        <ul className="space-y-1.5 text-xs text-slate-300">
          <li>• Totalmente esenti da oneri fiscali e previdenziali</li>
          <li>• Deducibili al 100% (IRAP e IRES), no IRPEF</li>
          <li>• IVA al 4% interamente detraibile</li>
          <li>• Zero costi di gestione del servizio</li>
          <li>• Ottimizzazione attività contabili</li>
        </ul>
      </div>
    </div>
  );
}

function NormativaBuoniSpesa() {
  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-white font-semibold text-sm mb-2">📋 Cosa sono i Fringe Benefit / Buoni Spesa?</h3>
        <p className="text-slate-300 text-xs leading-relaxed">
          I <span className="text-pink-400 font-medium">buoni spesa</span> rientrano nei <strong className="text-white">fringe benefit</strong> — beni e servizi che <span className="text-green-400 font-medium">non concorrono al reddito imponibile</span> entro specifici limiti annuali (Art. 51, comma 3 TUIR).
        </p>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-white font-semibold text-sm mb-2">💶 Soglie di esenzione annuali</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 rounded-lg p-3 text-center">
            <p className="text-slate-400 text-[10px] mb-1">Senza figli</p>
            <p className="text-white text-xl font-bold">€1.000</p>
            <p className="text-slate-500 text-[10px]">annui/dipendente</p>
          </div>
          <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-lg p-3 text-center border border-pink-500/30">
            <p className="text-pink-300 text-[10px] mb-1">Con figli</p>
            <p className="text-pink-400 text-xl font-bold">€2.000</p>
            <p className="text-pink-300/70 text-[10px]">annui/dipendente</p>
          </div>
        </div>
      </div>
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
        <p className="text-green-400 text-xs font-medium mb-1">✅ Vantaggi per l'azienda:</p>
        <ul className="text-slate-300 text-xs space-y-0.5">
          <li>• Costo 100% deducibile</li>
          <li>• Nessun contributo INPS</li>
          <li>• Nessuna ritenuta fiscale</li>
        </ul>
      </div>
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
        <p className="text-slate-300 text-xs">⚠️ <strong className="text-red-400">Attenzione:</strong> Se superi anche di 1€ la soglia, perdi TUTTA l'esenzione sull'intero importo.</p>
      </div>
    </div>
  );
}

function NormativaBuoniOmaggio() {
  return (
    <div className="space-y-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-white font-semibold text-sm mb-2">📋 Cosa sono i Buoni Omaggio?</h3>
        <p className="text-slate-300 text-xs leading-relaxed">
          I <span className="text-pink-400 font-medium">buoni omaggio</span> sono omaggi destinati a <strong className="text-white">clienti, fornitori o partner</strong>, non ai dipendenti.
        </p>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-white font-semibold text-sm mb-2">💶 Limiti di deducibilità</h3>
        <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-lg p-3 text-center border border-pink-500/30 mb-3">
          <p className="text-pink-300 text-[10px] mb-1">Limite per singolo omaggio</p>
          <p className="text-pink-400 text-xl font-bold">€50,00</p>
          <p className="text-pink-300/70 text-[10px]">IVA detraibile + costo deducibile</p>
        </div>
        <div className="space-y-2">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
            <p className="text-green-400 text-xs font-semibold">✅ Omaggio ≤ €50</p>
            <span className="text-slate-300 text-[10px]">IVA detraibile, costo deducibile al 100%</span>
          </div>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2">
            <p className="text-amber-400 text-xs font-semibold">⚠️ Omaggio > €50</p>
            <span className="text-slate-300 text-[10px]">IVA indetraibile, deducibilità limitata</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const NORMATIVE = {
  buoni_pasto: NormativaBuoniPasto,
  buoni_spesa: NormativaBuoniSpesa,
  buoni_omaggio: NormativaBuoniOmaggio,
};

export default function WelfareBuonoSection({ tipo, user }) {
  const [subTab, setSubTab] = useState('ordina');
  const NormativaComponent = NORMATIVE[tipo];

  return (
    <div>
      {/* Sub-tabs: Normativa | Ordina */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSubTab('normativa')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            subTab === 'normativa'
              ? 'bg-slate-700 text-white border border-slate-500'
              : 'bg-slate-800/50 text-slate-500 border border-slate-700/50'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Normativa
        </button>
        <button
          onClick={() => setSubTab('ordina')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            subTab === 'ordina'
              ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
              : 'bg-slate-800/50 text-slate-500 border border-slate-700/50'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          Ordina
        </button>
      </div>

      {subTab === 'normativa' && <NormativaComponent />}
      {subTab === 'ordina' && <WelfareOrdinaTab user={user} tipo={tipo} />}
    </div>
  );
}