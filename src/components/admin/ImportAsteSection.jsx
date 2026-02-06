import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileJson, CheckCircle2, AlertCircle, Loader2, RefreshCw, Building2, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function ImportAsteSection() {
  const [isUploading, setIsUploading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const queryClient = useQueryClient();

  // Carica statistiche attuali
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['aste-stats'],
    queryFn: async () => {
      const aste = await base44.entities.AstaImmobiliare.filter({ is_active: true });
      
      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);
      
      const perTipologia = {};
      const perProvincia = {};
      let scadute = 0;
      let attive = 0;
      
      aste.forEach(a => {
        // Per tipologia
        const tip = a.tipologia || 'Altra Categoria';
        perTipologia[tip] = (perTipologia[tip] || 0) + 1;
        
        // Per provincia
        const prov = a.provincia || 'Altra';
        perProvincia[prov] = (perProvincia[prov] || 0) + 1;
        
        // Scadute vs attive
        if (a.data_asta) {
          const dataAsta = new Date(a.data_asta);
          if (dataAsta < oggi) {
            scadute++;
          } else {
            attive++;
          }
        }
      });
      
      return {
        totale: aste.length,
        attive,
        scadute,
        perTipologia,
        perProvincia
      };
    }
  });

  const handleFile = async (file) => {
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
      toast.error('Formato non valido. Carica un file JSON.');
      return;
    }
    
    setIsUploading(true);
    setLastResult(null);
    
    try {
      const text = await file.text();
      const aste = JSON.parse(text);
      
      if (!Array.isArray(aste)) {
        throw new Error('Il file deve contenere un array di aste');
      }
      
      toast.info(`Importazione di ${aste.length} aste in corso...`);
      
      const response = await base44.functions.invoke('importAste', { aste });
      
      setLastResult(response.data);
      
      if (response.data.success) {
        toast.success(`Importazione completata! ${response.data.riepilogo.nuove_inserite} nuove, ${response.data.riepilogo.aggiornate} aggiornate`);
        queryClient.invalidateQueries({ queryKey: ['aste-stats'] });
        queryClient.invalidateQueries({ queryKey: ['aste-immobiliari'] });
      } else {
        toast.error(response.data.error || 'Errore durante l\'importazione');
      }
      
    } catch (error) {
      console.error('Errore import:', error);
      toast.error(`Errore: ${error.message}`);
      setLastResult({ success: false, error: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleInputChange = (e) => {
    const file = e.target.files[0];
    handleFile(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-lime-400" />
            Import Aste Immobiliari
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Carica il file JSON estratto dal portale PVP
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchStats()}
          disabled={loadingStats}
          className="border-slate-600 text-slate-300"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loadingStats ? 'animate-spin' : ''}`} />
          Aggiorna
        </Button>
      </div>

      {/* Statistiche attuali */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.totale}</p>
              <p className="text-slate-400 text-sm">Totale aste</p>
            </CardContent>
          </Card>
          <Card className="bg-green-900/30 border-green-500/30">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{stats.attive}</p>
              <p className="text-green-300 text-sm">Attive</p>
            </CardContent>
          </Card>
          <Card className="bg-red-900/30 border-red-500/30">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{stats.scadute}</p>
              <p className="text-red-300 text-sm">Scadute</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-lime-400">{Object.keys(stats.perProvincia).length}</p>
              <p className="text-slate-400 text-sm">Province</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Area upload */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-lime-400" />
            Carica nuovo file aste
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive
                ? 'border-lime-400 bg-lime-400/10'
                : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-12 h-12 text-lime-400 animate-spin" />
                <p className="text-white font-medium">Importazione in corso...</p>
                <p className="text-slate-400 text-sm">Potrebbero volerci alcuni secondi</p>
              </div>
            ) : (
              <>
                <FileJson className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <p className="text-white font-medium mb-2">
                  Trascina qui il file JSON
                </p>
                <p className="text-slate-400 text-sm mb-4">
                  oppure clicca per selezionarlo
                </p>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleInputChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" className="border-lime-400 text-lime-400 hover:bg-lime-400/10" asChild>
                    <span>Seleziona file</span>
                  </Button>
                </label>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Risultato ultimo import */}
      {lastResult && (
        <Card className={`border ${lastResult.success ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {lastResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400" />
              )}
              <span className={lastResult.success ? 'text-green-400' : 'text-red-400'}>
                {lastResult.success ? 'Importazione completata' : 'Errore importazione'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastResult.success ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{lastResult.riepilogo.totali_ricevute}</p>
                  <p className="text-slate-400 text-sm">Ricevute</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{lastResult.riepilogo.nuove_inserite}</p>
                  <p className="text-green-300 text-sm">Nuove</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-400">{lastResult.riepilogo.aggiornate}</p>
                  <p className="text-amber-300 text-sm">Aggiornate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-400">{lastResult.riepilogo.scartate}</p>
                  <p className="text-slate-500 text-sm">Scartate</p>
                </div>
              </div>
            ) : (
              <p className="text-red-400">{lastResult.error}</p>
            )}
            
            {lastResult.errori && lastResult.errori.length > 0 && (
              <div className="mt-4 p-3 bg-slate-900/50 rounded-lg">
                <p className="text-amber-400 text-sm font-medium mb-2">Errori riscontrati:</p>
                <ul className="text-slate-400 text-xs space-y-1">
                  {lastResult.errori.map((err, i) => (
                    <li key={i}>• {err.errore}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dettaglio per tipologia */}
      {stats && Object.keys(stats.perTipologia).length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-sm">Distribuzione per tipologia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.perTipologia).map(([tipo, count]) => (
                <Badge key={tipo} variant="outline" className="text-slate-300 border-slate-600">
                  {tipo}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Istruzioni */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <h3 className="text-white font-medium mb-2">📋 Istruzioni</h3>
          <ul className="text-slate-400 text-sm space-y-1">
            <li>1. Estrai le aste dal portale PVP con lo scraper</li>
            <li>2. Salva il file in formato JSON</li>
            <li>3. Carica il file qui sopra</li>
            <li>4. Le aste nuove verranno aggiunte, quelle esistenti aggiornate</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}