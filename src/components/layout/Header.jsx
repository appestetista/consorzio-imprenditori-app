import React, { useState } from 'react';
import { Menu, X, LogOut, Settings, Users, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

export default function Header({ user, totalNotifications = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = user?.role === 'admin';

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <>
      <header className="bg-slate-900 py-4 px-4 flex items-center justify-between sticky top-0 z-40 border-b border-lime-400/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-lime-400 rounded-full flex items-center justify-center">
            <span className="text-slate-900 font-bold text-lg">C</span>
          </div>
          <div>
            <h1 className="text-lime-400 font-bold text-lg leading-tight">Consorzio</h1>
            <p className="text-lime-400 text-sm">Imprenditori</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {totalNotifications > 0 && (
            <span className="bg-red-500 text-white text-sm rounded-full w-6 h-6 flex items-center justify-center font-bold">
              {totalNotifications > 99 ? '99+' : totalNotifications}
            </span>
          )}
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="bg-lime-400 p-2 rounded-lg"
          >
            {menuOpen ? <X className="w-6 h-6 text-slate-900" /> : <Menu className="w-6 h-6 text-slate-900" />}
          </button>
        </div>
      </header>

      {/* Menu Drawer */}
      <div className={cn(
        "fixed inset-0 z-50 transition-all duration-300",
        menuOpen ? "visible" : "invisible"
      )}>
        <div 
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity",
            menuOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMenuOpen(false)}
        />
        <div className={cn(
          "absolute right-0 top-0 h-full w-72 bg-slate-900 border-l border-lime-400/30 p-6 transition-transform duration-300",
          menuOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="flex justify-end mb-6">
            <button onClick={() => setMenuOpen(false)}>
              <X className="w-6 h-6 text-lime-400" />
            </button>
          </div>
          
          <div className="space-y-2">
            <p className="text-lime-400 font-semibold mb-4">
              {user?.company_name || user?.full_name || 'Utente'}
            </p>
            
            {isAdmin && (
              <Link
                to={createPageUrl('AdminPanel')}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Settings className="w-5 h-5 text-lime-400" />
                <span>Pannello Admin</span>
              </Link>
            )}
            
            {isAdmin && (
              <Link
                to={createPageUrl('GestioneMembri')}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Users className="w-5 h-5 text-lime-400" />
                <span>Gestione Membri</span>
              </Link>
            )}

            <Link
              to={createPageUrl('MyProfile')}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <User className="w-5 h-5 text-lime-400" />
              <span>Il Mio Profilo</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors w-full"
            >
              <LogOut className="w-5 h-5 text-red-400" />
              <span>Esci</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}