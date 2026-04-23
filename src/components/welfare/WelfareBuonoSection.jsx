import React, { useState } from 'react';
import { FileText, Send, Store } from 'lucide-react';
import WelfareOrdinaTab from './WelfareOrdinaTab';
import WelfareCatalogoTab from './WelfareCatalogoTab';

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
        <h3 className="text-white font-semibold text-sm mb-2">📋 Cosa sono i Buoni Spesa?</h3>
        <p className="text-slate-300 text-xs leading-relaxed">
          I <span className="text-pink-400 font-medium">buoni spesa</span> rientrano nella categoria dei <strong className="text-white">fringe benefit</strong> — compensi in natura erogati dal datore di lavoro ai dipendenti che <span className="text-green-400 font-medium">non concorrono alla formazione del reddito</span> entro specifiche soglie annuali.
        </p>
        <div className="mt-2 bg-slate-900 rounded-lg p-2">
          <p className="text-slate-400 text-[10px]">📜 <span className="text-slate-300">Riferimento:</span> Art. 51, comma 3, TUIR (D.P.R. 917/1986) — Soglie stabilizzate dalla L. 207/2024 (Legge di Bilancio 2025) per il triennio 2025-2027.</p>
        </div>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-white font-semibold text-sm mb-2">💶 Soglie di esenzione annuali (Fringe Benefit)</h3>
        <p className="text-slate-400 text-[10px] mb-2">La soglia ordinaria è €258,23 — deroga triennale 2025-2027:</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900 rounded-lg p-3 text-center">
            <p className="text-slate-400 text-[10px] mb-1">Senza figli a carico</p>
            <p className="text-white text-xl font-bold">€1.000</p>
            <p className="text-slate-500 text-[10px]">annui / dipendente</p>
          </div>
          <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-lg p-3 text-center border border-pink-500/30">
            <p className="text-pink-300 text-[10px] mb-1">Con figli a carico</p>
            <p className="text-pink-400 text-xl font-bold">€2.000</p>
            <p className="text-pink-300/70 text-[10px]">annui / dipendente</p>
          </div>
        </div>
        <p className="text-slate-500 text-[9px] mt-2 leading-relaxed">Figli a carico: reddito ≤ €4.000 (under 24) o ≤ €2.840,51 (over 24). Il dipendente deve presentare dichiarazione con CF dei figli.</p>
      </div>
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
        <p className="text-green-400 text-xs font-medium mb-1">✅ Vantaggi per l'azienda (entro la soglia):</p>
        <ul className="text-slate-300 text-xs space-y-0.5">
          <li>• Costo deducibile dal reddito d'impresa</li>
          <li>• Nessun contributo INPS/INAIL</li>
          <li>• Nessuna ritenuta IRPEF per il dipendente</li>
        </ul>
      </div>
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
        <p className="text-slate-300 text-xs">⚠️ <strong className="text-red-400">Attenzione — effetto "tutto o niente":</strong> se il totale dei fringe benefit annui supera anche di 1€ la soglia, <strong className="text-red-400">l'intero importo</strong> (non solo l'eccedenza) diventa imponibile a fini fiscali e contributivi.</p>
      </div>
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-white font-semibold text-sm mb-2">ℹ️ Fringe Benefit vs Welfare Aziendale</h3>
        <div className="space-y-2">
          <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-2">
            <p className="text-pink-400 text-[10px] font-semibold">Fringe Benefit (art. 51, c.3 TUIR)</p>
            <p className="text-slate-300 text-[10px]">Buoni spesa, gift card, beni in natura. Soglia: €1.000 / €2.000. Erogabili anche ad personam.</p>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-2">
            <p className="text-cyan-400 text-[10px] font-semibold">Welfare Aziendale (art. 51, c.2 TUIR)</p>
            <p className="text-slate-300 text-[10px]">Servizi di istruzione, sanità, previdenza, trasporti, assistenza. <strong className="text-white">Nessun limite di importo</strong>. Richiede regolamento aziendale e destinazione a categorie omogenee di dipendenti.</p>
          </div>
        </div>
        <p className="text-slate-400 text-[10px] mt-2 leading-relaxed">💡 I due strumenti sono cumulabili: puoi erogare fringe benefit fino alla soglia + servizi welfare senza limite, per lo stesso dipendente.</p>
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
            <p className="text-amber-400 text-xs font-semibold">⚠️ Omaggio &gt; €50</p>
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
      {/* Sub-tabs: Ordina | Normativa | Catalogo */}
      <div className="flex gap-2 mb-4">
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
          onClick={() => setSubTab('catalogo')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            subTab === 'catalogo'
              ? 'bg-slate-700 text-white border border-slate-500'
              : 'bg-slate-800/50 text-slate-500 border border-slate-700/50'
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          Catalogo
        </button>
      </div>

      {subTab === 'ordina' && <WelfareOrdinaTab user={user} tipo={tipo} />}
      {subTab === 'normativa' && <NormativaComponent />}
      {subTab === 'catalogo' && <WelfareCatalogoTab tipo={tipo === 'buoni_pasto' ? 'buoni-pasto' : 'marchi'} />}
    </div>
  );
}