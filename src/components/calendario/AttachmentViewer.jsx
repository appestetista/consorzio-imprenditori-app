import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

export default function AttachmentViewer({ attachment, onClose }) {
  if (!attachment) return null;

  const isImage = attachment.type?.startsWith('image/');
  const isAudio = attachment.type?.startsWith('audio/');
  const isPdf = attachment.type === 'application/pdf' || attachment.name?.endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-800">
        <span className="text-slate-300 text-xs truncate flex-1 mr-3">{attachment.name}</span>
        <div className="flex items-center gap-2">
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            download={attachment.name}
            className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-400" />
          </a>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {isImage ? (
          <img 
            src={attachment.url} 
            alt={attachment.name} 
            className="max-w-full max-h-full object-contain rounded"
          />
        ) : isPdf ? (
          <iframe 
            src={attachment.url} 
            className="w-full h-full rounded bg-white"
            title={attachment.name}
          />
        ) : isAudio ? (
          <div className="flex flex-col items-center gap-4">
            <div className="text-slate-400 text-sm">{attachment.name}</div>
            <audio controls src={attachment.url} className="w-72" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="text-slate-400 text-sm">Anteprima non disponibile</div>
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-white text-sm hover:bg-slate-700"
            >
              <ExternalLink className="w-4 h-4" />
              Apri file
            </a>
          </div>
        )}
      </div>
    </div>
  );
}