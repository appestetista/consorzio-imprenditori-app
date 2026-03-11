import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Lightbulb, TrendingUp, ShieldCheck, AlertTriangle, History, Euro } from 'lucide-react';

function fmt(n) {
  return n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function WelfareInfoPanel({ tipo, valore, persone, userEmail }) {
  const [ordiniPrecedenti, setOrdiniPrecedenti] = useState([]);

  const totaleDestinatari = valore * persone;

  useEffect(() => {
    if (!userEmail) return;
    base44.entities.WelfareRequest.filter({ user_email: userEmail, tipo_buono: tipo })
      .then(setOrdiniPrecedenti)
      .catch(() => {});
  }, [userEmail, tipo]);

  const haOrdiniPrecedenti = ordiniPrecedenti.length > 0;

  const valoreBuonoPasto = tipo === 'buoni_pasto' ? valore : 0;
  const giorniLavorativi = 22;
  const importoMensePasto = valoreBuonoPasto * giorniLavorativi;

  const esempioImporto = tipo === 'buoni_pasto'
    ? importoMensePasto
    : (totaleDestinatari > 0 ? Math.round(totaleDestinatari / persone) : 600);
  const nettoInBusta = Math.round(esempioImporto * 0.53);
  const tasseInBusta = Math.round(esempioImporto * 0.47);

  return (
    <Card className="bg-gradient-to-br from-slate-900 to-slate-800 border-cyan-500/30 border p-0 overflow-hidden">
      <div className="bg-cyan-500/10 px-4 py-3 flex items-center gap-2 border-b border-cyan-500/20">
        <Lightbulb className="w-4 h-4 text-cyan-400" />
        <h4 className="text-cyan-400 font-bold text-xs">Perché conviene? Te lo spieghiamo</h4>
      </div>

      <div className="p-4 space-y-4">

        {haOrdiniPrecedenti && (
          <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-400 text-xs font-bold mb-1">
                  Attenzione: hai già {ordiniPrecedenti.length} ordine/i di {tipo === 'buoni_pasto' ? 'Buoni Pasto' : tipo === 'buoni_spesa' ? 'Buoni Spesa' : 'Buoni Omaggio'} quest'anno
                </p>
                <p className="text-amber-300/80 text-[11px] leading-relaxed">
                  {tipo === 'buoni_omaggio' && (
                    <>Se stai ordinando per le <strong>stesse persone</strong> che hanno già ricevuto buoni omaggio, ricorda che ogni singolo omaggio deve restare entro <strong className="text-white">€50</strong> per mantenere la piena deducibilità fiscale.</>
                  )}
                  {tipo === 'buoni_spesa' && (
                    <>Se stai ordinando per gli <strong>stessi dipendenti</strong>, verifica che il totale annuo per ciascuno non superi <strong className="text-white">€1.000</strong> (o <strong className="text-white">€2.000</strong> per chi ha figli a carico), altrimenti perdi l&#39;intera esenzione fiscale.</>
                  )}
                  {tipo === 'buoni_pasto' && (
                    <>Se stai ordinando per gli <strong>stessi dipendenti</strong>, verifica che il valore giornaliero per ciascuno non superi <strong className="text-white">€10,00</strong> (elettronici) o <strong className="text-white">€4,00</strong> (cartacei), altrimenti la parte eccedente viene tassata.</>
                  )}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <History className="w-3 h-3 text-amber-400" />
                  <span className="text-amber-400/70 text-[10px]">Ordini trovati: {ordiniPrecedenti.length}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {tipo === 'buoni_pasto' && (
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
            <div className="flex items-start gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <p className="text-white text-xs font-semibold">Quanto vale per ogni dipendente?</p>
            </div>
            <div className="space-y-2">
              <p className="text-slate-300 text-[11px] leading-relaxed">
                In media un mese ha <strong className="text-white">22 giorni lavorativi</strong>. Con un buono da <strong className="text-white">€{fmt(valoreBuonoPasto)}</strong> al giorno:
              </p>
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-[10px] mb-1">22 giorni × €{fmt(valoreBuonoPasto)}</p>
                <p className="text-cyan-400 font-bold text-xl">€{fmt(importoMensePasto)}/mese</p>
                <p className="text-cyan-300/60 text-[10px] mt-1">per dipendente — totalmente esenti da tasse</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2 text-center">
                  <p className="text-cyan-300 text-[10px] font-semibold">Elettronici</p>
                  <p className="text-white font-bold text-base">fino a €10,00</p>
                  <p className="text-cyan-300/60 text-[9px]">al giorno / dipendente</p>
                </div>
                <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-center">
                  <p className="text-slate-400 text-[10px] font-semibold">Cartacei</p>
                  <p className="text-white font-bold text-base">fino a €4,00</p>
                  <p className="text-slate-400/60 text-[9px]">al giorno / dipendente</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div>
          <p className="text-white text-xs font-semibold mb-2">
            {tipo === 'buoni_pasto' && '💰 Busta paga vs Buoni Pasto — per dipendente/mese'}
            {tipo === 'buoni_spesa' && '💰 Busta paga vs Buoni Spesa'}
            {tipo === 'buoni_omaggio' && '💰 Busta paga vs Buoni Omaggio'}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
              <p className="text-red-400 text-[10px] font-bold mb-2 text-center">❌ In busta paga</p>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {tipo === 'buoni_pasto' ? (
                  <>Per dare <strong className="text-white">€{fmt(importoMensePasto)}/mese</strong> netti in busta paga, dovresti spendere circa <strong className="text-red-400">€{fmt(Math.round(importoMensePasto / 0.53))}</strong> lordi. La differenza? Finisce in tasse e contributi.</>
                ) : (
                  <>Se dai <strong className="text-white">€{fmt(esempioImporto)}</strong> lordi in busta paga, tra IRPEF, INPS e addizionali il dipendente si ritrova in tasca solo <strong className="text-red-400"> €{fmt(nettoInBusta)}</strong>.</>
                )}
              </p>
              <div className="mt-2 bg-red-500/10 rounded-lg px-2 py-1.5 text-center">
                <p className="text-[10px] text-slate-400">Persi in tasse e contributi</p>
                <p className="text-red-400 font-bold text-sm">−€{fmt(tipo === 'buoni_pasto' ? Math.round(importoMensePasto / 0.53) - importoMensePasto : tasseInBusta)}</p>
                <p className="text-red-300/60 text-[9px]">(~47% del lordo)</p>
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
              <p className="text-green-400 text-[10px] font-bold mb-2 text-center">
                ✅ {tipo === 'buoni_pasto' ? 'Con Buoni Pasto' : tipo === 'buoni_spesa' ? 'Con Buoni Spesa' : 'Con Buoni Omaggio'}
              </p>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {tipo === 'buoni_pasto' ? (
                  <>Con i buoni pasto dai <strong className="text-white">€{fmt(importoMensePasto)}/mese</strong> al dipendente e spendi esattamente <strong className="text-green-400">€{fmt(importoMensePasto)}</strong>. Zero tasse, zero contributi.</>
                ) : tipo === 'buoni_omaggio' ? (
                  <>Se dai un buono omaggio da <strong className="text-white">€{fmt(esempioImporto)}</strong>, al destinatario arriva esattamente <strong className="text-green-400">€{fmt(esempioImporto)}</strong>. Zero tasse, zero contributi.</>
                ) : (
                  <>Se dai buoni spesa per <strong className="text-white">€{fmt(esempioImporto)}</strong>, al dipendente arriva esattamente <strong className="text-green-400">€{fmt(esempioImporto)}</strong>. Zero tasse, zero contributi.</>
                )}
              </p>
              <div className="mt-2 bg-green-500/10 rounded-lg px-2 py-1.5 text-center">
                <p className="text-[10px] text-slate-400">Tasse e contributi</p>
                <p className="text-green-400 font-bold text-sm">€0,00</p>
                <p className="text-green-300/60 text-[9px]">(esenzione totale)</p>
              </div>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 mt-2 flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-300 text-[11px] leading-relaxed">
              {tipo === 'buoni_pasto' ? (
                <><strong className="text-green-400">Risparmi €{fmt(Math.round(importoMensePasto / 0.53) - importoMensePasto)}/mese</strong> per dipendente in tasse e contributi. Il dipendente riceve il <strong className="text-white">100%</strong> — è come un aumento di stipendio senza tasse!</>
              ) : (
                <><strong className="text-green-400">Risparmi €{fmt(totaleDestinatari * 0.47)}</strong> di tasse e contributi e ogni {tipo === 'buoni_omaggio' ? 'destinatario' : 'dipendente'} riceve il <strong className="text-white">100%</strong> dell&#39;importo. È come dare un aumento senza pagare le tasse!</>
              )}
            </p>
          </div>
        </div>

        {tipo === 'buoni_pasto' && (
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
            <div className="flex items-start gap-2 mb-2">
              <Euro className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-white text-xs font-semibold">Costo del servizio</p>
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-center">
                  <p className="text-amber-300 text-[10px] font-semibold">Fino a €30.000</p>
                  <p className="text-white font-bold text-base">5%</p>
                  <p className="text-amber-300/60 text-[9px]">sull&#39;importo ordinato</p>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
                  <p className="text-green-300 text-[10px] font-semibold">Oltre €30.000</p>
                  <p className="text-white font-bold text-base">3%</p>
                  <p className="text-green-300/60 text-[9px]">sulla parte eccedente</p>
                </div>
              </div>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                Esempio: su un ordine di €50.000 → 5% su €30.000 (= €1.500) + 3% su €20.000 (= €600) = <strong className="text-white">€2.100 totali</strong> di costo servizio.
              </p>
            </div>
          </div>
        )}

        {tipo !== 'buoni_pasto' && (
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
            <div className="flex items-start gap-2 mb-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <p className="text-white text-xs font-semibold">Puoi emetterli più volte all&#39;anno</p>
            </div>

            {tipo === 'buoni_spesa' && (
              <div className="space-y-2">
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Non sei limitato a un singolo ordine. Puoi emettere buoni spesa <strong className="text-white">più volte nell&#39;arco dell&#39;anno</strong>, purché il totale annuo per ciascun dipendente resti entro la soglia di esenzione:
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-2 text-center">
                    <p className="text-slate-300 text-[10px] font-semibold">Senza figli a carico</p>
                    <p className="text-white font-bold text-base">€1.000</p>
                    <p className="text-slate-400/60 text-[9px]">all&#39;anno / dipendente</p>
                  </div>
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2 text-center">
                    <p className="text-cyan-300 text-[10px] font-semibold">Con figli a carico</p>
                    <p className="text-white font-bold text-base">€2.000</p>
                    <p className="text-cyan-300/60 text-[9px]">all&#39;anno / dipendente</p>
                  </div>
                </div>
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 mt-1">
                  <p className="text-red-300 text-[10px] leading-relaxed">
                    <strong className="text-red-400">⚠️ Attenzione:</strong> se superi anche di solo 1€ la soglia annua, perdi <strong>tutta</strong> l&#39;esenzione sull&#39;intero importo (non solo sulla parte eccedente).
                  </p>
                </div>
              </div>
            )}

            {tipo === 'buoni_omaggio' && (
              <div className="space-y-2">
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Non sei limitato a un singolo ordine. Puoi emettere buoni omaggio <strong className="text-white">più volte nell&#39;arco dell&#39;anno</strong> a clienti, fornitori e partner. La soglia è <strong>per singolo omaggio</strong>:
                </p>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
                    <p className="text-green-300 text-[10px] font-semibold">Omaggio ≤ €50</p>
                    <p className="text-green-400 font-bold text-xs mt-1">IVA detraibile</p>
                    <p className="text-green-400 font-bold text-xs">Costo deducibile 100%</p>
                  </div>
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
                    <p className="text-red-300 text-[10px] font-semibold">Omaggio &gt; €50</p>
                    <p className="text-red-400 font-bold text-xs mt-1">IVA indetraibile</p>
                    <p className="text-red-400 font-bold text-xs">Deducibilità limitata</p>
                  </div>
                </div>
                <p className="text-slate-400 text-[10px] leading-relaxed mt-1">
                  Puoi fare quanti omaggi vuoi nell&#39;anno, l&#39;importante è che il <strong className="text-white">singolo omaggio</strong> non superi €50 per mantenere tutti i vantaggi fiscali.
                </p>
              </div>
            )}
          </div>
        )}

        {tipo === 'buoni_spesa' && (
          <div className="bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-xl p-3 border border-purple-500/30">
            <div className="flex items-start gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-white text-xs font-semibold">Fringe Benefit vs Welfare Aziendale: due strumenti diversi</p>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed mb-3">
              I <strong className="text-pink-400">buoni spesa</strong> rientrano nei <strong className="text-white">fringe benefit</strong> (art. 51, c.3 TUIR) con soglia annua di esenzione. Il <strong className="text-cyan-400">welfare aziendale</strong> (art. 51, c.2 TUIR) è un istituto diverso, <strong className="text-white">senza limiti di importo</strong>, destinato alla generalità dei dipendenti.
            </p>
            <div className="space-y-1.5">
              <div className="bg-slate-800/60 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-pink-400 flex-shrink-0" />
                  <span className="text-white text-xs font-semibold flex-1">Fringe Benefit (buoni spesa, gift card)</span>
                </div>
                <p className="text-slate-400 text-[10px] mt-1 pl-4">Art. 51, comma 3 TUIR — Soglia: <strong className="text-pink-400">€1.000</strong>/anno (o <strong className="text-pink-400">€2.000</strong> con figli a carico). Superata la soglia, <strong className="text-red-400">tutto l'importo</strong> diventa tassabile.</p>
              </div>
              <div className="bg-slate-800/60 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0" />
                  <span className="text-white text-xs font-semibold flex-1">Welfare Aziendale (servizi, istruzione, sanità...)</span>
                </div>
                <p className="text-slate-400 text-[10px] mt-1 pl-4">Art. 51, comma 2 TUIR — <strong className="text-green-400">Nessun limite di importo</strong>. Esente al 100% da IRPEF, INPS e INAIL se erogato tramite regolamento a categorie omogenee di dipendenti.</p>
              </div>
            </div>
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 mt-2">
              <p className="text-green-300 text-[10px] leading-relaxed">
                <strong className="text-green-400">💡 Strategia:</strong> puoi usare entrambi gli strumenti per lo stesso dipendente. I buoni spesa (fringe benefit) fino a €1.000/€2.000 + servizi welfare (istruzione, sanità, previdenza) <strong className="text-white">senza limite</strong>. Sono due canali fiscali indipendenti.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-lg px-3 py-1.5 mt-1.5">
              <p className="text-slate-500 text-[9px] leading-relaxed">
                📜 Fonti: Art. 51 c.2 e c.3 TUIR (D.P.R. 917/1986) — L. 207/2024 (Legge di Bilancio 2025), valido triennio 2025-2027.
              </p>
            </div>
          </div>
        )}

        <div className="bg-green-500/5 border border-green-500/20 rounded-lg px-3 py-2 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-slate-300 text-[11px] leading-relaxed">
            <strong className="text-green-400">100% deducibili:</strong> {tipo === 'buoni_omaggio'
              ? 'i buoni omaggio entro €50 sono interamente deducibili e con IVA detraibile — un vantaggio doppio per la tua azienda.'
              : tipo === 'buoni_pasto'
              ? "i buoni pasto sono interamente deducibili (IRES/IRPEF), non generano oneri previdenziali e l'IVA al 4% è interamente detraibile."
              : "i buoni spesa entro le soglie sono interamente deducibili dal reddito d'impresa (IRES/IRPEF) e non generano alcun onere previdenziale per l'azienda."
            }
          </p>
        </div>
      </div>
    </Card>
  );
}