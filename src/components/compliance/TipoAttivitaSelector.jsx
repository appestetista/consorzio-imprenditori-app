import React from 'react';

const TIPI_ATTIVITA = [
  { value: 'produttiva', label: 'Produttiva (manifattura, industria)' },
  { value: 'servizi', label: 'Servizi (uffici, consulenza)' },
  { value: 'commerciale', label: 'Commerciale (vendita, negozio)' },
  { value: 'artigianale', label: 'Artigianale (laboratorio, bottega)' },
  { value: 'agricola', label: 'Agricola / Agroalimentare' },
  { value: 'edile', label: 'Edile / Cantieristica' },
];

export default function TipoAttivitaSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {TIPI_ATTIVITA.map((tipo) => (
        <label
          key={tipo.value}
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            value === tipo.value
              ? 'border-lime-400 bg-lime-400/10'
              : 'border-slate-600 hover:border-slate-500'
          }`}
        >
          <input
            type="radio"
            name="tipo_attivita_categoria"
            value={tipo.value}
            checked={value === tipo.value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            value === tipo.value ? 'border-lime-400' : 'border-slate-500'
          }`}>
            {value === tipo.value && (
              <div className="w-2 h-2 rounded-full bg-lime-400" />
            )}
          </div>
          <span className="text-white text-sm">{tipo.label}</span>
        </label>
      ))}
    </div>
  );
}