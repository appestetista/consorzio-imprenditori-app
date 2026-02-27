import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, FileText } from 'lucide-react';

export default function MultiFileUpload({ uploadedFiles, previewUrls, onFilesChange, onPreviewsChange }) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    onFilesChange(prev => [...prev, file]);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onPreviewsChange(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    } else {
      onPreviewsChange(prev => [...prev, null]);
    }
    e.target.value = '';
  };

  const removeFile = (index) => {
    onFilesChange(prev => prev.filter((_, i) => i !== index));
    onPreviewsChange(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div>
      {/* Preview file caricati */}
      {uploadedFiles.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-lime-400 text-sm font-medium">
            {uploadedFiles.length} {uploadedFiles.length === 1 ? 'file caricato' : 'file caricati'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {uploadedFiles.map((file, idx) => (
              <div key={idx} className="relative bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                {previewUrls[idx] ? (
                  <img src={previewUrls[idx]} alt={`Pagina ${idx + 1}`} className="w-full h-20 object-cover" />
                ) : (
                  <div className="w-full h-20 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-slate-500" />
                  </div>
                )}
                <button
                  onClick={() => removeFile(idx)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                >
                  ✕
                </button>
                <p className="text-slate-400 text-[10px] text-center py-0.5 truncate px-1">{file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          className="border-lime-400 text-lime-400 hover:bg-lime-400/20 h-20 flex-col gap-2"
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera className="w-6 h-6" />
          <span className="text-xs">Scatta foto</span>
        </Button>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          className="border-slate-500 text-slate-300 hover:bg-slate-700 h-20 flex-col gap-2"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-6 h-6" />
          <span className="text-xs">Carica file</span>
        </Button>
      </div>
    </div>
  );
}