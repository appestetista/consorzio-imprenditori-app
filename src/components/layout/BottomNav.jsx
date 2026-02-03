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
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      {/* Sfondo scuro con texture sottile */}
      <div className="bg-[#1a1a2e] border-t border-[#2a2a4a] shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
        <div className="max-w-md mx-auto px-2 py-3">
          <div className="flex justify-between items-center gap-1.5">
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
                  {/* Pulsante 3D stile neumorphism scuro */}
                  <div 
                    className={cn(
                      "relative group transition-all duration-150 ease-out",
                      isActive 
                        ? "transform translate-y-[2px]" 
                        : "hover:translate-y-[-1px] active:translate-y-[2px]"
                    )}
                  >
                    {/* Ombra profonda 3D sotto il pulsante */}
                    <div 
                      className={cn(
                        "absolute inset-0 rounded-xl transition-all duration-150",
                        isActive
                          ? "bg-[#0d0d1a] top-0"
                          : "bg-[#0d0d1a] top-[4px] group-hover:top-[5px]"
                      )}
                      style={{
                        boxShadow: isActive 
                          ? 'none'
                          : '0 4px 0 #050510, 0 8px 15px rgba(0,0,0,0.5)'
                      }}
                    />
                    
                    {/* Superficie del pulsante */}
                    <div 
                      className={cn(
                        "relative flex flex-col items-center justify-center py-3 px-1 rounded-xl transition-all duration-150 overflow-hidden",
                        isActive 
                          ? "bg-gradient-to-b from-[#252545] to-[#1e1e38]" 
                          : "bg-gradient-to-b from-[#2d2d50] via-[#252545] to-[#1e1e38] group-hover:from-[#353560] group-hover:via-[#2d2d50]"
                      )}
                      style={{
                        boxShadow: isActive
                          ? 'inset 0 3px 8px rgba(0,0,0,0.5), inset 0 1px 3px rgba(0,0,0,0.3)'
                          : 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.2)'
                      }}
                    >
                      {/* Riflesso superiore */}
                      <div 
                        className={cn(
                          "absolute top-0 left-0 right-0 h-[45%] rounded-t-xl transition-opacity duration-150",
                          isActive ? "opacity-0" : "opacity-100"
                        )}
                        style={{
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)'
                        }}
                      />
                      
                      {/* Bordo interno luminoso */}
                      <div 
                        className={cn(
                          "absolute inset-[1px] rounded-[10px] pointer-events-none transition-opacity duration-150",
                          isActive ? "opacity-0" : "opacity-100"
                        )}
                        style={{
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 50%)'
                        }}
                      />
                      
                      {/* Glow colorato quando attivo */}
                      {isActive && (
                        <div 
                          className="absolute inset-0 rounded-xl opacity-30"
                          style={{
                            background: 'radial-gradient(circle at 50% 80%, rgba(163,230,53,0.4) 0%, transparent 70%)'
                          }}
                        />
                      )}
                      
                      {/* Icona */}
                      <div className="relative z-10">
                        <item.icon 
                          className={cn(
                            "w-5 h-5 mb-1 transition-all duration-150",
                            isActive 
                              ? "text-lime-400 stroke-[2.5px]" 
                              : "text-slate-400 group-hover:text-slate-300"
                          )} 
                          style={{
                            filter: isActive ? 'drop-shadow(0 0 8px rgba(163,230,53,0.7))' : 'none'
                          }}
                        />
                        {item.badge > 0 && (
                          <span 
                            className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center font-bold"
                            style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }}
                          >
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </div>
                      
                      {/* Label */}
                      <span 
                        className={cn(
                          "relative z-10 text-[10px] font-bold tracking-wide transition-all duration-150",
                          isActive 
                            ? "text-lime-400" 
                            : "text-slate-500 group-hover:text-slate-400"
                        )}
                        style={{
                          textShadow: isActive ? '0 0 10px rgba(163,230,53,0.5)' : 'none'
                        }}
                      >
                        {item.label}
                      </span>
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