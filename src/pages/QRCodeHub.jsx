import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, QrCode, Gift, Bookmark, X, User, Phone, LogOut, Settings, Crown, XCircle } from 'lucide-react';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { cn } from '@/lib/utils';

import QRCodeMyTab from '../components/qrhub/QRCodeMyTab';
import QRCodeScannerTab from '../components/qrhub/QRCodeScannerTab';
import QRCodeVantaggiTab from '../components/qrhub/QRCodeVantaggiTab';
import QRCodePrenotazioniTab from '../components/qrhub/QRCodePrenotazioniTab';

export default function QRCodeHub() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vantaggi'); // 'vantaggi' | 'prenotazioni'
  const [menuOpen, setMenuOpen] = useState(false);
  const { impersonation } = useImpersonation();

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (impersonation.active && impersonation.targetEmail) {
          const users = await base44.entities.User.filter({ email: impersonation.targetEmail });
          setUser(users[0] || currentUser);
        } else {
          setUser(currentUser);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [impersonation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: '#0a0f1a' }}>
      <main className="px-4 py-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl('Esplora?tab=strumenti')} className="text-[#d4af37] back-arrow-tap">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <QrCode className="w-6 h-6 text-[#d4af37]" />
          <h1 className="text-white text-xl font-bold">Vantaggi & QR Code</h1>
        </div>

        {/* QR Code personale compatto + Scanner */}
        <div className="mb-4">
          <QRCodeMyTab user={user} compact />
        </div>

        {/* Scanner sempre visibile */}
        <div className="mb-5">
          <QRCodeScannerTab user={user} />
        </div>

        {/* Etichette laterali verticali Vantaggi / Prenotazioni */}
        <div className="flex gap-0 mb-5">
          <button
            onClick={() => setActiveTab('vantaggi')}
            className={cn(
              "flex items-center justify-center py-3 px-1 rounded-l-xl border-2 border-r-0 transition-all font-bold text-xs",
              "writing-mode-vertical",
              activeTab === 'vantaggi'
                ? "bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]"
                : "bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-600"
            )}
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', minHeight: '120px' }}
          >
            <Gift className="w-4 h-4 mb-2" />
            VANTAGGI
          </button>
          <button
            onClick={() => setActiveTab('prenotazioni')}
            className={cn(
              "flex items-center justify-center py-3 px-1 rounded-r-xl border-2 border-l-0 transition-all font-bold text-xs",
              activeTab === 'prenotazioni'
                ? "bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]"
                : "bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-600"
            )}
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', minHeight: '120px' }}
          >
            <Bookmark className="w-4 h-4 mb-2" />
            PRENOTAZIONI
          </button>

          {/* Contenuto tab */}
          <div className="flex-1 min-w-0 ml-2">
            {activeTab === 'vantaggi' && <QRCodeVantaggiTab user={user} />}
            {activeTab === 'prenotazioni' && <QRCodePrenotazioniTab user={user} />}
          </div>
        </div>
      </main>

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
          <div className="flex items-center justify-between mb-6">
            <p className="text-lime-400 font-semibold text-sm">
              {user?.company_name || user?.full_name || 'Utente'}
            </p>
            <button onClick={() => setMenuOpen(false)}>
              <X className="w-6 h-6 text-lime-400" />
            </button>
          </div>
          
          <div className="space-y-2">
            {impersonation.active && (
              <Link
                to={createPageUrl('Home')}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 text-white py-3 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 transition-colors w-full mb-3"
              >
                <XCircle className="w-5 h-5" />
                <span>Torna ad Admin</span>
              </Link>
            )}
            
            {user?.role === 'admin' && !impersonation.active && (
              <Link
                to={createPageUrl('AdminPanel')}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 text-white py-3 px-4 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Settings className="w-5 h-5 text-lime-400" />
                <span>Pannello Admin</span>
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
              <Phone className="w-5 h-5 text-lime-400" />
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

      <BottomNav currentPage="QRCodeHub" onMenuOpen={() => setMenuOpen(true)} menuOpen={menuOpen} />
    </div>
  );
}