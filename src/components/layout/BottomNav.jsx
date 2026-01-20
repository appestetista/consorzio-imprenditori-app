import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Mail, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav({ currentPage, unreadMessages = 0 }) {
  const navItems = [
    { name: 'home', label: 'Home', icon: Home, page: 'Home' },
    { name: 'messaggi', label: ['Tutti i', 'messaggi', 'ricevuti'], icon: Mail, page: 'Messaggi', badge: unreadMessages },
    { name: 'contatta', label: ['Contatta', 'Consorzio'], icon: Phone, page: 'ContattaConsorzio' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-lime-400 py-2 px-2 z-50">
            <div className="max-w-md mx-auto grid grid-cols-3 gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={createPageUrl(item.page)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 transition-all py-1",
                    currentPage === item.page ? "text-slate-900" : "text-slate-700 hover:text-slate-900"
                  )}
                >
                  <div className="relative">
                    <item.icon className="w-5 h-5" />
                    {item.badge > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px]">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-medium text-center leading-tight">
                    {Array.isArray(item.label) ? item.label.map((line, i) => (
                      <div key={i}>{line}</div>
                    )) : item.label}
                  </div>
                </Link>
              ))}
            </div>
          </nav>
  );
}