import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Users, Wrench, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav({ currentPage, unreadMessages = 0, activeTab = null, isAdmin = false }) {
  // Non mostrare la nav per admin
  if (isAdmin) return null;

  // Versione semplice lime per utenti/consulenti (come da screenshot originale)
  // La versione 3D scura è stata rimossa per tornare allo stile originale

  const navItems = [
    { name: 'home', label: 'Home', icon: Home, page: 'Home', tab: null },
    { name: 'relazioni', label: 'Relazioni', icon: Users, page: 'Home?tab=relazioni', tab: 'relazioni' },
    { name: 'consulenza', label: 'Consulenza', icon: Briefcase, page: 'Home?tab=consulenza', tab: 'consulenza' },
    { name: 'strumenti', label: 'Strumenti', icon: Wrench, page: 'Home?tab=strumenti', tab: 'strumenti' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-lime-400 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
      <div className="max-w-md mx-auto px-6 py-2">
        <div className="flex justify-between items-center">
          {navItems.map((item) => {
            const isActive = item.tab === null 
              ? (currentPage === 'Home' && activeTab === null)
              : activeTab === item.tab;
            return (
              <Link
                key={item.name}
                to={createPageUrl(item.page)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[70px] py-2 px-3 rounded-2xl transition-all duration-200",
                  isActive 
                    ? "bg-slate-900" 
                    : "hover:bg-slate-900/10"
                )}
              >
                <div className="relative">
                  <item.icon className={cn(
                    "w-5 h-5 mb-1",
                    isActive ? "text-lime-400 stroke-[2.5px]" : "text-slate-800"
                  )} />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[11px] font-semibold",
                  isActive ? "text-lime-400" : "text-slate-800"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}