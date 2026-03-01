import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { QrCode, Copy, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

function generateQRCodeSVG(data, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=1e293b&color=a3e635`;
}

export default function QRCodeMyTab({ user }) {
  const [copied, setCopied] = useState(false);

  const { data: qrData, isLoading } = useQuery({
    queryKey: ['user-qr-code', user?.email],
    queryFn: async () => {
      const existing = await base44.entities.UserQRCode.filter({ user_email: user.email });
      if (existing.length > 0) return existing[0];
      const token = `QR-${user.email.split('@')[0]}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
      return await base44.entities.UserQRCode.create({ user_email: user.email, qr_token: token });
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

  if (isLoading) {
    return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-2 border-[#d4af37] border-t-transparent rounded-full"></div></div>;
  }

  const qrUrl = qrData ? generateQRCodeSVG(qrData.qr_token, 250) : null;

  return (
    <div>
      <Card className="bg-slate-800/60 border-[#d4af37]/20 overflow-hidden">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            {user?.logo_url ? (
              <img src={user.logo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 bg-[#d4af37] rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-slate-900" />
              </div>
            )}
            <div className="text-left">
              <p className="text-white font-bold">{user?.company_name || user?.full_name}</p>
              <p className="text-slate-400 text-sm">{user?.email}</p>
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
            {qrUrl && <img src={qrUrl} alt="QR Code" className="mx-auto rounded-lg" />}
          </div>

          <div className="bg-slate-900/60 rounded-lg p-3 mb-4">
            <p className="text-slate-400 text-xs mb-1">Il tuo codice identificativo:</p>
            <p className="text-[#d4af37] font-mono font-bold text-sm break-all">{qrData?.qr_token}</p>
          </div>

          <Button onClick={handleCopy} variant="outline" className="w-full border-[#d4af37]/50 text-[#d4af37] hover:bg-[#d4af37]/10">
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Copiato!' : 'Copia codice'}
          </Button>
        </CardContent>
      </Card>

      <div className="mt-5 bg-slate-800/30 border border-slate-700/40 rounded-xl p-4">
        <h3 className="text-white font-bold mb-3 text-sm">Come usare il QR Code</h3>
        <ol className="text-slate-400 text-sm space-y-2">
          {['Prenota un vantaggio dalla lista', "Vai fisicamente presso l'attività", 'Mostra questo QR code al personale', 'Il vantaggio verrà validato automaticamente'].map((t, i) => (
            <li key={i} className="flex gap-2">
              <span className="bg-[#d4af37] text-slate-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}