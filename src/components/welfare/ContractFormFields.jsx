import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Pencil, Check, AlertCircle } from 'lucide-react';

const BASE_FIELDS = [
  { key: 'ragione_sociale', label: 'Ragione Sociale', required: true, placeholder: 'Es. Mario Rossi SRL' },
  { key: 'indirizzo', label: 'Indirizzo', required: true, placeholder: 'Via Roma 1' },
  { key: 'comune', label: 'Comune', required: true, placeholder: 'Torino' },
  { key: 'cap', label: 'CAP', placeholder: '10100' },
  { key: 'provincia', label: 'Prov.', placeholder: 'TO', maxLength: 2 },
  { key: 'piva', label: 'P.IVA', required: true, placeholder: '01234567890' },
  { key: 'codice_fiscale', label: 'Codice Fiscale', placeholder: '01234567890' },
  { key: 'nome_referente', label: 'Nome Referente', placeholder: 'Mario Rossi' },
  { key: 'cellulare', label: 'Cellulare', required: true, placeholder: '+39 333 1234567' },
  { key: 'sdi_pec', label: 'Codice SDI / PEC', placeholder: 'SDI o PEC' },
  { key: 'email', label: 'Email', required: true, placeholder: 'info@azienda.it', type: 'email' },
];

function InlineField({ label, value, required, placeholder, maxLength, type, onChange, fieldType, options }) {
  const [editing, setEditing] = useState(false);
  const isEmpty = !value || value.trim() === '';

  // Select diretto: sempre visibile, niente pennetta
  if (fieldType === 'select_direct') {
    return (
      <div className="flex items-center gap-2 py-1.5 border-b border-slate-700/50">
        <span className="text-slate-400 text-xs w-28 flex-shrink-0">{label}{required ? ' *' : ''}</span>
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="bg-slate-800 border border-slate-600 text-white text-xs h-8 flex-1 rounded-md px-2 appearance-none"
        >
          <option value="">Seleziona...</option>
          {(options || []).map(opt => (
            <option key={opt} value={opt}>€ {opt}</option>
          ))}
        </select>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5 border-b border-slate-700/50">
        <span className="text-slate-400 text-xs w-28 flex-shrink-0">{label}{required ? ' *' : ''}</span>
        {fieldType === 'select' ? (
          <select
            autoFocus
            value={value || ''}
            onChange={e => { onChange(e.target.value); setEditing(false); }}
            onBlur={() => setEditing(false)}
            className="bg-slate-800 border border-slate-600 text-white text-xs h-7 flex-1 rounded-md px-2"
          >
            <option value="">Seleziona...</option>
            {(options || []).map(opt => (
              <option key={opt} value={opt}>€ {opt}</option>
            ))}
          </select>
        ) : (
          <Input
            autoFocus
            value={value || ''}
            onChange={e => onChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={e => e.key === 'Enter' && setEditing(false)}
            className="bg-slate-800 border-slate-600 text-white text-xs h-7 flex-1"
            placeholder={placeholder}
            maxLength={maxLength}
            type={type || 'text'}
          />
        )}
        <button onClick={() => setEditing(false)} className="text-green-400 p-0.5">
          <Check className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-slate-700/50 last:border-0">
      <span className="text-slate-400 text-xs w-28 flex-shrink-0">{label}{required ? ' *' : ''}</span>
      <span className={`text-xs flex-1 truncate ${isEmpty ? 'text-amber-400 italic' : 'text-white font-medium'}`}>
        {isEmpty ? 'Da compilare' : (fieldType === 'select' ? `€ ${value}` : value)}
      </span>
      <button onClick={() => setEditing(true)} className="text-slate-500 hover:text-pink-400 p-0.5 transition-colors">
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function ContractFormFields({ formData, setFormData, extraFields = [] }) {
  const allFields = [...BASE_FIELDS, ...extraFields];
  const missingRequired = allFields.filter(f => f.required && (!formData[f.key] || formData[f.key].trim() === ''));

  return (
    <div>
      {missingRequired.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-amber-400 text-xs">
            Completa: {missingRequired.map(f => f.label).join(', ')}
          </span>
        </div>
      )}
      <div className="bg-slate-900/50 rounded-lg px-3 py-1">
        {allFields.map(f => (
          <InlineField
            key={f.key}
            label={f.label}
            value={formData[f.key] || ''}
            required={f.required}
            placeholder={f.placeholder}
            maxLength={f.maxLength}
            type={f.type}
            fieldType={f.fieldType}
            options={f.options}
            onChange={val => setFormData(prev => ({ ...prev, [f.key]: val }))}
          />
        ))}
      </div>
    </div>
  );
}