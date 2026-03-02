import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { QrCode, Copy, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function generateQRCodeSVG(data, size = 200) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=1e293b&color=d4af37`;
}

export default function InlineMyQRCode({ user, compact = false }) {
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

  if (compact) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          {qrUrl && <img src={qrUrl} alt="QR Code" className="rounded-md w-full max-w-[140px] aspect-square" />}
        </div>
        <p className="text-slate-500 text-[10px] text-center mt-2 leading-tight">Fai scansionare il tuo QR dall'attività per utilizzare un vantaggio</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-[#d4af37]/30 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <QrCode className="w-5 h-5 text-[#d4af37]" />
        <h3 className="text-white font-bold text-sm">Se hai prenotato un vantaggio, all'arrivo fallo scansionare dall'attività.</h3>
      </div>
      <div className="flex items-center justify-center">
        {qrUrl && <img src={qrUrl} alt="QR Code" className="rounded-md" style={{ width: '180px', height: '180px' }} />}
      </div>
    </div>
  );
}