import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Building2, CheckCircle2, X } from 'lucide-react';

// Mappa: per ogni categoria, quali campi profilo servono
const CATEGORY_REQUIRED_FIELDS = {
  'Fiscale': ['settore', 'forma_giuridica', 'regime_fiscale', 'fatturato_annuo'],
  'Legale': ['settore', 'forma_giuridica', 'numero_dipendenti'],
  'Personale/HR': ['settore', 'forma_giuridica', 'numero_dipendenti', 'fatturato_annuo'],
  'Marketing': ['settore', 'fatturato_annuo'],
  'Investimenti': ['settore', 'forma_giuridica', 'fatturato_annuo', 'numero_dipendenti', 'regime_fiscale'],
  'Operativa': ['settore', 'numero_dipendenti'],
  'Strategica': ['settore', 'forma_giuridica', 'fatturato_annuo', 'numero_dipendenti', 'obiettivo_principale'],
  'Confronto': ['settore', 'forma_giuridica', 'fatturato_annuo', 'numero_dipendenti'],
};

// Keyword → campi necessari aggiuntivi (per domande specifiche)
const KEYWORD_FIELDS = [
  { keywords: ['dipendente', 'assunzione', 'assunz', 'personale', 'ccnl', 'stipendio', 'collaborator'], fields: ['numero_dipendenti', 'settore'] },
  { keywords: ['regime', 'forfettario', 'ordinario', 'iva', 'irpef', 'tasse', 'imposte', 'aliquota'], fields: ['regime_fiscale', 'forma_giuridica', 'fatturato_annuo'] },
  { keywords: ['bando', 'finanziament', 'agevolazion', 'contribut', 'fondo perduto'], fields: ['settore', 'forma_giuridica', 'fatturato_annuo', 'numero_dipendenti'] },
  { keywords: ['export', 'import', 'internazional', 'dogana', 'dazio'], fields: ['settore', 'fatturato_annuo'] },
  { keywords: ['fornitore', 'fornitura', 'preventivo', 'acquist'], fields: ['settore'] },
  { keywords: ['compliance', 'sanzione', 'gdpr', 'sicurezza'], fields: ['settore', 'numero_dipendenti', 'forma_giuridica'] },
  { keywords: ['contratto', 'clausola', 'recesso'], fields: ['forma_giuridica'] },
  { keywords: ['welfare', 'benefit', 'buoni pasto'], fields: ['numero_dipendenti', 'forma_giuridica'] },
  { keywords: ['srl', 'spa', 'ditta individuale', 'societ'], fields: ['forma_giuridica'] },
];

const FIELD_CONFIG = {
  settore: { label: 'Settore', type: 'select', options: ['Manifattura','Commercio','Servizi','Tecnologia','Ristorazione','Edilizia','Trasporti','Sanità','Professioni','Altro'] },
  forma_giuridica: { label: 'Forma giuridica', type: 'select', options: ['Ditta individuale','SRL','SRLS','SAS','SNC','SPA','Cooperativa','Altro'] },
  regime_fiscale: { label: 'Regime fiscale', type: 'select', options: ['Forfettario','Semplificato','Ordinario','Non so'] },
  fatturato_annuo: { label: 'Fatturato annuo', type: 'select', options: ['Sotto 100K','100K-500K','500K-1M','1M-5M','5M-10M','Oltre 10M'] },
  numero_dipendenti: { label: 'Numero dipendenti', type: 'select', options: ['Solo io','1-5','6-15','16-50','51-200','Oltre 200'] },
  obiettivo_principale: { label: 'Obiettivo principale', type: 'select', options: ['Crescita fatturato','Riduzione costi','Espansione','Digitalizzazione','Passaggio generazionale','Altro'] },
};

/**
 * Calcola i campi mancanti dato il profilo utente, la categoria e il messaggio
 * Ritorna array di nomi campo mancanti, o array vuoto se nulla manca
 */
export function getMissingFields(user, category, message) {
  if (!user) return [];
  
  // Campi richiesti dalla categoria
  const categoryFields = CATEGORY_REQUIRED_FIELDS[category] || ['settore', 'forma_giuridica'];
  
  // Campi aggiuntivi da keyword nel messaggio
  const msgLower = (message || '').toLowerCase();
  const keywordFields = KEYWORD_FIELDS
    .filter(kw => kw.keywords.some(k => msgLower.includes(k)))
    .flatMap(kw => kw.fields);
  
  // Unione senza duplicati
  const allNeeded = [...new Set([...categoryFields, ...keywordFields])];
  
  // Filtra solo quelli che l'utente non ha compilato
  // Controlla sia root level che nested _originalData (normalizeUser)
  return allNeeded.filter(field => {
    const val = user[field] || user?._originalData?.[field];
    return !val || (typeof val === 'string' && val.trim() === '');
  });
}

export default function MissingProfileDataModal({ fields, onComplete, onSkip }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Inizializza form vuoto per i campi richiesti
    const init = {};
    fields.forEach(f => { init[f] = ''; });
    setForm(init);
  }, [fields]);

  const allFilled = fields.every(f => form[f] && form[f].trim() !== '');

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe(form);
    setSaving(false);
    onComplete(form);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center px-4 pb-28 sm:pb-0" style={{ backgroundColor: 'rgba(10, 15, 26, 0.92)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md bg-[#0f1629] border border-slate-700/60 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
        
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center shadow-lg shadow-[#d4af37]/20">
                <Building2 className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">Mi servono alcuni dati</h2>
                <p className="text-[11px] text-slate-400">Per darti una risposta precisa e personalizzata</p>
              </div>
            </div>
            <button onClick={onSkip} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Campi */}
        <div className="px-5 pb-2 space-y-3 max-h-[50vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {fields.map(fieldName => {
            const config = FIELD_CONFIG[fieldName];
            if (!config) return null;
            return (
              <div key={fieldName}>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{config.label}</label>
                <select
                  value={form[fieldName] || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, [fieldName]: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#d4af37]/60 transition-colors appearance-none"
                >
                  <option value="">Seleziona...</option>
                  {config.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 pt-3 pb-5 space-y-2.5">
          <div className="flex items-start gap-2 bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-xl px-3 py-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#d4af37] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Questi dati restano nel tuo profilo e potrai modificarli quando vuoi.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSkip}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm font-medium hover:border-slate-600 transition-colors"
            >
              Rispondi senza
            </button>
            <button
              onClick={handleSave}
              disabled={!allFilled || saving}
              className="flex-1 py-2.5 rounded-xl bg-[#d4af37] text-slate-900 text-sm font-bold hover:bg-[#c8a931] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvo...' : 'Salva e continua'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}