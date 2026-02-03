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
      <div className="py-3 px-4 border-t border-[#d4af37]/30" style={{ backgroundColor: '#0c1730' }}>
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center gap-4">
            {navItems.map((item) => {
              const isActive = item.tab === null 
                ? (currentPage === 'Home' && activeTab === null)
                : activeTab === item.tab;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.page)}
                  className="flex-1 flex flex-col items-center py-2"
                >
                  <div 
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center mb-1 transition-all duration-150",
                      isActive 
                        ? "border-2 border-[#d4af37]" 
                        : "border border-slate-600"
                    )}
                  >
                    <item.icon 
                      className={cn(
                        "w-5 h-5 transition-colors duration-150",
                        isActive ? "text-[#d4af37]" : "text-slate-400"
                      )}
                    />
                  </div>
                  <span 
                    className={cn(
                      "text-[10px] font-medium transition-colors duration-150",
                      isActive ? "text-[#d4af37]" : "text-slate-500"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}