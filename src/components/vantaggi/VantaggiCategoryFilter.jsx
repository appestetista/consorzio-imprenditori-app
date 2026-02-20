import React from 'react';
import { UtensilsCrossed, Sparkles, Shirt, Sofa, Smartphone, Car, Dumbbell, Heart, GraduationCap, Briefcase, Monitor, Megaphone, Scale, Landmark, HardHat, Truck, Factory, Printer, Leaf, MoreHorizontal } from 'lucide-react';

const CATEGORIES = [
  { id: 'Ristorazione e Food', label: 'Ristorazione', icon: UtensilsCrossed, color: 'text-orange-400 border-orange-400/40 bg-orange-400/10' },
  { id: 'Estetica e Benessere', label: 'Estetica', icon: Sparkles, color: 'text-pink-400 border-pink-400/40 bg-pink-400/10' },
  { id: 'Abbigliamento e Moda', label: 'Moda', icon: Shirt, color: 'text-fuchsia-400 border-fuchsia-400/40 bg-fuchsia-400/10' },
  { id: 'Arredamento e Casa', label: 'Casa', icon: Sofa, color: 'text-amber-400 border-amber-400/40 bg-amber-400/10' },
  { id: 'Elettronica e Telefonia', label: 'Elettronica', icon: Smartphone, color: 'text-cyan-400 border-cyan-400/40 bg-cyan-400/10' },
  { id: 'Auto e Officine', label: 'Auto', icon: Car, color: 'text-red-400 border-red-400/40 bg-red-400/10' },
  { id: 'Sport e Tempo Libero', label: 'Sport', icon: Dumbbell, color: 'text-green-400 border-green-400/40 bg-green-400/10' },
  { id: 'Salute e Farmacia', label: 'Salute', icon: Heart, color: 'text-rose-400 border-rose-400/40 bg-rose-400/10' },
  { id: 'Formazione e Corsi', label: 'Formazione', icon: GraduationCap, color: 'text-indigo-400 border-indigo-400/40 bg-indigo-400/10' },
  { id: 'Servizi Professionali', label: 'Servizi Prof.', icon: Briefcase, color: 'text-blue-400 border-blue-400/40 bg-blue-400/10' },
  { id: 'Servizi Digitali e IT', label: 'IT / Digitale', icon: Monitor, color: 'text-teal-400 border-teal-400/40 bg-teal-400/10' },
  { id: 'Marketing e Comunicazione', label: 'Marketing', icon: Megaphone, color: 'text-violet-400 border-violet-400/40 bg-violet-400/10' },
  { id: 'Consulenza Fiscale e Legale', label: 'Fiscale/Legale', icon: Scale, color: 'text-slate-300 border-slate-400/40 bg-slate-400/10' },
  { id: 'Assicurazioni e Finanza', label: 'Finanza', icon: Landmark, color: 'text-emerald-400 border-emerald-400/40 bg-emerald-400/10' },
  { id: 'Edilizia e Impiantistica', label: 'Edilizia', icon: HardHat, color: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10' },
  { id: 'Logistica e Trasporti', label: 'Logistica', icon: Truck, color: 'text-sky-400 border-sky-400/40 bg-sky-400/10' },
  { id: 'Materie Prime e Industria', label: 'Industria', icon: Factory, color: 'text-orange-300 border-orange-300/40 bg-orange-300/10' },
  { id: 'Stampa e Grafica', label: 'Stampa', icon: Printer, color: 'text-purple-400 border-purple-400/40 bg-purple-400/10' },
  { id: 'Energia e Ambiente', label: 'Energia', icon: Leaf, color: 'text-lime-400 border-lime-400/40 bg-lime-400/10' },
  { id: 'Altro', label: 'Altro', icon: MoreHorizontal, color: 'text-slate-400 border-slate-500/40 bg-slate-500/10' },
];

export { CATEGORIES };

export default function VantaggiCategoryFilter({ selected, onSelect }) {
  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide mb-4">
      <div className="flex gap-2 min-w-max">
        <button
          onClick={() => onSelect(null)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all ${
            !selected 
              ? 'bg-lime-400 text-black border-lime-400 font-bold' 
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500'
          }`}
        >
          Tutti
        </button>
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = selected === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelect(isActive ? null : cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-all ${
                isActive 
                  ? 'bg-lime-400 text-black border-lime-400 font-bold' 
                  : `${cat.color} hover:opacity-80`
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}