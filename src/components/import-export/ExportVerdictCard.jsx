import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp,
  Package, Truck, Shield, DollarSign, TrendingUp, Users, FileText
} from 'lucide-react';
import { getFlagUrl } from './CountrySearchSelect';

/**
 * Estrae e calcola i numeri REALI dal dataset per costruire
 * un "conto della serva" comprensibile a chiunque.
 */
function buildContoServa(mercatoAnalisi, tradeData, exportForm, macroData) {
  const code = mercatoAnalisi.paese_code;
  const mercatoTrade = tradeData?.mercati?.find(m => m.paese_code === code);
  
  // === 1. COSTO INDUSTRIALE (dato dall'utente) ===
  const costoIndustriale = parseFloat(exportForm?.costo_industriale) || null;
  const prezzoVendita = parseFloat(exportForm?.prezzo_medio) || null;
  
  // === 2. DAZIO (da più fonti, in ordine di affidabilità) ===
  let dazioPerc = null;
  let dazioFonte = null;
  let dazioTipo = null;
  
  // Helper per parsing dazio
  const tryParseDazio = (v) => {
    if (v == null) return null;
    if (typeof v === 'number') return v >= 0 ? v : null;
    const n = parseFloat(String(v).replace(/[%,]/g, '').trim());
    return !isNaN(n) && n >= 0 ? n : null;
  };

  // Raccogliamo dazi da tutte le fonti, poi scegliamo il migliore
  let dazioLivello1 = { perc: null, fonte: null, tipo: null };
  let dazioLivello2 = { perc: null, fonte: null, tipo: null };
  let dazioLivello3 = { perc: null, fonte: null, tipo: null };
  // Indica se il dazio è specifico (es. $0.05/kg) e non ad valorem
  let hasDazioSpecifico = false;

  // Livello 1: Dazi strutturati da API (WITS/WTO)
  const tariffs = mercatoTrade?.dazi;
  if (tariffs) {
    // Controlla se il dazio è specifico (non ad valorem %)
    if (tariffs.duty_type === 'specifico' || tariffs.duty_type === 'misto' || tariffs.dazio_specifico) {
      hasDazioSpecifico = true;
    }
    const pref = tryParseDazio(tariffs.dazio_preferenziale_valore ?? tariffs.dazio_preferenziale);
    if (pref !== null) { dazioLivello1 = { perc: pref, fonte: 'WITS/TRAINS', tipo: 'preferenziale' }; }
    else {
      const mfn = tryParseDazio(tariffs.dazio_mfn_valore ?? tariffs.dazio_mfn);
      if (mfn !== null) { dazioLivello1 = { perc: mfn, fonte: 'WITS/TRAINS', tipo: 'MFN' }; }
      else {
        const wto = tryParseDazio(tariffs.dazio_mfn_wto);
        if (wto !== null) { dazioLivello1 = { perc: wto, fonte: 'WTO', tipo: 'MFN applied' }; }
      }
    }
  }
  
  // Livello 2: Web enrichment (Access2Markets)
  {
    const a2m = mercatoTrade?.web_enrichment?.access2markets;
    if (a2m) {
      if (a2m.dazio_convenzionale_tipo === 'specifico' || a2m.dazio_convenzionale_tipo === 'misto') {
        hasDazioSpecifico = true;
      }
      const prefA = tryParseDazio(a2m.dazio_preferenziale_valore) ?? tryParseDazio(a2m.dazio_preferenziale);
      if (prefA !== null) { dazioLivello2 = { perc: prefA, fonte: 'Access2Markets', tipo: 'preferenziale' }; }
      else {
        const convA = tryParseDazio(a2m.dazio_convenzionale_valore) ?? tryParseDazio(a2m.dazio_convenzionale);
        if (convA !== null) { dazioLivello2 = { perc: convA, fonte: 'Access2Markets', tipo: 'convenzionale' }; }
      }
    }
  }
  
  // Livello 3: Analisi AI (modulo regulatory / modulo E)
  {
    const regDazi = mercatoAnalisi.dazi_taric || mercatoAnalisi.logistica_dogane_gtm;
    if (regDazi) {
      const d = tryParseDazio(regDazi.dazio_preferenziale_valore) ?? tryParseDazio(regDazi.dazio_preferenziale) ?? tryParseDazio(regDazi.dazio_mfn) ?? tryParseDazio(regDazi.dazi_applicabili);
      if (d !== null) { dazioLivello3 = { perc: d, fonte: 'Analisi AI', tipo: 'stimato' }; }
    }
  }

  // Logica di scelta: se il livello 1 dice 0% ma un livello successivo ha un valore > 0,
  // oppure se il dazio è specifico (non esprimibile in %), preferisci la fonte più dettagliata
  const allLivelli = [dazioLivello1, dazioLivello2, dazioLivello3];
  const livelloConValore = allLivelli.find(l => l.perc !== null && l.perc > 0);
  const livelloZero = allLivelli.find(l => l.perc !== null && l.perc === 0);
  
  if (livelloConValore) {
    // Se un livello ha un valore > 0, usa quello (più affidabile di un 0% generico)
    dazioPerc = livelloConValore.perc;
    dazioFonte = livelloConValore.fonte;
    dazioTipo = livelloConValore.tipo;
  } else if (livelloZero) {
    // Tutti i livelli che hanno dato un valore dicono 0% — ma controlla dazi specifici
    if (hasDazioSpecifico) {
      // C'è un dazio specifico (es. $0.05/kg) — 0% ad valorem è fuorviante
      dazioPerc = 0;
      dazioFonte = livelloZero.fonte;
      dazioTipo = livelloZero.tipo + ' (+ dazio specifico)';
    } else {
      dazioPerc = 0;
      dazioFonte = livelloZero.fonte;
      dazioTipo = livelloZero.tipo;
    }
  }
  // Se tutti null, dazioPerc resta null
  
  // === 3. IVA LOCALE ===
  let ivaPerc = null;
  let ivaFonte = null;
  
  const a2m = mercatoTrade?.web_enrichment?.access2markets;
  if (a2m) {
    const tryParse = (v) => {
      if (v == null) return null;
      if (typeof v === 'number') return v;
      const n = parseFloat(String(v).replace(/[%,]/g, '').trim());
      return !isNaN(n) && n >= 0 ? n : null;
    };
    const iva = tryParse(a2m.iva_locale_valore) ?? tryParse(a2m.iva_locale);
    if (iva !== null) { ivaPerc = iva; ivaFonte = 'Access2Markets'; }
  }
  if (ivaPerc === null) {
    const lgd = mercatoAnalisi.logistica_dogane_gtm;
    if (lgd?.iva_gst_locale) {
      const n = parseFloat(String(lgd.iva_gst_locale).replace(/[^0-9.]/g, ''));
      if (!isNaN(n) && n >= 0) { ivaPerc = n; ivaFonte = 'Analisi AI'; }
    }
  }
  
  // === 4. MARGINI INTERMEDIARI (dalla struttura margini AI) ===
  let margineIntermediariPerc = null;
  const sm = mercatoAnalisi.struttura_margini;
  if (sm) {
    // Somma i margini della catena: importatore + distributore
    const parse = (v) => {
      if (!v) return 0;
      const match = String(v).match(/(\d+(?:\.\d+)?)/);
      return match ? parseFloat(match[1]) : 0;
    };
    const mi = parse(sm.margine_importatore);
    const md = parse(sm.margine_distributore);
    if (mi > 0 || md > 0) margineIntermediariPerc = mi + md;
  }
  
  // === 5. DIMENSIONE MERCATO ===
  let importTotaleUsd = null;
  if (mercatoTrade?.import_totale?.valore_usd) {
    importTotaleUsd = parseFloat(String(mercatoTrade.import_totale.valore_usd).replace(/[^0-9.]/g, ''));
  }
  
  // === 6. TOP FORNITORI ===
  const topFornitori = mercatoTrade?.top_fornitori?.slice(0, 5) || [];
  
  // === 7. POSIZIONE ITALIA ===
  const posizioneItalia = mercatoTrade?.posizione_exporter || mercatoTrade?.posizione_italia;
  const quotaItalia = mercatoTrade?.quota_exporter || mercatoTrade?.quota_italia;
  
  // === 8. CERTIFICAZIONI OBBLIGATORIE ===
  const certObbligatorie = a2m?.certificazioni_obbligatorie || 
    mercatoAnalisi.verifica_normativa?.autorizzazioni_necessarie?.filter(a => a?.tipo === 'obbligatorio').map(a => a?.requisito).filter(Boolean) || [];
  
  // === 9. CALCOLO CONTO DELLA SERVA ===
  let calcolo = null;
  if (costoIndustriale && prezzoVendita) {
    const dazioEuro = dazioPerc !== null ? costoIndustriale * (dazioPerc / 100) : null;
    const costoConDazio = dazioEuro !== null ? costoIndustriale + dazioEuro : null;
    
    // Margine lordo prima dei costi export
    const margineLordoPct = ((prezzoVendita - costoIndustriale) / prezzoVendita * 100);
    
    // Costo totale export (solo componenti noti)
    let costoTotaleExport = costoIndustriale;
    const vociCosto = [{ voce: 'Costo industriale', valore: costoIndustriale, fonte: 'Dato utente' }];
    
    if (dazioEuro !== null) {
      costoTotaleExport += dazioEuro;
      vociCosto.push({ voce: `Dazio (${dazioPerc}% ${dazioTipo})`, valore: dazioEuro, fonte: dazioFonte });
    }
    
    // Margine reale per te (prezzo vendita - costo totale componenti noti)
    const guadagnoPerUnita = prezzoVendita - costoTotaleExport;
    const margineRealePerc = (guadagnoPerUnita / prezzoVendita * 100);
    
    // Voci mancanti (non calcolate)
    const vociMancanti = [];
    if (dazioPerc === null) vociMancanti.push('Dazio doganale');
    vociMancanti.push('Trasporto internazionale');
    vociMancanti.push('Sdoganamento e burocrazia');
    if (margineIntermediariPerc) vociMancanti.push(`Margini intermediari (~${margineIntermediariPerc}%)`);
    
    calcolo = {
      costoIndustriale,
      prezzoVendita,
      dazioPerc,
      dazioEuro,
      dazioFonte,
      dazioTipo,
      costoTotaleExport,
      vociCosto,
      vociMancanti,
      guadagnoPerUnita,
      margineLordoPct: margineLordoPct.toFixed(1),
      margineRealePerc: margineRealePerc.toFixed(1),
      margineIntermediariPerc,
      calcoloCompleto: dazioPerc !== null
    };
  }
  
  // === 10. VERDETTO ===
  let verdetto = 'DATI_INSUFFICIENTI';
  let verdettoMotivo = '';
  
  if (calcolo) {
    const mr = parseFloat(calcolo.margineRealePerc);
    if (mr > 30) {
      verdetto = 'CONVIENE';
      verdettoMotivo = `Margine lordo del ${calcolo.margineRealePerc}% — c'è spazio per coprire trasporto, intermediari e burocrazia.`;
    } else if (mr > 15) {
      verdetto = 'DA_VALUTARE';
      verdettoMotivo = `Margine lordo del ${calcolo.margineRealePerc}% — sufficiente ma i costi di trasporto e intermediari potrebbero erodere il guadagno. Serve un preventivo logistico.`;
    } else if (mr > 0) {
      verdetto = 'RISCHIO_ALTO';
      verdettoMotivo = `Margine lordo solo del ${calcolo.margineRealePerc}% — molto stretto. Aggiungendo trasporto e intermediari potresti andare in perdita.`;
    } else {
      verdetto = 'NON_CONVIENE';
      verdettoMotivo = `Il costo totale (€${calcolo.costoTotaleExport.toFixed(2)}) supera già il prezzo di vendita (€${prezzoVendita.toFixed(2)}) — operazione in perdita.`;
    }
  } else if (!costoIndustriale || !prezzoVendita) {
    verdettoMotivo = 'Inserisci il costo industriale e il prezzo di vendita per calcolare il margine.';
  }
  
  // Aggiusta il verdetto considerando certificazioni mancanti (blocco operativo)
  const certUtente = Array.isArray(exportForm?.certificazioni) ? exportForm.certificazioni : [];
  const certMancanti = certObbligatorie.filter(c => 
    !certUtente.some(cu => cu.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(cu.toLowerCase()))
  );
  const hasBloccoNormativo = certMancanti.length > 0;
  
  return {
    calcolo,
    verdetto,
    verdettoMotivo,
    dazioPerc,
    dazioFonte,
    dazioTipo,
    ivaPerc,
    ivaFonte,
    importTotaleUsd,
    topFornitori,
    posizioneItalia,
    quotaItalia,
    certObbligatorie,
    certMancanti,
    hasBloccoNormativo,
    margineIntermediariPerc,
    mercatoNome: mercatoAnalisi.paese_nome || mercatoAnalisi.mercato,
    punteggioOpportunita: mercatoAnalisi.punteggio_opportunita,
    conclusioneOperativa: mercatoAnalisi.conclusione_operativa,
    difficoltaIngresso: mercatoAnalisi.canali_ingresso?.entry_strategy?.estimated_entry_complexity,
    confrontoImportGlobale: mercatoAnalisi.confronto_import_globale || null,
  };
}

function formatMoney(v) {
  if (v == null || isNaN(v)) return 'N/D';
  return `€${v.toFixed(2)}`;
}

function formatBigMoney(usd) {
  if (!usd || isNaN(usd)) return 'N/D';
  if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)} miliardi`;
  if (usd >= 1e6) return `$${(usd / 1e6).toFixed(1)} milioni`;
  if (usd >= 1e3) return `$${(usd / 1e3).toFixed(0)} mila`;
  return `$${usd.toFixed(0)}`;
}

const VERDETTO_CONFIG = {
  CONVIENE: { 
    bg: 'bg-green-500/15 border-green-500/30', 
    textColor: 'text-green-400', 
    icon: CheckCircle,
    label: '✅ Conviene esportare',
    sublabel: 'I numeri sono a tuo favore'
  },
  DA_VALUTARE: { 
    bg: 'bg-yellow-500/15 border-yellow-500/30', 
    textColor: 'text-yellow-400', 
    icon: AlertTriangle,
    label: '⚠️ Da valutare con attenzione',
    sublabel: 'Il margine c\'è, ma è stretto'
  },
  RISCHIO_ALTO: { 
    bg: 'bg-orange-500/15 border-orange-500/30', 
    textColor: 'text-orange-400', 
    icon: AlertTriangle,
    label: '🔶 Rischio elevato',
    sublabel: 'Margine troppo basso per i costi export'
  },
  NON_CONVIENE: { 
    bg: 'bg-red-500/15 border-red-500/30', 
    textColor: 'text-red-400', 
    icon: XCircle,
    label: '❌ Non conviene',
    sublabel: 'Operazione in perdita'
  },
  DATI_INSUFFICIENTI: { 
    bg: 'bg-slate-500/15 border-slate-500/30', 
    textColor: 'text-slate-400', 
    icon: AlertTriangle,
    label: 'Dati insufficienti',
    sublabel: 'Compila costo industriale e prezzo di vendita'
  }
};

function VociCostoTable({ calcolo }) {
  if (!calcolo) return null;
  
  return (
    <div className="space-y-1.5">
      <p className="text-white text-[10px] font-semibold uppercase tracking-wider">Il conto — quanto ti costa esportare 1 unità</p>
      
      {calcolo.vociCosto.map((v, i) => (
        <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-xs">{v.voce}</span>
            <span className="text-white/40 text-[9px]">({v.fonte})</span>
          </div>
          <span className="text-white font-mono text-sm font-semibold">{formatMoney(v.valore)}</span>
        </div>
      ))}
      
      {/* Totale costi noti */}
      <div className="flex items-center justify-between py-2 border-t-2 border-white/10">
        <span className="text-white font-semibold text-xs">Costo totale (noto)</span>
        <span className="text-white font-mono text-sm font-bold">{formatMoney(calcolo.costoTotaleExport)}</span>
      </div>
      
      {/* Prezzo di vendita */}
      <div className="flex items-center justify-between py-2 bg-white/5 rounded-lg px-3 -mx-1">
        <span className="text-lime-400 font-semibold text-xs">Tuo prezzo di vendita</span>
        <span className="text-lime-400 font-mono text-sm font-bold">{formatMoney(calcolo.prezzoVendita)}</span>
      </div>
      
      {/* Guadagno per unità */}
      <div className="flex items-center justify-between py-2 bg-white/5 rounded-lg px-3 -mx-1">
        <span className={`font-semibold text-xs ${calcolo.guadagnoPerUnita >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {calcolo.guadagnoPerUnita >= 0 ? '→ Guadagno per unità' : '→ Perdita per unità'}
        </span>
        <span className={`font-mono text-sm font-bold ${calcolo.guadagnoPerUnita >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatMoney(Math.abs(calcolo.guadagnoPerUnita))}
        </span>
      </div>
      
      {/* Attenzione: voci non incluse */}
      {calcolo.vociMancanti.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mt-2">
          <p className="text-amber-400 text-[10px] font-bold mb-1">⚠ Costi NON ancora inclusi nel calcolo:</p>
          <ul className="text-amber-200/80 text-[10px] space-y-0.5">
            {calcolo.vociMancanti.map((v, i) => (
              <li key={i}>• {v}</li>
            ))}
          </ul>
          <p className="text-amber-300/80 text-[9px] mt-1.5 italic">
            Il margine reale sarà inferiore a quello mostrato. Chiedi un preventivo di trasporto per un calcolo preciso.
          </p>
        </div>
      )}
    </div>
  );
}

function MercatoContextSection({ data }) {
  return (
    <div className="space-y-2 mt-3">
      {/* Dimensione mercato */}
      {data.importTotaleUsd && (
        <div className="flex items-start gap-2.5 p-2.5 bg-white/[0.03] rounded-lg">
          <TrendingUp className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-white text-xs font-medium">Questo mercato importa {formatBigMoney(data.importTotaleUsd)} di questo prodotto</p>
            <p className="text-white/60 text-[10px]">Più il numero è grande, più c'è domanda</p>
            {/* Confronto con altri mercati */}
            {data.confrontoImportGlobale && (
              <div className="mt-2 space-y-1 border-t border-white/5 pt-2">
                {data.confrontoImportGlobale.paese_importa_di_piu?.nome && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-green-400 text-[10px]">▲</span>
                    <p className="text-white/70 text-[10px]">
                      <span className="font-semibold text-white/90">{data.confrontoImportGlobale.paese_importa_di_piu.nome}</span> importa {data.confrontoImportGlobale.paese_importa_di_piu.valore_usd || 'N/D'}
                      {data.confrontoImportGlobale.paese_importa_di_piu.fonte && (
                        <span className="text-white/40"> ({data.confrontoImportGlobale.paese_importa_di_piu.fonte})</span>
                      )}
                    </p>
                  </div>
                )}
                {data.confrontoImportGlobale.paese_importa_di_meno?.nome && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-orange-400 text-[10px]">▼</span>
                    <p className="text-white/70 text-[10px]">
                      <span className="font-semibold text-white/90">{data.confrontoImportGlobale.paese_importa_di_meno.nome}</span> importa {data.confrontoImportGlobale.paese_importa_di_meno.valore_usd || 'N/D'}
                      {data.confrontoImportGlobale.paese_importa_di_meno.fonte && (
                        <span className="text-white/40"> ({data.confrontoImportGlobale.paese_importa_di_meno.fonte})</span>
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Posizione Italia */}
      {data.posizioneItalia && (
        <div className="flex items-start gap-2.5 p-2.5 bg-white/[0.03] rounded-lg">
          <Users className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-xs font-medium">
              L'Italia è il fornitore {data.posizioneItalia} 
              {data.quotaItalia ? ` con il ${data.quotaItalia} del mercato` : ''}
            </p>
            <p className="text-white/60 text-[10px]">Significa che i prodotti italiani sono già conosciuti qui</p>
          </div>
        </div>
      )}
      
      {/* Top concorrenti */}
      {data.topFornitori.length > 0 && (
        <div className="flex items-start gap-2.5 p-2.5 bg-white/[0.03] rounded-lg">
          <Shield className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-xs font-medium">I tuoi principali concorrenti:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.topFornitori.map((f, i) => (
                <span key={i} className="bg-white/5 text-white px-2 py-0.5 rounded text-[10px]">
                  {typeof f === 'string' ? f : `${f.paese || ''} ${f.quota_percentuale || ''}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Dazio */}
      <div className="flex items-start gap-2.5 p-2.5 bg-white/[0.03] rounded-lg">
        <FileText className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-white text-xs font-medium">
            {data.dazioPerc !== null 
              ? `Dazio doganale: ${data.dazioPerc}% (${data.dazioTipo})`
              : 'Dazio doganale: non disponibile dalle fonti consultate'
            }
          </p>
          {data.dazioPerc !== null && (
            <p className="text-white/60 text-[10px]">
              È la "tassa di ingresso" che il paese applica ai prodotti importati
              {data.dazioFonte ? ` — fonte: ${data.dazioFonte}` : ''}
            </p>
          )}
          {data.ivaPerc !== null && (
            <p className="text-white/60 text-[10px] mt-0.5">
              IVA locale: {data.ivaPerc}% {data.ivaFonte ? `(${data.ivaFonte})` : ''}
            </p>
          )}
        </div>
      </div>
      
      {/* Certificazioni obbligatorie */}
      {data.certObbligatorie.length > 0 && (
        <div className="flex items-start gap-2.5 p-2.5 bg-white/[0.03] rounded-lg">
          <Shield className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-xs font-medium">Certificazioni obbligatorie per entrare:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.certObbligatorie.map((c, i) => {
                const mancante = data.certMancanti.includes(c);
                return (
                  <span key={i} className={`px-2 py-0.5 rounded text-[10px] border ${
                    mancante 
                      ? 'bg-red-500/15 text-red-400 border-red-500/30' 
                      : 'bg-green-500/10 text-green-400 border-green-500/20'
                  }`}>
                    {mancante ? '❌' : '✅'} {c}
                  </span>
                );
              })}
            </div>
            {data.hasBloccoNormativo && (
              <p className="text-red-400 text-[10px] mt-1.5 font-semibold">
                ⛔ Ti mancano delle certificazioni obbligatorie — non puoi esportare finché non le ottieni.
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Difficoltà ingresso */}
      {data.difficoltaIngresso && (
        <div className="flex items-start gap-2.5 p-2.5 bg-white/[0.03] rounded-lg">
          <Package className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white text-xs font-medium">
              Difficoltà di ingresso: {
                data.difficoltaIngresso === 'Low' ? '🟢 Bassa — accessibile' :
                data.difficoltaIngresso === 'Medium' ? '🟡 Media — serve preparazione' :
                '🔴 Alta — complesso e costoso'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SingleMarketVerdict({ mercatoAnalisi, tradeData, exportForm, macroData }) {
  const [expanded, setExpanded] = useState(true);
  const data = buildContoServa(mercatoAnalisi, tradeData, exportForm, macroData);
  const config = VERDETTO_CONFIG[data.verdetto];
  const Icon = config.icon;
  const flagUrl = getFlagUrl(data.calcolo ? mercatoAnalisi.paese_code : '');
  
  return (
    <Card className={`border overflow-hidden ${config.bg}`}>
      {/* Header con bandiera e verdetto */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        {mercatoAnalisi.paese_code && (
          <img 
            src={getFlagUrl(mercatoAnalisi.paese_code)} 
            alt="" 
            className="w-8 h-6 rounded object-cover flex-shrink-0 border border-white/10"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm">{data.mercatoNome}</p>
          <p className={`text-xs font-semibold ${config.textColor}`}>{config.label}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {data.punteggioOpportunita != null && (
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm ${
              data.punteggioOpportunita >= 7 ? 'bg-green-500/20 text-green-400' :
              data.punteggioOpportunita >= 5 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
            }`}>{data.punteggioOpportunita}</div>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      
      {expanded && (
        <CardContent className="px-4 pb-4 pt-0 space-y-4">
          {/* Motivazione verdetto */}
          <div className={`rounded-lg p-3 ${config.bg}`}>
            <div className="flex items-start gap-2">
              <Icon className={`w-5 h-5 ${config.textColor} flex-shrink-0 mt-0.5`} />
              <p className={`text-sm leading-relaxed ${config.textColor}`}>{data.verdettoMotivo}</p>
            </div>
          </div>
          
          {/* Il conto */}
          {data.calcolo && <VociCostoTable calcolo={data.calcolo} />}
          
          {/* Blocco normativo */}
          {data.hasBloccoNormativo && (
            <div className="bg-red-500/15 border-2 border-red-500/40 rounded-xl p-3">
              <p className="text-red-400 font-bold text-xs mb-1">⛔ BLOCCO NORMATIVO</p>
              <p className="text-red-200/80 text-xs">
                Ti mancano certificazioni obbligatorie ({data.certMancanti.join(', ')}). 
                Prima di qualsiasi calcolo economico, devi ottenere queste certificazioni — senza non puoi nemmeno spedire.
              </p>
            </div>
          )}
          
          {/* Contesto mercato */}
          <MercatoContextSection data={data} />
          
          {/* Conclusione operativa dall'AI */}
          {data.conclusioneOperativa && (
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 mt-2">
              <p className="text-lime-400 text-[10px] font-bold uppercase tracking-wider mb-1">💡 Cosa fare concretamente</p>
              <p className="text-white/80 text-xs leading-relaxed">{data.conclusioneOperativa}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function ExportVerdictCard({ analysisResult, tradeData, exportForm, macroData }) {
  if (!analysisResult?.mercati_analisi || analysisResult.mercati_analisi.length === 0) return null;
  
  return (
    <div className="space-y-3">
      {/* Titolo sezione */}
      <div className="flex items-center gap-2.5 mb-1">
        <DollarSign className="w-5 h-5 text-lime-400" />
        <div>
          <h2 className="text-white font-bold text-base">Il verdetto — ti conviene esportare?</h2>
          <p className="text-white/60 text-[10px]">Calcoli reali basati sui tuoi dati e le fonti ufficiali</p>
        </div>
      </div>
      
      {analysisResult.mercati_analisi.map((m, idx) => (
        <SingleMarketVerdict 
          key={m.paese_code || idx}
          mercatoAnalisi={m}
          tradeData={tradeData}
          exportForm={exportForm}
          macroData={macroData}
        />
      ))}
    </div>
  );
}