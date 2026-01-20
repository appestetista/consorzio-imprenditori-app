import React from 'react';
import { X, Check, Minus, AlertTriangle, DollarSign, Clock, Cog, Target, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function CandidateComparisonTable({ candidates, supplierProfiles, onClose, onSelect }) {
  const getSupplierProfile = (email) => supplierProfiles.find(p => p.user_email === email);

  const getScoreIcon = (score) => {
    if (score === 'basso' || score === 'bassa') return <Check className="w-4 h-4 text-green-400" />;
    if (score === 'medio' || score === 'media') return <Minus className="w-4 h-4 text-amber-400" />;
    return <AlertTriangle className="w-4 h-4 text-red-400" />;
  };

  const getScoreColor = (score) => {
    if (score === 'basso' || score === 'bassa') return 'text-green-400';
    if (score === 'medio' || score === 'media') return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lime-400 font-semibold">Confronta candidati</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left text-slate-400 py-2 px-2 font-medium">Indicatore</th>
              {candidates.map((c, idx) => (
                <th key={c.id} className="text-center text-slate-300 py-2 px-2 font-medium">
                  Fornitore {idx + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Badge */}
            <tr className="border-b border-slate-700/50">
              <td className="py-3 px-2 text-slate-400">Badge</td>
              {candidates.map(c => {
                const profile = getSupplierProfile(c.supplier_email);
                return (
                  <td key={c.id} className="text-center py-3 px-2">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {profile?.badges?.length > 0 ? profile.badges.map(badge => (
                        <Badge key={badge} className={
                          badge === 'affidabile' ? 'bg-green-500/20 text-green-400 text-[10px]' :
                          badge === 'complesso' ? 'bg-amber-500/20 text-amber-400 text-[10px]' :
                          badge === 'dispendioso' ? 'bg-orange-500/20 text-orange-400 text-[10px]' :
                          'bg-red-500/20 text-red-400 text-[10px]'
                        }>
                          {badge}
                        </Badge>
                      )) : <span className="text-slate-500">-</span>}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Lo rifarebbero */}
            <tr className="border-b border-slate-700/50">
              <td className="py-3 px-2 text-slate-400">Lo rifarebbero</td>
              {candidates.map(c => {
                const profile = getSupplierProfile(c.supplier_email);
                const pct = profile?.aggregated_stats?.would_redo_percentage;
                return (
                  <td key={c.id} className="text-center py-3 px-2">
                    {pct !== undefined ? (
                      <span className={pct >= 70 ? 'text-green-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400'}>
                        {pct}%
                      </span>
                    ) : <span className="text-slate-500">N/D</span>}
                  </td>
                );
              })}
            </tr>

            {/* Prezzo stimato */}
            <tr className="border-b border-slate-700/50">
              <td className="py-3 px-2 text-slate-400 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" /> Prezzo
              </td>
              {candidates.map(c => (
                <td key={c.id} className="text-center py-3 px-2 text-slate-300 text-xs">
                  {c.estimated_price}
                </td>
              ))}
            </tr>

            {/* Tempi */}
            <tr className="border-b border-slate-700/50">
              <td className="py-3 px-2 text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Tempi
              </td>
              {candidates.map(c => (
                <td key={c.id} className="text-center py-3 px-2 text-slate-300 text-xs">
                  {c.estimated_time}
                </td>
              ))}
            </tr>

            {/* Costo stimato (valutazione) */}
            <tr className="border-b border-slate-700/50">
              <td className="py-3 px-2 text-slate-400">Costo stimato</td>
              {candidates.map(c => (
                <td key={c.id} className="text-center py-3 px-2">
                  <div className="flex items-center justify-center gap-1">
                    {c.comparison_scores?.estimated_cost ? (
                      <>
                        {getScoreIcon(c.comparison_scores.estimated_cost)}
                        <span className={getScoreColor(c.comparison_scores.estimated_cost)}>
                          {c.comparison_scores.estimated_cost}
                        </span>
                      </>
                    ) : <span className="text-slate-500">-</span>}
                  </div>
                </td>
              ))}
            </tr>

            {/* Complessità gestionale */}
            <tr className="border-b border-slate-700/50">
              <td className="py-3 px-2 text-slate-400 flex items-center gap-1">
                <Cog className="w-3.5 h-3.5" /> Complessità
              </td>
              {candidates.map(c => (
                <td key={c.id} className="text-center py-3 px-2">
                  <div className="flex items-center justify-center gap-1">
                    {c.comparison_scores?.management_complexity ? (
                      <>
                        {getScoreIcon(c.comparison_scores.management_complexity)}
                        <span className={getScoreColor(c.comparison_scores.management_complexity)}>
                          {c.comparison_scores.management_complexity}
                        </span>
                      </>
                    ) : <span className="text-slate-500">-</span>}
                  </div>
                </td>
              ))}
            </tr>

            {/* Coerenza problema */}
            <tr className="border-b border-slate-700/50">
              <td className="py-3 px-2 text-slate-400 flex items-center gap-1">
                <Target className="w-3.5 h-3.5" /> Coerenza
              </td>
              {candidates.map(c => (
                <td key={c.id} className="text-center py-3 px-2">
                  <div className="flex items-center justify-center gap-1">
                    {c.comparison_scores?.problem_coherence ? (
                      <>
                        {getScoreIcon(c.comparison_scores.problem_coherence === 'alta' ? 'basso' : c.comparison_scores.problem_coherence === 'bassa' ? 'alto' : 'medio')}
                        <span className={c.comparison_scores.problem_coherence === 'alta' ? 'text-green-400' : c.comparison_scores.problem_coherence === 'bassa' ? 'text-red-400' : 'text-amber-400'}>
                          {c.comparison_scores.problem_coherence}
                        </span>
                      </>
                    ) : <span className="text-slate-500">-</span>}
                  </div>
                </td>
              ))}
            </tr>

            {/* Rischio percepito */}
            <tr className="border-b border-slate-700/50">
              <td className="py-3 px-2 text-slate-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Rischio
              </td>
              {candidates.map(c => (
                <td key={c.id} className="text-center py-3 px-2">
                  <div className="flex items-center justify-center gap-1">
                    {c.comparison_scores?.perceived_risk ? (
                      <>
                        {getScoreIcon(c.comparison_scores.perceived_risk)}
                        <span className={getScoreColor(c.comparison_scores.perceived_risk)}>
                          {c.comparison_scores.perceived_risk}
                        </span>
                      </>
                    ) : <span className="text-slate-500">-</span>}
                  </div>
                </td>
              ))}
            </tr>

            {/* Azioni */}
            <tr>
              <td className="py-4 px-2"></td>
              {candidates.map(c => (
                <td key={c.id} className="text-center py-4 px-2">
                  <Button 
                    onClick={() => onSelect(c)}
                    size="sm"
                    className="bg-lime-400 text-slate-900 hover:bg-lime-500"
                  >
                    Scegli
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}