import React, { useState, useRef } from 'react';
import { Plus, Camera, Image, Paperclip, X, Loader2 } from 'lucide-react';
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
      // Reset inputs per permettere di ricaricare lo stesso file
      if (cameraRef.current) cameraRef.current.value = '';
      if (photoRef.current) photoRef.current.value = '';
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="relative flex-shrink-0">
      {/* Input nascosti */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
      <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />
      <input ref={fileRef} type="file" accept="*/*" className="hidden" onChange={(e) => handleUpload(e.target.files?.[0])} />

      {/* Overlay per chiudere */}
      {open && (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
      )}

      {/* Popup 3 pulsanti stile ChatGPT */}
      {open && (
        <div className="absolute bottom-full left-0 mb-3 z-50">
          <div className="flex gap-2">
            {/* Fotocamera */}
            <button
              onClick={() => { cameraRef.current?.click(); setOpen(false); }}
              className="flex flex-col items-center justify-center w-[80px] h-[72px] rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 active:scale-95 transition-all"
            >
              <Camera className="w-5 h-5 text-slate-300 mb-1" />
              <span className="text-[10px] text-slate-400 font-medium">Fotocamera</span>
            </button>
            {/* Foto */}
            <button
              onClick={() => { photoRef.current?.click(); setOpen(false); }}
              className="flex flex-col items-center justify-center w-[80px] h-[72px] rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 active:scale-95 transition-all"
            >
              <Image className="w-5 h-5 text-slate-300 mb-1" />
              <span className="text-[10px] text-slate-400 font-medium">Foto</span>
            </button>
            {/* File */}
            <button
              onClick={() => { fileRef.current?.click(); setOpen(false); }}
              className="flex flex-col items-center justify-center w-[80px] h-[72px] rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 active:scale-95 transition-all"
            >
              <Paperclip className="w-5 h-5 text-slate-300 mb-1" />
              <span className="text-[10px] text-slate-400 font-medium">File</span>
            </button>
          </div>
        </div>
      )}

      {/* Pulsante + */}
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled || uploading}
        className="ml-1 mb-2 w-7 h-7 rounded-full flex items-center justify-center transition-all"
        style={{ backgroundColor: open ? '#334155' : 'transparent' }}
      >
        {uploading ? (
          <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
        ) : open ? (
          <X className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <Plus className="w-4 h-4 text-slate-400" />
        )}
      </button>
    </div>
  );
}