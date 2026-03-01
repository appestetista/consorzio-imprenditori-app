import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { X, User, Phone, LogOut, Settings, XCircle, Crown, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useImpersonation } from '../admin/ImpersonationContext';
import { isUserConsultant } from '../utils/normalizeUser';
import BottomNav from './BottomNav';

export default function BottomNavWithMenu({ currentPage, activeTab = null, unreadMessages = 0 }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const { impersonation, stopImpersonation } = useImpersonation();

  useEffect(() => {
    base44.auth.me().then(u => setEffectiveUser(u)).catch(() => {});
  }, []);

  const DEFAULT_LOGO = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop";
  const userLogo = effectiveUser?.company_logo || DEFAULT_LOGO;

  return (
    <>
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
          "absolute right-0 top-0 h-full w-72 bg-slate-900 border-l border-[#d4af37]/30 p-6 transition-transform duration-300",
          menuOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src={userLogo} alt="Profilo" className="w-10 h-10 rounded-full object-cover border-2 border-[#d4af37]/50" />
              <p className="text-[#d4af37] font-semibold text-sm truncate max-w-[140px]">
                {effectiveUser?.company_name || effectiveUser?.full_name || 'Utente'}
              </p>
            </div>
            <button onClick={() => setMenuOpen(false)}>
              <X className="w-6 h-6 text-[#d4af37]" />
            </button>
          </div>
          
          <div className="space-y-2">
            {impersonation.active && (
              <button
                onClick={() => { stopImpersonation(); setMenuOpen(false); window.location.href = createPageUrl('Home'); }}
                className="flex items-center gap-3 text-white py-3 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 transition-colors w-full mb-3"
              >
                <XCircle className="w-5 h-5" />
                <span>Torna ad Admin</span>
              </button>
            )}

            {effectiveUser?.role === 'admin' && !impersonation.active && (
              <Link
                to={createPageUrl('AdminPanel')}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Settings className="w-5 h-5 text-[#d4af37]" />
                <span>Pannello Admin</span>
              </Link>
            )}

            {(effectiveUser?.role === 'user' || isUserConsultant(effectiveUser) || impersonation.active) && (
              <Link
                to={createPageUrl('MyProfile')}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <User className="w-5 h-5 text-[#d4af37]" />
                <span>Il Mio Profilo</span>
              </Link>
            )}

            <Link
              to={createPageUrl('Pricing')}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Crown className="w-5 h-5 text-[#d4af37]" />
              <span>Prezzi</span>
            </Link>

            <Link
              to={createPageUrl('ContattaConsorzio')}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <Phone className="w-5 h-5 text-[#d4af37]" />
              <span>Contatta Consorzio</span>
            </Link>

            <button
              onClick={() => { setMenuOpen(false); base44.auth.logout(); }}
              className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors w-full text-left"
            >
              <LogOut className="w-5 h-5 text-red-400" />
              <span>Esci</span>
            </button>
          </div>
        </div>
      </div>

      <BottomNav 
        currentPage={currentPage} 
        activeTab={activeTab}
        unreadMessages={unreadMessages} 
        onMenuOpen={() => setMenuOpen(prev => !prev)} 
        menuOpen={menuOpen} 
      />
    </>
  );
}