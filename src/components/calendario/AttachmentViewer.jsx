import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

function getFileCategory(att) {
  const type = (att.type || '').toLowerCase();
  const name = (att.name || att.url || '').toLowerCase();
  const ext = name.split('.').pop();

  if (type.startsWith('image/') || ['jpg','jpeg','png','gif','webp','svg','bmp'].includes(ext)) return 'image';
  if (type.startsWith('audio/') || ['mp3','wav','ogg','webm','m4a','aac'].includes(ext)) return 'audio';
  if (type.startsWith('video/') || ['mp4','mov','avi','mkv'].includes(ext)) return 'video';
  if (type === 'application/pdf' || ext === 'pdf') return 'pdf';
  // Documenti office / testo: prova iframe
  if (['doc','docx','xls','xlsx','ppt','pptx','txt','csv','rtf'].includes(ext)) return 'document';
  // Fallback: prova sempre iframe
  return 'other';
}

export default function AttachmentViewer({ attachment, onClose }) {
  if (!attachment) return null;

  const category = getFileCategory(attachment);

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
        {category === 'image' ? (
          <img 
            src={attachment.url} 
            alt={attachment.name} 
            className="max-w-full max-h-full object-contain rounded"
          />
        ) : category === 'audio' ? (
          <div className="flex flex-col items-center gap-4">
            <div className="text-slate-400 text-sm">{attachment.name}</div>
            <audio controls src={attachment.url} className="w-72" />
          </div>
        ) : category === 'video' ? (
          <video controls src={attachment.url} className="max-w-full max-h-full rounded" />
        ) : (
          <iframe 
            src={attachment.url} 
            className="w-full h-full rounded bg-white"
            title={attachment.name}
          />
        )}
      </div>
    </div>
  );
}