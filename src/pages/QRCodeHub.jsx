import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, QrCode, Gift, ScanLine, Bookmark, X, User, Phone, LogOut, Settings, Crown, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { normalizeUser, isUserConsultant } from '../components/utils/normalizeUser';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import QRCodeMyTab from '../components/qrhub/QRCodeMyTab.jsx';
import QRCodeScannerTab from '../components/qrhub/QRCodeScannerTab.jsx';
import QRCodeVantaggiTab from '../components/qrhub/QRCodeVantaggiTab.jsx';
import QRCodePrenotazioniTab from '../components/qrhub/QRCodePrenotazioniTab.jsx';

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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-slate-800/80 border border-slate-700/50 mb-5 h-auto flex-wrap">
            <TabsTrigger value="vantaggi" className="flex-1 data-[state=active]:bg-[#d4af37]/20 data-[state=active]:text-[#d4af37] text-xs py-2.5">
              <Gift className="w-3.5 h-3.5 mr-1" />
              Vantaggi
            </TabsTrigger>
            <TabsTrigger value="mio-qr" className="flex-1 data-[state=active]:bg-[#d4af37]/20 data-[state=active]:text-[#d4af37] text-xs py-2.5">
              <QrCode className="w-3.5 h-3.5 mr-1" />
              Il Mio QR
            </TabsTrigger>
            <TabsTrigger value="scanner" className="flex-1 data-[state=active]:bg-[#d4af37]/20 data-[state=active]:text-[#d4af37] text-xs py-2.5">
              <ScanLine className="w-3.5 h-3.5 mr-1" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="prenotazioni" className="flex-1 data-[state=active]:bg-[#d4af37]/20 data-[state=active]:text-[#d4af37] text-xs py-2.5">
              <Bookmark className="w-3.5 h-3.5 mr-1" />
              Prenotazioni
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vantaggi">
            <QRCodeVantaggiTab user={user} />
          </TabsContent>

          <TabsContent value="mio-qr">
            <QRCodeMyTab user={user} />
          </TabsContent>

          <TabsContent value="scanner">
            <QRCodeScannerTab user={user} />
          </TabsContent>

          <TabsContent value="prenotazioni">
            <QRCodePrenotazioniTab user={user} />
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav currentPage="QRCodeHub" />
    </div>
  );
}