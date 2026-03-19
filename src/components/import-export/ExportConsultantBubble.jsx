import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import ExportContactCard from './ExportContactCard';

const BUBBLE_IMG = 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/5735af2d2_ChatGPT_Image_9_mar_2026__14_59_16-removebg-preview.png';

export default function ExportConsultantBubble({
  contactForm, setContactForm, contactSent, setContactSent,
  sendContactMutation, uploadingAttachment, handleAttachmentUpload,
  removeAttachment, exportManagers
}) {
  const [open, setOpen] = useState(false);
  const [bobOffset, setBobOffset] = useState(0);
  const animRef = useRef(null);

  // Animazione bobbing continua
  useEffect(() => {
    let frame = 0;
    const animate = () => {
      frame++;
      setBobOffset(Math.sin(frame * 0.04) * 6);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <>
      {/* Bolla floating */}
      <button
        onClick={() => setOpen(true)}
        className="fixed z-[100] right-4 transition-transform active:scale-90"
        style={{
          bottom: `${80 + bobOffset}px`,
          width: 68, height: 68,
        }}
      >
        <div className="relative w-full h-full">
          {/* Cerchio glow pulsante */}
          <div className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: 'radial-gradient(circle, rgba(212,175,55,0.25) 0%, transparent 70%)',
              transform: 'scale(1.5)',
            }}
          />
          {/* Bolla trasparente */}
          <div className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 40%, rgba(100,180,255,0.1) 70%, transparent 100%)',
              border: '1.5px solid rgba(255,255,255,0.2)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3), inset 0 2px 8px rgba(255,255,255,0.15)',
              backdropFilter: 'blur(4px)',
            }}
          />
          {/* Pupino */}
          <img
            src={BUBBLE_IMG}
            alt="Consulente Export"
            className="absolute inset-0 w-full h-full object-contain p-1 drop-shadow-lg pointer-events-none"
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }}
          />
        </div>
      </button>

      {/* Popup modale */}
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/60 backdrop-blur-sm px-3 pb-3"
          onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.1)',
              maxHeight: '85vh',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <img src={BUBBLE_IMG} alt="" className="w-10 h-10 object-contain" />
                <div>
                  <p className="text-white font-bold text-sm">Consulente Export</p>
                  <p className="text-slate-400 text-[10px]">Richiedi assistenza personalizzata</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Contenuto scrollabile */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 60px)' }}>
              <div className="p-1">
                <ExportContactCard
                  contactForm={contactForm}
                  setContactForm={setContactForm}
                  contactSent={contactSent}
                  setContactSent={setContactSent}
                  sendContactMutation={sendContactMutation}
                  uploadingAttachment={uploadingAttachment}
                  handleAttachmentUpload={handleAttachmentUpload}
                  removeAttachment={removeAttachment}
                  exportManagers={exportManagers}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}