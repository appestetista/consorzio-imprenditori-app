import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Users, Wrench, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav({ currentPage, unreadMessages = 0, activeTab = null, isAdmin = false }) {
  // Non mostrare la nav 3D premium per utenti e consulenti
  // Admin non vede la nav (gestito da isAdmin=true)

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
        <div className="py-3 px-4" style={{ backgroundColor: '#0B1E2D' }}>
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center gap-2">
            {navItems.map((item) => {
              const isActive = item.tab === null 
                ? (currentPage === 'Home' && activeTab === null)
                : activeTab === item.tab;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.page)}
                  className="flex-1 flex justify-center"
                >
                  {/* Pulsante 3D Premium con cornice oro */}
                  <div 
                    className={cn(
                      "relative w-[72px] h-[72px] transition-transform duration-100 ease-out",
                      "active:scale-[0.96]"
                    )}
                  >
                    {/* Ombra esterna per effetto flottante */}
                    <div 
                      className="absolute inset-0 rounded-[18px]"
                      style={{
                        boxShadow: '0 6px 20px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.3)'
                      }}
                    />

                    {/* Cornice metallica argento/oro */}
                    <div 
                      className="absolute inset-0 rounded-[18px] p-[3px]"
                      style={{
                        background: isActive 
                          ? 'linear-gradient(145deg, #d4af37 0%, #b8860b 25%, #8b7355 50%, #d4af37 75%, #f0e68c 100%)'
                          : 'linear-gradient(145deg, #c0c0c0 0%, #a8a8a8 25%, #808080 50%, #c0c0c0 75%, #e8e8e8 100%)'
                      }}
                    >
                      {/* Superficie interna nero → blu scuro */}
                      <div 
                        className="relative w-full h-full rounded-[15px] flex flex-col items-center justify-center overflow-hidden"
                        style={{
                          background: isActive 
                                                            ? 'linear-gradient(160deg, #2a2a2a 0%, #152040 50%, #1a2850 100%)' 
                                                            : 'linear-gradient(160deg, #1a1a1a 0%, #001d3b 50%, #001530 100%)',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(255,255,255,0.05)'
                        }}
                      >


                        {/* Icona */}
                        <item.icon 
                          className={cn(
                            "w-6 h-6 mb-1 relative z-10 transition-all duration-150",
                            isActive 
                              ? "text-[#d4af37] stroke-[2px]" 
                              : "text-[#a0a0a0]"
                          )}
                          style={{
                            filter: isActive ? 'drop-shadow(0 0 6px rgba(212,175,55,0.5))' : 'none'
                          }}
                        />

                        {/* Label */}
                        <span 
                          className={cn(
                            "text-[9px] font-semibold relative z-10 tracking-wide",
                            isActive ? "text-[#d4af37]" : "text-[#909090]"
                          )}
                        >
                          {item.label}
                        </span>

                        {/* Badge notifiche */}
                        {item.badge > 0 && (
                          <span 
                            className="absolute top-1 right-1 bg-red-500 text-white text-[8px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center font-bold z-20"
                            style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }}
                          >
                            {item.badge > 99 ? '99+' : item.badge}
                          </span>
                        )}
                      </div>
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