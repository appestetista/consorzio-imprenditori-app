import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, RefreshCw, 
  Building2, Package, Ship, Monitor, Car, Sofa, Wrench, Home, Store, Factory, Trash2, Bell
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState({}); // {tipologia: {name, rows, data}}
  const [pendingAste, setPendingAste] = useState({}); // {tipologia: [aste array]}
  const queryClient = useQueryClient();

  // Helper per parsare data_ora_vendita (formato "DD/MM/YYYY HH:MM" da data_0)
  const parseDataOraVendita = (dataOraStr) => {
    if (!dataOraStr) return null;
    // Formato: "18/03/2026 16:30"
    const parts = dataOraStr.trim().split(' ');
    if (parts.length < 1) return null;
    
    const dateParts = parts[0].split('/');
    if (dateParts.length !== 3) return null;
    
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1; // mesi 0-indexed
    const year = parseInt(dateParts[2], 10);
    
    let hours = 0, minutes = 0;
    if (parts[1]) {
      const timeParts = parts[1].split(':');
      hours = parseInt(timeParts[0], 10) || 0;
      minutes = parseInt(timeParts[1], 10) || 0;
    }
    
    return new Date(year, month, day, hours, minutes);
  };

  // Carica statistiche per tipologia
  const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
    queryKey: ['aste-stats-admin'],
    queryFn: async () => {
      const aste = await base44.entities.AstaImmobiliare.list();
      
      const adesso = new Date();
      
      const perTipologia = {};
      let totaleAttive = 0;
      let totaleScadute = 0;
      
      aste.forEach(a => {
        const tip = a.tipologia || 'Altra Categoria';
        if (!perTipologia[tip]) {
          perTipologia[tip] = { attive: 0, scadute: 0, totale: 0 };
        }
        
        perTipologia[tip].totale++;
        
        // Usa data_ora_vendita (campo data_0 dal CSV) per determinare se scaduta
        const dataVendita = parseDataOraVendita(a.data_ora_vendita);
        
        if (dataVendita && dataVendita < adesso) {
          perTipologia[tip].scadute++;
          totaleScadute++;
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

  // Parsing CSV con supporto per campi tra virgolette
  const parseCSVLine = (line, separator) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === separator && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  // Parsing CSV generico
  const parseCSVGeneric = (text) => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    console.log('CSV lines count:', lines.length);
    console.log('First line:', lines[0]?.substring(0, 200));
    
    if (lines.length < 2) throw new Error('CSV vuoto o senza dati');
    
    // Rileva separatore (virgola o punto e virgola)
    const firstLine = lines[0];
    const separator = firstLine.includes(';') ? ';' : ',';
    console.log('Separator detected:', separator);
    
    // Prima riga = intestazioni
    const headers = parseCSVLine(lines[0], separator).map(h => h.replace(/^\ufeff/, '').trim());
    console.log('Headers found:', headers.length, headers.slice(0, 5));
    
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i], separator);
      if (values.length < 3) continue; // Skip righe con meno di 3 valori
      
      const row = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      data.push(row);
    }
    console.log('Rows parsed:', data.length);
    return data;
  };

  // Converte formato web scraper PVP al formato interno
  const convertWebScraperFormat = (rows) => {
    return rows.map(row => {
      // Estrai prezzo (formato italiano: 22.068,00 € -> 22068.00)
      let prezzo = 0;
      if (row.price_0) {
        // Rimuovi € e spazi, poi rimuovi i punti (separatore migliaia), poi sostituisci virgola con punto
        const prezzoStr = row.price_0.replace(/[€\s\u00a0]/g, '').replace(/\./g, '').replace(',', '.');
        prezzo = parseFloat(prezzoStr) || 0;
        console.log('Prezzo raw:', row.price_0, '-> parsed:', prezzo);
      }
      
      // Estrai data asta (formato DD/MM/YYYY -> YYYY-MM-DD)
      let dataAsta = '';
      if (row.Auction_Date_0) {
        const parts = row.Auction_Date_0.trim().split('/');
        if (parts.length === 3) {
          dataAsta = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        console.log('Data raw:', row.Auction_Date_0, '-> parsed:', dataAsta);
      }
      
      // Estrai provincia dalla località
      let provincia = 'Pesaro-Urbino';
      const localita = row.data_2 || '';
      if (localita.includes('Pesaro')) provincia = 'Pesaro-Urbino';
      else if (localita.includes('Ancona')) provincia = 'Ancona';
      else if (localita.includes('Rimini')) provincia = 'Rimini';
      else if (localita.includes('Fano')) provincia = 'Pesaro-Urbino';
      
      // External ID dall'URL o Insertion_Number
      let externalId = row.Insertion_Number_0 || '';
      if (row['data-page-selector']) {
        const match = row['data-page-selector'].match(/idAnnuncio=(\d+)/);
        if (match) externalId = match[1];
      }
      
      // Link ufficiale
      const linkUfficiale = row['data-page-selector'] || `https://pvp.giustizia.it/pvp/it/detail_annuncio.page?idAnnuncio=${externalId}`;
      
      // Titolo dalla descrizione - prova varie chiavi possibili
      let titolo = row['data_3'] || row['Property_Included_in_Lot_-_Description_0'] || 'Asta immobiliare';
      // Se ancora vuoto, cerca la chiave che contiene "Description"
      if (titolo === 'Asta immobiliare') {
        const descKey = Object.keys(row).find(k => k.includes('Description'));
        if (descKey) titolo = row[descKey];
      }
      if (titolo && titolo.length > 200) titolo = titolo.substring(0, 200) + '...';
      
      // Offerta minima (formato italiano: 16.551,00 € -> 16551.00)
      let offertaMinima = 0;
      if (row['Minimum_Offer_0']) {
        const offertaStr = row['Minimum_Offer_0'].replace(/[€\s\u00a0]/g, '').replace(/\./g, '').replace(',', '.');
        offertaMinima = parseFloat(offertaStr) || 0;
      }

      // Rilancio minimo
      let rilancioMinimo = 0;
      if (row['Minimum_Raise_0']) {
        const rilancioStr = row['Minimum_Raise_0'].replace(/[€\s\u00a0]/g, '').replace(/\./g, '').replace(',', '.');
        rilancioMinimo = parseFloat(rilancioStr) || 0;
      }

      // Data e ora vendita (da data_0, es. "18/03/2026 16:30")
      const dataOraVendita = row['data_0'] || '';

      return {
        titolo,
        localita,
        provincia,
        prezzo_base: prezzo,
        offerta_minima: offertaMinima,
        rilancio_minimo: rilancioMinimo,
        data_ora_vendita: dataOraVendita,
        data_asta: dataAsta,
        link_ufficiale: linkUfficiale,
        external_id: `pvp_${externalId}`,
        lotto: row['Lot_Number_0'] || '',
        fonte: 'pvp.giustizia.it',
        cauzione_stimata: prezzo * 0.1,
        raw_data: row // Salva tutti i dati originali dal CSV
      };
    }).filter(a => {
      const valid = a.external_id && a.prezzo_base > 0;
      if (!valid) {
        console.log('Asta SCARTATA:', { external_id: a.external_id, prezzo: a.prezzo_base, titolo: a.titolo?.substring(0, 50) });
      }
      return valid;
    });
  };

  // Rileva se è formato web scraper (cerca anche con BOM)
  const isWebScraperFormat = (headers) => {
    const headerStr = headers.join(',');
    return headerStr.includes('Insertion_Number_0') || headerStr.includes('data-page-selector') || headerStr.includes('Auction_Date_0');
  };

  // Parsing CSV con auto-detect formato
  const parseCSV = (text) => {
    const rows = parseCSVGeneric(text);
    if (rows.length === 0) throw new Error('CSV vuoto o senza dati');
    
    // Controlla se è formato web scraper
    const headers = Object.keys(rows[0]);
    if (isWebScraperFormat(headers)) {
      return convertWebScraperFormat(rows);
    }
    
    // Formato standard - converti numeri
    return rows.map(row => {
      if (row.prezzo_base) {
        row.prezzo_base = parseFloat(String(row.prezzo_base).replace(',', '.')) || 0;
      }
      if (row.cauzione_stimata) {
        row.cauzione_stimata = parseFloat(String(row.cauzione_stimata).replace(',', '.')) || 0;
      }
      return row;
    });
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

      console.log('Aste parsate:', aste.length, 'Prima asta:', aste[0]);
      
      // Aggiungi tipologia forzata a ogni asta
      const asteConTipologia = aste.map(a => ({
        ...a,
        tipologia: tipologia
      }));

      // Filtra aste scadute (data_ora_vendita < oggi)
      const adesso = new Date();
      const asteAttive = asteConTipologia.filter(a => {
        const dataVendita = parseDataOraVendita(a.data_ora_vendita);
        if (!dataVendita) return true; // Se non ha data, la consideriamo attiva
        return dataVendita >= adesso;
      });
      
      const asteScadute = asteConTipologia.length - asteAttive.length;

      // Salva info file caricato e aste in attesa di pubblicazione
      setUploadedFiles(prev => ({
        ...prev,
        [tipologia]: { name: file.name, rows: aste.length, scadute: asteScadute, attive: asteAttive.length }
      }));
      
      setPendingAste(prev => ({
        ...prev,
        [tipologia]: asteAttive // Solo aste attive
      }));

      console.log('Aste totali:', asteConTipologia.length, 'Attive:', asteAttive.length, 'Scadute:', asteScadute);
      
      if (asteScadute > 0) {
        toast.warning(`File caricato: ${asteAttive.length} aste attive pronte per la pubblicazione. ${asteScadute} aste scadute escluse.`);
      } else {
        toast.success(`File caricato: ${asteAttive.length} aste pronte per la pubblicazione.`);
      }
      
    } catch (error) {
      console.error('Errore import:', error);
      toast.error(`Errore: ${error.message}`);
      setLastResult({ success: false, error: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  // Elimina aste scadute per tipologia (usa data_ora_vendita / data_0)
  const handleDeleteScadute = async (tipologia) => {
    const adesso = new Date();
    
    try {
      toast.info(`Eliminazione aste scadute "${tipologia}"...`);
      
      const aste = await base44.entities.AstaImmobiliare.filter({ tipologia });
      const scadute = aste.filter(a => {
        const dataVendita = parseDataOraVendita(a.data_ora_vendita);
        return dataVendita && dataVendita < adesso;
      });
      
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

  // Elimina TUTTE le aste per tipologia
  const handleDeleteTutte = async (tipologia) => {
    if (!confirm(`Sei sicuro di voler eliminare TUTTE le aste della categoria "${tipologia}"? Questa azione è irreversibile.`)) {
      return;
    }
    
    try {
      toast.info(`Eliminazione di tutte le aste "${tipologia}"...`);
      
      const aste = await base44.entities.AstaImmobiliare.filter({ tipologia });
      
      for (const asta of aste) {
        await base44.entities.AstaImmobiliare.delete(asta.id);
      }
      
      toast.success(`Eliminate ${aste.length} aste`);
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

  // Pubblica le aste caricate per una tipologia
  const handlePublish = async (tipologia) => {
    const asteToPublish = pendingAste[tipologia];
    if (!asteToPublish || asteToPublish.length === 0) {
      toast.error('Nessuna asta da pubblicare');
      return;
    }

    setIsPublishing(true);
    setActiveTipologia(tipologia);
    
    try {
      toast.info(`Pubblicazione ${asteToPublish.length} aste "${tipologia}" in corso...`);
      
      const response = await base44.functions.invoke('importAste', { aste: asteToPublish });
      
      setLastResult({ ...response.data, tipologia });
      
      if (response.data.success) {
        toast.success(`${tipologia}: ${response.data.riepilogo.nuove_inserite} nuove, ${response.data.riepilogo.aggiornate} aggiornate`);
        
        // Rimuovi le aste pubblicate dalla lista pending
        setPendingAste(prev => {
          const newPending = { ...prev };
          delete newPending[tipologia];
          return newPending;
        });
        
        // Rimuovi il file dalla lista
        setUploadedFiles(prev => {
          const newFiles = { ...prev };
          delete newFiles[tipologia];
          return newFiles;
        });
        
        queryClient.invalidateQueries({ queryKey: ['aste-stats-admin'] });
        queryClient.invalidateQueries({ queryKey: ['aste-immobiliari'] });
      } else {
        toast.error(response.data.error || 'Errore durante la pubblicazione');
      }
    } catch (error) {
      console.error('Errore pubblicazione:', error);
      toast.error(`Errore: ${error.message}`);
      setLastResult({ success: false, error: error.message, tipologia });
    } finally {
      setIsPublishing(false);
      setActiveTipologia(null);
    }
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
          <div className="flex gap-2">
            {statsData.scadute > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteScadute(tipologia.id)}
                className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Elimina {statsData.scadute} scadute
              </Button>
            )}
            {statsData.totale > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteTutte(tipologia.id)}
                className="flex-1 border-red-600 text-red-500 hover:bg-red-600/20"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Elimina tutte ({statsData.totale})
              </Button>
            )}
          </div>

          {/* File caricato e pulsante Pubblica */}
          {uploadedFiles[tipologia.id] && (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                  <span className="truncate max-w-[150px]">{uploadedFiles[tipologia.id].name}</span>
                  <Badge variant="outline" className="text-xs">{uploadedFiles[tipologia.id].rows} righe</Badge>
                </div>
                <button 
                  onClick={() => {
                    setUploadedFiles(prev => {
                      const newFiles = {...prev};
                      delete newFiles[tipologia.id];
                      return newFiles;
                    });
                    setPendingAste(prev => {
                      const newPending = {...prev};
                      delete newPending[tipologia.id];
                      return newPending;
                    });
                  }}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  ✕
                </button>
              </div>
              
              {/* Pulsante Pubblica */}
              {pendingAste[tipologia.id] && pendingAste[tipologia.id].length > 0 && (
                <Button
                  onClick={() => handlePublish(tipologia.id)}
                  disabled={isPublishing && activeTipologia === tipologia.id}
                  className={`w-full bg-${colorClass}-500 hover:bg-${colorClass}-600 text-slate-900 font-bold`}
                >
                  {isPublishing && activeTipologia === tipologia.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Pubblicazione...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Pubblica {pendingAste[tipologia.id].length} aste
                    </>
                  )}
                </Button>
              )}
            </div>
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

      {/* Pulsante Notifica Nuove Aste */}
      <Card className="bg-amber-900/20 border-amber-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-amber-400 font-medium">🔔 Notifica Nuove Aste</h3>
              <p className="text-slate-400 text-sm mt-1">Invia una notifica a tutti gli utenti per avvisarli delle nuove aste caricate</p>
            </div>
            <NotifyNewAsteButton />
          </div>
        </CardContent>
      </Card>

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

// Componente per il pulsante notifica
function NotifyNewAsteButton() {
  const [isSending, setIsSending] = useState(false);
  
  const handleNotify = async () => {
    setIsSending(true);
    try {
      const response = await base44.functions.invoke('notifyNewAste', {
        message: 'Sono state caricate nuove aste giudiziarie. Consulta la sezione Aste per scoprirle!'
      });
      
      if (response.data?.success) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data?.error || 'Errore durante l\'invio');
      }
    } catch (error) {
      toast.error(`Errore: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <Button
      onClick={handleNotify}
      disabled={isSending}
      className="bg-amber-500 hover:bg-amber-600 text-white"
    >
      {isSending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Bell className="w-4 h-4 mr-2" />
      )}
      {isSending ? 'Invio...' : 'Invia Notifica'}
    </Button>
  );
}