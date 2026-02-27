import React from 'react';
import { Euro, Shield, Zap, Flame, Leaf, Sun, Phone, Wifi } from 'lucide-react';
import AdminPremiumCard from './AdminPremiumCard';

const GREEN_BORDER = 'linear-gradient(145deg, #22c55e 0%, #16a34a 30%, #15803d 60%, #22c55e 100%)';
const DARK_BG = 'linear-gradient(160deg, #1a1a1a 0%, #0c1730 50%, #0a1225 100%)';
const FISCALITA_BG = 'linear-gradient(160deg, #15803d 0%, #166534 50%, #14532d 100%)';

const ITEMS = [
  { key: 'assicurazioni', icon: Shield, label: 'Assicurazioni', iconColor: 'text-green-400', bg: DARK_BG },
  { key: 'luce', icon: Zap, label: 'Luce', iconColor: 'text-yellow-400', bg: DARK_BG },
  { key: 'gas', icon: Flame, label: 'Gas', iconColor: 'text-orange-400', bg: DARK_BG },
  { key: 'efficientamento', icon: Leaf, label: 'Efficientam.', iconColor: 'text-green-400', bg: DARK_BG, fontSize: 'text-[9px]' },
  { key: 'fotovoltaico', icon: Sun, label: 'Fotovoltaico', iconColor: 'text-yellow-400', bg: DARK_BG },
  { key: 'telefonia', icon: Phone, label: 'Telefonia', iconColor: 'text-green-400', bg: DARK_BG },
  { key: 'internet', icon: Wifi, label: 'Internet', iconColor: 'text-green-400', bg: DARK_BG },
  { key: 'fiscalita', icon: Euro, label: 'Fiscalità<br/>Energetica', iconColor: 'text-white', bg: FISCALITA_BG, bellColor: 'text-white/60' },
];

export default function AdminRisparmioGrid({ onSelectCategory }) {
  return (
    <div className="mb-6">
      <div className="border-2 border-green-500/50 rounded-xl p-3 bg-green-500/5">
        <h2 className="text-green-400 font-semibold text-sm mb-3 flex items-center gap-2">
          <Euro className="w-4 h-4" />
          Risparmio Energetico
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {ITEMS.map(item => (
            <AdminPremiumCard
              key={item.key}
              icon={item.icon}
              label={item.label}
              onClick={() => onSelectCategory(item.key)}
              borderGradient={GREEN_BORDER}
              bgGradient={item.bg}
              iconColor={item.iconColor}
              bellColor={item.bellColor || 'text-green-400/60'}
            />
          ))}
        </div>
      </div>
    </div>
  );
}