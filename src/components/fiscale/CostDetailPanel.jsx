import React, { useState } from 'react';
import CostCompositionBar from './CostCompositionBar';
import CostGroupAccordion from './CostGroupAccordion';
import { COST_GROUPS, ATECO_PRESETS, applyPreset, totalFromItems } from './costGroups';

const formatEuro = (n) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

export default function CostDetailPanel({ itemValues, fatturato, onItemChange, onApplyPreset }) {
  const [showPresets, setShowPresets] = useState(false);
  const totaleCosti = totalFromItems(itemValues);
  const maxPerItem = Math.max(Math.round(fatturato * 0.4), 50000);

  const handleItemChange = (itemId, newValue) => {
    onItemChange(itemId, newValue);
  };

  return (
    <div className="space-y-3 mt-3">
      <CostCompositionBar itemValues={itemValues} totaleCosti={totaleCosti} />

      <div className="space-y-2">
        {COST_GROUPS.map(group => (
          <CostGroupAccordion
            key={group.id}
            group={group}
            itemValues={itemValues}
            maxPerItem={maxPerItem}
            onChange={handleItemChange}
          />
        ))}
      </div>

      {/* Riga totale */}
      <div className="flex justify-between items-center px-3 py-2 bg-slate-800/60 rounded-xl border border-slate-600">
        <span className="text-white text-xs font-bold">TOTALE COSTI</span>
        <span className="text-white text-base font-black">{formatEuro(totaleCosti)}</span>
      </div>

      {/* Pre-compila da settore */}
      <button
        onClick={() => setShowPresets(!showPresets)}
        className="w-full text-center py-2 text-[#d4af37] text-xs font-semibold hover:underline"
      >
        🎯 Pre-compila dal settore
      </button>

      {showPresets && (
        <div className="grid grid-cols-2 gap-2">
          {Object.keys(ATECO_PRESETS).map(name => (
            <button
              key={name}
              onClick={() => { onApplyPreset(name); setShowPresets(false); }}
              className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs font-medium hover:border-[#d4af37] hover:bg-[#d4af37]/10 transition-all"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}