import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import DatiEstrattiBilancio from './DatiEstrattiBilancio';
import RevisioneContabile from './RevisioneContabile';
import IndicatoriFinanziari from './IndicatoriFinanziari';
import CoerenzaFiscale from './CoerenzaFiscale';

const PARTI_LABELS = {
  stato_patrimoniale: 'Stato Patrimoniale',
  conto_economico: 'Conto Economico',
  nota_integrativa: 'Nota Integrativa',
  rendiconto_finanziario: 'Rendiconto Finanziario'
};

export default function AnalisiBilancio() {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploading(true);
    setResult(null);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setUploading(false);

    setLoading(true);
    const response = await base44.functions.invoke('analisiBilancio', { file_url });
    setResult(response.data);
    setLoading(false);
  };

  const analisi = result?.analisi;
  const ocrInfo = result?.ocr_info;
  const datiEstratti = result?.dati_estratti;
  const revisione = result?.revisione;
  const indicatoriFinanziari = result?.indicatori_finanziari;
  const coerenzaFiscale = result?.coerenza_fiscale;
  const isIdoneo = analisi?.esito === 'Documento idoneo';

  return (
    <div className="space-y-4">
      {/* Info */}
      <Card className="bg-[#0a2540] border-[#1a3a5c]">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-[#d4af37] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white text-sm font-medium mb-1">Verifica Bilancio di Esercizio</p>
              <p className="text-slate-400 text-xs">
                Carica un bilancio (PDF) per verificare se contiene le parti obbligatorie previste dal Codice Civile italiano.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload */}
      <label className="block cursor-pointer">
        <input
          type="file"
          accept=".pdf,.xlsx,.csv,.png,.jpg,.jpeg"
          onChange={handleFileUpload}
          className="hidden"
          disabled={loading || uploading}
        />
        <Card className="bg-slate-800 border-slate-700 border-dashed border-2 hover:border-[#d4af37]/50 transition-colors">
          <CardContent className="p-6 text-center">
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin" />
                <p className="text-slate-300 text-sm">Caricamento file...</p>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-[#d4af37] animate-spin" />
                <p className="text-slate-300 text-sm">Analisi in corso...</p>
                <p className="text-slate-500 text-xs">Verifica delle sezioni del bilancio</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-slate-400" />
                <p className="text-slate-300 text-sm">Clicca per caricare il bilancio</p>
                <p className="text-slate-500 text-xs">PDF, XLSX, immagini</p>
              </div>
            )}
          </CardContent>
        </Card>
      </label>

      {/* File name */}
      {fileName && !loading && !uploading && (
        <p className="text-slate-500 text-xs text-center">File: {fileName}</p>
      )}

      {/* Risultato */}
      {analisi && (
        <div className="space-y-3">
          {/* Esito */}
          <Card className={`border-2 ${isIdoneo ? 'bg-green-900/20 border-green-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
            <CardContent className="p-4 flex items-center gap-3">
              {isIdoneo ? (
                <CheckCircle2 className="w-8 h-8 text-green-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
              )}
              <div>
                <p className={`font-bold text-lg ${isIdoneo ? 'text-green-400' : 'text-red-400'}`}>
                  {analisi.esito}
                </p>
                <p className="text-slate-400 text-xs mt-0.5">{analisi.tipo_documento}</p>
              </div>
            </CardContent>
          </Card>

          {/* Info documento */}
          {(analisi.ragione_sociale !== 'Non rilevata' || analisi.anno_riferimento !== 'Non rilevato') && (
            <Card className="bg-[#0a2540] border-[#1a3a5c]">
              <CardContent className="p-4 space-y-1">
                {analisi.ragione_sociale && analisi.ragione_sociale !== 'Non rilevata' && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs">Ragione sociale</span>
                    <span className="text-white text-xs font-medium">{analisi.ragione_sociale}</span>
                  </div>
                )}
                {analisi.anno_riferimento && analisi.anno_riferimento !== 'Non rilevato' && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-xs">Anno riferimento</span>
                    <span className="text-white text-xs font-medium">{analisi.anno_riferimento}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Checklist parti */}
          <Card className="bg-[#0a2540] border-[#1a3a5c]">
            <CardContent className="p-4">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">Sezioni rilevate</p>
              <div className="space-y-2">
                {Object.entries(PARTI_LABELS).map(([key, label]) => {
                  const presente = analisi.parti_presenti?.[key];
                  return (
                    <div key={key} className="flex items-center gap-3">
                      {presente ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${presente ? 'text-slate-200' : 'text-slate-500'}`}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Info OCR */}
          {ocrInfo && (
            <Card className="bg-[#0a2540] border-[#1a3a5c]">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-xs">Qualità OCR</span>
                  <span className={`text-xs font-medium ${
                    ocrInfo.qualita === 'buona' ? 'text-green-400' : 
                    ocrInfo.qualita === 'media' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {ocrInfo.qualita === 'buona' ? '✓ Buona' : ocrInfo.qualita === 'media' ? '~ Media' : '⚠ Scarsa'}
                  </span>
                </div>
                {ocrInfo.correzioni > 0 && (
                  <p className="text-slate-500 text-[10px] mt-1">
                    {ocrInfo.correzioni} correzioni tipografiche applicate prima dell'analisi
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dati estratti */}
          {datiEstratti && <DatiEstrattiBilancio dati={datiEstratti} />}

          {/* Revisione contabile */}
          {revisione && <RevisioneContabile revisione={revisione} />}

          {/* Indicatori finanziari */}
          {indicatoriFinanziari && <IndicatoriFinanziari dati={indicatoriFinanziari} />}

          {/* Coerenza fiscale */}
          {coerenzaFiscale && <CoerenzaFiscale dati={coerenzaFiscale} />}

          {/* Note */}
          {analisi.note && (
            <Card className="bg-yellow-900/20 border-yellow-600/40">
              <CardContent className="p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-yellow-300 text-xs">{analisi.note}</p>
              </CardContent>
            </Card>
          )}

          {/* Nuovo upload */}
          <Button
            variant="outline"
            onClick={() => { setResult(null); setFileName(''); }}
            className="w-full border-slate-600 text-slate-300 hover:text-white"
          >
            Analizza un altro documento
          </Button>
        </div>
      )}

      {/* Error */}
      {result && !result.success && (
        <Card className="bg-red-900/30 border-red-800">
          <CardContent className="p-4">
            <p className="text-red-300 text-sm">{result.error || 'Errore nell\'analisi'}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}