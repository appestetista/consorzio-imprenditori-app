import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Check, MapPin, Hash, Building2 } from 'lucide-react';
import AtecoSearchInput from './AtecoSearchInput';

const REGIONI = [
  'Abruzzo','Basilicata','Calabria','Campania','Emilia-Romagna','Friuli Venezia Giulia',
  'Lazio','Liguria','Lombardia','Marche','Molise','Piemonte','Puglia','Sardegna',
  'Sicilia','Toscana','Trentino-Alto Adige','Umbria',"Valle d'Aosta",'Veneto'
];

const FORME_GIURIDICHE = [
  { value: 'SRL', label: 'S.R.L.' },
  { value: 'SRLU', label: 'S.R.L. Unipersonale' },
  { value: 'SPA', label: 'S.P.A.' },
  { value: 'SAPA', label: 'S.A.P.A.' },
  { value: 'RF', label: 'Regime Forfettario' },
  { value: 'Ditta individuale', label: 'Ditta Individuale' },
  { value: 'SNC', label: 'S.N.C.' },
  { value: 'SAS', label: 'S.A.S.' },
  { value: 'COOP', label: 'Cooperativa' },
];

const REGIMI = ['Ordinario', 'Semplificato', 'Forfettario'];

export default function QuickEditFiscale({ user, onSave, onClose }) {
  const [forma, setForma] = useState(user?.forma_giuridica || '');
  const [regione, setRegione] = useState(user?.regione || user?.region || '');
  const [ateco, setAteco] = useState(user?.ateco_code || '');
  const [regime, setRegime] = useState(user?.regime_fiscale || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const data = {};
    if (forma) data.forma_giuridica = forma;
    if (regione) data.regione = regione;
    if (ateco) data.ateco_code = ateco;
    if (regime) data.regime_fiscale = regime;

    // Auto-coerenza
    const CAPITALI = ['SRL', 'SRLU', 'SPA', 'SAPA', 'SE'];
    if (CAPITALI.includes(forma)) {
      data.regime_fiscale = 'Ordinario';
      data.tipo_contabilita = 'Ordinaria';
      data.gestione_inps = 'Gestione separata';
    }
    if (forma === 'RF') {
      data.regime_fiscale = 'Forfettario';
    }

    await base44.auth.updateMe(data);
    setSaving(false);
    onSave({ ...user, ...data });
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4">
      <div className="bg-[#0a2540] border border-[#1a3a5c] rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <h2 className="text-white text-base font-bold flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#d4af37]" />
            Modifica dati fiscali
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-4">
          {/* Forma giuridica */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">Forma giuridica</label>
            <div className="grid grid-cols-2 gap-1.5">
              {FORME_GIURIDICHE.map(f => (
                <button key={f.value} onClick={() => setForma(f.value)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-all text-left ${
                    forma === f.value
                      ? 'bg-[#d4af37] text-slate-900'
                      : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Regime fiscale — solo se non auto-determinato */}
          {!['SRL','SRLU','SPA','SAPA','SE','RF'].includes(forma) && (
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1.5">Regime fiscale</label>
              <div className="flex gap-2">
                {REGIMI.filter(r => r !== 'Forfettario').map(r => (
                  <button key={r} onClick={() => setRegime(r)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                      regime === r ? 'bg-[#d4af37] text-slate-900' : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60'
                    }`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Regione */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">
              <MapPin className="w-3 h-3 inline mr-1" />Regione
            </label>
            <select
              value={regione}
              onChange={e => setRegione(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-white px-3 py-2 outline-none focus:border-[#d4af37]"
            >
              <option value="">Seleziona regione...</option>
              {REGIONI.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* ATECO */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">
              <Hash className="w-3 h-3 inline mr-1" />Codice ATECO
            </label>
            <AtecoSearchInput value={ateco} onChange={setAteco} />
            {ateco && (
              <div className="mt-1.5 bg-slate-800/60 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-300 text-xs font-medium">{ateco}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 pt-2 space-y-2">
          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 rounded-xl text-sm font-bold bg-[#d4af37] text-slate-900 hover:bg-[#c9a432] transition-all disabled:opacity-50">
            {saving ? 'Salvataggio...' : 'Salva e aggiorna simulazione'}
          </button>
        </div>
      </div>
    </div>
  );
}