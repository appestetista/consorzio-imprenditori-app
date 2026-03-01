import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Wrench, QrCode, Menu, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav({ currentPage, unreadMessages = 0, activeTab = null, isAdmin = false, onMenuOpen, menuOpen = false }) {
  const navItems = [
    { name: 'home', label: 'Home', icon: Home, page: 'Home', tab: null },
    { name: 'strumenti', label: 'Strumenti', icon: Wrench, page: 'Esplora?tab=strumenti', tab: 'strumenti' },
    { name: 'personale', label: 'Personale', icon: UserCircle, page: 'Esplora?tab=personale', tab: 'personale' },
    { name: 'menu', label: 'Menu', icon: Menu, isMenu: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
        <div className="py-3 px-4" style={{ backgroundColor: '#061018' }}>
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center gap-0">
            {navItems.map((item) => {
              const isActive = item.isMenu
                  ? menuOpen
                  : item.name === 'home'
                    ? currentPage === 'Home'
                    : activeTab === item.tab;
              
              const Wrapper = item.isMenu ? 'button' : item.disabled ? 'div' : Link;
              const wrapperProps = item.isMenu 
                ? { onClick: onMenuOpen } 
                : item.disabled ? {} : { to: createPageUrl(item.page) };
              
              return (
                <Wrapper
                  key={item.name}
                  {...wrapperProps}
                  className="flex-1 flex justify-center"
                >
                  {/* Pulsante 3D Premium con cornice oro */}
                  <div 
                    className={cn(
                      "relative w-[76px] h-[76px] transition-transform duration-100 ease-out",
                      !item.disabled && "active:scale-[0.96]",
                    item.disabled && "opacity-40"
                    )}
                  >
                    {/* Ombra esterna per effetto flottante */}
                    <div 
                      className="absolute inset-0 rounded-[16px]"
                      style={{
                        boxShadow: '0 6px 20px rgba(0,0,0,0.5), 0 3px 8px rgba(0,0,0,0.3)'
                      }}
                    />

                    {/* Cornice metallica argento/oro */}
                    <div 
                      className="absolute inset-0 rounded-[16px] p-[2.5px]"
                      style={{
                        background: isActive 
                          ? 'linear-gradient(145deg, #d4af37 0%, #b8860b 25%, #8b7355 50%, #d4af37 75%, #f0e68c 100%)'
                          : 'linear-gradient(145deg, #c0c0c0 0%, #a8a8a8 25%, #808080 50%, #c0c0c0 75%, #e8e8e8 100%)'
                      }}
                    >
                      {/* Superficie interna nero → blu scuro */}
                      <div 
                        className="relative w-full h-full rounded-[13px] flex flex-col items-center justify-center overflow-hidden"
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
                            "text-[10px] font-semibold relative z-10 tracking-wide",
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
                </Wrapper>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}