import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Users, Wrench, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav({ currentPage, unreadMessages = 0, activeTab = null }) {
  const navItems = [
    { name: 'home', label: 'Home', icon: Home, page: 'Home', tab: null },
    { name: 'relazioni', label: 'Relazioni', icon: Users, page: 'Home?tab=relazioni', tab: 'relazioni' },
    { name: 'consulenza', label: 'Consulenza', icon: Briefcase, page: 'Home?tab=consulenza', tab: 'consulenza' },
    { name: 'strumenti', label: 'Strumenti', icon: Wrench, page: 'Home?tab=strumenti', tab: 'strumenti' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Sfondo con effetto metallico/premium */}
      <div className="bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border-t border-slate-700/50 shadow-[0_-8px_30px_rgba(0,0,0,0.4)]">
        <div className="max-w-md mx-auto px-3 py-3">
          <div className="flex justify-between items-center gap-2">
            {navItems.map((item) => {
              const isActive = item.tab === null 
                ? (currentPage === 'Home' && activeTab === null)
                : activeTab === item.tab;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.page)}
                  className="flex-1"
                >
                  {/* Contenitore 3D del pulsante */}
                  <div 
                    className={cn(
                      "relative group transition-all duration-200",
                      isActive ? "transform scale-[0.98]" : "hover:scale-[1.02]"
                    )}
                  >
                    {/* Ombra esterna 3D */}
                    <div className={cn(
                      "absolute inset-0 rounded-2xl transition-all duration-200",
                      isActive 
                        ? "bg-lime-500/20 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)]" 
                        : "bg-slate-950 shadow-[0_4px_12px_rgba(0,0,0,0.5),0_2px_4px_rgba(0,0,0,0.4)]"
                    )} />
                    
                    {/* Pulsante principale con effetto incassato/rialzato */}
                    <div 
                      className={cn(
                        "relative flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl transition-all duration-200",
                        isActive 
                          ? "bg-gradient-to-b from-slate-800 to-slate-900 shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(0,0,0,0.4)]" 
                          : "bg-gradient-to-b from-slate-700 to-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.3)] hover:from-slate-600 hover:to-slate-700"
                      )}
                    >
                      {/* Bordo luminoso superiore */}
                      <div className={cn(
                        "absolute top-0 left-2 right-2 h-[1px] rounded-full transition-all duration-200",
                        isActive 
                          ? "bg-lime-400/60" 
                          : "bg-gradient-to-r from-transparent via-slate-500/40 to-transparent"
                      )} />
                      
                      {/* Contenuto */}
                      <div className="relative">
                        <item.icon className={cn(
                          "w-5 h-5 mb-1 transition-all duration-200",
                          isActive 
                            ? "text-lime-400 stroke-[2.5px] drop-shadow-[0_0_6px_rgba(163,230,53,0.6)]" 
                            : "text-slate-400 group-hover:text-slate-300"
                        )} />
                        {item.badge > 0 && (
                          <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold shadow-lg">
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </div>
                      <span className={cn(
                        "text-[10px] font-semibold transition-all duration-200",
                        isActive 
                          ? "text-lime-400 drop-shadow-[0_0_4px_rgba(163,230,53,0.4)]" 
                          : "text-slate-400 group-hover:text-slate-300"
                      )}>
                        {item.label}
                      </span>
                      
                      {/* Glow attivo */}
                      {isActive && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-lime-400/40 rounded-full blur-sm" />
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}