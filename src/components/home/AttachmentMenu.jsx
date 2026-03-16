import React, { useState, useRef } from 'react';
import { Plus, Camera, Image, Paperclip, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AttachmentMenu({ onFileUploaded, disabled }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef(null);
  const photoRef = useRef(null);
  const fileRef = useRef(null);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setOpen(false);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onFileUploaded?.(file_url, file.name);
      toast.success('File allegato!');
    } catch {
      toast.error('Errore durante il caricamento');
    } finally {
      setUploading(false);
    }
  };

  const items = [
    { icon: Camera, label: 'Fotocamera', onClick: () => cameraRef.current?.click() },
    { icon: Image, label: 'Foto', onClick: () => photoRef.current?.click() },
    { icon: Paperclip, label: 'Allega file', onClick: () => fileRef.current?.click() },
  ];

  return (
    <div className="relative flex-shrink-0">
      {/* Input nascosti */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
      <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
      <input ref={fileRef} type="file" accept="*/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />

      {/* Menu popup */}
      {open && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-2 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
            {items.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-white hover:bg-slate-700/60 transition-colors"
              >
                <item.icon className="w-4 h-4 text-slate-400" />
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Pulsante + */}
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled || uploading}
        className="ml-1 mb-2 w-7 h-7 rounded-full flex items-center justify-center transition-all"
        style={{ backgroundColor: open ? '#334155' : 'transparent' }}
      >
        {uploading ? (
          <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        ) : open ? (
          <X className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <Plus className="w-4 h-4 text-slate-400" />
        )}
      </button>
    </div>
  );
}