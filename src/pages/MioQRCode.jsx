import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, QrCode, Copy, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { toast } from 'sonner';

// Genera QR Code come SVG
function generateQRCodeSVG(data, size = 200) {
  // Semplice QR code pattern (in produzione usare una libreria come qrcode)
  // Per ora usiamo un servizio esterno
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=1e293b&color=a3e635`;
}

export default function MioQRCode() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
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

  // Ottieni o crea QR code per l'utente
  const { data: qrData, isLoading: loadingQR } = useQuery({
    queryKey: ['user-qr-code', user?.email],
    queryFn: async () => {
      // Cerca QR esistente
      const existing = await base44.entities.UserQRCode.filter({ user_email: user.email });
      if (existing.length > 0) {
        return existing[0];
      }
      // Crea nuovo QR token (UUID-like)
      const token = `QR-${user.email.split('@')[0]}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
      const newQR = await base44.entities.UserQRCode.create({
        user_email: user.email,
        qr_token: token
      });
      return newQR;
    },
    enabled: !!user?.email,
  });

  const handleCopy = () => {
    if (qrData?.qr_token) {
      navigator.clipboard.writeText(qrData.qr_token);
      setCopied(true);
      toast.success('Codice copiato!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading || loadingQR) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const qrUrl = qrData ? generateQRCodeSVG(qrData.qr_token, 250) : null;

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />

      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('VantaggiIscritti')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <QrCode className="w-6 h-6 text-lime-400" />
          <h1 className="text-white text-xl font-bold">Il Mio QR Code</h1>
        </div>

        {/* Card principale QR */}
        <Card className="bg-slate-800 border-lime-400/30 overflow-hidden">
          <CardContent className="p-6 text-center">
            {/* Info utente */}
            <div className="flex items-center justify-center gap-3 mb-4">
              {user?.logo_url ? (
                <img src={user.logo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 bg-lime-400 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-slate-900" />
                </div>
              )}
              <div className="text-left">
                <p className="text-white font-bold">{user?.company_name || user?.full_name}</p>
                <p className="text-slate-400 text-sm">{user?.email}</p>
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-slate-700 rounded-xl p-4 mb-4">
              {qrUrl && (
                <img 
                  src={qrUrl} 
                  alt="QR Code" 
                  className="mx-auto rounded-lg"
                />
              )}
            </div>

            {/* Token visibile */}
            <div className="bg-slate-900 rounded-lg p-3 mb-4">
              <p className="text-slate-400 text-xs mb-1">Il tuo codice identificativo:</p>
              <p className="text-lime-400 font-mono font-bold text-sm break-all">
                {qrData?.qr_token}
              </p>
            </div>

            <Button
              onClick={handleCopy}
              variant="outline"
              className="w-full border-lime-400 text-lime-400 hover:bg-lime-400/10"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copiato!' : 'Copia codice'}
            </Button>
          </CardContent>
        </Card>

        {/* Istruzioni */}
        <div className="mt-6 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <h3 className="text-white font-bold mb-3">Come usare il QR Code</h3>
          <ol className="text-slate-400 text-sm space-y-2">
            <li className="flex gap-2">
              <span className="bg-lime-400 text-slate-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
              <span>Prenota un vantaggio dalla lista</span>
            </li>
            <li className="flex gap-2">
              <span className="bg-lime-400 text-slate-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
              <span>Vai fisicamente presso l'attività</span>
            </li>
            <li className="flex gap-2">
              <span className="bg-lime-400 text-slate-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
              <span>Mostra questo QR code al personale</span>
            </li>
            <li className="flex gap-2">
              <span className="bg-lime-400 text-slate-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
              <span>Il vantaggio verrà validato automaticamente</span>
            </li>
          </ol>
        </div>

        {/* Note */}
        <div className="mt-4 text-center">
          <p className="text-slate-500 text-xs">
            Questo QR code è personale e resta valido finché sei iscritto al Consorzio.
          </p>
        </div>
      </main>

      <BottomNav currentPage="MioQRCode" />
    </div>
  );
}