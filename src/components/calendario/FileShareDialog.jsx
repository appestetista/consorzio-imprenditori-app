import React from 'react';
import ReactDOM from 'react-dom';
import { X, Mail, MessageCircle } from 'lucide-react';

export default function FileShareDialog({ file, onClose }) {
  if (!file) return null;

  const shareText = `📄 ${file.titolo}\n${file.contenuto || ''}`.trim();
  const shareTextEncoded = encodeURIComponent(shareText);

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${shareTextEncoded}`, '_blank');
    onClose();
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`File: ${file.titolo}`);
    const body = shareTextEncoded;
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-slate-800 rounded-xl p-5 w-72 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-base">Condividi</h3>
          <button onClick={onClose} className="w-6 h-6 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        <p className="text-slate-400 text-xs mb-4 truncate">📄 {file.titolo}</p>

        <div className="flex gap-3">
          <button
            onClick={handleWhatsApp}
            className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl bg-green-600/20 hover:bg-green-600/30 transition-colors"
          >
            <MessageCircle className="w-8 h-8 text-green-400" />
            <span className="text-xs text-green-300 font-semibold">WhatsApp</span>
          </button>
          <button
            onClick={handleEmail}
            className="flex-1 flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 transition-colors"
          >
            <Mail className="w-8 h-8 text-blue-400" />
            <span className="text-xs text-blue-300 font-semibold">Email</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}