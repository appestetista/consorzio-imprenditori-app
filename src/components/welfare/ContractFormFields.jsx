import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ContractFormFields({ formData, setFormData }) {
  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-slate-300 text-xs">Ragione Sociale *</Label>
        <Input value={formData.ragione_sociale || ''} onChange={e => update('ragione_sociale', e.target.value)} className="bg-slate-800 border-slate-600 text-white text-sm h-9" placeholder="Es. Mario Rossi SRL" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-slate-300 text-xs">Indirizzo *</Label>
          <Input value={formData.indirizzo || ''} onChange={e => update('indirizzo', e.target.value)} className="bg-slate-800 border-slate-600 text-white text-sm h-9" placeholder="Via Roma 1" />
        </div>
        <div>
          <Label className="text-slate-300 text-xs">Comune *</Label>
          <Input value={formData.comune || ''} onChange={e => update('comune', e.target.value)} className="bg-slate-800 border-slate-600 text-white text-sm h-9" placeholder="Torino" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Label className="text-slate-300 text-xs">CAP</Label>
          <Input value={formData.cap || ''} onChange={e => update('cap', e.target.value)} className="bg-slate-800 border-slate-600 text-white text-sm h-9" placeholder="10100" />
        </div>
        <div>
          <Label className="text-slate-300 text-xs">Prov.</Label>
          <Input value={formData.provincia || ''} onChange={e => update('provincia', e.target.value)} className="bg-slate-800 border-slate-600 text-white text-sm h-9" placeholder="TO" maxLength={2} />
        </div>
        <div>
          <Label className="text-slate-300 text-xs">P.IVA *</Label>
          <Input value={formData.piva || ''} onChange={e => update('piva', e.target.value)} className="bg-slate-800 border-slate-600 text-white text-sm h-9" placeholder="01234567890" />
        </div>
      </div>
      <div>
        <Label className="text-slate-300 text-xs">Nome Referente</Label>
        <Input value={formData.nome_referente || ''} onChange={e => update('nome_referente', e.target.value)} className="bg-slate-800 border-slate-600 text-white text-sm h-9" placeholder="Mario Rossi" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-slate-300 text-xs">Cellulare *</Label>
          <Input value={formData.cellulare || ''} onChange={e => update('cellulare', e.target.value)} className="bg-slate-800 border-slate-600 text-white text-sm h-9" placeholder="+39 333 1234567" />
        </div>
        <div>
          <Label className="text-slate-300 text-xs">Codice SDI / PEC</Label>
          <Input value={formData.sdi_pec || ''} onChange={e => update('sdi_pec', e.target.value)} className="bg-slate-800 border-slate-600 text-white text-sm h-9" placeholder="SDI o PEC" />
        </div>
      </div>
      <div>
        <Label className="text-slate-300 text-xs">Email *</Label>
        <Input value={formData.email || ''} onChange={e => update('email', e.target.value)} className="bg-slate-800 border-slate-600 text-white text-sm h-9" placeholder="info@azienda.it" type="email" />
      </div>
    </div>
  );
}