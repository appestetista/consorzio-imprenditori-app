import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Upload, Loader2, Shield, FileText, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AnonymizeQuoteView({ requestId }) {
  const [fileUrl, setFileUrl] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFileName(file.name);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFileUrl(file_url);
    setUploading(false);
  };

  const anonymizeMutation = useMutation({
    mutationFn: () => base44.functions.invoke('anonymizeQuote', {
      file_url: fileUrl,
      request_id: requestId
    }),
    onSuccess: (res) => setResult(res.data)
  });

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 rounded-lg p-3 flex items-start gap-2">
        <Shield className="w-4 h-4 text-lime-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-slate-300 text-xs font-medium">Anonimizzazione preventivo</p>
          <p className="text-slate-500 text-xs mt-0.5">
            Carica un preventivo esistente e il sistema rimuoverà automaticamente tutti i riferimenti 
            all'azienda emittente e alla tua azienda, mantenendo solo prezzi e condizioni.
          </p>
        </div>
      </div>

      {/* Upload area */}
      {!result && (
        <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center">
          <input
            type="file"
            id="quote-upload"
            className="hidden"
            onChange={handleUpload}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
          <label htmlFor="quote-upload" className="cursor-pointer block">
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-lime-400 mx-auto" />
            ) : fileUrl ? (
              <div className="space-y-2">
                <FileText className="w-8 h-8 text-lime-400 mx-auto" />
                <p className="text-white text-sm">{fileName}</p>
                <p className="text-slate-500 text-xs">File caricato - clicca per cambiare</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-slate-400 text-sm">Carica preventivo (PDF, immagine, documento)</p>
                <p className="text-slate-600 text-xs">Il file verrà analizzato e anonimizzato dall'AI</p>
              </div>
            )}
          </label>
        </div>
      )}

      {/* Anonymize button */}
      {fileUrl && !result && (
        <Button
          onClick={() => anonymizeMutation.mutate()}
          disabled={anonymizeMutation.isPending}
          className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500 font-semibold"
        >
          {anonymizeMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Anonimizzazione in corso...</>
          ) : (
            <><Eye className="w-4 h-4 mr-2" /> Anonimizza preventivo</>
          )}
        </Button>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-lime-400" />
            <h4 className="text-white font-semibold text-sm">Preventivo anonimizzato</h4>
          </div>

          {/* Document info */}
          <div className="grid grid-cols-2 gap-2">
            {result.document_type && (
              <div className="bg-slate-800 rounded-lg p-2">
                <p className="text-slate-500 text-xs">Tipo documento</p>
                <p className="text-white text-sm">{result.document_type}</p>
              </div>
            )}
            {result.total_amount && (
              <div className="bg-slate-800 rounded-lg p-2">
                <p className="text-slate-500 text-xs">Importo totale</p>
                <p className="text-lime-400 text-sm font-semibold">{result.total_amount}</p>
              </div>
            )}
          </div>

          {/* Items summary */}
          {result.items_summary?.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-3">
              <p className="text-slate-500 text-xs font-medium mb-2">Voci principali</p>
              <div className="space-y-1.5">
                {result.items_summary.map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-slate-300">{item.description}</span>
                    <span className="text-white font-medium">{item.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Anonymized content */}
          <div className="bg-slate-800 rounded-lg p-3">
            <p className="text-slate-500 text-xs font-medium mb-2">Contenuto anonimizzato</p>
            <div className="bg-slate-900 rounded-lg p-3 max-h-60 overflow-y-auto">
              <pre className="text-slate-300 text-xs whitespace-pre-wrap font-sans leading-relaxed">
                {result.anonymized_content}
              </pre>
            </div>
          </div>

          {/* Warnings */}
          {result.warnings?.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-amber-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {w}
                </p>
              ))}
            </div>
          )}

          <Button 
            variant="outline" 
            onClick={() => { setResult(null); setFileUrl(null); setFileName(''); }}
            className="w-full border-slate-600 text-slate-300"
          >
            Carica un altro preventivo
          </Button>
        </div>
      )}
    </div>
  );
}