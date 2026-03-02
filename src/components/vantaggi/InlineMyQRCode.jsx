import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { QrCode, Copy, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function generateQRCodeSVG(data, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=1e293b&color=d4af37`;
}

export default function InlineMyQRCode({ user }) {
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
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin w-6 h-6 border-2 border-[#d4af37] border-t-transparent rounded-full" />
      </div>
    );
  }

  const qrUrl = qrData ? generateQRCodeSVG(qrData.qr_token, 200) : null;

  return (
    <div className="bg-slate-800 border border-[#d4af37]/30 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <QrCode className="w-5 h-5 text-[#d4af37]" />
        <h3 className="text-white font-bold text-sm">Il Mio QR Code</h3>
      </div>

      {/* Info utente compatta */}
      <div className="flex items-center gap-2 mb-3">
        {user?.logo_url ? (
          <img src={user.logo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
        ) : (
          <div className="w-8 h-8 bg-[#d4af37] rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-slate-900" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm truncate">{user?.company_name || user?.full_name}</p>
          <p className="text-slate-400 text-[10px] truncate">{user?.email}</p>
        </div>
      </div>

      {/* QR Code */}
      <div className="bg-slate-700 rounded-lg p-3 mb-3 flex items-center justify-center">
        {qrUrl && <img src={qrUrl} alt="QR Code" className="rounded-md" style={{ width: '180px', height: '180px' }} />}
      </div>

      {/* Token + Copia */}
      <div className="bg-slate-900 rounded-lg p-2 mb-2">
        <p className="text-[#d4af37] font-mono font-bold text-[11px] break-all text-center">
          {qrData?.qr_token}
        </p>
      </div>

      <Button onClick={handleCopy} variant="outline" size="sm" className="w-full border-[#d4af37]/50 text-[#d4af37] hover:bg-[#d4af37]/10 h-8 text-xs">
        {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
        {copied ? 'Copiato!' : 'Copia codice'}
      </Button>

      <p className="text-slate-500 text-[10px] text-center mt-2">
        Mostra questo QR code in negozio per usare i vantaggi
      </p>
    </div>
  );
}