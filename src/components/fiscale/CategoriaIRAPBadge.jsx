import React from 'react';
import { Info, AlertTriangle, Loader2 } from 'lucide-react';

export default function CategoriaIRAPBadge({ categoriaIrap, aliquotaIrap, fonte, loading }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/60 border border-slate-700">
        <Loader2 className="w-3.5 h-3.5 text-[#d4af37] animate-spin flex-shrink-0" />
        <span className="text-slate-400 text-[11px]">Ricerca categoria IRAP...</span>
      </div>
    );
  }

  if (!categoriaIrap) return null;

  const isDefault = fonte === 'default';
  const isSpecial = categoriaIrap !== 'Impresa Ordinaria';

  return (
    <div className="space-y-1.5">
      <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${
        isDefault 
          ? 'bg-blue-900/20 border-blue-600/30' 
          : 'bg-green-900/20 border-green-600/30'
      }`}>
        <Info className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isDefault ? 'text-blue-400' : 'text-green-400'}`} />
        <div>
          <p className={`text-[11px] font-medium ${isDefault ? 'text-blue-300' : 'text-green-300'}`}>
            Categoria IRAP assegnata automaticamente: <span className="font-bold">{categoriaIrap}</span>
          </p>
          {aliquotaIrap !== null && (
            <p className="text-slate-400 text-[10px] mt-0.5">
              Aliquota: {(aliquotaIrap * 100).toFixed(2)}% 
              {isDefault ? ' (ordinaria – nessun raccordo ATECO trovato)' : ' (da raccordo ATECO)'}
            </p>
          )}
        </div>
      </div>
      {isSpecial && (
        <div className="flex items-start gap-1.5 p-2 rounded-lg bg-yellow-900/20 border border-yellow-600/30">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <p className="text-yellow-300 text-[10px]">Verificare possesso requisiti normativi per applicazione aliquota specifica.</p>
        </div>
      )}
    </div>
  );
}