import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';
import { Upload, Loader2, Shield, FileText, CheckCircle, AlertTriangle, Eye, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AnonymizeQuoteView({ requestId, user, onAnonymized }) {
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
      request_id: requestId,
      user_company_name: user?.company_name || '',
      user_address: user?.address ? `${user.address}, ${user.city || ''} ${user.postal_code || ''}` : '',
      user_vat: user?.vat_number || ''
    }),
    onSuccess: (res) => {
      setResult(res.data);
      if (onAnonymized) onAnonymized(res.data.anonymized_url);
    }
  });

  return (
    <div className="space-y-4">
      {/* Overlay bloccante durante anonimizzazione */}
      {anonymizeMutation.isPending && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-8 max-w-sm mx-4 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-lime-400/20 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 animate-spin text-lime-400" />
            </div>
            <h3 className="text-white text-lg font-semibold">Anonimizzazione in corso...</h3>
            <p className="text-slate-400 text-sm">
              Stiamo oscurando nomi, indirizzi, P.IVA e loghi dal tuo preventivo. 
              Può richiedere fino a <span className="text-lime-400 font-medium">30 secondi</span>.
            </p>
            <p className="text-slate-500 text-xs">Non chiudere questa finestra.</p>
          </div>
        </div>
      )}

      <div className="bg-slate-900 rounded-lg p-3 flex items-start gap-2">
        <Shield className="w-4 h-4 text-lime-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-slate-300 text-xs font-medium">Anonimizzazione visiva del preventivo</p>
          <p className="text-slate-500 text-xs mt-0.5">
            Carica un preventivo esistente. Il documento verrà mostrato così com'è, ma con loghi, nomi aziende, 
            indirizzi, P.IVA e ogni dato identificativo coperti da barre nere. I prezzi e le condizioni resteranno visibili.
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
            accept=".pdf,.jpg,.jpeg,.png"
          />
          <label htmlFor="quote-upload" className="cursor-pointer block">
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-lime-400 mx-auto" />
            ) : fileUrl ? (
              <div className="space-y-2">
                <FileText className="w-8 h-8 text-lime-400 mx-auto" />
                <p className="text-white text-sm">{fileName}</p>
                <p className="text-slate-500 text-xs">File caricato — clicca per cambiare</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-slate-400 text-sm">Carica preventivo (PDF o immagine)</p>
                <p className="text-slate-600 text-xs">Il documento sarà visivamente anonimizzato dall'AI</p>
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
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Anonimizzazione in corso (può richiedere ~30s)...</>
          ) : (
            <><Eye className="w-4 h-4 mr-2" /> Anonimizza preventivo</>
          )}
        </Button>
      )}

      {/* Error */}
      {anonymizeMutation.isError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            Errore durante l'anonimizzazione. Riprova.
          </p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-lime-400" />
            <h4 className="text-white font-semibold text-sm">Preventivo anonimizzato</h4>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-800 rounded-lg p-2">
              <p className="text-slate-500 text-xs">Elementi censurati</p>
              <p className="text-white text-sm font-semibold">{result.sensitive_items_found || 0}</p>
            </div>
            {result.total_amount && (
              <div className="bg-slate-800 rounded-lg p-2">
                <p className="text-slate-500 text-xs">Importo totale</p>
                <p className="text-lime-400 text-sm font-semibold">{result.total_amount}</p>
              </div>
            )}
          </div>

          {/* Preview iframe */}
          {result.anonymized_url && (
            <div className="bg-white rounded-lg overflow-hidden">
              <iframe
                src={result.anonymized_url}
                className="w-full h-[500px] border-0"
                title="Preventivo anonimizzato"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(result.anonymized_url, '_blank')}
              className="flex-1 border-slate-600 text-slate-300"
            >
              <ExternalLink className="w-4 h-4 mr-2" /> Apri in nuova scheda
            </Button>
            <Button 
              variant="outline" 
              onClick={() => { setResult(null); setFileUrl(null); setFileName(''); }}
              className="flex-1 border-slate-600 text-slate-300"
            >
              Carica un altro
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}