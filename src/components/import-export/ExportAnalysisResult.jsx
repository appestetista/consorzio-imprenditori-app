import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Target, TrendingUp, Shield, Truck, 
  DollarSign, MapPin, AlertTriangle, Calendar, CheckCircle, 
  BarChart3, Package, ExternalLink, ArrowRight, HelpCircle, X 
} from 'lucide-react';

import { 
  VerificaNormativaCard, StrutturaIngressoCard, CanaliVenditaCard, 
  LogisticaDoganeGTMCard, ValidazioneCommercialeCard, DatiMancantiCard 
} from './ExportPhaseCards';
import CustomsDutyGuideCard from './CustomsDutyGuideCard';
import InfoTooltip from './InfoTooltip';

function EntryBarriersSection({ entryBarriers }) {
  const [showBLInfo, setShowBLInfo] = useState(false);

  const getBarrierType = (value) => {
    if (!value) return null;
    const v = value.toLowerCase();
    if (v.includes('obbligat') || v.includes('required') || v.includes('high')) return 'obbligatoria';
    if (v.includes('consigliat') || v.includes('recommended') || v.includes('medium')) return 'facoltativa';
    if (v.includes('low') || v.includes('basso') || v.includes('opzional')) return 'bassa';
    return null;
  };

  const brandLoyaltyType = getBarrierType(entryBarriers.brand_loyalty_level);

  return (
    <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2.5 mb-3">
      <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Barriere all'Ingresso</p>
      
      {/* Brand Loyalty con ? */}
      <div className="flex justify-between items-start py-1.5 border-b border-white/5 gap-4">
        <span className="text-slate-400 text-xs flex items-center gap-1.5">
          Brand Loyalty
          <button onClick={() => setShowBLInfo(true)}
            className="w-4 h-4 rounded-full bg-white/10 border border-white/30 flex items-center justify-center hover:bg-white/20 transition-colors flex-shrink-0">
            <span className="text-white text-[8px] font-bold leading-none">?</span>
          </button>
        </span>
        <div className="flex items-center gap-1.5">
          {entryBarriers.brand_loyalty_level && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
              brandLoyaltyType === 'obbligatoria' ? 'bg-red-500/15 text-red-400' :
              brandLoyaltyType === 'facoltativa' ? 'bg-amber-500/15 text-amber-400' : 'bg-green-500/15 text-green-400'
            }`}>
              {brandLoyaltyType === 'obbligatoria' ? 'Alta → difficile entrare' :
               brandLoyaltyType === 'facoltativa' ? 'Media → margine di manovra' : 'Bassa → accessibile'}
            </span>
          )}
          <span className="text-white text-xs text-right">{entryBarriers.brand_loyalty_level || 'Non disponibile'}</span>
        </div>
      </div>

      {showBLInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={() => setShowBLInfo(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-sm">Brand Loyalty</h3>
              <button onClick={() => setShowBLInfo(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-slate-300 text-xs leading-relaxed">
              <p>La <strong className="text-white">Brand Loyalty</strong> misura quanto i consumatori del mercato target sono legati ai marchi già presenti.</p>
              <div className="bg-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="bg-red-500/15 text-red-400 text-[9px] font-bold px-1.5 py-0.5 rounded">High</span>
                  <span className="text-slate-400 text-[11px]">I consumatori comprano sempre gli stessi brand. Entrare è molto difficile.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500/15 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded">Medium</span>
                  <span className="text-slate-400 text-[11px]">C'è fedeltà, ma i consumatori provano nuovi brand se il rapporto qualità/prezzo è interessante.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-green-500/15 text-green-400 text-[9px] font-bold px-1.5 py-0.5 rounded">Low</span>
                  <span className="text-slate-400 text-[11px]">I consumatori cambiano brand facilmente. Mercato aperto a nuovi ingressi.</span>
                </div>
              </div>
              <p className="text-slate-500 text-[10px]">Una brand loyalty alta non è un blocco assoluto, ma richiede investimenti maggiori in marketing e un posizionamento differenziante.</p>
            </div>
          </div>
        </div>
      )}

      {/* Certificazioni con tag obbligatorie/facoltative */}
      {entryBarriers.required_certifications?.length > 0 && (
        <div className="mt-1.5">
          <p className="text-white/60 text-[10px] mb-1">Certificazioni richieste</p>
          <div className="flex flex-wrap gap-1">
            {entryBarriers.required_certifications.map((c, i) => (
              <span key={i} className="bg-red-500/10 text-red-300 px-2 py-0.5 rounded-md text-[10px] border border-red-500/20 flex items-center gap-1">
                {c}
                <span className="bg-red-500/20 text-red-400 text-[8px] font-bold px-1 rounded">OBB.</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {entryBarriers.recommended_certifications?.length > 0 && (
        <div className="mt-1.5">
          <p className="text-white/60 text-[10px] mb-1">Certificazioni consigliate</p>
          <div className="flex flex-wrap gap-1">
            {entryBarriers.recommended_certifications.map((c, i) => (
              <span key={i} className="bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-md text-[10px] border border-amber-500/20 flex items-center gap-1">
                {c}
                <span className="bg-amber-500/20 text-amber-400 text-[8px] font-bold px-1 rounded">FAC.</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {entryBarriers.notes && (
        <p className="text-white/50 text-[10px] mt-1.5 italic">{entryBarriers.notes}</p>
      )}

      {/* Confronto rispetto ai competitor */}
      {entryBarriers.competitor_comparison && (
        <div className="mt-2 pt-2 border-t border-white/5">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-wider mb-1">Rispetto ai competitor</p>
          <p className="text-white/80 text-[10px] leading-relaxed">{entryBarriers.competitor_comparison}</p>
        </div>
      )}
    </div>
  );
}

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

// Dizionario spiegazioni per ogni label
const SPIEGAZIONI = {
  "Import totale": { title: "Import Totale", body: "È il valore totale in dollari delle importazioni di questo prodotto nel paese target in un anno. Più è alto, più il mercato è grande e c'è domanda." },
  "CAGR": { title: "CAGR — Tasso di Crescita Annuo Composto", body: "È la crescita media annua delle importazioni negli ultimi anni. Un CAGR positivo (es. +5%) indica un mercato in espansione. Se negativo, la domanda sta calando." },
  "Dazi": { title: "Dazi Doganali", body: "È la tassa che il paese di destinazione applica ai prodotti importati. Si esprime in percentuale sul valore della merce. Un dazio alto rende il tuo prodotto più costoso rispetto ai concorrenti locali." },
  "Barriere non tariffarie": { title: "Barriere Non Tariffarie (NTB)", body: "Sono tutti gli ostacoli all'importazione DIVERSI dai dazi. Esempi concreti: certificazioni obbligatorie (es. CE, FDA, GOST), standard sanitari e fitosanitari (SPS), requisiti di etichettatura nella lingua locale, quote di importazione, licenze speciali, regolamentazione tecnica (TBT), test di laboratorio locali, registrazione prodotto presso enti governativi. Spesso sono più costose e lente da superare dei dazi stessi." },
  "Accessibilità mercato": { title: "Accessibilità del Mercato", body: "Valutazione complessiva di quanto è facile entrare in questo mercato considerando: complessità burocratica, barriere normative, costi di ingresso, apertura verso prodotti stranieri e livello di competizione. Bassa = facile entrare, Alta = complesso e costoso." },
  "Import annuo": { title: "Importazioni Totali del Paese", body: "Il valore totale in dollari che il paese ha importato DA TUTTO IL MONDO di questo tipo di prodotto nell'ultimo anno. Rappresenta la dimensione complessiva della domanda. È la somma delle importazioni da tutti i paesi fornitori." },
  "Export ITA→paese": { title: "Export Italia verso questo Paese", body: "Il valore in dollari dei prodotti italiani di questa categoria esportati SPECIFICAMENTE verso questo paese. Rappresenta il flusso bilaterale Italia→Paese. Se è alto, c'è già un canale commerciale attivo. La quota Italia è il rapporto tra questo valore e l'import totale." },
  "Trend YoY": { title: "Trend Anno su Anno (Year over Year)", body: "La variazione percentuale delle importazioni rispetto all'anno precedente. Se positivo (+), il mercato cresce. Se negativo (-), sta diminuendo." },
  "Quota Italia": { title: "Quota di Mercato dell'Italia", body: "La percentuale delle importazioni totali del paese che arrivano dall'Italia. Se è alta, i prodotti italiani sono molto presenti. Se bassa, c'è spazio per crescere." },
  "Consumo Apparente (C)": { title: "Consumo Apparente", body: "Formula: C = P + M − X (Produzione + Import − Export). Rappresenta quanto il mercato consuma realmente. Se la Produzione Locale non è disponibile, viene stimato come proxy basato sull'import totale." },
  "Produzione Locale (P)": { title: "Produzione Locale", body: "Quanto il paese produce internamente di questo prodotto. Questo dato NON è disponibile da API pubbliche a livello di singolo codice HS: viene stimato dall'AI usando fonti settoriali (FAOSTAT, UNIDO, statistiche nazionali). Se manca il dato numerico, viene fornita una valutazione qualitativa della capacità produttiva locale." },
  "Import (M)": { title: "Importazioni Totali del Paese", body: "Quanto il paese importa DA TUTTO IL MONDO di questo prodotto. Questo è il dato più affidabile perché proviene da UN Comtrade/Trade Map. Più importa, più ha bisogno di fornitori esterni come te." },
  "Export (X)": { title: "Esportazioni del Paese verso il Mondo", body: "Quanto il paese ESPORTA verso altri paesi di questo prodotto. Se esporta molto, potrebbe essere un concorrente. Questo dato è ricercato su Trade Map ma non sempre disponibile per ogni HS." },
  "Dipendenza Import": { title: "Dipendenza dalle Importazioni", body: "Indica quanto il paese dipende dalle importazioni per soddisfare la domanda interna. Calcolata come M/C × 100. Una dipendenza alta è positiva per te: il paese HA BISOGNO di importare. Se il consumo apparente non è calcolabile, viene fornita una stima qualitativa." },
  "Demand Score": { title: "Punteggio di Domanda", body: "Un indice sintetico (0-100) che combina volume importazioni, crescita, popolazione e PIL pro capite per stimare quanto forte è la domanda nel mercato." },
  "Import pro capite": { title: "Import Pro Capite", body: "Le importazioni divise per il numero di abitanti. Un valore alto indica che ogni persona nel paese spende molto per questo tipo di prodotto — alto potere d'acquisto." },
  "Validazione coerenza": { title: "Validazione Coerenza Dati", body: "Un controllo automatico che verifica se i dati commerciali sono coerenti tra loro. Se segnala anomalie, alcuni dati potrebbero essere inaffidabili o incompleti." },
  "Segmentazione": { title: "Segmentazione del Mercato", body: "Come il mercato è diviso: fascia alta, media, bassa. Ti aiuta a capire dove posizionare il tuo prodotto." },
  "Volumi consumo": { title: "Volumi di Consumo", body: "La quantità fisica (tonnellate, unità, litri) consumata nel mercato. Complementa il dato in valore ($) per capire le dimensioni reali." },
  "Trend": { title: "Trend di Mercato", body: "La direzione in cui si sta muovendo il mercato: in crescita, stabile o in calo." },
  "Simulazione prezzo": { title: "Simulazione Prezzo", body: "Una stima del prezzo a cui dovresti vendere per essere competitivo nel mercato target, considerando dazi, trasporto e margini intermediari." },
  "Margine lordo": { title: "Margine Lordo", body: "La differenza tra il tuo prezzo di vendita e il costo totale del prodotto esportato (costo industriale + dazi + trasporto). È ciò che ti rimane in tasca." },
  "Break even": { title: "Punto di Pareggio (Break Even)", body: "Il volume minimo di vendita necessario per coprire tutti i costi fissi dell'operazione export. Sotto questa soglia, sei in perdita." },
  "Investimento iniziale": { title: "Investimento Iniziale Stimato", body: "Il budget iniziale necessario per avviare l'operazione export: certificazioni, fiere, primo lotto, logistica, marketing." },
  "Quota online": { title: "Quota Vendite Online", body: "La percentuale delle vendite di questo tipo di prodotto che avviene tramite canali digitali (e-commerce, marketplace). Più è alta, più puoi vendere senza intermediari fisici." },
  "Margine trade": { title: "Margine per gli Intermediari (Trade Margin)", body: "La percentuale che i distributori e importatori locali trattengono sul prezzo finale. Devi tenerne conto perché riduce il tuo margine." },
  "Modalità ingresso": { title: "Modalità di Ingresso nel Mercato", body: "Il modo più comune per entrare in questo mercato: tramite distributore, agente, filiale diretta, marketplace o joint venture." },
  "Posizionamento rispetto ai competitor italiani": { title: "Posizionamento Italia", body: "Come si posizionano i prodotti italiani rispetto ai concorrenti in questo mercato: se sono percepiti come premium, di nicchia, o in diretta competizione con produttori locali." },
};

function isNDValue(value) {
  if (!value) return true;
  const v = String(value).trim().toLowerCase();
  return v === 'n/d' || v === 'non disponibile' || v === 'dato non disponibile da fonti ufficiali verificabili' || v === 'n/a' || v === 'nd';
}

function DataRow({ label, value, warning }) {
  const spiegazione = SPIEGAZIONI[label];

  if (isNDValue(value)) {
    return (
      <div className="flex justify-between items-start py-1.5 border-b border-white/5 last:border-0">
        <span className="text-white/60 text-xs flex items-center gap-1">
          {label}
          {spiegazione && <InfoTooltip title={spiegazione.title}><p>{spiegazione.body}</p></InfoTooltip>}
        </span>
        <span className="text-white/30 text-xs italic">Non disponibile</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-white/5 last:border-0 gap-4">
      <span className="text-white/70 text-xs flex-shrink-0 flex items-center gap-1">
        {label}
        {spiegazione && <InfoTooltip title={spiegazione.title}><p>{spiegazione.body}</p></InfoTooltip>}
      </span>
      <span className={`text-xs text-right font-medium ${warning ? 'text-amber-400' : 'text-white'}`}>{value}</span>
    </div>
  );
}

/**
 * Versione avanzata di DataRow per la sezione Domanda Locale.
 * Se il valore è lungo (>60 chars) lo mostra come blocco sotto la label.
 * Se il valore contiene indicatori di stima, mostra un badge "Stima".
 */
function DetailedDataRow({ label, value, spiegazioneKey }) {
  const spiegazione = SPIEGAZIONI[spiegazioneKey || label];
  const isEstimate = value && /stima|proxy|approssim|circa|indicativ/i.test(String(value));
  const isLong = value && String(value).length > 60;

  if (isNDValue(value)) {
    return (
      <div className="py-1.5 border-b border-white/5 last:border-0">
        <div className="flex justify-between items-start">
          <span className="text-white/60 text-xs flex items-center gap-1">
            {label}
            {spiegazione && <InfoTooltip title={spiegazione.title}><p>{spiegazione.body}</p></InfoTooltip>}
          </span>
          <span className="text-amber-400/60 text-[10px] italic">Dato non reperibile da fonti pubbliche</span>
        </div>
      </div>
    );
  }

  if (isLong) {
    return (
      <div className="py-1.5 border-b border-white/5 last:border-0">
        <div className="flex items-center gap-1 mb-1">
          <span className="text-white/60 text-xs font-medium">{label}</span>
          {spiegazione && <InfoTooltip title={spiegazione.title}><p>{spiegazione.body}</p></InfoTooltip>}
          {isEstimate && <span className="text-amber-400 text-[8px] font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">STIMA</span>}
        </div>
        <p className="text-white/80 text-[11px] leading-relaxed pl-1">{value}</p>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-start py-1.5 border-b border-white/5 last:border-0 gap-4">
      <span className="text-white/70 text-xs flex-shrink-0 flex items-center gap-1">
        {label}
        {spiegazione && <InfoTooltip title={spiegazione.title}><p>{spiegazione.body}</p></InfoTooltip>}
        {isEstimate && <span className="text-amber-400 text-[8px] font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">STIMA</span>}
      </span>
      <span className="text-xs text-right font-medium text-white">{value}</span>
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
              <p className="text-white/60 text-xs uppercase tracking-wider font-medium">Prontezza all'Export</p>
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
              <OpenSection title={
                <span className="flex items-center gap-1.5">
                  Analisi di Mercato
                  <InfoTooltip title="Analisi di Mercato (Market Screening)">
                    <p>L'analisi di mercato è il primo passo per capire se un paese è interessante per il tuo prodotto. Mostra quante importazioni ci sono, se crescono, quanto costano i dazi e quali ostacoli burocratici potresti incontrare.</p>
                  </InfoTooltip>
                </span>
              } icon={BarChart3} iconColor="text-lime-400">
                <DataRow label="Import totale" value={m.market_screening.import_totale} />
                <DataRow label="CAGR" value={m.market_screening.cagr} />
                <DataRow label="Dazi" value={m.market_screening.dazi} />
                <DataRow label="Barriere non tariffarie" value={m.market_screening.barriere_non_tariffarie} />
                <DataRow label="Accessibilità mercato" value={m.market_screening.accessibilita_mercato} />
              </OpenSection>
            )}

            {/* Flussi Commerciali */}
            {m.flussi_commerciali && (
              <OpenSection title={
                <span className="flex items-center gap-1.5">
                  Flussi Commerciali
                  <InfoTooltip title="Flussi Commerciali">
                    <p>I flussi commerciali mostrano i movimenti reali di merci tra paesi. Qui vedi quanto il paese importa di questo prodotto, quanto l'Italia ci esporta già, e chi sono gli altri fornitori principali. Più il flusso dall'Italia è forte, più c'è già un canale avviato.</p>
                  </InfoTooltip>
                </span>
              } icon={TrendingUp} iconColor="text-cyan-400">
                <DataRow label="Import annuo" value={m.flussi_commerciali.valore_import_annuo} />
                <DataRow label="Export ITA→paese" value={m.flussi_commerciali.export_italia_verso_paese} />
                <DataRow label="Trend YoY" value={m.flussi_commerciali.trend_yoy_percentuale} />
                <DataRow label="Quota Italia" value={m.flussi_commerciali.quota_italia} />
                {m.flussi_commerciali.principali_fornitori?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <p className="text-white/60 text-[10px] mb-1.5 flex items-center gap-1">
                      Top fornitori
                      <InfoTooltip title="Principali Fornitori">
                        <p>I paesi che esportano di più verso questo mercato per questo prodotto. La quota indica la percentuale sul totale delle importazioni del paese.</p>
                      </InfoTooltip>
                    </p>
                    <div className="space-y-1">
                      {m.flussi_commerciali.principali_fornitori.slice(0, 8).map((f, i) => {
                        const paese = typeof f === 'string' ? f : (f.paese || '');
                        const quota = typeof f === 'string' ? '' : (f.quota_percentuale || '');
                        const valore = typeof f === 'string' ? '' : (f.valore_usd || '');
                        return (
                          <div key={i} className="flex items-center justify-between bg-white/[0.03] rounded-lg px-2.5 py-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-white/40 text-[9px] font-bold w-4">#{i + 1}</span>
                              <span className="text-white text-[11px] font-medium">{paese}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {valore && <span className="text-white/50 text-[10px]">{valore}</span>}
                              {quota && <span className="text-cyan-400 text-[10px] font-bold">{quota}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </OpenSection>
            )}

            {/* Domanda Locale & Market Sizing */}
            {m.domanda_locale && (
              <OpenSection title={
                <span className="flex items-center gap-1.5">
                  Domanda Locale e Dimensione del Mercato
                  <InfoTooltip title="Domanda Locale e Dimensione del Mercato">
                    <p>Questa sezione analizza quanto il mercato consuma realmente del tuo prodotto. Usa la formula C = P + M − X (Consumo = Produzione + Import − Export). Alcuni dati (come la produzione locale per singolo codice HS) non sono disponibili da API pubbliche e vengono stimati dall'AI con fonti settoriali.</p>
                  </InfoTooltip>
                </span>
              } icon={Target} iconColor="text-purple-400">
                {/* Market Sizing quantitativo */}
                <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-2.5 mb-3">
                  <p className="text-purple-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Dimensione del Mercato (C = P + M − X)</p>
                  <DetailedDataRow label="Consumo Apparente (C)" value={m.domanda_locale.consumo_apparente} spiegazioneKey="Consumo Apparente (C)" />
                  <DetailedDataRow label="Produzione Locale (P)" value={m.domanda_locale.produzione_locale} spiegazioneKey="Produzione Locale (P)" />
                  <DetailedDataRow label="Import (M)" value={m.domanda_locale.import_value} spiegazioneKey="Import (M)" />
                  <DetailedDataRow label="Export (X)" value={m.domanda_locale.export_value} spiegazioneKey="Export (X)" />
                  <DetailedDataRow label="Dipendenza Import" value={m.domanda_locale.dipendenza_import} spiegazioneKey="Dipendenza Import" />
                </div>
                {/* Nota metodologica — spiega le fonti e i limiti */}
                {m.domanda_locale.nota_metodologica && (
                  <div className="bg-slate-700/30 border border-white/5 rounded-lg px-3 py-2 mb-3">
                    <p className="text-white/40 text-[9px] font-bold uppercase tracking-wider mb-1">Nota metodologica</p>
                    <p className="text-white/60 text-[10px] leading-relaxed">{m.domanda_locale.nota_metodologica}</p>
                  </div>
                )}
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
                      <p className="text-white/60 text-[10px] mb-1">Canali distributivi</p>
                      <div className="flex flex-wrap gap-1">
                        {m.domanda_locale.canali_distributivi.map((c, i) => (
                          <span key={i} className="bg-white/5 text-white px-2 py-0.5 rounded-md text-[10px]">{c}</span>
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
                <ul className="text-white/80 text-[10px] space-y-1">
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
                      <ul className="text-white/80 text-[10px] space-y-0.5">
                        {m.opportunita.map((o, i) => <li key={i}>• {o}</li>)}
                      </ul>
                    </div>
                  )}
                  {m.sfide?.length > 0 && (
                    <div className="bg-orange-500/5 rounded-lg p-2 border border-orange-500/10">
                      <p className="text-orange-400 text-[10px] font-bold uppercase mb-1">Sfide</p>
                      <ul className="text-white/80 text-[10px] space-y-0.5">
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
                <p className="text-white/80 text-xs leading-relaxed">{m.conclusione_operativa}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Analisi Economica Export */}
      {analysisResult.analisi_economica && (
        <OpenSection title={
          <span className="flex items-center gap-1.5">
            Analisi Economica Export
            <InfoTooltip title="Analisi Economica Export">
              <p>Questa sezione stima i numeri economici della tua operazione export: a che prezzo vendere, quale margine aspettarti, quante unità devi vendere per andare in pareggio e quanto budget iniziale serve.</p>
            </InfoTooltip>
          </span>
        } icon={DollarSign} iconColor="text-lime-400">
          <DataRow label="Simulazione prezzo" value={analysisResult.analisi_economica.simulazione_prezzo} />
          <DataRow label="Margine lordo" value={analysisResult.analisi_economica.margine_lordo} />
          <DataRow label="Break even" value={analysisResult.analisi_economica.break_even} />
          <DataRow label="Investimento iniziale" value={analysisResult.analisi_economica.investimento_iniziale} />
          {analysisResult.analisi_economica.note && (
            <p className="text-white/50 text-[10px] mt-2 italic">{analysisResult.analisi_economica.note}</p>
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
                  {step.kpi && <p className="text-white/60 text-[10px]">KPI: {step.kpi}</p>}
                  {step.budget_stimato && <p className="text-white/60 text-[10px]">Budget: {step.budget_stimato}</p>}
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
          <p className="text-white/80 text-sm leading-relaxed">{analysisResult.timeline_consigliata}</p>
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
        <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-2">Trasparenza dati</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-white/60">
          <div><span className="text-white/40">Fonte:</span> UN Comtrade</div>
          <div><span className="text-white/40">Macro:</span> World Bank</div>
          <div><span className="text-white/40">HS:</span> {confirmedExportHS?.hs_code}</div>
          <div><span className="text-white/40">Esportatore:</span> {tradeData?._query_log?.exporter || 'IT'}</div>
          <div><span className="text-white/40">Periodo:</span> {tradeData?._query_log?.periodo || `${new Date().getFullYear() - 5}-${new Date().getFullYear() - 1}`}</div>
          <div><span className="text-white/40">Data:</span> {tradeData?._timestamp_recupero ? new Date(tradeData._timestamp_recupero).toLocaleString('it-IT') : 'N/D'}</div>
          {tradeData?._partial && <div className="col-span-2"><span className="text-amber-400 text-[9px]">⚠ Alcuni dati commerciali non disponibili — analisi basata su fonti web</span></div>}
        </div>
        <p className="text-white/40 text-[10px] mt-2 italic">Metodologia conforme a ICE, SACE, World Bank, International Trade Centre.</p>
      </div>
    </div>
  );
}

function CompetitiveIntelligenceSection({ m }) {
  const [showCIInfo, setShowCIInfo] = useState(false);
  
  if (!m?.analisi_competitiva) return null;

  return (
              <OpenSection title={
                <span className="flex items-center gap-2">
                  Intelligenza Competitiva
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
                        <h3 className="text-white font-bold text-sm">Intelligenza Competitiva</h3>
                        <button onClick={() => setShowCIInfo(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="space-y-3 text-slate-300 text-xs leading-relaxed">
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                          <p className="text-orange-400 text-[10px] font-bold uppercase tracking-wider mb-1">Cos'è</p>
                          <p>La sezione Intelligenza Competitiva analizza il panorama competitivo del mercato target: chi sono i concorrenti principali, come si posizionano, quali prezzi praticano e quali canali distributivi utilizzano.</p>
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
                {m.analisi_competitiva?.competitive_landscape && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-white/60 uppercase tracking-wider">Concentrazione mercato</span>
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
                            {c.value_proposition && <p className="text-white/70 text-[10px]">{c.value_proposition}</p>}
                            {c.estimated_market_share && c.estimated_market_share !== 'N/D' && (
                              <p className="text-white/50 text-[10px] mt-0.5">Quota: {c.estimated_market_share}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Pricing Intelligence */}
                {m.analisi_competitiva?.pricing_intelligence && (
                  <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-lg p-2.5 mb-3">
                    <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      Analisi Prezzi
                      <InfoTooltip title="Analisi Prezzi (Pricing Intelligence)">
                        <p>Mostra il range di prezzi a cui prodotti simili vengono venduti nel mercato target. Ti serve per capire se il tuo prezzo è competitivo o troppo alto rispetto a quello che i compratori locali sono abituati a pagare.</p>
                      </InfoTooltip>
                    </p>
                    <div className="flex items-center gap-3 mb-1">
                      {m.analisi_competitiva.pricing_intelligence.local_price_range_min && (
                        <span className="text-white text-xs font-medium">
                          {m.analisi_competitiva.pricing_intelligence.local_price_range_min} — {m.analisi_competitiva.pricing_intelligence.local_price_range_max}
                          {m.analisi_competitiva.pricing_intelligence.price_unit && (
                            <span className="text-white/50 text-[10px] font-normal ml-1">/{m.analisi_competitiva.pricing_intelligence.price_unit}</span>
                          )}
                          {m.analisi_competitiva.pricing_intelligence.currency && (
                            <span className="text-white/50 text-[10px] font-normal ml-1">({m.analisi_competitiva.pricing_intelligence.currency})</span>
                          )}
                        </span>
                      )}
                    </div>
                    {m.analisi_competitiva.pricing_intelligence.price_unit && (
                      <p className="text-white/50 text-[10px]">Unità di misura: {m.analisi_competitiva.pricing_intelligence.price_unit}</p>
                    )}
                    {m.analisi_competitiva.pricing_intelligence.benchmark_product && (
                      <p className="text-white/60 text-[10px]">Rif: {m.analisi_competitiva.pricing_intelligence.benchmark_product}</p>
                    )}
                    {m.analisi_competitiva.pricing_intelligence.notes && (
                      <p className="text-white/50 text-[10px] mt-1 italic">{m.analisi_competitiva.pricing_intelligence.notes}</p>
                    )}
                  </div>
                )}

                {/* Distribution Channels */}
                {m.analisi_competitiva?.distribution_channels && (
                  <div className="mb-3">
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      Canali Distributivi
                      <InfoTooltip title="Canali Distributivi">
                        <p>I canali distributivi sono i modi in cui i prodotti arrivano ai clienti finali: online (e-commerce), tramite distributori, in negozi fisici, o con vendita diretta. Capire i canali dominanti ti aiuta a scegliere come entrare nel mercato.</p>
                      </InfoTooltip>
                    </p>
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
                        <p className="text-white/60 text-[10px] mb-1">Player offline</p>
                        <div className="flex flex-wrap gap-1">
                          {m.analisi_competitiva.distribution_channels.offline_key_players.map((p, i) => (
                            <span key={i} className="bg-white/5 text-white px-2 py-0.5 rounded-md text-[10px]">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Differentiation Factors */}
                {m.analisi_competitiva?.differentiation_factors?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      Leve Competitive
                      <InfoTooltip title="Leve Competitive (Differentiation Factors)">
                        <p>Sono i fattori che puoi usare per distinguerti dai concorrenti: qualità superiore, Made in Italy, design, prezzo competitivo, servizio post-vendita, certificazioni specifiche. Sono i tuoi punti di forza per convincere i compratori.</p>
                      </InfoTooltip>
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {m.analisi_competitiva.differentiation_factors.map((f, i) => (
                        <span key={i} className="bg-lime-500/10 text-lime-400 px-2 py-0.5 rounded-md text-[10px] border border-lime-500/20">{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entry Barriers */}
                {m.analisi_competitiva?.entry_barriers && (
                  <EntryBarriersSection entryBarriers={m.analisi_competitiva.entry_barriers} />
                )}

                {/* Posizionamento Italia */}
                <DataRow label="Posizionamento rispetto ai competitor italiani" value={m.analisi_competitiva?.posizionamento_italia} />

                {/* SWOT */}
                {m.analisi_competitiva?.swot && (
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
                {m.analisi_competitiva?.sources?.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5">
                    <p className="text-white/40 text-[10px] mb-1">Fonti:</p>
                    <div className="space-y-0.5">
                      {m.analisi_competitiva.sources.map((s, i) => (
                        <p key={i} className="text-white/40 text-[10px] truncate">{s}</p>
                      ))}
                    </div>
                  </div>
                )}
              </OpenSection>
  );
}