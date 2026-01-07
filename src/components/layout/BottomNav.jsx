import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Mail, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav({ currentPage, unreadMessages = 0 }) {
  const navItems = [
    { name: 'home', label: 'home', icon: Home, page: 'Home' },
    { name: 'messaggi', label: 'messaggi', icon: Mail, page: 'Messaggi', badge: unreadMessages },
    { name: 'contatta', label: 'contatta consorzio', icon: Phone, page: 'ContattaConsorzio' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-lime-400 py-3 px-4 z-50">
      <div className="max-w-md mx-auto flex justify-around items-center">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={createPageUrl(item.page)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all",
              currentPage === item.page ? "text-slate-900" : "text-slate-700 hover:text-slate-900"
            )}
          >
            <div className="relative">
              <item.icon className="w-6 h-6" />
              {item.badge > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}