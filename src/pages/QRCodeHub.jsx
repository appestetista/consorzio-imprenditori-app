import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, QrCode, Gift, ScanLine, Bookmark, X, User, Phone, LogOut, Settings, Crown, XCircle } from 'lucide-react';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { normalizeUser, isUserConsultant } from '../components/utils/normalizeUser';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import QRCodeMyTab from '../components/qrhub/QRCodeMyTab';
import QRCodeScannerTab from '../components/qrhub/QRCodeScannerTab';
import QRCodeVantaggiTab from '../components/qrhub/QRCodeVantaggiTab';
import QRCodePrenotazioniTab from '../components/qrhub/QRCodePrenotazioniTab';

export default function QRCodeHub() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vantaggi');
  const [menuOpen, setMenuOpen] = useState(false);
  const { impersonation } = useImpersonation();
  const navigate = useNavigate();

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
        <div className="flex items-center gap-3 mb-5">
          <Link to={createPageUrl('Home')} className="text-[#d4af37] back-arrow-tap">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <QrCode className="w-6 h-6 text-[#d4af37]" />
          <h1 className="text-white text-xl font-bold">Vantaggi & QR Code</h1>
        </div>

        {/* Pulsanti grandi: Vantaggi e Prenotazioni */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            onClick={() => setActiveTab('vantaggi')}
            className={cn(
              "rounded-2xl py-5 px-4 flex flex-col items-center gap-2 border-2 transition-all font-bold text-base",
              activeTab === 'vantaggi'
                ? "bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]"
                : "bg-slate-800/60 border-slate-700/50 text-slate-300 hover:border-slate-600"
            )}
          >
            <Gift className="w-8 h-8" />
            Vantaggi
          </button>
          <button
            onClick={() => setActiveTab('prenotazioni')}
            className={cn(
              "rounded-2xl py-5 px-4 flex flex-col items-center gap-2 border-2 transition-all font-bold text-base",
              activeTab === 'prenotazioni'
                ? "bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]"
                : "bg-slate-800/60 border-slate-700/50 text-slate-300 hover:border-slate-600"
            )}
          >
            <Bookmark className="w-8 h-8" />
            Prenotazioni
          </button>
        </div>

        {/* Pulsanti quadrati: Il Mio QR e Scanner */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => setActiveTab('mio-qr')}
            className={cn(
              "rounded-2xl aspect-square flex flex-col items-center justify-center gap-2 border-2 transition-all font-semibold text-sm",
              activeTab === 'mio-qr'
                ? "bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]"
                : "bg-slate-800/60 border-slate-700/50 text-slate-300 hover:border-slate-600"
            )}
          >
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/26d542c6d_istockphoto-1358621997-612x612.jpg"
              alt="QR"
              className={cn("w-14 h-14 object-contain", activeTab === 'mio-qr' ? "brightness-100 sepia hue-rotate-[15deg] saturate-[3]" : "invert opacity-60")}
            />
            Il Mio QR
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={cn(
              "rounded-2xl aspect-square flex flex-col items-center justify-center gap-2 border-2 transition-all font-semibold text-sm",
              activeTab === 'scanner'
                ? "bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]"
                : "bg-slate-800/60 border-slate-700/50 text-slate-300 hover:border-slate-600"
            )}
          >
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/26d542c6d_istockphoto-1358621997-612x612.jpg"
              alt="Scanner"
              className={cn("w-14 h-14 object-contain", activeTab === 'scanner' ? "brightness-100 sepia hue-rotate-[15deg] saturate-[3]" : "invert opacity-60")}
            />
            Scanner
          </button>
        </div>

        {/* Contenuto tab attivo */}
        {activeTab === 'vantaggi' && <QRCodeVantaggiTab user={user} />}
        {activeTab === 'mio-qr' && <QRCodeMyTab user={user} />}
        {activeTab === 'scanner' && <QRCodeScannerTab user={user} />}
        {activeTab === 'prenotazioni' && <QRCodePrenotazioniTab user={user} />}
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