import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  Globe, ExternalLink, ChevronDown, ChevronUp, Loader2, 
  AlertTriangle, CheckCircle, BookOpen, RefreshCw, ShieldAlert, Info 
} from 'lucide-react';

function StatusBadge({ classificazione }) {
  const isUfficiale = classificazione?.includes('Ufficiale') || classificazione?.includes('Istituzionale');
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
      isUfficiale 
        ? 'bg-green-500/15 text-green-400 border-green-500/30' 
        : 'bg-red-500/15 text-red-400 border-red-500/30'
    }`}>
      {classificazione || 'Non verificato'}
    </span>
  );
}

function LinkRow({ label, url, note }) {
  if (!url) return null;
  return (
    <div className="flex items-start gap-2 py-1">
      <ExternalLink className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-slate-400 text-[10px]">{label}: </span>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-[10px] hover:text-cyan-300 break-all">
          {url}
        </a>
        {note && <p className="text-slate-500 text-[9px] mt-0.5">{note}</p>}
      </div>
    </div>
  );
}

function DatoTrovato({ label, valore, fonte, warning }) {
  const valStr = valore != null ? String(valore) : '';
  const nonDisponibile = !valore || valStr === 'null' || valStr.toLowerCase().includes('non reperito') || valStr.toLowerCase().includes('consultare');
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-white/5 last:border-0 gap-2">
      <span className="text-slate-400 text-[10px] flex-shrink-0">{label}</span>
      <div className="text-right">
        <span className={`text-[10px] font-semibold ${nonDisponibile ? 'text-slate-500 italic' : warning ? 'text-amber-400' : 'text-white'}`}>
          {valStr || 'Non disponibile'}
        </span>
        {fonte && <p className="text-slate-600 text-[8px] mt-0.5">{fonte}</p>}
      </div>
    </div>
  );
}

export default function CustomsDutyGuideCard({ countryCode, countryName, hsCode, productDescription }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const handleFetch = async () => {
    if (data) {
      setExpanded(!expanded);
      return;
    }
    setLoading(true);
    setError(null);
    const response = await base44.functions.invoke('customsDutyLookup', {
      country_code: countryCode,
      country_name: countryName,
      hs_code: hsCode,
      product_description: productDescription
    });
    if (response.data?.error) {
      setError(response.data.error);
    } else {
      setData(response.data);
      setExpanded(true);
    }
    setLoading(false);
  };

  const f = data?.fonte_ufficiale;
  const nav = data?.percorso_navigazione;
  const dati = data?.dati_trovati;
  const agg = data?.aggiornamenti;
  const lim = data?.limiti;
  const risorse = data?.risorse_complementari;

  return (
    <div className="bg-slate-800/60 border border-white/5 rounded-xl overflow-hidden">
      {/* Header — bottone per aprire */}
      <button
        onClick={handleFetch}
        disabled={loading}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <span className="text-white font-bold text-xs">Guida Doganale Operativa</span>
          {f && <StatusBadge classificazione={f.classificazione} />}
        </div>
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
        ) : (
          expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {error && (
        <div className="px-4 pb-3">
          <p className="text-red-400 text-[10px]">Errore: {error}</p>
        </div>
      )}

      {expanded && data && (
        <div className="border-t border-white/5">
          {/* BLOCCO 0 — Spiegazione Semplice per l'imprenditore */}
          {data.spiegazione_semplice && (
            <div className="px-4 py-3 border-b border-white/5">
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-3.5">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <span className="text-sm">💡</span>
                  </div>
                  <span className="text-amber-400 text-xs font-bold">In parole semplici</span>
                  {data.spiegazione_semplice.livello_difficolta && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      data.spiegazione_semplice.livello_difficolta === 'facile' ? 'bg-green-500/15 text-green-400 border-green-500/30' :
                      data.spiegazione_semplice.livello_difficolta === 'medio' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                      'bg-red-500/15 text-red-400 border-red-500/30'
                    }`}>
                      {data.spiegazione_semplice.livello_difficolta === 'facile' ? '✅ Facile' :
                       data.spiegazione_semplice.livello_difficolta === 'medio' ? '⚠️ Medio' : '🔴 Complesso'}
                    </span>
                  )}
                </div>
                {data.spiegazione_semplice.cosa_significa && (
                  <p className="text-white text-[11px] leading-relaxed mb-2">{data.spiegazione_semplice.cosa_significa}</p>
                )}
                {data.spiegazione_semplice.quanto_costa && (
                  <p className="text-lime-400 text-[11px] font-semibold mb-2">💰 {data.spiegazione_semplice.quanto_costa}</p>
                )}
                {data.spiegazione_semplice.cosa_fare && (
                  <p className="text-cyan-400 text-[11px] mb-2">👉 {data.spiegazione_semplice.cosa_fare}</p>
                )}
                {data.spiegazione_semplice.attenzione && (
                  <p className="text-orange-400/90 text-[10px] italic mt-1">⚠ {data.spiegazione_semplice.attenzione}</p>
                )}
              </div>
            </div>
          )}

          {/* BLOCCO 0b — Esempio Calcolo su €10.000 */}
          {data.esempio_calcolo && data.esempio_calcolo.totale_tasse_eur && (
            <div className="px-4 py-3 border-b border-white/5">
              <div className="bg-slate-700/50 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <span className="text-sm">📊</span>
                  <span className="text-lime-400 text-[10px] font-bold uppercase tracking-wider">Esempio su €10.000 FOB</span>
                </div>
                <div className="space-y-1.5">
                  <CalcRow label="Valore merce (FOB)" value="€10.000,00" />
                  {data.esempio_calcolo.dazio_importazione_eur > 0 && (
                    <CalcRow label="+ Dazio importazione" value={`€${Number(data.esempio_calcolo.dazio_importazione_eur).toLocaleString('it-IT', {minimumFractionDigits: 2})}`} />
                  )}
                  {data.esempio_calcolo.anti_dumping_eur > 0 && (
                    <CalcRow label="+ Anti-dumping" value={`€${Number(data.esempio_calcolo.anti_dumping_eur).toLocaleString('it-IT', {minimumFractionDigits: 2})}`} warn />
                  )}
                  {data.esempio_calcolo.altre_tasse_eur > 0 && (
                    <CalcRow label="+ Altre tasse" value={`€${Number(data.esempio_calcolo.altre_tasse_eur).toLocaleString('it-IT', {minimumFractionDigits: 2})}`} />
                  )}
                  {data.esempio_calcolo.iva_eur > 0 && (
                    <CalcRow label={`+ IVA/GST`} value={`€${Number(data.esempio_calcolo.iva_eur).toLocaleString('it-IT', {minimumFractionDigits: 2})}`} />
                  )}
                  <div className="border-t border-lime-400/20 my-1" />
                  <CalcRow label="TOTALE TASSE (escluso trasporto)" value={`€${Number(data.esempio_calcolo.totale_tasse_eur).toLocaleString('it-IT', {minimumFractionDigits: 2})}`} bold />
                </div>
                {data.esempio_calcolo.nota && (
                  <p className="text-slate-400 text-[9px] mt-2 italic">{data.esempio_calcolo.nota}</p>
                )}
              </div>
            </div>
          )}

          {/* BLOCCO A — Fonte Ufficiale */}
          {f && (
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400 text-[10px] font-bold uppercase tracking-wider">Fonte Ufficiale</span>
              </div>
              <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white text-xs font-semibold">{f.ente_nome}</span>
                  <StatusBadge classificazione={f.classificazione} />
                </div>
                {f.ente_nome_locale && f.ente_nome_locale !== f.ente_nome && (
                  <p className="text-slate-400 text-[10px] italic">{f.ente_nome_locale}</p>
                )}
                <LinkRow label="Pagina tariffaria" url={f.url_tariffario} />
                <LinkRow label="Homepage ente" url={f.url_homepage} />
                {f.portale_ricerca_tariffe && (
                  <LinkRow label="Portale ricerca tariffe" url={f.portale_ricerca_tariffe} />
                )}
                {f.note && <p className="text-slate-500 text-[9px] mt-1">{f.note}</p>}
              </div>
            </div>
          )}

          {/* BLOCCO B — Come trovare i dazi */}
          {nav && nav.passaggi?.length > 0 && (
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-1.5 mb-2">
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider">Come trovare i dazi</span>
              </div>
              <div className="space-y-2">
                {nav.passaggi.map((p) => (
                  <div key={p.step} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-cyan-400 text-[9px] font-bold">{p.step}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-[11px] font-medium">{p.azione}</p>
                      {p.dettaglio && <p className="text-slate-400 text-[10px] mt-0.5">{p.dettaglio}</p>}
                    </div>
                  </div>
                ))}
              </div>
              {/* Indicazioni specifiche */}
              <div className="mt-3 space-y-1 bg-white/[0.02] rounded-lg p-2.5">
                {nav.dove_inserire_hs && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-400 text-[10px]">📍</span>
                    <p className="text-slate-300 text-[10px]"><strong className="text-amber-400">Codice HS:</strong> {nav.dove_inserire_hs}</p>
                  </div>
                )}
                {nav.dove_leggere_dazio && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-400 text-[10px]">📍</span>
                    <p className="text-slate-300 text-[10px]"><strong className="text-amber-400">Dazio:</strong> {nav.dove_leggere_dazio}</p>
                  </div>
                )}
                {nav.dove_leggere_iva && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-400 text-[10px]">📍</span>
                    <p className="text-slate-300 text-[10px]"><strong className="text-amber-400">IVA/GST:</strong> {nav.dove_leggere_iva}</p>
                  </div>
                )}
                {nav.dove_imposte_aggiuntive && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-400 text-[10px]">📍</span>
                    <p className="text-slate-300 text-[10px]"><strong className="text-amber-400">Altre imposte:</strong> {nav.dove_imposte_aggiuntive}</p>
                  </div>
                )}
              </div>
              {nav.access2markets_guida && (
                <div className="mt-2 bg-blue-500/5 border border-blue-500/10 rounded-lg p-2.5">
                  <p className="text-blue-400 text-[10px] font-bold mb-1">🇪🇺 Access2Markets (fonte complementare UE)</p>
                  <p className="text-slate-300 text-[10px]">{nav.access2markets_guida}</p>
                </div>
              )}
            </div>
          )}

          {/* BLOCCO C — Dati trovati */}
          {dati && (
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-1.5 mb-2">
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-indigo-400 text-[10px] font-bold uppercase tracking-wider">Dati Trovati</span>
                {dati.dato_verificato !== undefined && (
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                    dati.dato_verificato 
                      ? 'bg-green-500/15 text-green-400 border-green-500/30' 
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}>
                    {dati.dato_verificato ? 'Verificato' : 'Da confermare'}
                  </span>
                )}
              </div>
              <div className="bg-white/[0.02] rounded-lg p-2.5">
                <DatoTrovato label="Dazio MFN" valore={dati.dazio_mfn} fonte={dati.dazio_mfn_fonte} />
                <DatoTrovato label="Dazio pref. EU" valore={dati.dazio_preferenziale_eu} fonte={dati.dazio_preferenziale_fonte} />
                {dati.accordo_commerciale && (
                  <div className="py-1.5 border-b border-white/5">
                    <span className="text-slate-400 text-[10px]">Accordo: </span>
                    <span className="text-white text-[10px] font-medium">{dati.accordo_commerciale}</span>
                  </div>
                )}
                <DatoTrovato label={dati.iva_gst_tipo || 'IVA/GST'} valore={dati.iva_gst} fonte={dati.iva_gst_fonte} />
                {dati.altre_imposte?.length > 0 && dati.altre_imposte.map((imp, i) => (
                  <DatoTrovato key={i} label={imp.nome} valore={imp.valore} fonte={imp.fonte} warning />
                ))}
              </div>
              {dati.nota_verifica && (
                <p className="text-amber-400/80 text-[9px] mt-1.5 italic">⚠ {dati.nota_verifica}</p>
              )}
            </div>
          )}

          {/* BLOCCO D — Aggiornamenti */}
          {agg && (
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-1.5 mb-2">
                <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-teal-400 text-[10px] font-bold uppercase tracking-wider">Aggiornamenti</span>
              </div>
              <div className="space-y-1.5">
                <LinkRow label="Sezione aggiornamenti" url={agg.url_aggiornamenti} note={agg.sezione_nome} />
                {agg.dove_pubblicati && (
                  <p className="text-slate-300 text-[10px]"><span className="text-slate-500">Dove:</span> {agg.dove_pubblicati}</p>
                )}
                {agg.frequenza && (
                  <p className="text-slate-300 text-[10px]"><span className="text-slate-500">Frequenza:</span> {agg.frequenza}</p>
                )}
                <p className="text-slate-300 text-[10px]">
                  <span className="text-slate-500">Ultimo agg.:</span>{' '}
                  <span className={agg.ultimo_aggiornamento === 'Non indicata' ? 'text-amber-400 italic' : 'text-white font-medium'}>
                    {agg.ultimo_aggiornamento || 'Non indicata'}
                  </span>
                </p>
                {agg.gazzetta_ufficiale && (
                  <p className="text-slate-300 text-[10px]"><span className="text-slate-500">Gazzetta:</span> {agg.gazzetta_ufficiale}</p>
                )}
              </div>
            </div>
          )}

          {/* BLOCCO E — Limiti */}
          {lim && (
            <div className="px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-orange-400 text-[10px] font-bold uppercase tracking-wider">Limiti & Avvertenze</span>
              </div>
              {lim.cosa_non_mostra?.length > 0 && (
                <div className="mb-2">
                  <p className="text-slate-500 text-[9px] font-semibold mb-1">Cosa il sito NON mostra:</p>
                  <ul className="text-slate-400 text-[10px] space-y-0.5">
                    {lim.cosa_non_mostra.map((c, i) => <li key={i}>• {c}</li>)}
                  </ul>
                </div>
              )}
              {lim.calcoli_manuali_necessari && (
                <p className="text-slate-300 text-[10px] mb-1"><span className="text-slate-500">Calcoli manuali:</span> {lim.calcoli_manuali_necessari}</p>
              )}
              {lim.broker_necessario && (
                <div className="bg-orange-500/5 border border-orange-500/10 rounded-lg p-2 mb-1.5">
                  <p className="text-orange-400 text-[10px] font-bold">⚠ Broker/importatore locale consigliato</p>
                  {lim.broker_nota && <p className="text-slate-400 text-[10px] mt-0.5">{lim.broker_nota}</p>}
                </div>
              )}
              {lim.complessita_tariffaria && (
                <p className="text-slate-300 text-[10px] mb-1"><span className="text-slate-500">Complessità:</span> {lim.complessita_tariffaria}</p>
              )}
              {lim.lingue_disponibili?.length > 0 && (
                <p className="text-slate-400 text-[10px]">
                  <span className="text-slate-500">Lingue sito:</span> {lim.lingue_disponibili.join(', ')}
                </p>
              )}
            </div>
          )}

          {/* BLOCCO F — Risorse Complementari */}
          {risorse?.length > 0 && (
            <div className="px-4 py-3">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">Risorse Complementari</p>
              <div className="space-y-1">
                {risorse.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 py-1">
                    <ExternalLink className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {r.url ? (
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-[10px] hover:text-cyan-300">
                          {r.nome}
                        </a>
                      ) : (
                        <span className="text-slate-300 text-[10px]">{r.nome}</span>
                      )}
                      <span className="text-slate-600 text-[9px] ml-1">({r.tipo})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          {data.timestamp && (
            <div className="px-4 py-2 border-t border-white/5">
              <p className="text-slate-600 text-[9px]">
                Consultazione: {new Date(data.timestamp).toLocaleString('it-IT')} · HS {data.hs_code} · {countryName}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}