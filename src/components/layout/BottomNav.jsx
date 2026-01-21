import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Mail, Phone, Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav({ currentPage, unreadMessages = 0 }) {
  const navItems = [
    { name: 'home', label: 'Home', icon: Home, page: 'Home' },
    { name: 'messaggi', label: 'Messaggi', icon: Mail, page: 'Messaggi', badge: unreadMessages },
    { name: 'contatta', label: 'Consorzio', icon: Phone, page: 'ContattaConsorzio' },
    { name: 'focus', label: 'Focus', icon: Crosshair, page: 'Focus' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-lime-400 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
      <div className="max-w-md mx-auto px-6 py-2">
        <div className="flex justify-between items-center">
          {navItems.map((item) => {
            const isActive = currentPage === item.page;
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