import React from 'react';
import { Shield, Building2, ShoppingBag, Percent, Truck, Search, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

function DataRow({ label, value, warning }) {
  const safeValue = (value != null && typeof value === 'object') ? JSON.stringify(value) : value;
  if (!safeValue || safeValue === 'N/D' || safeValue === 'Non disponibile') {
    return (
      <div className="flex justify-between items-start py-1.5 border-b border-white/5 last:border-0">
        <span className="text-slate-500 text-xs">{label}</span>
        <span className="text-slate-600 text-xs italic">Non disponibile</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-start py-1.5 border-b border-white/5 last:border-0 gap-4">
      <span className="text-slate-400 text-xs flex-shrink-0">{label}</span>
      <span className={`text-xs text-right ${warning ? 'text-amber-400' : 'text-white'}`}>{safeValue}</span>
    </div>
  );
}

function PhaseSection({ title, icon: Icon, iconColor, phaseNum, children }) {
  const bgMap = {
    'text-red-400': 'bg-red-500/20',
    'text-teal-400': 'bg-teal-500/20',
    'text-cyan-400': 'bg-cyan-500/20',
    'text-emerald-400': 'bg-emerald-500/20',
    'text-blue-400': 'bg-blue-500/20',
    'text-purple-400': 'bg-purple-500/20',
  };
  const bgClass = bgMap[iconColor] || 'bg-slate-500/20';
  return (
    <div className="bg-slate-800/60 border border-white/5 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black ${bgClass} ${iconColor}`}>
          {phaseNum}
        </div>
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-white font-bold text-sm">{title}</span>
      </div>
      <div className="px-4 pb-4 pt-3">{children}</div>
    </div>
  );
}

function RequisitoTag({ tipo }) {
  const styles = {
    obbligatorio: 'bg-red-500/15 text-red-400 border-red-500/30',
    consigliato: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    opzionale: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    non_applicabile: 'bg-slate-500/15 text-slate-400 border-slate-500/30'
  };
  const labels = {
    obbligatorio: 'Obbligatorio',
    consigliato: 'Consigliato',
    opzionale: 'Opzionale',
    non_applicabile: 'N/A'
  };
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${styles[tipo] || styles.opzionale}`}>
      {labels[tipo] || tipo}
    </span>
  );
}

// FASE 1 — Verifica Normativa Obbligatoria
export function VerificaNormativaCard({ data }) {
  if (!data) return null;
  return (
    <PhaseSection title="Verifica Normativa Obbligatoria" icon={Shield} iconColor="text-red-400" phaseNum="1">
      {data.normative_importazione && (
        <div className="mb-3">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Normative di importazione</p>
          <p className="text-slate-300 text-xs leading-relaxed">{data.normative_importazione}</p>
        </div>
      )}

      {data.autorizzazioni_necessarie?.length > 0 && (
        <div className="mb-3">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Autorizzazioni e requisiti</p>
          <div className="space-y-2">
            {data.autorizzazioni_necessarie.map((a, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-xs font-medium">{a.requisito}</span>
                  <RequisitoTag tipo={a.tipo} />
                </div>
                {a.dettaglio && <p className="text-slate-400 text-[10px] leading-relaxed">{a.dettaglio}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.restrizioni_divieti && data.restrizioni_divieti !== 'Nessuna' && (
        <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2.5 mb-3">
          <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider mb-1">⛔ Restrizioni / Divieti</p>
          <p className="text-red-300 text-xs">{data.restrizioni_divieti}</p>
        </div>
      )}

      <DataRow label="Etichettatura e conformità" value={data.etichettatura_conformita} />

      {data.rappresentante_locale && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">Rappresentante locale</span>
            <RequisitoTag tipo={data.rappresentante_locale.necessario === 'obbligatorio' ? 'obbligatorio' : data.rappresentante_locale.necessario === 'consigliato' ? 'consigliato' : 'opzionale'} />
          </div>
          {data.rappresentante_locale.dettaglio && (
            <p className="text-slate-400 text-[10px] mt-1">{data.rappresentante_locale.dettaglio}</p>
          )}
        </div>
      )}

      {data.blocchi_operativi?.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 mt-3">
          <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">⛔ BLOCCHI OPERATIVI</p>
          <ul className="text-red-300 text-[10px] space-y-0.5">
            {data.blocchi_operativi.map((b, i) => <li key={i}>• {b}</li>)}
          </ul>
        </div>
      )}
    </PhaseSection>
  );
}

// FASE 2 — Struttura di Ingresso
export function StrutturaIngressoCard({ data }) {
  if (!data) return null;
  const si = data.struttura_ingresso;
  return (
    <PhaseSection title="Struttura di Ingresso nel Mercato" icon={Building2} iconColor="text-teal-400" phaseNum="2">
      {/* Entry Strategy */}
      {data.entry_strategy && (
        <div className="bg-teal-500/5 border border-teal-500/10 rounded-lg p-2.5 mb-3">
          <p className="text-teal-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Modello consigliato</p>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-white text-xs font-bold">{data.entry_strategy.recommended_model}</span>
            {data.entry_strategy.estimated_entry_complexity && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                data.entry_strategy.estimated_entry_complexity === 'Low' ? 'bg-green-500/15 text-green-400' :
                data.entry_strategy.estimated_entry_complexity === 'Medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'
              }`}>{data.entry_strategy.estimated_entry_complexity}</span>
            )}
          </div>
          {data.entry_strategy.model_justification && (
            <p className="text-slate-400 text-[10px] leading-relaxed">{data.entry_strategy.model_justification}</p>
          )}
        </div>
      )}

      {/* Importatore locale */}
      {si?.importatore_locale && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-slate-400 text-xs">Importatore locale</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${si.importatore_locale.necessario ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'}`}>
              {si.importatore_locale.necessario ? 'Necessario' : 'Non necessario'}
            </span>
          </div>
          {si.importatore_locale.ruolo && <p className="text-slate-400 text-[10px]">{si.importatore_locale.ruolo}</p>}
        </div>
      )}

      {/* Confronto modelli */}
      {si?.confronto_modelli?.length > 0 && (
        <div className="mb-3">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Confronto modelli di ingresso</p>
          <div className="space-y-2">
            {si.confronto_modelli.map((cm, i) => (
              <div key={i} className={`border rounded-lg p-2.5 ${cm.applicabile ? 'bg-white/[0.03] border-white/10' : 'bg-slate-800/30 border-slate-700/30 opacity-60'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-xs font-medium">{cm.modello}</span>
                  {cm.applicabile ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {cm.pro && (
                    <div><p className="text-green-400 text-[9px] font-bold">PRO</p><p className="text-slate-400 text-[10px]">{cm.pro}</p></div>
                  )}
                  {cm.contro && (
                    <div><p className="text-red-400 text-[9px] font-bold">CONTRO</p><p className="text-slate-400 text-[10px]">{cm.contro}</p></div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vincoli */}
      {si?.vincoli_contrattuali && <DataRow label="Vincoli contrattuali" value={si.vincoli_contrattuali} />}
      {si?.vincoli_fiscali && <DataRow label="Vincoli fiscali" value={si.vincoli_fiscali} />}
    </PhaseSection>
  );
}

// FASE 3 — Canali Realistici di Vendita
export function CanaliVenditaCard({ data }) {
  if (!data || !data.canali_vendita) return null;
  const cv = data.canali_vendita;

  return (
    <PhaseSection title="Canali Realistici di Vendita" icon={ShoppingBag} iconColor="text-cyan-400" phaseNum="3">
      {/* Canali applicabili */}
      <div className="space-y-2 mb-3">
        {cv.retail_fisico && cv.retail_fisico.applicabile && (
          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white text-xs font-medium">🏪 Retail fisico</span>
              <CheckCircle className="w-3 h-3 text-green-400" />
            </div>
            {cv.retail_fisico.dettaglio && <p className="text-slate-400 text-[10px]">{cv.retail_fisico.dettaglio}</p>}
            {cv.retail_fisico.operatori?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {cv.retail_fisico.operatori.map((o, i) => (
                  <span key={i} className="bg-white/5 text-slate-300 px-2 py-0.5 rounded-md text-[10px]">{o}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {cv.foodservice?.applicabile && (
          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white text-xs font-medium">🍽️ Foodservice / HoReCa</span>
              <CheckCircle className="w-3 h-3 text-green-400" />
            </div>
            {cv.foodservice.dettaglio && <p className="text-slate-400 text-[10px]">{cv.foodservice.dettaglio}</p>}
          </div>
        )}

        {cv.b2b_industriale?.applicabile && (
          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white text-xs font-medium">🏭 B2B Industriale</span>
              <CheckCircle className="w-3 h-3 text-green-400" />
            </div>
            {cv.b2b_industriale.dettaglio && <p className="text-slate-400 text-[10px]">{cv.b2b_industriale.dettaglio}</p>}
          </div>
        )}

        {cv.marketplace_digitali?.applicabile && (
          <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white text-xs font-medium">🌐 Marketplace digitali</span>
              <CheckCircle className="w-3 h-3 text-green-400" />
            </div>
            {cv.marketplace_digitali.piattaforme_verificate?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {cv.marketplace_digitali.piattaforme_verificate.map((p, i) => (
                  <span key={i} className="bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded-md text-[10px] border border-cyan-500/20">{p}</span>
                ))}
              </div>
            )}
            {cv.marketplace_digitali.note && <p className="text-slate-400 text-[10px] mt-1">{cv.marketplace_digitali.note}</p>}
          </div>
        )}
      </div>

      {/* Canali esclusi */}
      {cv.canali_esclusi?.length > 0 && (
        <div className="bg-slate-700/30 border border-white/5 rounded-lg p-2.5">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Canali non applicabili</p>
          {cv.canali_esclusi.map((ce, i) => (
            <div key={i} className="flex items-start gap-2 py-1">
              <XCircle className="w-3 h-3 text-slate-500 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-slate-400 text-[10px] font-medium">{ce.canale}</span>
                {ce.motivo && <span className="text-slate-500 text-[10px]"> — {ce.motivo}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </PhaseSection>
  );
}

// FASE 4 — Struttura dei Margini
export function StrutturaMarginiCard({ data }) {
  if (!data) return null;
  return (
    <PhaseSection title="Struttura dei Margini" icon={Percent} iconColor="text-emerald-400" phaseNum="4">
      <DataRow label="Margine importatore" value={data.margine_importatore} />
      <DataRow label="Margine distributore" value={data.margine_distributore} />
      <DataRow label="Margine retail" value={data.margine_retail} />
      {data.moltiplicatore_prezzo && (
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-lg p-2.5 mt-2 mb-2">
          <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">Moltiplicatore fabbrica → consumatore</p>
          <p className="text-white text-sm font-bold">{data.moltiplicatore_prezzo}</p>
        </div>
      )}
      {data.sostenibilita_economica && (
        <div className="mt-2">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Sostenibilità economica</p>
          <p className="text-slate-300 text-xs leading-relaxed">{data.sostenibilita_economica}</p>
        </div>
      )}
    </PhaseSection>
  );
}

// FASE 5 — Logistica e Dogane (complementare)
export function LogisticaDoganeGTMCard({ data }) {
  if (!data) return null;
  return (
    <PhaseSection title="Logistica e Dogane" icon={Truck} iconColor="text-blue-400" phaseNum="5">
      <DataRow label="HS confermato" value={data.hs_confermato} />
      <DataRow label="Dazi applicabili" value={data.dazi_applicabili} />
      <DataRow label="IVA/GST locale" value={data.iva_gst_locale} />
      <DataRow label="Incoterms consigliati" value={data.incoterms_consigliati} />
      <DataRow label="Tempi sdoganamento" value={data.tempi_sdoganamento} />
    </PhaseSection>
  );
}

// FASE 6 — Validazione Commerciale
export function ValidazioneCommercialeCard({ data }) {
  if (!data) return null;
  return (
    <PhaseSection title="Validazione Commerciale" icon={Search} iconColor="text-purple-400" phaseNum="6">
      {data.domanda_locale && (
        <div className="mb-2">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Domanda locale</p>
          <p className="text-slate-300 text-xs leading-relaxed">{data.domanda_locale}</p>
        </div>
      )}
      {data.livello_concorrenza && (
        <div className="flex items-center justify-between py-1.5 border-b border-white/5">
          <span className="text-slate-400 text-xs">Concorrenza</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            data.livello_concorrenza === 'alta' ? 'bg-red-500/15 text-red-400' :
            data.livello_concorrenza === 'media' ? 'bg-amber-500/15 text-amber-400' : 'bg-green-500/15 text-green-400'
          }`}>{data.livello_concorrenza}</span>
        </div>
      )}
      {data.barriere_culturali && <DataRow label="Barriere culturali" value={data.barriere_culturali} />}
      {data.adattamento_prodotto && (
        <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 mt-2">
          <p className="text-amber-400 text-[10px] font-bold uppercase tracking-wider mb-1">Adattamento prodotto</p>
          <p className="text-slate-300 text-xs leading-relaxed">{data.adattamento_prodotto}</p>
        </div>
      )}
      {data.canali_non_applicabili?.length > 0 && (
        <div className="mt-2">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Canali esclusi dalla validazione</p>
          {data.canali_non_applicabili.map((c, i) => (
            <div key={i} className="flex items-start gap-1.5 py-0.5">
              <XCircle className="w-3 h-3 text-slate-500 mt-0.5 flex-shrink-0" />
              <span className="text-slate-400 text-[10px]"><strong className="text-slate-300">{c.canale}</strong> — {c.motivo}</span>
            </div>
          ))}
        </div>
      )}
    </PhaseSection>
  );
}

// Dati Mancanti (se presenti)
export function DatiMancantiCard({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-4 h-4 text-amber-400" />
        <p className="text-amber-400 font-bold text-xs">Dati necessari per completare l'analisi</p>
      </div>
      <ul className="text-amber-200/80 text-xs space-y-1">
        {data.map((d, i) => <li key={i}>• {d}</li>)}
      </ul>
    </div>
  );
}