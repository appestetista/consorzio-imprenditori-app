import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Mail, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav({ currentPage, unreadMessages = 0 }) {
  const navItems = [
    { name: 'home', label: 'Home', icon: Home, page: 'Home' },
    { name: 'messaggi', label: 'Messaggi', icon: Mail, page: 'Messaggi', badge: unreadMessages },
    { name: 'contatta', label: 'Consorzio', icon: Phone, page: 'ContattaConsorzio' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-lime-400 py-3 px-4 z-50 shadow-lg">
      <div className="max-w-md mx-auto flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          return (
            <Link
              key={item.name}
              to={createPageUrl(item.page)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all px-4 py-1 rounded-xl",
                isActive 
                  ? "bg-slate-900 text-lime-400" 
                  : "text-slate-800 hover:bg-slate-900/10"
              )}
            >
              <div className="relative">
                <item.icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
                {item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full min-w-5 h-5 px-1 flex items-center justify-center font-bold animate-pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-xs font-semibold",
                isActive && "text-lime-400"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}