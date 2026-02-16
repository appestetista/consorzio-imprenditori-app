import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Globe, TrendingUp, Ship, FileText, Loader2, CheckCircle, AlertTriangle, Target, DollarSign, Package, MapPin, ArrowRight, Search, ExternalLink, Send, Paperclip, Camera, X, Users, Mail } from 'lucide-react';
import { useAILimits } from '@/components/hooks/useAILimits';
import LimitReachedBanner from '@/components/common/LimitReachedBanner';
import UsageCounter from '@/components/common/UsageCounter';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import ImportMessagesSection from '@/components/import-export/ImportMessagesSection';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import SectionConsultantPanel from '../components/consulenze/SectionConsultantPanel';
import HSCodeClassifier from '../components/import-export/HSCodeClassifier';

const SETTORI = [
  'Alimentare e bevande',
  'Moda e tessile',
  'Arredamento e design',
  'Meccanica e automazione',
  'Cosmetica e cura persona',
  'Tecnologia e elettronica',
  'Automotive e componentistica',
  'Farmaceutico e medicale',
  'Agricoltura e agroalimentare',
  'Altro'
];

const MERCATI_TARGET = [
  { code: 'US', name: 'Stati Uniti', flag: '🇺🇸' },
  { code: 'CN', name: 'Cina', flag: '🇨🇳' },
  { code: 'DE', name: 'Germania', flag: '🇩🇪' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' },
  { code: 'UK', name: 'Regno Unito', flag: '🇬🇧' },
  { code: 'JP', name: 'Giappone', flag: '🇯🇵' },
  { code: 'AE', name: 'Emirati Arabi', flag: '🇦🇪' },
  { code: 'BR', name: 'Brasile', flag: '🇧🇷' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'KR', name: 'Corea del Sud', flag: '🇰🇷' },
  { code: 'SA', name: 'Arabia Saudita', flag: '🇸🇦' }
];

export default function ImportExport() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('export'); // 'export' | 'import' | 'messages'
  const [exportForm, setExportForm] = useState({
    settore: '',
    prodotto: '',
    descrizione_prodotto: '',
    fatturato_annuo: '',
    esperienza_export: '',
    mercati_interesse: [],
    certificazioni: '',
    capacita_produttiva: ''
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [confirmedExportHS, setConfirmedExportHS] = useState(null);
  const [importForm, setImportForm] = useState({
    tipo_richiesta: '',
    descrizione_prodotto: '',
    quantita: '',
    frequenza: '',
    tempo_attesa: '',
    budget: '',
    esperienza_import: '',
    requisiti: ''
  });
  const [analyzingImport, setAnalyzingImport] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [confirmedImportHS, setConfirmedImportHS] = useState(null);
  const [contactForm, setContactForm] = useState({ subject: '', message: '', exportManagerId: '', attachments: [] });
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) {
        console.error(e);
      }
    };
    loadUser();
  }, []);

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  const { data: exportManagers = [] } = useQuery({
    queryKey: ['export-managers'],
    queryFn: () => base44.entities.Consultant.filter({ category: 'Internazionalizzazione/Export' }),
  });

  // Limiti AI Export
  const { 
    usageCount: exportUsage, 
    limit: exportLimit, 
    isLimitReached: exportLimitReached, 
    trackUsage: trackExportUsage 
  } = useAILimits(user?.email, 'export_analysis');

  // Limiti AI Import
  const { 
    usageCount: importUsage, 
    limit: importLimit, 
    isLimitReached: importLimitReached, 
    trackUsage: trackImportUsage 
  } = useAILimits(user?.email, 'import_analysis');

  // Conta messaggi non letti per Import
  const { data: importUnreadCount = 0 } = useQuery({
    queryKey: ['import-unread-count', user?.email],
    queryFn: async () => {
      const msgs = await base44.entities.Message.filter({ 
        to_email: user?.email, 
        source: 'import_export',
        is_read: false 
      });
      return msgs.length;
    },
    enabled: !!user?.email,
  });

  // State per contatto consulente Import
  const [importContactForm, setImportContactForm] = useState({ subject: '', message: '', attachments: [] });
  const [uploadingImportAttachment, setUploadingImportAttachment] = useState(false);
  const [importContactSent, setImportContactSent] = useState(false);

  const handleImportAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingImportAttachment(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImportContactForm(prev => ({
        ...prev,
        attachments: [...prev.attachments, { name: file.name, url: file_url }]
      }));
    } catch (err) {
      console.error('Errore upload:', err);
    } finally {
      setUploadingImportAttachment(false);
      e.target.value = '';
    }
  };

  const removeImportAttachment = (index) => {
    setImportContactForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const sendImportContactMutation = useMutation({
    mutationFn: async () => {
      // Trova il consulente Import (Internazionalizzazione/Export)
      const importConsultant = exportManagers[0]; // Usa il primo consulente disponibile
      const targetEmail = importConsultant?.email || 'import@consorzio.it';

      // Invia richiesta al consulente Import
      await base44.entities.Message.create({
        from_email: user.email,
        to_email: targetEmail,
        content: `**Richiesta Import dalla Cina**\n\nOggetto: ${importContactForm.subject}\n\n${importContactForm.message}\n\n---\n**Dati richiesta:**\n- Tipo: ${importForm.tipo_richiesta === 'produzione_custom' ? 'Produzione su misura' : 'Prodotto esistente'}\n- Prodotto: ${importForm.descrizione_prodotto}\n- Quantità: ${importForm.quantita}\n- Budget: ${importForm.budget || 'Non specificato'}\n- Tempo attesa: ${importForm.tempo_attesa || 'Non specificato'}\n\n---\nInviato da: ${user.company_name || user.full_name}\nEmail: ${user.email}`,
        source: 'import_export',
        source_reference: 'Import dalla Cina',
        attachments: importContactForm.attachments.map(a => ({ url: a.url, name: a.name, type: 'document' }))
      });

      // Crea notifica per il consulente
      await base44.entities.Notification.create({
        user_email: targetEmail,
        type: 'consultation',
        title: 'Nuova richiesta Import Cina',
        content: `${user.company_name || user.full_name} richiede consulenza import: ${importContactForm.subject}`
      });

      // Invia email notifica al consulente
      await base44.integrations.Core.SendEmail({
        to: targetEmail,
        subject: `Nuova richiesta Import Cina: ${importContactForm.subject}`,
        body: `Hai ricevuto una nuova richiesta di consulenza per import dalla Cina.\n\nDa: ${user.company_name || user.full_name}\nEmail: ${user.email}\n\nOggetto: ${importContactForm.subject}\n\nProdotto: ${importForm.descrizione_prodotto}\nQuantità: ${importForm.quantita}\n\n${importContactForm.message}\n\nAccedi all'app per rispondere.`
      });
    },
    onSuccess: () => {
      setImportContactSent(true);
      setImportContactForm({ subject: '', message: '', attachments: [] });
      queryClient.invalidateQueries({ queryKey: ['import-unread-count'] });
    }
  });

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingAttachment(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setContactForm(prev => ({
        ...prev,
        attachments: [...prev.attachments, { name: file.name, url: file_url }]
      }));
    } catch (err) {
      console.error('Errore upload:', err);
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (index) => {
    setContactForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const sendContactMutation = useMutation({
    mutationFn: async () => {
      const exportManager = exportManagers.find(e => e.id === contactForm.exportManagerId);
      
      if (!exportManager) {
        throw new Error('Seleziona un Export Manager');
      }

      // Crea messaggio
      await base44.entities.Message.create({
        from_email: user.email,
        to_email: exportManager.email,
        content: `**Richiesta consulenza Export**\n\nOggetto: ${contactForm.subject}\n\n${contactForm.message}\n\n---\nInviato da: ${user.company_name || user.full_name}\nEmail: ${user.email}`,
        source: 'import_export',
        source_reference: 'Export',
        attachments: contactForm.attachments.map(a => ({ url: a.url, name: a.name, type: 'document' }))
      });

      // Invia email all'export manager
      await base44.integrations.Core.SendEmail({
        to: exportManager.email,
        subject: `Nuova richiesta consulenza Export: ${contactForm.subject}`,
        body: `Hai ricevuto una nuova richiesta di consulenza export.\n\nDa: ${user.company_name || user.full_name}\nEmail: ${user.email}\n\nOggetto: ${contactForm.subject}\n\n${contactForm.message}\n\nAccedi all'app per rispondere.`
      });

      // Crea notifica per l'export manager
      await base44.entities.Notification.create({
        user_email: exportManager.email,
        type: 'consultation',
        title: 'Nuova richiesta consulenza Export',
        content: `${user.company_name || user.full_name} richiede consulenza export: ${contactForm.subject}`
      });
    },
    onSuccess: () => {
      setContactSent(true);
      setContactForm({ subject: '', message: '', exportManagerId: '', attachments: [] });
      queryClient.invalidateQueries({ queryKey: ['import-unread-count'] });
    }
  });

  const analyzeImportFeasibility = async () => {
    if (!importForm.descrizione_prodotto || !importForm.quantita || !importForm.tipo_richiesta) return;
    
    if (importLimitReached) return;
    
    setAnalyzingImport(true);
    try {
      await trackImportUsage();
      const currentYear = new Date().getFullYear();
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un esperto di import dalla Cina con 15 anni di esperienza nel sourcing e nella produzione in Asia. Siamo nel ${currentYear}.

REGOLE INDEROGABILI (la violazione di anche una sola regola invalida l'intera analisi):
- OGNI dato numerico (prezzo FOB, costo spedizione, aliquota dazio, percentuale) DEVE provenire da una fonte ufficiale verificabile.
- Fonti ammesse ESCLUSIVAMENTE: TARIC (EU), Agenzia delle Dogane italiana, Freightos Baltic Index (per tariffe container), World Freight Rates, UN Comtrade, Trade Map (ITC), normativa CE/UE vigente.
- Se un dato NON è reperibile con certezza, scrivi ESATTAMENTE: "Da verificare su [nome fonte specifica]". NON approssimare, NON stimare, NON dedurre.
- NON usare MAI espressioni come "circa", "stimato", "approssimativamente", "indicativamente", "potrebbe costare", "range indicativo" per dati quantitativi.
- Per ogni dato numerico inserito, indica tra parentesi la fonte e l'anno/periodo, es: "(TARIC, 2025)" oppure "(Freightos, Q1 2025)".
- NON INVENTARE MAI codici HS, aliquote dazio, prezzi FOB, costi di spedizione.
- Per MOQ: indica solo se basato su prassi verificabile di settore, altrimenti scrivi "MOQ variabile — richiedere quotazione diretta a fornitori".
- Preferisci lasciare un campo con "Da verificare" piuttosto che inserire un dato non verificato.

Valuta la fattibilità di questo import per un'azienda italiana:

TIPO RICHIESTA: ${importForm.tipo_richiesta === 'produzione_custom' ? 'Produzione su misura da disegni/specifiche' : 'Ricerca prodotto esistente già disponibile'}
PRODOTTO: ${importForm.descrizione_prodotto}
QUANTITÀ RICHIESTA: ${importForm.quantita}
FREQUENZA ORDINI: ${importForm.frequenza || 'Non specificata'}
TEMPO MASSIMO ATTESA: ${importForm.tempo_attesa || 'Non specificato'}
BUDGET: ${importForm.budget || 'Non specificato'}
ESPERIENZA IMPORT: ${importForm.esperienza_import || 'Non specificata'}
REQUISITI SPECIFICI: ${importForm.requisiti || 'Nessuno specificato'}

Fornisci un'analisi completa che includa:
1. Punteggio fattibilità (1-10) con motivazione basata su criteri oggettivi
2. Se l'import è consigliato o meno e perché
3. MOQ tipico — solo se verificabile, altrimenti "Da verificare con fornitori"
4. Tempi realistici dettagliati (produzione + spedizione mare/aereo) — indicare fonte se disponibile
5. Costi: per ogni voce (FOB, spedizione, dazi, IVA), indicare SOLO dati da fonte ufficiale con riferimento. Se non disponibile, scrivere "Da quantificare con preventivo — verificare su [fonte]"
6. Dazi doganali: indicare SOLO aliquota da TARIC con codice HS pertinente. Se codice HS incerto, dichiararlo.
7. Criticità specifiche per questo tipo di import
8. Requisiti necessari (certificazioni CE, documenti doganali, normativa UE applicabile con riferimento)
9. Prossimi passi concreti e ordinati
10. Vantaggi specifici di questo import
11. Fonti dati effettivamente utilizzate (solo fonti da cui hai estratto dati reali)

RICORDA: meglio un'analisi con 5 dati certi e 10 "Da verificare" che un'analisi con 15 dati inventati.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            punteggio_fattibilita: { type: "number" },
            motivazione_punteggio: { type: "string" },
            consigliato: { type: "boolean" },
            valutazione_generale: { type: "string" },
            raccomandazione: { type: "string" },
            moq_tipico: { type: "string" },
            tempi_produzione: { type: "string" },
            tempi_spedizione_mare: { type: "string" },
            tempi_spedizione_aerea: { type: "string" },
            tempo_totale: { type: "string" },
            costi_stimati: {
              type: "object",
              properties: {
                costo_prodotto_fob: { type: "string" },
                costo_spedizione_mare: { type: "string" },
                costo_spedizione_aerea: { type: "string" },
                dazi_doganali_percentuale: { type: "string" },
                iva: { type: "string" },
                costi_accessori: { type: "string" },
                totale_stimato_min: { type: "string" },
                totale_stimato_max: { type: "string" }
              }
            },
            vantaggi: { type: "array", items: { type: "string" } },
            criticita: { type: "array", items: { type: "string" } },
            requisiti_necessari: { type: "array", items: { type: "string" } },
            prossimi_passi: { type: "array", items: { type: "string" } },
            fonti_dati: { type: "array", items: { type: "string" } }
          }
        }
      });

      setImportResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzingImport(false);
    }
  };

  const toggleMercato = (code) => {
    setExportForm(prev => ({
      ...prev,
      mercati_interesse: prev.mercati_interesse.includes(code)
        ? prev.mercati_interesse.filter(m => m !== code)
        : [...prev.mercati_interesse, code]
    }));
  };

  const handleExportHSConfirm = (hsData) => {
    setConfirmedExportHS(hsData);
    analyzeExportPotential(hsData);
  };

  const analyzeExportPotential = async (hsData) => {
    if (!exportForm.settore || !exportForm.prodotto || exportForm.mercati_interesse.length === 0) return;
    if (!hsData) return;
    
    if (exportLimitReached) return;
    
    setAnalyzing(true);
    try {
      await trackExportUsage();
      const mercatiNomi = exportForm.mercati_interesse.map(code => 
        MERCATI_TARGET.find(m => m.code === code)?.name
      ).join(', ');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un Export Manager esperto con 20 anni di esperienza nell'internazionalizzazione delle PMI italiane.

REGOLE INDEROGABILI (la violazione di anche una sola regola invalida l'intera analisi):
- OGNI dato numerico (valore import, percentuale, quota, dazio, costo) DEVE provenire da una fonte ufficiale verificabile.
- Fonti ammesse ESCLUSIVAMENTE: Trade Map (ITC), UN Comtrade, Eurostat, WTO Tariff Database, TARIC, ICE-Agenzia, Banca Mondiale, OECD.
- Se un dato NON è reperibile con certezza da queste fonti, scrivi ESATTAMENTE: "Dato non disponibile — verificare su [nome fonte]". NON approssimare, NON stimare, NON dedurre.
- NON usare MAI espressioni come "circa", "stimato", "approssimativamente", "indicativamente" per dati quantitativi.
- Per ogni dato numerico inserito, indica tra parentesi la fonte e l'anno di riferimento, es: "(Trade Map, 2024)" oppure "(Eurostat, 2023)".
- NON INVENTARE MAI codici HS, aliquote dazio, percentuali di crescita o valori di import/export.
- Preferisci lasciare un campo vuoto o scrivere "Non disponibile" piuttosto che inserire un dato non verificato.

PROFILO AZIENDA:
- Settore: ${exportForm.settore}
- Prodotto: ${exportForm.prodotto}
- Descrizione: ${exportForm.descrizione_prodotto || 'Non specificata'}
- Fatturato annuo: ${exportForm.fatturato_annuo || 'Non specificato'}
- Esperienza export: ${exportForm.esperienza_export || 'Nessuna'}
- Certificazioni: ${exportForm.certificazioni || 'Non specificate'}
- Capacità produttiva: ${exportForm.capacita_produttiva || 'Non specificata'}

CODICE HS CONFERMATO DALL'UTENTE: ${hsData.hs_code}
DESCRIZIONE DOGANALE: ${hsData.descrizione_ufficiale}
CERTEZZA CLASSIFICAZIONE: ${hsData.certezza}

MERCATI DI INTERESSE: ${mercatiNomi}

IMPORTANTE: Usa il codice HS ${hsData.hs_code} confermato sopra come base per tutti i dati di flusso commerciale, dazi e barriere tariffarie. Non usare un codice HS diverso.

Fornisci un'analisi dettagliata e professionale che includa:
1. Valutazione generale della readiness all'export (punteggio 1-10) — basata su criteri oggettivi (certificazioni, esperienza, capacità produttiva)
2. Per ogni mercato selezionato:
   - FLUSSI COMMERCIALI: valore import del prodotto (codice HS pertinente) con fonte e anno. Se il dato non è disponibile, scrivilo esplicitamente.
   - Trend YoY con fonte e anno. Se non disponibile, dichiararlo.
   - Principali paesi fornitori con quota %, solo se da fonte ufficiale.
   - Quota di mercato Italia, solo se da fonte ufficiale.
   - Opportunità, sfide, barriere tariffarie/non tariffarie (dazi da TARIC/WTO Tariff Database con codice HS).
   - Documenti necessari e certificazioni obbligatorie (da normativa vigente del paese).
3. Raccomandazione sui mercati prioritari — giustificata con dati di flusso citati.
4. Costi di ingresso per mercato — solo se basati su fonti verificabili, altrimenti "Da quantificare con preventivo specifico".
5. Timeline consigliata.
6. Canali di distribuzione consigliati per il settore specifico.
7. Rischi principali e come mitigarli.
8. Primi passi concreti da fare.

RICORDA: meglio un'analisi con 5 dati certi e 10 "Non disponibile" che un'analisi con 15 dati inventati.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            readiness_score: { type: "number" },
            readiness_commento: { type: "string" },
            raccomandazione_generale: { type: "string" },
            mercati_analisi: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  mercato: { type: "string" },
                  punteggio_opportunita: { type: "number" },
                  flussi_commerciali: {
                    type: "object",
                    properties: {
                      valore_import_annuo: { type: "string" },
                      trend_yoy_percentuale: { type: "string" },
                      crescita_o_calo: { type: "string" },
                      principali_fornitori: { type: "array", items: { type: "object", properties: { paese: { type: "string" }, quota_percentuale: { type: "string" } } } },
                      quota_italia: { type: "string" },
                      posizione_italia: { type: "string" }
                    }
                  },
                  opportunita: { type: "array", items: { type: "string" } },
                  sfide: { type: "array", items: { type: "string" } },
                  barriere_tariffarie: { type: "string" },
                  documenti_necessari: { type: "array", items: { type: "string" } },
                  certificazioni_richieste: { type: "array", items: { type: "string" } },
                  costo_ingresso_stimato: { type: "string" },
                  canali_distribuzione: { type: "array", items: { type: "string" } }
                }
              }
            },
            mercati_prioritari: { type: "array", items: { type: "string" } },
            timeline_consigliata: { type: "string" },
            rischi_principali: { type: "array", items: { type: "string" } },
            primi_passi: { type: "array", items: { type: "string" } },
            risorse_utili: { type: "array", items: { type: "object", properties: { nome: { type: "string" }, url: { type: "string" }, descrizione: { type: "string" } } } }
          }
        }
      });

      setAnalysisResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  const searchHsCode = async () => {
    if (!hsCodeSearch.trim()) return;
    
    setSearchingHsCode(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Cerca informazioni doganali per il prodotto: "${hsCodeSearch}"

REGOLE INDEROGABILI:
- OGNI dato (codice HS, aliquota dazio, percentuale IVA, restrizione) DEVE provenire da fonte ufficiale verificabile.
- Fonti ammesse ESCLUSIVAMENTE: TARIC (database tariffario UE), Agenzia delle Dogane e dei Monopoli (Italia), WCO (World Customs Organization), WTO Tariff Database.
- Se un codice HS NON è determinabile con certezza, fornisci i possibili capitoli/voci e scrivi "Codice esatto da verificare su TARIC con descrizione merceologica dettagliata".
- Per ogni aliquota dazio, indica: fonte, anno, codice HS di riferimento, paese di origine.
- NON INVENTARE MAI codici HS, dazi o percentuali. Se non hai il dato certo, scrivi "Da verificare su TARIC — consultare voce [capitolo HS]".
- Per le certificazioni obbligatorie, citare la normativa UE/nazionale di riferimento (es: Regolamento UE 2023/xxx, Direttiva 2014/xxx).

Fornisci:
1. Codice HS più probabile con livello di certezza (alto/medio/basso) e fonte
2. Descrizione ufficiale della voce doganale dalla nomenclatura combinata UE
3. Dazi doganali per import in Italia dalla Cina — SOLO da TARIC con codice HS specifico
4. Dazi doganali per export dall'Italia verso USA, Cina, UK — SOLO da WTO Tariff Database o fonte equivalente
5. Restrizioni o certificazioni obbligatorie con riferimento normativo
6. IVA applicabile (aliquota standard e eventuali aliquote ridotte con base normativa)
7. Documentazione necessaria per import/export con riferimento normativo`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            hs_code: { type: "string" },
            descrizione_doganale: { type: "string" },
            capitolo_hs: { type: "string" },
            dazi_import_cina_italia: { type: "string" },
            dazi_export: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  paese: { type: "string" },
                  dazio_percentuale: { type: "string" },
                  note: { type: "string" }
                }
              }
            },
            iva_italia: { type: "string" },
            restrizioni: { type: "array", items: { type: "string" } },
            certificazioni_obbligatorie: { type: "array", items: { type: "string" } },
            documenti_necessari: { type: "array", items: { type: "string" } },
            fonti: { type: "array", items: { type: "string" } }
          }
        }
      });

      setHsCodeResult(result);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingHsCode(false);
    }
  };

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setExportForm({
      settore: '',
      prodotto: '',
      descrizione_prodotto: '',
      fatturato_annuo: '',
      esperienza_export: '',
      mercati_interesse: [],
      certificazioni: '',
      capacita_produttiva: ''
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('Home')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">Import / Export</h1>
        </div>

        {/* Hero Card */}
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">Internazionalizzazione</h2>
                <p className="text-white/80 text-sm">Analizza mercati e opportunità globali</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Switch */}
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setActiveTab('export')}
            className={`flex-1 ${activeTab === 'export' ? 'bg-lime-400 text-slate-900 hover:bg-lime-500' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => setActiveTab('import')}
            className={`flex-1 ${activeTab === 'import' ? 'bg-red-400 text-white hover:bg-red-500' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
          >
            <img src="https://flagcdn.com/w20/cn.png" alt="China" className="w-5 h-3.5 mr-1 object-cover rounded-sm" />
            <span className="mr-1">CN</span>
            Import
          </Button>
          <Button
            onClick={() => setActiveTab('messages')}
            className={`relative ${activeTab === 'messages' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
          >
            <Mail className="w-4 h-4" />
            {importUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {importUnreadCount}
              </span>
            )}
          </Button>
        </div>

        {activeTab === 'messages' ? (
          <ImportMessagesSection user={user} />
        ) : activeTab === 'export' ? (
          <>
            {/* Pannello Consulenti per Export */}
            {user && (
              <div className="mb-6">
                <SectionConsultantPanel 
                  sectionId="import_export" 
                  sectionLabel="Import / Export" 
                  user={user} 
                />
              </div>
            )}

            {/* Limite Export */}
            {exportLimitReached && (
              <LimitReachedBanner actionType="export_analysis" usageCount={exportUsage} limit={exportLimit} />
            )}
            {!exportLimitReached && user && (
              <UsageCounter usageCount={exportUsage} limit={exportLimit} label="Analisi export disponibili questo mese" />
            )}

            {!analysisResult ? (
              <div className="space-y-4">
                {/* Form Export */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-lime-400" />
                      Valuta il tuo potenziale Export
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-slate-400 text-sm mb-1 block">Settore *</label>
                        <Select
                          value={exportForm.settore}
                          onValueChange={(value) => setExportForm({ ...exportForm, settore: value })}
                        >
                          <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                            <SelectValue placeholder="Seleziona il tuo settore" />
                          </SelectTrigger>
                          <SelectContent>
                            {SETTORI.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-slate-400 text-sm mb-1 block">Prodotto principale *</label>
                        <Input
                          placeholder="Es. Macchine per packaging alimentare"
                          value={exportForm.prodotto}
                          onChange={(e) => setExportForm({ ...exportForm, prodotto: e.target.value })}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 text-sm mb-1 block">Descrizione prodotto</label>
                        <Textarea
                          placeholder="Descrivi brevemente il tuo prodotto, caratteristiche distintive, vantaggi competitivi..."
                          value={exportForm.descrizione_prodotto}
                          onChange={(e) => setExportForm({ ...exportForm, descrizione_prodotto: e.target.value })}
                          className="bg-slate-900 border-slate-700 text-white min-h-[80px]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-400 text-sm mb-1 block">Fatturato annuo</label>
                          <Select
                            value={exportForm.fatturato_annuo}
                            onValueChange={(value) => setExportForm({ ...exportForm, fatturato_annuo: value })}
                          >
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                              <SelectValue placeholder="Range" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="< 500k">{'< 500.000€'}</SelectItem>
                              <SelectItem value="500k-1M">500k - 1M €</SelectItem>
                              <SelectItem value="1M-5M">1M - 5M €</SelectItem>
                              <SelectItem value="5M-10M">5M - 10M €</SelectItem>
                              <SelectItem value="> 10M">{'> 10M €'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-slate-400 text-sm mb-1 block">Esperienza export</label>
                          <Select
                            value={exportForm.esperienza_export}
                            onValueChange={(value) => setExportForm({ ...exportForm, esperienza_export: value })}
                          >
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                              <SelectValue placeholder="Livello" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="nessuna">Nessuna</SelectItem>
                              <SelectItem value="occasionale">Occasionale</SelectItem>
                              <SelectItem value="regolare_eu">Regolare (solo UE)</SelectItem>
                              <SelectItem value="regolare_extra_eu">Regolare (extra UE)</SelectItem>
                              <SelectItem value="consolidata">Consolidata</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-400 text-sm mb-1 block">Certificazioni possedute</label>
                        <Input
                          placeholder="Es. ISO 9001, CE, FDA, HACCP..."
                          value={exportForm.certificazioni}
                          onChange={(e) => setExportForm({ ...exportForm, certificazioni: e.target.value })}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-slate-400 text-sm mb-1 block">Capacità produttiva disponibile per export</label>
                        <Input
                          placeholder="Es. 30% della produzione, 1000 unità/mese"
                          value={exportForm.capacita_produttiva}
                          onChange={(e) => setExportForm({ ...exportForm, capacita_produttiva: e.target.value })}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Selezione Mercati */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-lime-400" />
                      Mercati di interesse *
                    </h3>
                    <p className="text-slate-400 text-sm mb-3">Seleziona uno o più mercati da analizzare</p>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {MERCATI_TARGET.map((mercato) => (
                        <button
                          key={mercato.code}
                          onClick={() => toggleMercato(mercato.code)}
                          className={`p-2 rounded-lg text-center transition-all ${
                            exportForm.mercati_interesse.includes(mercato.code)
                              ? 'bg-lime-400 text-slate-900'
                              : 'bg-slate-700 text-white hover:bg-slate-600'
                          }`}
                        >
                          <span className="text-xl">{mercato.flag}</span>
                          <p className="text-xs mt-1">{mercato.name}</p>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={analyzeExportPotential}
                  disabled={!exportForm.settore || !exportForm.prodotto || exportForm.mercati_interesse.length === 0 || analyzing || exportLimitReached}
                  className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold h-12 disabled:opacity-50"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analisi in corso...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Analizza Potenziale Export
                    </>
                  )}
                </Button>
              </div>
            ) : (
              /* Risultati Analisi Export */
              <div className="space-y-4">
                {/* Readiness Score */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-semibold">Export Readiness</h3>
                      <div className={`text-2xl font-bold ${
                        analysisResult.readiness_score >= 7 ? 'text-green-400' :
                        analysisResult.readiness_score >= 5 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {analysisResult.readiness_score}/10
                      </div>
                    </div>
                    <p className="text-slate-300 text-sm">{analysisResult.readiness_commento}</p>
                  </CardContent>
                </Card>

                {/* Raccomandazione */}
                <Card className="bg-emerald-500/20 border-emerald-500/50">
                  <CardContent className="p-4">
                    <h3 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Raccomandazione
                    </h3>
                    <p className="text-emerald-200 text-sm">{analysisResult.raccomandazione_generale}</p>
                  </CardContent>
                </Card>

                {/* Mercati Prioritari */}
                {analysisResult.mercati_prioritari?.length > 0 && (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <h3 className="text-white font-semibold mb-2">🎯 Mercati Prioritari</h3>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.mercati_prioritari.map((m, i) => (
                          <span key={i} className="bg-lime-400/20 text-lime-400 px-3 py-1 rounded-full text-sm">
                            {m}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Analisi per Mercato */}
                {analysisResult.mercati_analisi?.map((mercato, idx) => (
                  <Card key={idx} className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-semibold">{mercato.mercato}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          mercato.punteggio_opportunita >= 7 ? 'bg-green-500/20 text-green-400' :
                          mercato.punteggio_opportunita >= 5 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {mercato.punteggio_opportunita}/10
                        </span>
                      </div>

                      {/* Flussi Commerciali */}
                      {mercato.flussi_commerciali && (
                        <div className="mb-3 bg-slate-700/50 rounded-lg p-3">
                          <p className="text-lime-400 text-xs font-semibold mb-2">📊 Flussi Commerciali (ultimi 12 mesi):</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-slate-400 text-xs">Import totale:</p>
                              <p className="text-white font-semibold">{mercato.flussi_commerciali.valore_import_annuo}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-xs">Trend YoY:</p>
                              <p className={`font-semibold ${mercato.flussi_commerciali.crescita_o_calo === 'crescita' ? 'text-green-400' : 'text-red-400'}`}>
                                {mercato.flussi_commerciali.trend_yoy_percentuale}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-xs">Quota Italia:</p>
                              <p className="text-white">{mercato.flussi_commerciali.quota_italia}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-xs">Posizione Italia:</p>
                              <p className="text-white">{mercato.flussi_commerciali.posizione_italia}</p>
                            </div>
                          </div>
                          {mercato.flussi_commerciali.principali_fornitori?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-slate-400 text-xs mb-1">Top fornitori:</p>
                              <div className="flex flex-wrap gap-1">
                                {mercato.flussi_commerciali.principali_fornitori.slice(0, 5).map((f, i) => (
                                  <span key={i} className="bg-slate-600 text-slate-200 px-2 py-0.5 rounded text-xs">
                                    {f.paese} ({f.quota_percentuale})
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {mercato.opportunita?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-green-400 text-xs font-semibold mb-1">Opportunità:</p>
                          <ul className="text-slate-300 text-sm space-y-1">
                            {mercato.opportunita.map((o, i) => <li key={i}>• {o}</li>)}
                          </ul>
                        </div>
                      )}

                      {mercato.sfide?.length > 0 && (
                        <div className="mb-3">
                          <p className="text-orange-400 text-xs font-semibold mb-1">Sfide:</p>
                          <ul className="text-slate-300 text-sm space-y-1">
                            {mercato.sfide.map((s, i) => <li key={i}>• {s}</li>)}
                          </ul>
                        </div>
                      )}

                      {(mercato.barriere_tariffarie || mercato.costo_ingresso_stimato) && (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {mercato.barriere_tariffarie && (
                            <div>
                              <p className="text-slate-400 text-xs">Barriere tariffarie:</p>
                              <p className="text-white">{mercato.barriere_tariffarie}</p>
                            </div>
                          )}
                          {mercato.costo_ingresso_stimato && (
                            <div>
                              <p className="text-slate-400 text-xs">Costo ingresso stimato:</p>
                              <p className="text-white">{mercato.costo_ingresso_stimato}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {mercato.certificazioni_richieste?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-slate-400 text-xs mb-1">Certificazioni richieste:</p>
                          <div className="flex flex-wrap gap-1">
                            {mercato.certificazioni_richieste.map((c, i) => (
                              <span key={i} className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs">{c}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Timeline */}
                {analysisResult.timeline_consigliata && (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <h3 className="text-white font-semibold mb-2">⏱️ Timeline Consigliata</h3>
                      <p className="text-slate-300 text-sm">{analysisResult.timeline_consigliata}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Primi Passi */}
                {analysisResult.primi_passi?.length > 0 && (
                  <Card className="bg-blue-500/20 border-blue-500/50">
                    <CardContent className="p-4">
                      <h3 className="text-blue-400 font-semibold mb-2">🚀 Primi Passi</h3>
                      <ol className="text-blue-200 text-sm space-y-2">
                        {analysisResult.primi_passi.map((p, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="bg-blue-500/30 rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">{i + 1}</span>
                            {p}
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>
                )}

                {/* Rischi */}
                {analysisResult.rischi_principali?.length > 0 && (
                  <Card className="bg-orange-500/20 border-orange-500/50">
                    <CardContent className="p-4">
                      <h3 className="text-orange-400 font-semibold mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Rischi Principali
                      </h3>
                      <ul className="text-orange-200 text-sm space-y-1">
                        {analysisResult.rischi_principali.map((r, i) => <li key={i}>• {r}</li>)}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Risorse Utili */}
                {analysisResult.risorse_utili?.length > 0 && (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <h3 className="text-white font-semibold mb-3">🔗 Risorse Utili</h3>
                      <div className="space-y-2">
                        {analysisResult.risorse_utili.map((r, i) => (
                          <a
                            key={i}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-lime-400 hover:text-lime-300 text-sm"
                          >
                            <ExternalLink className="w-4 h-4" />
                            {r.nome}
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Form Contatto Export Manager */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Users className="w-5 h-5 text-lime-400" />
                      Contatta un Export Manager del Consorzio
                    </h3>
                    
                    {contactSent ? (
                      <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 text-center">
                        <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <p className="text-green-400 font-medium">Richiesta inviata!</p>
                        <p className="text-green-200 text-sm mt-1">L'Export Manager ti contatterà al più presto.</p>
                        <Button
                          onClick={() => setContactSent(false)}
                          variant="outline"
                          className="mt-3 border-green-500/50 text-green-400 hover:bg-green-500/20"
                        >
                          Invia altra richiesta
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Select
                          value={contactForm.exportManagerId}
                          onValueChange={(value) => setContactForm({ ...contactForm, exportManagerId: value })}
                        >
                          <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                            <SelectValue placeholder="Seleziona un Export Manager" />
                          </SelectTrigger>
                          <SelectContent>
                            {exportManagers.map((em) => (
                              <SelectItem key={em.id} value={em.id}>
                                {em.name} {em.city ? `- ${em.city}` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Oggetto (es. Valutazione export USA)"
                          value={contactForm.subject}
                          onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                          className="bg-slate-900 border-slate-700 text-white"
                        />
                        <Textarea
                          placeholder="Descrivi la tua richiesta, mercati di interesse, prodotti..."
                          value={contactForm.message}
                          onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                          className="bg-slate-900 border-slate-700 text-white min-h-[100px]"
                        />
                        
                        {/* Allegati */}
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <label className="flex-1 cursor-pointer">
                              <div className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg transition-colors text-sm">
                                <Paperclip className="w-4 h-4" />
                                Allega documento
                              </div>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                                onChange={handleAttachmentUpload}
                                className="hidden"
                                disabled={uploadingAttachment}
                              />
                            </label>
                            <label className="flex-1 cursor-pointer">
                              <div className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg transition-colors text-sm h-full">
                                <Camera className="w-4 h-4" />
                                Scatta foto
                              </div>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleAttachmentUpload}
                                className="hidden"
                                disabled={uploadingAttachment}
                              />
                            </label>
                          </div>
                          
                          {uploadingAttachment && (
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Caricamento in corso...
                            </div>
                          )}
                          
                          {contactForm.attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {contactForm.attachments.map((att, idx) => (
                                <div key={idx} className="bg-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
                                  <FileText className="w-4 h-4 text-lime-400" />
                                  <span className="text-white truncate max-w-[120px]">{att.name}</span>
                                  <button onClick={() => removeAttachment(idx)} className="text-red-400 hover:text-red-300">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <Button
                          onClick={() => sendContactMutation.mutate()}
                          disabled={!contactForm.exportManagerId || !contactForm.subject || !contactForm.message || sendContactMutation.isPending || uploadingAttachment}
                          className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold"
                        >
                          {sendContactMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Invio in corso...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Invia Richiesta
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Button
                  onClick={resetAnalysis}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-400 hover:bg-slate-800"
                >
                  Nuova Analisi
                </Button>
              </div>
            )}
          </>
        ) : (
          /* Tab Import dalla Cina */
          <div className="space-y-4">
            {/* Limite Import */}
            {importLimitReached && (
              <LimitReachedBanner actionType="import_analysis" usageCount={importUsage} limit={importLimit} />
            )}
            {!importLimitReached && user && (
              <UsageCounter usageCount={importUsage} limit={importLimit} label="Analisi import disponibili questo mese" />
            )}

            {/* Hero Import */}
            <Card className="bg-gradient-to-br from-red-500 to-red-700 border-0">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">🇨🇳</span>
                  <div>
                    <h3 className="text-white font-bold">Import dalla Cina</h3>
                    <p className="text-white/80 text-sm">Produci su misura o trova prodotti esistenti</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!importResult ? (
              <div className="space-y-4">
                {/* Tipo di Import */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-3">Cosa vuoi fare?</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setImportForm({ ...importForm, tipo_richiesta: 'produzione_custom' })}
                        className={`p-4 rounded-lg text-center transition-all ${
                          importForm.tipo_richiesta === 'produzione_custom'
                            ? 'bg-lime-400 text-slate-900'
                            : 'bg-slate-700 text-white hover:bg-slate-600'
                        }`}
                      >
                        <Package className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm font-medium">Produzione su misura</p>
                        <p className="text-xs opacity-70 mt-1">Da disegni/specifiche</p>
                      </button>
                      <button
                        onClick={() => setImportForm({ ...importForm, tipo_richiesta: 'prodotto_esistente' })}
                        className={`p-4 rounded-lg text-center transition-all ${
                          importForm.tipo_richiesta === 'prodotto_esistente'
                            ? 'bg-lime-400 text-slate-900'
                            : 'bg-slate-700 text-white hover:bg-slate-600'
                        }`}
                      >
                        <Search className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm font-medium">Prodotto esistente</p>
                        <p className="text-xs opacity-70 mt-1">Già disponibile</p>
                      </button>
                    </div>
                  </CardContent>
                </Card>

                {/* Form Valutazione */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-lime-400" />
                      Valuta la fattibilità del tuo import
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-slate-400 text-sm mb-1 block">Descrizione prodotto *</label>
                        <Textarea
                          placeholder="Descrivi il prodotto che vuoi importare/produrre..."
                          value={importForm.descrizione_prodotto}
                          onChange={(e) => setImportForm({ ...importForm, descrizione_prodotto: e.target.value })}
                          className="bg-slate-900 border-slate-700 text-white min-h-[80px]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-400 text-sm mb-1 block">Quantità richiesta *</label>
                          <Select
                            value={importForm.quantita}
                            onValueChange={(value) => setImportForm({ ...importForm, quantita: value })}
                          >
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                              <SelectValue placeholder="Pezzi" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="100-500">100 - 500 pz</SelectItem>
                              <SelectItem value="500-1000">500 - 1.000 pz</SelectItem>
                              <SelectItem value="1000-5000">1.000 - 5.000 pz</SelectItem>
                              <SelectItem value="5000-10000">5.000 - 10.000 pz</SelectItem>
                              <SelectItem value="10000-50000">10.000 - 50.000 pz</SelectItem>
                              <SelectItem value="50000+">Oltre 50.000 pz</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-slate-400 text-sm mb-1 block">Frequenza ordini</label>
                          <Select
                            value={importForm.frequenza}
                            onValueChange={(value) => setImportForm({ ...importForm, frequenza: value })}
                          >
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                              <SelectValue placeholder="Seleziona" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="una_tantum">Una tantum</SelectItem>
                              <SelectItem value="trimestrale">Trimestrale</SelectItem>
                              <SelectItem value="semestrale">Semestrale</SelectItem>
                              <SelectItem value="annuale">Annuale</SelectItem>
                              <SelectItem value="continuativo">Continuativo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-slate-400 text-sm mb-1 block">Tempo massimo attesa</label>
                          <Select
                            value={importForm.tempo_attesa}
                            onValueChange={(value) => setImportForm({ ...importForm, tempo_attesa: value })}
                          >
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                              <SelectValue placeholder="Seleziona" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2-4_settimane">2-4 settimane</SelectItem>
                              <SelectItem value="1-2_mesi">1-2 mesi</SelectItem>
                              <SelectItem value="2-3_mesi">2-3 mesi</SelectItem>
                              <SelectItem value="3-6_mesi">3-6 mesi</SelectItem>
                              <SelectItem value="flessibile">Flessibile</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-slate-400 text-sm mb-1 block">Budget indicativo</label>
                          <Select
                            value={importForm.budget}
                            onValueChange={(value) => setImportForm({ ...importForm, budget: value })}
                          >
                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                              <SelectValue placeholder="Seleziona" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="< 5000">{"< 5.000€"}</SelectItem>
                              <SelectItem value="5000-15000">5.000 - 15.000€</SelectItem>
                              <SelectItem value="15000-50000">15.000 - 50.000€</SelectItem>
                              <SelectItem value="50000-100000">50.000 - 100.000€</SelectItem>
                              <SelectItem value="> 100000">{"> 100.000€"}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <label className="text-slate-400 text-sm mb-1 block">Hai già esperienza di import?</label>
                        <Select
                          value={importForm.esperienza_import}
                          onValueChange={(value) => setImportForm({ ...importForm, esperienza_import: value })}
                        >
                          <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                            <SelectValue placeholder="Seleziona" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nessuna">Nessuna esperienza</SelectItem>
                            <SelectItem value="poca">Poca (1-2 ordini)</SelectItem>
                            <SelectItem value="media">Media (3-10 ordini)</SelectItem>
                            <SelectItem value="consolidata">Consolidata (10+ ordini)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-slate-400 text-sm mb-1 block">Requisiti specifici</label>
                        <Textarea
                          placeholder="Certificazioni richieste, materiali particolari, standard di qualità..."
                          value={importForm.requisiti}
                          onChange={(e) => setImportForm({ ...importForm, requisiti: e.target.value })}
                          className="bg-slate-900 border-slate-700 text-white min-h-[60px]"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={analyzeImportFeasibility}
                  disabled={!importForm.descrizione_prodotto || !importForm.quantita || !importForm.tipo_richiesta || analyzingImport || importLimitReached}
                  className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold h-12 disabled:opacity-50"
                >
                  {analyzingImport ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Analisi in corso...
                    </>
                  ) : (
                    <>
                      <Ship className="w-5 h-5 mr-2" />
                      Valuta Fattibilità Import
                    </>
                  )}
                </Button>
              </div>
            ) : (
              /* Risultati Analisi Import - Design Elegante */
              <div className="space-y-4">
                {/* Header con Punteggio */}
                <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-r from-red-500/20 to-orange-500/10 p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                            <Ship className="w-7 h-7 text-white" />
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs uppercase tracking-wider">Analisi Import</p>
                            <h3 className="text-white font-bold text-lg">Fattibilità</h3>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-4xl font-black ${
                            importResult.punteggio_fattibilita >= 7 ? 'text-green-400' :
                            importResult.punteggio_fattibilita >= 5 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {importResult.punteggio_fattibilita}
                            <span className="text-lg text-slate-500">/10</span>
                          </div>
                          <div className={`text-xs font-medium mt-1 px-2 py-0.5 rounded-full inline-block ${
                            importResult.punteggio_fattibilita >= 7 ? 'bg-green-500/20 text-green-400' :
                            importResult.punteggio_fattibilita >= 5 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {importResult.punteggio_fattibilita >= 7 ? 'Alta fattibilità' :
                             importResult.punteggio_fattibilita >= 5 ? 'Media fattibilità' : 'Bassa fattibilità'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-slate-300 text-sm leading-relaxed">{importResult.valutazione_generale}</p>
                      {importResult.motivazione_punteggio && (
                        <p className="text-slate-400 text-xs mt-2 italic">{importResult.motivazione_punteggio}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Raccomandazione */}
                <Card className={`border-2 ${importResult.consigliato ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/30' : 'bg-gradient-to-br from-orange-500/10 to-amber-500/5 border-orange-500/30'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${importResult.consigliato ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                        {importResult.consigliato ? <CheckCircle className="w-5 h-5 text-green-400" /> : <AlertTriangle className="w-5 h-5 text-orange-400" />}
                      </div>
                      <div>
                        <h3 className={`font-bold text-base ${importResult.consigliato ? 'text-green-400' : 'text-orange-400'}`}>
                          {importResult.consigliato ? '✓ Import Consigliato' : '⚠ Valuta con attenzione'}
                        </h3>
                        <p className={`text-sm mt-1 leading-relaxed ${importResult.consigliato ? 'text-green-200/80' : 'text-orange-200/80'}`}>
                          {importResult.raccomandazione}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Vantaggi */}
                {importResult.vantaggi?.length > 0 && (
                  <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/30">
                    <CardContent className="p-4">
                      <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Vantaggi
                      </h3>
                      <div className="space-y-2">
                        {importResult.vantaggi.map((v, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                            <p className="text-emerald-100/90 text-sm">{v}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tempi e Logistica */}
                <Card className="bg-slate-800/80 border-slate-700">
                  <CardContent className="p-4">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-blue-400" />
                      Tempi e Logistica
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-slate-700/50 rounded-xl p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-400 text-xs uppercase tracking-wider">MOQ Tipico</span>
                          <span className="text-white font-semibold">{importResult.moq_tipico}</span>
                        </div>
                        <div className="h-1 bg-slate-600 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full w-3/4" />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-700/50 rounded-xl p-3">
                          <p className="text-slate-400 text-xs mb-1">⚙️ Produzione</p>
                          <p className="text-white font-semibold text-sm">{importResult.tempi_produzione}</p>
                        </div>
                        <div className="bg-slate-700/50 rounded-xl p-3">
                          <p className="text-slate-400 text-xs mb-1">🚢 Via mare</p>
                          <p className="text-white font-semibold text-sm">{importResult.tempi_spedizione_mare || importResult.tempi_spedizione}</p>
                        </div>
                        {importResult.tempi_spedizione_aerea && (
                          <div className="bg-slate-700/50 rounded-xl p-3">
                            <p className="text-slate-400 text-xs mb-1">✈️ Via aerea</p>
                            <p className="text-white font-semibold text-sm">{importResult.tempi_spedizione_aerea}</p>
                          </div>
                        )}
                        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-xl p-3 border border-blue-500/30">
                          <p className="text-blue-300 text-xs mb-1">⏱ Tempo totale</p>
                          <p className="text-blue-400 font-bold text-sm">{importResult.tempo_totale}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Criticità */}
                {importResult.criticita?.length > 0 && (
                  <Card className="bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/30">
                    <CardContent className="p-4">
                      <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Criticità da considerare
                      </h3>
                      <div className="space-y-2">
                        {importResult.criticita.map((c, i) => (
                          <div key={i} className="flex items-start gap-2 bg-red-500/10 rounded-lg p-2">
                            <span className="text-red-400 text-xs font-bold mt-0.5">!</span>
                            <p className="text-red-200/90 text-sm">{c}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Requisiti */}
                {importResult.requisiti_necessari?.length > 0 && (
                  <Card className="bg-slate-800/80 border-slate-700">
                    <CardContent className="p-4">
                      <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" />
                        Requisiti necessari
                      </h3>
                      <div className="grid gap-2">
                        {importResult.requisiti_necessari.map((r, i) => (
                          <div key={i} className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
                            <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-purple-400 text-xs font-bold">{i + 1}</span>
                            </div>
                            <p className="text-slate-200 text-sm">{r}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Prossimi Passi */}
                {importResult.prossimi_passi?.length > 0 && (
                  <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/30">
                    <CardContent className="p-4">
                      <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                        <ArrowRight className="w-5 h-5" />
                        Prossimi passi
                      </h3>
                      <div className="space-y-3">
                        {importResult.prossimi_passi.map((p, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                              <span className="text-white text-sm font-bold">{i + 1}</span>
                            </div>
                            <div className="flex-1 bg-blue-500/10 rounded-lg p-3 border-l-2 border-blue-500">
                              <p className="text-blue-100 text-sm">{p}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Fonti Dati */}
                {importResult.fonti_dati?.length > 0 && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-3">
                      <p className="text-slate-500 text-xs mb-2">📚 Fonti dati:</p>
                      <div className="flex flex-wrap gap-1">
                        {importResult.fonti_dati.map((f, i) => (
                          <span key={i} className="bg-slate-700/50 text-slate-400 text-xs px-2 py-0.5 rounded">{f}</span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={() => setImportResult(null)}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-400 hover:bg-slate-800"
                >
                  Nuova Valutazione
                </Button>
              </div>
            )}

            {/* Form Contatto Agenzia Import - sempre visibile */}
            <Card id="import-contact-section" className="bg-gradient-to-br from-red-500 to-orange-600 border-0 shadow-xl shadow-red-500/20 mt-6">
              <CardContent className="p-5">
                <div className="text-center mb-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-4xl">🇨🇳</span>
                  </div>
                  <h3 className="text-white font-bold text-xl mb-2">Vuoi procedere con l'import?</h3>
                  <p className="text-white/90 text-sm mb-4">
                    La nostra agenzia di import ti segue in ogni fase: fino alla consegna in Italia.
                  </p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 mb-4">
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white/10 rounded-lg p-2">
                      <p className="text-white/80 text-xs">✓ Ricerca fornitori</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2">
                      <p className="text-white/80 text-xs">✓ Controllo qualità</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2">
                      <p className="text-white/80 text-xs">✓ Gestione dogana</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2">
                      <p className="text-white/80 text-xs">✓ Spedizione inclusa</p>
                    </div>
                  </div>
                </div>
                
                {importContactSent ? (
                  <div className="bg-white/20 rounded-xl p-4 text-center">
                    <CheckCircle className="w-10 h-10 text-white mx-auto mb-2" />
                    <p className="text-white font-bold text-lg">Abbiamo preso in carico la vostra richiesta</p>
                    <p className="text-white/80 text-sm mt-1">Nell'arco di 48 ore verrete ricontattati.</p>
                    <Button
                      onClick={() => setImportContactSent(false)}
                      variant="outline"
                      className="mt-3 border-white/50 text-white hover:bg-white/20"
                    >
                      Invia altra richiesta
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input
                      placeholder="Oggetto (es. Richiesta preventivo import gadget)"
                      value={importContactForm.subject}
                      onChange={(e) => setImportContactForm({ ...importContactForm, subject: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                    <Textarea
                      placeholder="Descrivi la tua richiesta: che prodotto vuoi importare, quantità, tempistiche desiderate..."
                      value={importContactForm.message}
                      onChange={(e) => setImportContactForm({ ...importContactForm, message: e.target.value })}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[100px]"
                    />
                    
                    {/* Allegati e Foto */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <label className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 px-3 rounded-lg transition-colors text-sm">
                            <Paperclip className="w-4 h-4" />
                            Allega documento
                          </div>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                            onChange={handleImportAttachmentUpload}
                            className="hidden"
                            disabled={uploadingImportAttachment}
                          />
                        </label>
                        <label className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 px-3 rounded-lg transition-colors text-sm h-full">
                            <Camera className="w-4 h-4" />
                            Scatta foto
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleImportAttachmentUpload}
                            className="hidden"
                            disabled={uploadingImportAttachment}
                          />
                        </label>
                      </div>
                      
                      {uploadingImportAttachment && (
                        <div className="flex items-center gap-2 text-white/70 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Caricamento in corso...
                        </div>
                      )}
                      
                      {importContactForm.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {importContactForm.attachments.map((att, idx) => (
                            <div key={idx} className="bg-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
                              <FileText className="w-4 h-4 text-white" />
                              <span className="text-white truncate max-w-[120px]">{att.name}</span>
                              <button onClick={() => removeImportAttachment(idx)} className="text-white/70 hover:text-white">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => sendImportContactMutation.mutate()}
                      disabled={!importContactForm.subject || !importContactForm.message || sendImportContactMutation.isPending || uploadingImportAttachment}
                      className="w-full bg-white hover:bg-white/90 text-red-600 font-bold h-12 text-base"
                    >
                      {sendImportContactMutation.isPending ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Invio in corso...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
                          Richiedi Import
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <BottomNav currentPage="ImportExport" unreadMessages={messages.length} />
    </div>
  );
}