import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, RefreshCw, 
  Building2, Package, Ship, Monitor, Car, Sofa, Wrench, Home, Store, Factory, Trash2
} from 'lucide-react';
import { toast } from 'sonner';

// Categorie con icone
const CATEGORIE = {
  mobili: {
    label: 'Beni Mobili',
    icon: Package,
    color: 'lime',
    tipologie: [
      { id: 'Nautica', label: 'Nautica', icon: Ship },
      { id: 'Informatica E Elettronica', label: 'Informatica ed Elettronica', icon: Monitor },
      { id: 'Autoveicoli', label: 'Autoveicoli', icon: Car },
      { id: 'Arredamento ed Elettrodomestici', label: 'Arredamento ed Elettrodomestici', icon: Sofa },
      { id: 'Macchinari, Utensili, Materie Prime', label: 'Macchinari, Utensili, Materie Prime', icon: Wrench },
    ]
  },
  immobili: {
    label: 'Immobili',
    icon: Building2,
    color: 'amber',
    tipologie: [
      { id: 'Immobile Residenziale', label: 'Residenziale', icon: Home },
      { id: 'Immobile Commerciale', label: 'Commerciale', icon: Store },
      { id: 'Immobile Industriale', label: 'Industriale', icon: Factory },
    ]
  }
};

export default function ImportAsteSection() {
  const [activeTab, setActiveTab] = useState('mobili');
  const [activeTipologia, setActiveTipologia] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const queryClient = useQueryClient();

  // Carica statistiche per tipologia
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['aste-stats-admin'],
    queryFn: async () => {
      const aste = await base44.entities.AstaImmobiliare.list();
      
      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);
      
      const perTipologia = {};
      let totaleAttive = 0;
      let totaleScadute = 0;
      
      aste.forEach(a => {
        const tip = a.tipologia || 'Altra Categoria';
        if (!perTipologia[tip]) {
          perTipologia[tip] = { attive: 0, scadute: 0, totale: 0 };
        }
        
        perTipologia[tip].totale++;
        
        if (a.data_asta) {
          const dataAsta = new Date(a.data_asta);
          if (dataAsta < oggi) {
            perTipologia[tip].scadute++;
            totaleScadute++;
          } else {
            perTipologia[tip].attive++;
            totaleAttive++;
          }
        } else {
          perTipologia[tip].attive++;
          totaleAttive++;
        }
      });
      
      return {
        totale: aste.length,
        attive: totaleAttive,
        scadute: totaleScadute,
        perTipologia
      };
    }
  });

  // Parsing CSV
  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV vuoto o senza dati');
    
    // Prima riga = intestazioni
    const headers = lines[0].split(';').map(h => h.trim().replace(/"/g, ''));
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim().replace(/"/g, ''));
      if (values.length !== headers.length) continue;
      
      const row = {};
      headers.forEach((h, idx) => {
        let val = values[idx];
        // Converti numeri
        if (['prezzo_base', 'cauzione_stimata'].includes(h)) {
          val = parseFloat(val.replace(',', '.')) || 0;
        }
        row[h] = val;
      });
      data.push(row);
    }
    return data;
  };

  // Gestisce import file per tipologia specifica
  const handleFile = async (file, tipologia) => {
    if (!file) return;
    
    const isCSV = file.name.endsWith('.csv');
    const isJSON = file.name.endsWith('.json');
    
    if (!isCSV && !isJSON) {
      toast.error('Formato non valido. Carica un file CSV o JSON.');
      return;
    }
    
    setIsUploading(true);
    setLastResult(null);
    
    try {
      const text = await file.text();
      let aste;
      
      if (isCSV) {
        aste = parseCSV(text);
      } else {
        aste = JSON.parse(text);
      }
      
      if (!Array.isArray(aste)) {
        throw new Error('Il file deve contenere un array di aste');
      }
      
      // Aggiungi tipologia forzata a ogni asta
      const asteConTipologia = aste.map(a => ({
        ...a,
        tipologia: tipologia
      }));
      
      toast.info(`Importazione ${aste.length} aste "${tipologia}" in corso...`);
      
      const response = await base44.functions.invoke('importAste', { aste: asteConTipologia });
      
      setLastResult({ ...response.data, tipologia });
      
      if (response.data.success) {
        toast.success(`${tipologia}: ${response.data.riepilogo.nuove_inserite} nuove, ${response.data.riepilogo.aggiornate} aggiornate`);
        queryClient.invalidateQueries({ queryKey: ['aste-stats-admin'] });
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

  // Elimina aste scadute per tipologia
  const handleDeleteScadute = async (tipologia) => {
    const oggi = new Date().toISOString().split('T')[0];
    
    try {
      toast.info(`Eliminazione aste scadute "${tipologia}"...`);
      
      const aste = await base44.entities.AstaImmobiliare.filter({ tipologia });
      const scadute = aste.filter(a => a.data_asta && a.data_asta < oggi);
      
      for (const asta of scadute) {
        await base44.entities.AstaImmobiliare.delete(asta.id);
      }
      
      toast.success(`Eliminate ${scadute.length} aste scadute`);
      queryClient.invalidateQueries({ queryKey: ['aste-stats-admin'] });
      queryClient.invalidateQueries({ queryKey: ['aste-immobiliari'] });
      
    } catch (error) {
      toast.error(`Errore: ${error.message}`);
    }
  };

  const handleDrop = (e, tipologia) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    handleFile(file, tipologia);
  };

  const renderTipologiaCard = (tipologia, categoria) => {
    const Icon = tipologia.icon;
    const statsData = stats?.perTipologia[tipologia.id] || { attive: 0, scadute: 0, totale: 0 };
    const colorClass = categoria === 'mobili' ? 'lime' : 'amber';
    
    return (
      <Card key={tipologia.id} className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={`w-5 h-5 text-${colorClass}-400`} />
              <span className="text-sm">{tipologia.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                {statsData.attive} attive
              </Badge>
              {statsData.scadute > 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  {statsData.scadute} scadute
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Area upload */}
          <div
            onDrop={(e) => handleDrop(e, tipologia.id)}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); setActiveTipologia(tipologia.id); }}
            onDragLeave={() => { setDragActive(false); setActiveTipologia(null); }}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
              dragActive && activeTipologia === tipologia.id
                ? `border-${colorClass}-400 bg-${colorClass}-400/10`
                : 'border-slate-600 hover:border-slate-500'
            }`}
          >
            {isUploading && activeTipologia === tipologia.id ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 text-lime-400 animate-spin" />
                <span className="text-slate-300 text-sm">Importazione...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet className="w-8 h-8 text-slate-500" />
                <p className="text-slate-400 text-xs">Trascina CSV o</p>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={(e) => {
                    setActiveTipologia(tipologia.id);
                    handleFile(e.target.files[0], tipologia.id);
                  }}
                  className="hidden"
                  id={`file-upload-${tipologia.id}`}
                />
                <label htmlFor={`file-upload-${tipologia.id}`}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={`border-${colorClass}-400 text-${colorClass}-400 hover:bg-${colorClass}-400/10`} 
                    asChild
                  >
                    <span><Upload className="w-3 h-3 mr-1" /> Seleziona</span>
                  </Button>
                </label>
              </div>
            )}
          </div>

          {/* Azioni */}
          {statsData.scadute > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDeleteScadute(tipologia.id)}
              className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Elimina {statsData.scadute} scadute
            </Button>
          )}

          {/* Risultato ultimo import per questa tipologia */}
          {lastResult && lastResult.tipologia === tipologia.id && (
            <div className={`p-2 rounded-lg text-xs ${lastResult.success ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'}`}>
              {lastResult.success ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lastResult.riepilogo.nuove_inserite} nuove, {lastResult.riepilogo.aggiornate} aggiornate</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{lastResult.error}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-lime-400" />
            Gestione Aste
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Importa aste per tipologia • Le aste con data passata non vengono mostrate agli utenti
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

      {/* Statistiche generali */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.totale}</p>
              <p className="text-slate-400 text-sm">Totale</p>
            </CardContent>
          </Card>
          <Card className="bg-green-900/30 border-green-500/30">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{stats.attive}</p>
              <p className="text-green-300 text-sm">Visibili utenti</p>
            </CardContent>
          </Card>
          <Card className="bg-red-900/30 border-red-500/30">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-400">{stats.scadute}</p>
              <p className="text-red-300 text-sm">Scadute (nascoste)</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs Mobili / Immobili */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border border-slate-700 w-full">
          <TabsTrigger 
            value="mobili" 
            className="flex-1 data-[state=active]:bg-lime-400/20 data-[state=active]:text-lime-400"
          >
            <Package className="w-4 h-4 mr-2" />
            Beni Mobili
          </TabsTrigger>
          <TabsTrigger 
            value="immobili" 
            className="flex-1 data-[state=active]:bg-amber-400/20 data-[state=active]:text-amber-400"
          >
            <Building2 className="w-4 h-4 mr-2" />
            Immobili
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mobili" className="mt-4">
          <div className="grid gap-4">
            {CATEGORIE.mobili.tipologie.map(tip => renderTipologiaCard(tip, 'mobili'))}
          </div>
        </TabsContent>

        <TabsContent value="immobili" className="mt-4">
          <div className="grid gap-4">
            {CATEGORIE.immobili.tipologie.map(tip => renderTipologiaCard(tip, 'immobili'))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Info box */}
      <Card className="bg-blue-900/20 border-blue-500/30">
        <CardContent className="p-4">
          <h3 className="text-blue-400 font-medium mb-2">ℹ️ Come funziona</h3>
          <ul className="text-slate-400 text-sm space-y-1">
            <li>• Carica un file <strong className="text-white">CSV</strong> (separatore: punto e virgola) per ogni tipologia</li>
            <li>• Colonne: titolo, localita, provincia, prezzo_base, data_asta, link_ufficiale, external_id</li>
            <li>• Le aste con <strong className="text-white">data passata</strong> vengono automaticamente nascoste agli utenti</li>
            <li>• Le aste esistenti (stesso external_id) vengono aggiornate, non duplicate</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}