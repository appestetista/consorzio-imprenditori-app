import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Camera, Upload, Loader2, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const STEPS = [
  { label: 'Caricamento immagine...', target: 15 },
  { label: 'Lettura dati dal timbro...', target: 40 },
  { label: 'Ricerca codice ATECO...', target: 65 },
  { label: 'Verifica dati aziendali...', target: 85 },
  { label: 'Completamento...', target: 100 },
];

export default function StampPhotoExtractor({ onDataExtracted, onClose }) {
  const [extracting, setExtracting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [progressStep, setProgressStep] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const animRef = useRef(null);

  // Animazione barra di progresso graduale
  useEffect(() => {
    if (!extracting) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    const targetValue = STEPS[progressStep]?.target || 0;
    const animate = () => {
      setDisplayProgress(prev => {
        if (prev >= targetValue) return targetValue;
        // Avanza lentamente verso il target dello step corrente
        const diff = targetValue - prev;
        const increment = Math.max(0.15, diff * 0.02);
        return Math.min(prev + increment, targetValue);
      });
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [extracting, progressStep]);

  // Se c'è un file pre-selezionato (da pulsanti esterni), processalo subito
  React.useEffect(() => {
    if (window.__stampFile) {
      const file = window.__stampFile;
      window.__stampFile = null;
      processFile(file);
    }
  }, []);

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = async (file) => {
    if (!file) return;

    // Mostra anteprima
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    setExtracting(true);
    setError(null);
    setExtractedData(null);
    setProgressStep(0);
    setDisplayProgress(0);

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setProgressStep(1);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analizza questa foto di un timbro aziendale italiano. Estrai SOLO i dati che riesci EFFETTIVAMENTE a leggere dal timbro. Non inventare nulla.

I timbri aziendali italiani tipicamente contengono:
- Ragione sociale / Nome azienda
- Partita IVA (11 cifre)
- Codice Fiscale (può coincidere con P.IVA o essere alfanumerico 16 caratteri)
- Indirizzo sede legale (via, numero civico, CAP, città, provincia)
- Eventuale codice ATECO
- Eventuale numero REA o iscrizione CCIAA
- Eventuale email/PEC

REGOLE:
- Se un dato NON è leggibile o NON è presente nel timbro, lascia il campo come stringa vuota ""
- NON inventare dati
- NON dedurre dati non presenti
- Restituisci SOLO ciò che è scritto nel timbro`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          ragione_sociale: { type: "string", description: "Ragione sociale/nome azienda" },
          partita_iva: { type: "string", description: "Partita IVA (11 cifre)" },
          codice_fiscale: { type: "string", description: "Codice fiscale" },
          indirizzo: { type: "string", description: "Indirizzo completo" },
          cap: { type: "string", description: "CAP" },
          citta: { type: "string", description: "Città" },
          provincia: { type: "string", description: "Provincia (sigla)" },
          codice_ateco: { type: "string", description: "Codice ATECO se presente" },
          email_pec: { type: "string", description: "Email o PEC se presente" },
          numero_rea: { type: "string", description: "Numero REA o iscrizione CCIAA" },
          dati_non_leggibili: { type: "boolean", description: "true se l'immagine è troppo sfocata o illeggibile" },
          note: { type: "string", description: "Eventuali note sulla qualità dell'immagine" }
        }
      }
    });

    if (result.dati_non_leggibili) {
      setExtracting(false);
      setDisplayProgress(0);
      setError(result.note || "L'immagine non è leggibile. Riprova con una foto più nitida.");
      return;
    }

    const hasData = result.ragione_sociale || result.partita_iva || result.codice_fiscale;
    if (!hasData) {
      setExtracting(false);
      setDisplayProgress(0);
      setError("Non sono riuscito a trovare dati aziendali nel timbro. Assicurati che la foto sia nitida e il timbro ben visibile.");
      return;
    }

    setProgressStep(2);

    // STEP 2: Cerca l'attività prevalente ufficiale tramite P.IVA su fonti Camera di Commercio
    let attivitaPrevalente = '';
    if (result.partita_iva) {
      const cciaResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Cerca l'azienda italiana con Partita IVA: ${result.partita_iva}${result.ragione_sociale ? ', ragione sociale: ' + result.ragione_sociale : ''}${result.citta ? ', città: ' + result.citta : ''}.

Cerca su registroimprese.it, openapi.it, infoimprese.it, atoka.io, o altre fonti ufficiali italiane della Camera di Commercio (CCIAA).

DEVO SAPERE:
1. ATTIVITÀ PREVALENTE registrata in Camera di Commercio (descrizione testuale dell'attività, es: "Lavori di costruzione di edifici residenziali", "Ristorazione con somministrazione", "Commercio al dettaglio di abbigliamento")
2. Anno di inizio attività (anno iscrizione CCIAA o apertura P.IVA)
3. Tipologia macro tra: "ufficio", "negozio_retail", "ristorante_bar", "magazzino_logistica", "produzione_industriale", "cantiere_edile", "laboratorio_artigianale", "studio_professionale", "struttura_sanitaria", "struttura_ricettiva", "agricoltura", "trasporti"

REGOLE FONDAMENTALI:
- L'attività prevalente è il dato PIÙ IMPORTANTE: cercala con attenzione nelle fonti ufficiali
- Restituisci SOLO dati trovati con certezza da fonti ufficiali
- Se NON trovi un dato, restituisci stringa vuota ""
- NON inventare dati, NON dedurre dall'nome dell'azienda`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            attivita_prevalente: { type: "string", description: "Descrizione testuale dell'attività prevalente dalla CCIAA (es: 'Lavori di costruzione di edifici residenziali'). Vuoto se non trovata." },
            anno_attivazione: { type: "string", description: "Anno di inizio attività (es: 2015). Vuoto se non trovato." },
            tipo_attivita_categoria: { type: "string", description: "Categoria macro. Vuoto se non determinabile." },
            fonte: { type: "string", description: "Fonte da cui è stato trovato il dato" }
          }
        }
      });

      attivitaPrevalente = cciaResult.attivita_prevalente || '';
      if (cciaResult.anno_attivazione) {
        result.anno_attivazione = cciaResult.anno_attivazione;
      }
      if (cciaResult.tipo_attivita_categoria) {
        result.tipo_attivita_categoria = cciaResult.tipo_attivita_categoria;
      }
      console.log('[StampExtractor] Attività prevalente CCIAA:', attivitaPrevalente);
    }

    setProgressStep(3);

    // STEP 3: Usa l'attività prevalente per cercare il codice ATECO nel database interno
    {
      // Priorità: attività prevalente da CCIAA > descrizione dal timbro > ragione sociale
      const descrizioneRicerca = attivitaPrevalente || result.descrizione_ateco || result.ragione_sociale || '';
      
      if (descrizioneRicerca) {
        const atecoLookup = await base44.functions.invoke('lookupAteco', {
          descrizione_attivita: descrizioneRicerca,
          ragione_sociale: result.ragione_sociale || '',
          partita_iva: result.partita_iva || ''
        });

        const atecoResult = atecoLookup.data;
        if (atecoResult.codice_ateco) {
          result.codice_ateco = atecoResult.codice_ateco;
          result.descrizione_ateco = atecoResult.descrizione_ateco || '';
        }
      }
    }

    setProgressStep(4);
    setExtracting(false);
    setExtractedData(result);
  };

  const handleConfirm = () => {
    if (extractedData && onDataExtracted) {
      onDataExtracted(extractedData);
    }
  };

  const fields = [
    { key: 'ragione_sociale', label: 'Ragione Sociale' },
    { key: 'partita_iva', label: 'Partita IVA' },
    { key: 'codice_fiscale', label: 'Codice Fiscale' },
    { key: 'indirizzo', label: 'Indirizzo' },
    { key: 'cap', label: 'CAP' },
    { key: 'citta', label: 'Città' },
    { key: 'provincia', label: 'Provincia' },
    { key: 'codice_ateco', label: 'Codice ATECO' },
    { key: 'descrizione_ateco', label: 'Attività ATECO' },
    { key: 'anno_attivazione', label: 'Anno attivazione' },
    { key: 'tipo_attivita_categoria', label: 'Tipo attività' },
    { key: 'email_pec', label: 'Email / PEC' },
    { key: 'numero_rea', label: 'N° REA / CCIAA' },
  ];

  return (
    <Card className="bg-slate-800/90 border-slate-700 mb-4">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Camera className="w-4 h-4 text-lime-400" />
            Scansiona timbro aziendale
          </h3>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="text-slate-400 text-xs">
          Analisi in corso del timbro aziendale...
        </p>

        {extracting && (
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4 space-y-4">
            {preview && (
              <img src={preview} alt="Timbro" className="w-24 h-24 object-cover rounded-lg mx-auto border border-slate-600" />
            )}
            {/* Barra di progresso */}
            <div className="space-y-2">
              <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 rounded-full transition-none"
                  style={{
                    width: `${displayProgress}%`,
                    background: 'linear-gradient(90deg, #a855f7, #6366f1, #22d3ee)'
                  }}
                />
                {/* Shimmer */}
                <div 
                  className="absolute inset-y-0 left-0 rounded-full opacity-40 animate-pulse"
                  style={{
                    width: `${displayProgress}%`,
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)'
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  <span className="text-purple-300 text-xs">{STEPS[progressStep]?.label || 'Elaborazione...'}</span>
                </div>
                <span className="text-slate-400 text-xs font-mono">{Math.round(displayProgress)}%</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-300 text-sm">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { if (onClose) onClose(); }}
                className="mt-2 border-red-500/50 text-red-400 hover:bg-red-500/20 text-xs"
              >
                Torna indietro
              </Button>
            </div>
          </div>
        )}

        {extractedData && (
          <div className="space-y-3">
            {preview && (
              <img src={preview} alt="Timbro" className="w-20 h-20 object-cover rounded-lg border border-slate-600" />
            )}
            
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-xs font-semibold">Dati estratti</span>
              </div>
              
              <div className="space-y-1">
                {fields.map(({ key, label }) => {
                  const val = extractedData[key];
                  if (!val) return null;
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-slate-500 text-xs w-24 flex-shrink-0">{label}:</span>
                      <span className="text-white text-xs font-medium">{val}</span>
                    </div>
                  );
                })}
              </div>

              {extractedData.note && (
                <p className="text-amber-400 text-[10px] mt-2 italic">⚠️ {extractedData.note}</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleConfirm}
                className="flex-1 bg-lime-400 text-slate-900 hover:bg-lime-500"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Usa questi dati
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { if (onClose) onClose(); }}
                className="border-slate-600 text-slate-300"
              >
                Rifai foto
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}