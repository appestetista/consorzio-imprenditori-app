import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, Pencil, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FIELDS = [
  { key: 'ragione_sociale', label: 'Ragione Sociale', required: true, placeholder: 'Es. Mario Rossi SRL' },
  { key: 'indirizzo', label: 'Indirizzo', required: true, placeholder: 'Via Roma 1', half: true },
  { key: 'comune', label: 'Comune', required: true, placeholder: 'Torino', half: true },
  { key: 'cap', label: 'CAP', placeholder: '10100', third: true },
  { key: 'provincia', label: 'Prov.', placeholder: 'TO', third: true, maxLength: 2 },
  { key: 'piva', label: 'P.IVA', required: true, placeholder: '01234567890', third: true },
  { key: 'codice_fiscale', label: 'Codice Fiscale', placeholder: '01234567890', full: true },
  { key: 'nome_referente', label: 'Nome Referente', placeholder: 'Mario Rossi', full: true },
  { key: 'cellulare', label: 'Cellulare', required: true, placeholder: '+39 333 1234567', half: true },
  { key: 'sdi_pec', label: 'Codice SDI / PEC', placeholder: 'SDI o PEC', half: true },
  { key: 'email', label: 'Email', required: true, placeholder: 'info@azienda.it', full: true, type: 'email' },
];

function PreviewRow({ label, value, required }) {
  const isEmpty = !value || value.trim() === '';
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-700/50 last:border-0">
      <span className="text-slate-400 text-xs">{label}{required ? ' *' : ''}</span>
      {isEmpty ? (
        <span className="text-amber-400 text-xs flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Da compilare
        </span>
      ) : (
        <span className="text-white text-xs font-medium flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-green-400" /> {value}
        </span>
      )}
    </div>
  );
}

export default function ContractFormFields({ formData, setFormData }) {
  const [editing, setEditing] = useState(false);
  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  // Conta quanti campi sono pre-compilati
  const filledCount = FIELDS.filter(f => formData[f.key] && formData[f.key].trim() !== '').length;
  const missingRequired = FIELDS.filter(f => f.required && (!formData[f.key] || formData[f.key].trim() === ''));

  // Auto-apri modifica se mancano campi obbligatori
  const showEdit = editing || missingRequired.length > 0;

  if (!showEdit) {
    // Anteprima compatta — dati pre-compilati dal profilo
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-xs font-medium">
              {filledCount}/{FIELDS.length} campi compilati dal profilo
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            className="text-pink-400 hover:text-pink-300 hover:bg-slate-700 text-xs h-7 px-2"
          >
            <Pencil className="w-3 h-3 mr-1" /> Modifica
          </Button>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          {FIELDS.map(f => (
            <PreviewRow key={f.key} label={f.label} value={formData[f.key]} required={f.required} />
          ))}
        </div>
      </div>
    );
  }

  // Modalità modifica
  const renderField = (f) => (
    <div key={f.key}>
      <Label className="text-slate-300 text-xs">{f.label}{f.required ? ' *' : ''}</Label>
      <Input
        value={formData[f.key] || ''}
        onChange={e => update(f.key, e.target.value)}
        className="bg-slate-800 border-slate-600 text-white text-sm h-9"
        placeholder={f.placeholder}
        maxLength={f.maxLength}
        type={f.type || 'text'}
      />
    </div>
  );

  // Raggruppa i campi per riga
  const rows = [];
  let i = 0;
  while (i < FIELDS.length) {
    const f = FIELDS[i];
    if (f.full) {
      rows.push(<div key={f.key}>{renderField(f)}</div>);
      i++;
    } else if (f.half) {
      const next = FIELDS[i + 1];
      rows.push(
        <div key={f.key} className="grid grid-cols-2 gap-2">
          {renderField(f)}
          {next && next.half && renderField(next)}
        </div>
      );
      i += next && next.half ? 2 : 1;
    } else if (f.third) {
      const fields = [f];
      if (FIELDS[i + 1]?.third) fields.push(FIELDS[i + 1]);
      if (FIELDS[i + 2]?.third) fields.push(FIELDS[i + 2]);
      rows.push(
        <div key={f.key} className={`grid grid-cols-${fields.length} gap-2`}>
          {fields.map(renderField)}
        </div>
      );
      i += fields.length;
    } else {
      rows.push(<div key={f.key}>{renderField(f)}</div>);
      i++;
    }
  }

  return (
    <div className="space-y-3">
      {missingRequired.length === 0 && (
        <div className="flex items-center justify-between">
          <span className="text-slate-400 text-xs">Modifica i dati del contratto</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
            className="text-green-400 hover:text-green-300 hover:bg-slate-700 text-xs h-7 px-2"
          >
            <CheckCircle className="w-3 h-3 mr-1" /> Chiudi modifica
          </Button>
        </div>
      )}
      {missingRequired.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-amber-400 text-xs">
            Completa i campi mancanti: {missingRequired.map(f => f.label).join(', ')}
          </span>
        </div>
      )}
      {rows}
    </div>
  );
}