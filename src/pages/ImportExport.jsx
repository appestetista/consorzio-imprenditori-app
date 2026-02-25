import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Globe, TrendingUp, Ship, FileText, Loader2, CheckCircle, AlertTriangle, Target, DollarSign, Package, MapPin, ArrowRight, Search, ExternalLink, X, Mail, BarChart3, Clock } from 'lucide-react';
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
import { fetchTradeData, computeMetrics, interpretData, fetchMacroData, enrichMetricsWithDemand } from '../components/import-export/ExportDataFetcher';
import { fetchPriceData, computePriceMetrics, interpretPriceData } from '../components/import-export/PriceMarginFetcher';
import { ALL_COUNTRIES } from '../components/import-export/CountrySearchSelect';
import CountryInfoCard from '../components/import-export/CountryInfoCard';
import ExportComparisonRanking from '../components/import-export/ExportComparisonRanking';
import PriceMarginSection from '../components/import-export/PriceMarginCard';
import MarketSummaryCard from '../components/import-export/MarketSummaryCard';
import ExportAnalysisResult from '../components/import-export/ExportAnalysisResult';
import { fetchImportData, computeLandedCost, interpretImportData } from '../components/import-export/ImportDataFetcher';
import LandedCostTable from '../components/import-export/LandedCostTable';
import ImportMarketIndicators from '../components/import-export/ImportMarketIndicators';
import ImportTopImportersChart from '../components/import-export/ImportTopImportersChart';
import ImportTradeChart from '../components/import-export/ImportTradeChart';
import { buildExportSummary, buildImportSummary } from '../components/import-export/buildAnalysisSummary';
import SearchHistory from '../components/import-export/SearchHistory';
import WorldMapExplorer from '../components/import-export/WorldMapExplorer';
import ImportContactCard from '../components/import-export/ImportContactCard';
import ExportContactCard from '../components/import-export/ExportContactCard';
import ImportLimitPopup from '../components/import-export/ImportLimitPopup';

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

const EXPORTER_COUNTRIES = [
  { code: 'IT', name: 'Italia' },
  { code: 'DE', name: 'Germania' },
  { code: 'FR', name: 'Francia' },
  { code: 'ES', name: 'Spagna' },
  { code: 'NL', name: 'Paesi Bassi' },
  { code: 'BE', name: 'Belgio' },
  { code: 'AT', name: 'Austria' },
  { code: 'PL', name: 'Polonia' },
  { code: 'PT', name: 'Portogallo' },
];

export default function ImportExport() {
  const [user, setUser] = useState(null);
  const urlParamsIE = new URLSearchParams(window.location.search);
  const initialTab = urlParamsIE.get('tab') === 'import' ? 'import' : 'export';
  const [activeTab, setActiveTab] = useState(initialTab); // 'export' | 'import' | 'messages' | 'history'
  const [exportForm, setExportForm] = useState({
    settore: '',
    prodotto: '',
    capacita_produttiva: '',
    posizionamento: '',
    certificazioni: '',
    business_model: '',
    canale_preferito: ''
  });
  const [selectedMapCountry, setSelectedMapCountry] = useState(null);
  const [showHSClassifier, setShowHSClassifier] = useState(false);
  const [exportValidationErrors, setExportValidationErrors] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [exportStep, setExportStep] = useState(''); // '', 'fetching', 'computing', 'interpreting'
  const [analysisResult, setAnalysisResult] = useState(null);
  const [tradeData, setTradeData] = useState(null);
  const [tradeMetrics, setTradeMetrics] = useState(null);
  const [confirmedExportHS, setConfirmedExportHS] = useState(null);
  const [periodoAnalisi] = useState('5');
  const [macroData, setMacroData] = useState({});
  const [priceMetrics, setPriceMetrics] = useState(null);
  const [priceInterpretation, setPriceInterpretation] = useState(null);
  const [priceStep, setPriceStep] = useState(''); // '', 'fetching', 'computing', 'interpreting'
  const [userPriceData, setUserPriceData] = useState({ prezzo_vendita: '', costo_produzione: '', unita: '', costo_logistica: '', commissioni: '', dazi: '' });
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
  const [importStep, setImportStep] = useState(''); // '', 'fetching', 'computing', 'interpreting'
  const [importResult, setImportResult] = useState(null);
  const [importRawData, setImportRawData] = useState(null);
  const [importLandedCost, setImportLandedCost] = useState(null);
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
  const [showImportLimitPopup, setShowImportLimitPopup] = useState(false);

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

      // Genera riepilogo analisi automatico
      const analysisSummary = (confirmedImportHS || importRawData || importLandedCost || importResult)
        ? '\n\n' + buildImportSummary({ confirmedHS: confirmedImportHS, importRawData, importLandedCost, importResult, importForm })
        : '';

      // Invia richiesta al consulente Import
      await base44.entities.Message.create({
        from_email: user.email,
        to_email: targetEmail,
        content: `**Richiesta Import dalla Cina**\n\nOggetto: ${importContactForm.subject}\n\n${importContactForm.message}${analysisSummary}\n\n---\nInviato da: ${user.company_name || user.full_name}\nEmail: ${user.email}`,
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

      // Genera riepilogo analisi automatico
      const analysisSummary = (confirmedExportHS || tradeData || tradeMetrics || analysisResult)
        ? '\n\n' + buildExportSummary({ confirmedHS: confirmedExportHS, tradeData, tradeMetrics, analysisResult, exportForm, MERCATI_TARGET: ALL_COUNTRIES })
        : '';

      // Crea messaggio
      await base44.entities.Message.create({
        from_email: user.email,
        to_email: exportManager.email,
        content: `**Richiesta consulenza Export**\n\nOggetto: ${contactForm.subject}\n\n${contactForm.message}${analysisSummary}\n\n---\nInviato da: ${user.company_name || user.full_name}\nEmail: ${user.email}`,
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

  const handleImportHSConfirm = (hsData) => {
    setConfirmedImportHS(hsData);
    analyzeImportFeasibility(hsData);
  };

  const analyzeImportFeasibility = async (hsData) => {
    if (!importForm.descrizione_prodotto || !importForm.quantita || !importForm.tipo_richiesta) return;
    if (!hsData) return;
    if (importLimitReached) return;
    
    setAnalyzingImport(true);
    setImportRawData(null);
    setImportLandedCost(null);
    setImportResult(null);

    try {
      await trackImportUsage({
        search_label: `Import: ${importForm.descrizione_prodotto.substring(0, 60)}`,
        search_meta: {
          prodotto: importForm.descrizione_prodotto,
          hs_code: hsData.hs_code,
          tipo_richiesta: importForm.tipo_richiesta
        }
      });

      // STEP 2: Recupero dati da TARIC + Comtrade
      setImportStep('fetching');
      const rawData = await fetchImportData(hsData.hs_code, hsData.descrizione_ufficiale);
      if (rawData?._api_error) {
        setImportRawData(rawData);
        setImportResult({ _api_error: true });
        return;
      }
      setImportRawData(rawData);

      // STEP 3: Calcolo Landed Cost (lato client, nessuna AI)
      setImportStep('computing');
      const landed = computeLandedCost(rawData, importForm.quantita, importForm.budget);
      if (landed?._api_error) {
        setImportLandedCost(landed);
        setImportResult({ _api_error: true });
        return;
      }
      setImportLandedCost(landed);

      // STEP 4: Interpretazione AI (riceve solo dati calcolati)
      setImportStep('interpreting');
      const interpretation = await interpretImportData(rawData, landed, hsData.hs_code, hsData.descrizione_ufficiale, importForm);
      if (interpretation?._api_error) {
        setImportResult({ _api_error: true });
        return;
      }
      setImportResult(interpretation);
    } catch (e) {
      console.error('[Import] Errore analisi:', e);
      setImportResult({ _api_error: true });
    } finally {
      setAnalyzingImport(false);
      setImportStep('');
    }
  };

  // No longer needed - replaced by CountrySearchSelect

  const handleExportHSConfirm = (hsData) => {
    setConfirmedExportHS(hsData);
    analyzeExportPotential(hsData);
  };

  const analyzeExportPotential = async (hsData) => {
    const mercatiInteresse = selectedMapCountry ? [selectedMapCountry.iso_a2] : (user?.export_mercati_target || []);
    const exporterCountry = user?.export_paese_esportatore || 'IT';
    
    if (!exportForm.settore || !exportForm.prodotto || mercatiInteresse.length === 0) return;
    if (!hsData) return;
    if (exportLimitReached) return;
    
    setAnalyzing(true);
    setTradeData(null);
    setTradeMetrics(null);
    setAnalysisResult(null);
    setMacroData({});

    const mercatiNames = mercatiInteresse.map(code => {
      if (code === 'WLD') return 'World';
      const c = ALL_COUNTRIES.find(c => c.code === code);
      return c ? c.name : code;
    });

    try {
      const mercatiLabels = mercatiNames.slice(0, 3).join(', ');
      await trackExportUsage({
        search_label: `${exportForm.prodotto} → ${mercatiLabels}`,
        search_meta: {
          prodotto: exportForm.prodotto,
          settore: exportForm.settore,
          hs_code: hsData.hs_code,
          mercati: mercatiNames
        }
      });

      // STEP 1: Recupero dati ufficiali + macro World Bank in parallelo
      setExportStep('fetching');
      const [rawData, macro] = await Promise.all([
        fetchTradeData(hsData.hs_code, mercatiInteresse, mercatiNames, exporterCountry, parseInt(periodoAnalisi)),
        fetchMacroData(mercatiInteresse)
      ]);
      
      if (rawData?._api_error) {
        setTradeData(rawData);
        setAnalysisResult({ _api_error: true });
        return;
      }
      setTradeData(rawData);
      setMacroData(macro || {});

      // STEP 2-3: Verifica completezza e calcolo metriche (lato client)
      setExportStep('computing');
      const metricsRaw = computeMetrics(rawData);
      if (metricsRaw?._api_error) {
        setTradeMetrics(metricsRaw);
        setAnalysisResult({ _api_error: true });
        return;
      }
      // Arricchisci con demand_score e validazione coerenza
      const metrics = enrichMetricsWithDemand(metricsRaw, macro || {});
      setTradeMetrics(metrics);

      // STEP 4: Interpretazione strategica AI (include dati macro stabilità)
      setExportStep('interpreting');
      const interpretation = await interpretData(rawData, metrics, hsData.hs_code, hsData.descrizione_ufficiale, {
        settore: exportForm.settore,
        prodotto: exportForm.prodotto,
        descrizione: '',
        fatturato_annuo: user?.export_fatturato_annuo || '',
        esperienza_export: user?.export_esperienza || '',
        certificazioni: exportForm.certificazioni || user?.export_certificazioni || '',
        capacita_produttiva: exportForm.capacita_produttiva,
        posizionamento: exportForm.posizionamento,
        business_model: exportForm.business_model,
        canale_preferito: exportForm.canale_preferito
      }, macro || {});

      if (interpretation?._api_error) {
        setAnalysisResult({ _api_error: true });
        return;
      }
      setAnalysisResult(interpretation);

      // STEP 2: Analisi Prezzo & Marginalità (in parallelo dopo risultati principali)
      setPriceStep('fetching');
      const priceRaw = await fetchPriceData(hsData.hs_code, mercatiInteresse, mercatiNames, exporterCountry, parseInt(periodoAnalisi));
      if (priceRaw?._api_error) {
        setPriceMetrics(null);
        setPriceStep('');
      } else {
        setPriceStep('computing');
        const pMetrics = computePriceMetrics(priceRaw);
        setPriceMetrics(pMetrics);

        if (pMetrics && !pMetrics._api_error) {
          setPriceStep('interpreting');
          const pInterp = await interpretPriceData(pMetrics, hsData.hs_code, hsData.descrizione_ufficiale, {
            settore: exportForm.settore,
            prodotto: exportForm.prodotto,
            fatturato_annuo: user?.export_fatturato_annuo || ''
          });
          setPriceInterpretation(pInterp);
        }
        setPriceStep('');
      }
    } catch (e) {
      console.error('[Export] Errore analisi:', e);
      setAnalysisResult({ _api_error: true });
    } finally {
      setAnalyzing(false);
      setExportStep('');
      setPriceStep('');
    }
  };

  const resetAnalysis = () => {
    setAnalysisResult(null);
    setConfirmedExportHS(null);
    setTradeData(null);
    setTradeMetrics(null);
    setMacroData({});
    setPriceMetrics(null);
    setPriceInterpretation(null);
    setPriceStep('');
    setUserPriceData({ prezzo_vendita: '', costo_produzione: '', unita: '', costo_logistica: '', commissioni: '', dazi: '' });
    setExportForm({
      settore: '',
      prodotto: '',
      capacita_produttiva: '',
      posizionamento: '',
      certificazioni: '',
      business_model: '',
      canale_preferito: ''
    });
    setSelectedMapCountry(null);
    setShowHSClassifier(false);
    setExportValidationErrors({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Usage Counter sopra header */}
        {activeTab === 'export' && !analysisResult && !exportLimitReached && user && (
          <div className="mb-3">
            <UsageCounter usageCount={exportUsage} limit={exportLimit} label="Analisi export disponibili questa settimana" />
          </div>
        )}
        {activeTab === 'export' && !analysisResult && exportLimitReached && (
          <div className="mb-3">
            <LimitReachedBanner actionType="export_analysis" usageCount={exportUsage} limit={exportLimit} isWeekly={true} />
          </div>
        )}

        {/* Minimal Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link to={createPageUrl('Home')} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center back-arrow-tap">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div className="flex-1">
            <h1 className="text-white text-lg font-bold tracking-tight">Export</h1>
            <p className="text-slate-500 text-xs">Analisi mercati internazionali</p>
          </div>
          <button
            onClick={() => setActiveTab(activeTab === 'history' ? 'export' : 'history')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all ${
              activeTab === 'history' 
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium">Storico</span>
          </button>
        </div>

        {/* Ricerca rapida export */}
        {activeTab === 'export' && !analysisResult && (
          <div className="mb-5 space-y-3">
            <p className="text-white font-semibold text-sm">Cosa vuoi esportare?</p>
            <div>
              <Input
                placeholder="Es. Olio d'oliva, macchine tessili, vino..."
                value={exportForm.prodotto}
                onChange={(e) => { setExportForm({ ...exportForm, prodotto: e.target.value }); setExportValidationErrors(prev => ({ ...prev, prodotto: '' })); }}
                className={`bg-slate-800/60 text-white h-11 rounded-xl placeholder:text-slate-500 ${exportValidationErrors.prodotto ? 'border-red-500 border-2' : 'border-white/10'}`}
              />
              {exportValidationErrors.prodotto && <p className="text-red-400 text-xs mt-1">{exportValidationErrors.prodotto}</p>}
            </div>
            <p className="text-white font-semibold text-sm">Indica dove</p>
          </div>
        )}

        {/* Mappa Stati */}
        <WorldMapExplorer onCountrySelect={(country) => {
          if (activeTab === 'export' && !analysisResult) {
            setSelectedMapCountry(country);
            setExportValidationErrors(prev => ({ ...prev, mercato: false }));
          }
        }} />

        {/* Settore - Toggle chips sotto la mappa */}
        {activeTab === 'export' && !analysisResult && (
          <div className="mt-4 mb-2">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-white font-semibold text-sm">Settore *</p>
              {exportValidationErrors.settore && <p className="text-red-400 text-xs">{exportValidationErrors.settore}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SETTORI.map((s) => (
              <button
                key={s}
                onClick={() => { setExportForm({ ...exportForm, settore: exportForm.settore === s ? '' : s }); setExportValidationErrors(prev => ({ ...prev, settore: '' })); }}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border text-center ${
                    exportForm.settore === s
                      ? 'bg-lime-400 text-slate-900 border-lime-400 shadow-lg shadow-lime-400/20'
                      : 'bg-slate-800/60 text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab Switch — solo per Import/Messaggi (visibile quando non su export/history) */}
        {(activeTab === 'import' || activeTab === 'messages') && (
          <div className="flex gap-1.5 mb-6 bg-slate-800/50 p-1 rounded-xl border border-white/5">
            <button onClick={() => setActiveTab('import')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'import' ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-400 hover:text-white'}`}>
              <Ship className="w-4 h-4" />Import CN
            </button>
            <button onClick={() => setActiveTab('messages')} className={`relative px-4 flex items-center justify-center py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'messages' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}>
              <Mail className="w-4 h-4" />
              {importUnreadCount > 0 && (<span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4.5 h-4.5 flex items-center justify-center font-bold ring-2 ring-slate-900">{importUnreadCount}</span>)}
            </button>
          </div>
        )}

        {activeTab === 'messages' ? (
          <ImportMessagesSection user={user} />
        ) : activeTab === 'history' ? (
          <SearchHistory userEmail={user?.email} />
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

            {/* Limite Export — spostato in alto sopra header */}

            {!analysisResult ? (
              exportLimitReached ? (
                /* Limite raggiunto — nasconde il form, mostra solo il messaggio */
                <div className="space-y-4">
                  <Card className="bg-slate-800/60 border-white/5 backdrop-blur-sm">
                    <CardContent className="p-5 text-center">
                      <p className="text-slate-400 text-sm">
                        Le analisi si ricaricheranno la prossima settimana. Puoi comunque contattare i nostri consulenti export per assistenza personalizzata.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) :
              <div className="space-y-4">
                {/* Paese selezionato dalla mappa */}
                {selectedMapCountry && (
                  <div className="flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3">
                    <MapPin className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-cyan-400 text-[10px] font-semibold uppercase tracking-wider">Mercato selezionato</p>
                      <p className="text-white font-bold text-sm">{selectedMapCountry.name}</p>
                    </div>
                    <button onClick={() => setSelectedMapCountry(null)} className="text-slate-500 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Capacità produttiva */}
                <div>
                  <label className="text-slate-400 text-xs font-medium mb-1.5 block">Capacità produttiva per export</label>
                  <Input
                    placeholder="Es. 30% della produzione, 1000 unità/mese"
                    value={exportForm.capacita_produttiva}
                    onChange={(e) => setExportForm({ ...exportForm, capacita_produttiva: e.target.value })}
                    className="bg-slate-800/60 border-white/10 text-white h-11 rounded-xl"
                  />
                </div>

                {/* Posizionamento di prezzo */}
                <div>
                  <label className="text-slate-400 text-xs font-medium mb-1.5 block">Posizionamento di prezzo</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Entry Level', 'Mid-range', 'Premium', 'Luxury'].map(p => (
                      <button
                        key={p}
                        onClick={() => setExportForm({ ...exportForm, posizionamento: exportForm.posizionamento === p ? '' : p })}
                        className={`px-2 py-2 rounded-xl text-[11px] font-medium transition-all border text-center ${
                          exportForm.posizionamento === p
                            ? 'bg-lime-400 text-slate-900 border-lime-400 shadow-lg shadow-lime-400/20'
                            : 'bg-slate-800/60 text-slate-400 border-white/10 hover:border-white/20 hover:text-white'
                        }`}
                      >{p}</button>
                    ))}
                  </div>
                </div>

                {/* Business Model e Canale */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 text-xs font-medium mb-1.5 block">Business Model</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['B2B', 'B2C'].map(bm => (
                        <button
                          key={bm}
                          onClick={() => setExportForm({ ...exportForm, business_model: exportForm.business_model === bm ? '' : bm })}
                          className={`px-2 py-2 rounded-xl text-xs font-bold transition-all border text-center ${
                            exportForm.business_model === bm
                              ? 'bg-lime-400 text-slate-900 border-lime-400'
                              : 'bg-slate-800/60 text-slate-400 border-white/10 hover:text-white'
                          }`}
                        >{bm}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-400 text-xs font-medium mb-1.5 block">Canale preferito</label>
                    <Select
                      value={exportForm.canale_preferito}
                      onValueChange={(v) => setExportForm({ ...exportForm, canale_preferito: v })}
                    >
                      <SelectTrigger className="bg-slate-800/60 border-white/10 text-white h-10 rounded-xl text-xs">
                        <SelectValue placeholder="Seleziona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Online">Online / Marketplace</SelectItem>
                        <SelectItem value="Distributore">Distributore / Agente</SelectItem>
                        <SelectItem value="Retail">Retail fisico / GDO</SelectItem>
                        <SelectItem value="Diretto">Export diretto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Certificazioni possedute */}
                <div>
                  <label className="text-slate-400 text-xs font-medium mb-1.5 block">Certificazioni possedute</label>
                  <Input
                    placeholder="Es. CE, ISO 9001, BIO, FDA, HACCP..."
                    value={exportForm.certificazioni}
                    onChange={(e) => setExportForm({ ...exportForm, certificazioni: e.target.value })}
                    className="bg-slate-800/60 border-white/10 text-white h-11 rounded-xl placeholder:text-slate-500"
                  />
                </div>

                {/* Tasto Avvia Analisi — sempre visibile se non in analisi */}
                {!exportLimitReached && !analyzing && !confirmedExportHS && !showHSClassifier && (
                  <Button
                    onClick={() => {
                      const errors = {};
                      if (!exportForm.prodotto?.trim()) errors.prodotto = 'Inserisci il prodotto da esportare';
                      if (!exportForm.settore) errors.settore = 'Seleziona un settore';
                      if (!selectedMapCountry && (user?.export_mercati_target || []).length === 0) errors.mercato = true;
                      setExportValidationErrors(errors);
                      if (Object.keys(errors).length > 0) return;
                      setShowHSClassifier(true);
                    }}
                    className="w-full bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-900 font-bold h-12 rounded-xl shadow-lg shadow-lime-400/20 hover:shadow-lime-400/30"
                  >
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Avvia Analisi Export
                  </Button>
                )}

                {/* Avviso mercato mancante */}
                {exportValidationErrors.mercato && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    <p className="text-red-400 text-xs font-medium">Seleziona un paese dalla mappa oppure imposta i mercati target nel tuo profilo.</p>
                    <Link to={createPageUrl('MyProfile')} className="text-lime-400 text-xs hover:underline mt-1 inline-block">
                      Vai al profilo →
                    </Link>
                  </div>
                )}

                {/* Classificazione HS automatica */}
                {showHSClassifier && !analyzing && !confirmedExportHS && (
                  <HSCodeClassifier
                    productDescription={`${exportForm.prodotto} (Settore: ${exportForm.settore})`}
                    onConfirm={handleExportHSConfirm}
                    onError={() => {}}
                    autoStart={true}
                  />
                )}

                {/* Prezzo vendita e Costo produzione — visibili dopo classificazione HS */}
                {confirmedExportHS && !analyzing && !analysisResult && (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-lime-400" />
                        Prezzo e Costo (opzionale)
                      </h3>
                      <p className="text-slate-400 text-xs mb-3">Per calcolare il Margine Lordo %. L'unità di misura è libera.</p>
                      <div className="space-y-3">
                        <div>
                          <label className="text-slate-400 text-sm mb-1 block">Unità di misura</label>
                          <Input
                            placeholder="Es. pezzo, kg, litro, metro..."
                            value={userPriceData.unita}
                            onChange={(e) => setUserPriceData({ ...userPriceData, unita: e.target.value })}
                            className="bg-slate-900 border-slate-700 text-white"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-slate-400 text-sm mb-1 block">Prezzo di vendita (€)</label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Es. 25.00"
                              value={userPriceData.prezzo_vendita}
                              onChange={(e) => setUserPriceData({ ...userPriceData, prezzo_vendita: e.target.value })}
                              className="bg-slate-900 border-slate-700 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 text-sm mb-1 block">Costo produzione (€)</label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Es. 12.50"
                              value={userPriceData.costo_produzione}
                              onChange={(e) => setUserPriceData({ ...userPriceData, costo_produzione: e.target.value })}
                              className="bg-slate-900 border-slate-700 text-white"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-slate-400 text-sm mb-1 block">Logistica (€)</label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={userPriceData.costo_logistica}
                              onChange={(e) => setUserPriceData({ ...userPriceData, costo_logistica: e.target.value })}
                              className="bg-slate-900 border-slate-700 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 text-sm mb-1 block">Commissioni (€)</label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={userPriceData.commissioni}
                              onChange={(e) => setUserPriceData({ ...userPriceData, commissioni: e.target.value })}
                              className="bg-slate-900 border-slate-700 text-white"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 text-sm mb-1 block">Dazi (€)</label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={userPriceData.dazi}
                              onChange={(e) => setUserPriceData({ ...userPriceData, dazi: e.target.value })}
                              className="bg-slate-900 border-slate-700 text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {analyzing && (
                  <Card className="bg-slate-800/60 border-white/5 backdrop-blur-sm shadow-2xl">
                    <CardContent className="p-5">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-lime-400/10 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-lime-400" />
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">Analisi in corso</p>
                            <p className="text-slate-500 text-xs">Recupero e analisi dati reali</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {['fetching', 'computing', 'interpreting'].map((step, i) => {
                            const labels = {
                              fetching: 'Recupero dati ufficiali',
                              computing: 'Calcolo metriche',
                              interpreting: 'Elaborazione analisi'
                            };
                            const isActive = exportStep === step;
                            const isDone = ['fetching', 'computing', 'interpreting'].indexOf(exportStep) > i;
                            return (
                              <div key={step} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                                isActive ? 'bg-lime-400/10 text-lime-400' : isDone ? 'bg-green-500/10 text-green-400' : 'text-slate-500'
                              }`}>
                                {isActive ? <Loader2 className="w-3 h-3 animate-spin" /> : isDone ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-slate-600 block" />}
                                {labels[step]}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : analysisResult?._api_error ? (
              /* Errore API Export */
              <div className="space-y-4">
                <Card className="bg-red-500/15 border-red-500/40">
                  <CardContent className="p-6 text-center">
                    <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <h3 className="text-red-400 font-bold text-lg mb-2">Dati temporaneamente non disponibili dal database ufficiale.</h3>
                    <p className="text-slate-400 text-sm">Non è possibile completare l'analisi. Riprova tra qualche minuto.</p>
                  </CardContent>
                </Card>
                <Button
                  onClick={resetAnalysis}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-400 hover:bg-slate-800"
                >
                  Riprova
                </Button>
              </div>
            ) : (
              /* Risultati Analisi Export */
              <div className="space-y-4">
                {/* Codice HS Confermato */}
                {confirmedExportHS && (
                  <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                      <Package className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-amber-400 text-[10px] font-semibold uppercase tracking-wider">Codice HS</p>
                      <p className="text-white font-mono font-bold text-sm">{confirmedExportHS.hs_code}</p>
                      <p className="text-slate-400 text-[10px] truncate">{confirmedExportHS.descrizione_ufficiale}</p>
                    </div>
                  </div>
                )}

                {/* Anomalie Dataset Export */}
                {tradeMetrics?.anomalie_presenti && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                    <h3 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2 text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      Anomalie nel dataset
                    </h3>
                    <ul className="text-yellow-200/80 text-xs space-y-1">
                      {tradeMetrics.anomalie.map((a, i) => <li key={i}>• {a}</li>)}
                    </ul>
                  </div>
                )}

                {/* Risultati analisi strutturata */}
                <ExportAnalysisResult
                  analysisResult={analysisResult}
                  tradeMetrics={tradeMetrics}
                  macroData={macroData}
                  confirmedExportHS={confirmedExportHS}
                  tradeData={tradeData}
                />

                {/* Classifica Comparativa */}
                {tradeMetrics?.metriche?.length > 1 && analysisResult?.mercati_analisi && (
                  <ExportComparisonRanking 
                    metriche={tradeMetrics.metriche} 
                    macroData={macroData} 
                    mercatiAnalisi={analysisResult.mercati_analisi}
                  />
                )}

                {/* Country Cards con macro data */}
                {tradeMetrics?.metriche?.length > 0 && (
                  <div className="space-y-2">
                    {tradeMetrics.metriche.map(m => (
                      <CountryInfoCard
                        key={m.paese_code}
                        countryCode={m.paese_code}
                        countryName={m.paese_nome}
                        macroData={macroData?.[m.paese_code]}
                        metrics={m}
                        isCompact={tradeMetrics.metriche.length > 3}
                      />
                    ))}
                  </div>
                )}

                {/* STEP 2: Analisi Prezzo & Marginalità */}
                {priceStep && (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                          <p className="text-white font-semibold text-sm">Analisi Prezzo & Marginalità...</p>
                        </div>
                        <div className="space-y-2">
                          {['fetching', 'computing', 'interpreting'].map((step, i) => {
                            const labels = {
                              fetching: '1. Recupero prezzi unitari da UN Comtrade...',
                              computing: '2. Calcolo premium/discount e trend...',
                              interpreting: '3. Interpretazione strategica AI...'
                            };
                            const isActive = priceStep === step;
                            const isDone = ['fetching', 'computing', 'interpreting'].indexOf(priceStep) > i;
                            return (
                              <div key={step} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                                isActive ? 'bg-indigo-400/10 text-indigo-400' : isDone ? 'bg-green-500/10 text-green-400' : 'text-slate-500'
                              }`}>
                                {isActive ? <Loader2 className="w-3 h-3 animate-spin" /> : isDone ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-slate-600 block" />}
                                {labels[step]}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!priceStep && priceMetrics && (
                  <>
                    {priceMetrics.metriche?.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-white font-bold text-sm flex items-center gap-2 px-1">
                          <BarChart3 className="w-4 h-4 text-indigo-400" />
                          Riepilogo per mercato
                        </h3>
                        {priceMetrics.metriche.map(pm => {
                          const tm = tradeMetrics?.metriche?.find(t => t.paese_code === pm.paese_code);
                          return (
                            <MarketSummaryCard
                              key={pm.paese_code}
                              priceM={pm}
                              tradeM={tm}
                              macro={macroData?.[pm.paese_code]}
                              userPriceData={userPriceData}
                              dataSourceInfo={{
                                periodo: tradeData?._query_log?.periodo,
                                annoCambio: priceMetrics?.tasso_cambio?.anno || tradeMetrics?.tasso_cambio?.anno,
                                dataRecupero: tradeData?._timestamp_recupero
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                    <PriceMarginSection priceMetrics={priceMetrics} interpretation={priceInterpretation} userPriceData={userPriceData} />
                  </>
                )}

                {/* Form Contatto Export Manager */}
                <ExportContactCard
                  contactForm={contactForm}
                  setContactForm={setContactForm}
                  contactSent={contactSent}
                  setContactSent={setContactSent}
                  sendContactMutation={sendContactMutation}
                  uploadingAttachment={uploadingAttachment}
                  handleAttachmentUpload={handleAttachmentUpload}
                  removeAttachment={removeAttachment}
                  exportManagers={exportManagers}
                />

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
            {importLimitReached && !importResult && (
              <LimitReachedBanner actionType="import_analysis" usageCount={importUsage} limit={importLimit} isWeekly={true} />
            )}
            {!importLimitReached && user && !importResult && (
              <UsageCounter usageCount={importUsage} limit={importLimit} label="Analisi import disponibili questa settimana" />
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

            {importResult?._api_error ? (
              /* Errore API Import */
              <div className="space-y-4">
                <Card className="bg-red-500/15 border-red-500/40">
                  <CardContent className="p-6 text-center">
                    <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <h3 className="text-red-400 font-bold text-lg mb-2">Dati temporaneamente non disponibili dal database ufficiale.</h3>
                    <p className="text-slate-400 text-sm">Non è possibile completare l'analisi. Riprova tra qualche minuto.</p>
                  </CardContent>
                </Card>
                <Button
                  onClick={() => { setImportResult(null); setImportRawData(null); setImportLandedCost(null); setConfirmedImportHS(null); }}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-400 hover:bg-slate-800"
                >
                  Riprova
                </Button>
              </div>
            ) : !importResult ? (
              importLimitReached ? (
                /* Limite raggiunto — nasconde il form, mostra solo il messaggio */
                <div className="space-y-4">
                  <Card className="bg-slate-800/60 border-white/5 backdrop-blur-sm">
                    <CardContent className="p-5 text-center">
                      <p className="text-slate-400 text-sm mb-3">
                        Le analisi si ricaricheranno la prossima settimana. Puoi comunque contattare i nostri consulenti specializzati per assistenza.
                      </p>
                      <Button
                        onClick={() => setShowImportLimitPopup(true)}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        Contatta i nostri consulenti
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ) :
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

                {/* Classificazione HS obbligatoria prima dell'analisi import */}
                {importForm.descrizione_prodotto && importForm.quantita && importForm.tipo_richiesta && !analyzingImport && !confirmedImportHS && (
                  <HSCodeClassifier
                    productDescription={`${importForm.descrizione_prodotto}${importForm.requisiti ? ' - Requisiti: ' + importForm.requisiti : ''}`}
                    onConfirm={handleImportHSConfirm}
                    onError={() => {}}
                  />
                )}

                {analyzingImport && (
                  <Card className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-5 h-5 animate-spin text-lime-400" />
                          <p className="text-white font-semibold text-sm">Analisi import in corso...</p>
                        </div>
                        <div className="space-y-2">
                          {['fetching', 'computing', 'interpreting'].map((step, i) => {
                            const labels = {
                              fetching: '1. Recupero dati ufficiali...',
                              computing: '2. Calcolo costi...',
                              interpreting: '3. Valutazione fattibilità...'
                            };
                            const isActive = importStep === step;
                            const isDone = ['fetching', 'computing', 'interpreting'].indexOf(importStep) > i;
                            return (
                              <div key={step} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                                isActive ? 'bg-lime-400/10 text-lime-400' : isDone ? 'bg-green-500/10 text-green-400' : 'text-slate-500'
                              }`}>
                                {isActive ? <Loader2 className="w-3 h-3 animate-spin" /> : isDone ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-slate-600 block" />}
                                {labels[step]}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              /* Risultati Analisi Import - Design Elegante */
              <div className="space-y-4">
                {/* Codice HS Confermato */}
                {confirmedImportHS && (
                  <Card className="bg-amber-500/10 border-amber-500/30">
                    <CardContent className="p-3 flex items-center gap-3">
                      <span className="text-amber-400 text-lg">📦</span>
                      <div>
                        <p className="text-amber-400 text-xs font-semibold">Codice HS confermato</p>
                        <p className="text-white font-mono font-bold text-sm">{confirmedImportHS.hs_code}</p>
                        <p className="text-slate-400 text-[10px]">{confirmedImportHS.descrizione_ufficiale}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

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

                {/* Indicatori Economia Cinese (World Bank) */}
                <ImportMarketIndicators 
                  chinaMacro={importRawData?.china_macro} 
                  topImportatori={importRawData?.top_importatori_mondiali}
                />

                {/* Landed Cost Table — dati TARIC + calcolo */}
                <LandedCostTable landedCost={importLandedCost} importData={importRawData} />

                {/* Grafico Flussi Commerciali Cina→Italia con quantità */}
                <ImportTradeChart 
                  flussiComtrade={importRawData?.flussi_comtrade}
                  flussiConvertitiEur={importLandedCost?.flussi_convertiti_eur}
                  tassoCambio={importLandedCost?.tasso_cambio}
                  unita={importRawData?.flussi_comtrade?.import_italia_da_cina_unita}
                />

                {/* Classifica Top Importatori Mondiali con grafici */}
                <ImportTopImportersChart 
                  topImportatori={importRawData?.top_importatori_mondiali}
                  landedCost={importLandedCost}
                />

                {/* Anomalie Dataset Import */}
                {importLandedCost?.anomalie_presenti && (
                  <Card className="bg-yellow-500/15 border-yellow-500/40">
                    <CardContent className="p-4">
                      <h3 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Dataset presenta anomalie statistiche
                      </h3>
                      <ul className="text-yellow-200/80 text-sm space-y-1">
                        {importLandedCost.anomalie.map((a, i) => <li key={i}>• {a}</li>)}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Dati non disponibili */}
                {importRawData?.dati_non_disponibili?.length > 0 && (
                  <Card className="bg-slate-700/30 border-slate-600">
                    <CardContent className="p-3">
                      <p className="text-slate-500 text-xs mb-1.5">⚠ Dati non reperiti:</p>
                      <div className="space-y-1">
                        {importRawData.dati_non_disponibili.map((d, i) => (
                          <p key={i} className="text-slate-500 text-[10px]">• {d}</p>
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
                {(importRawData?.taric?.fonte || importRawData?.flussi_comtrade?.fonte || importRawData?.iva?.base_normativa) && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardContent className="p-3">
                      <p className="text-slate-500 text-xs mb-2">📚 Fonti dati utilizzate:</p>
                      <div className="flex flex-wrap gap-1">
                        {importRawData.taric?.fonte && (
                          <span className="bg-slate-700/50 text-slate-400 text-xs px-2 py-0.5 rounded">{importRawData.taric.fonte}</span>
                        )}
                        {importRawData.flussi_comtrade?.fonte && (
                          <span className="bg-slate-700/50 text-slate-400 text-xs px-2 py-0.5 rounded">{importRawData.flussi_comtrade.fonte}</span>
                        )}
                        {importRawData.iva?.base_normativa && (
                          <span className="bg-slate-700/50 text-slate-400 text-xs px-2 py-0.5 rounded">{importRawData.iva.base_normativa}</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={() => { setImportResult(null); setImportRawData(null); setImportLandedCost(null); setConfirmedImportHS(null); }}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-400 hover:bg-slate-800"
                >
                  Nuova Valutazione
                </Button>
              </div>
            )}

            {/* Form Contatto Agenzia Import */}
            <ImportContactCard
              importContactForm={importContactForm}
              setImportContactForm={setImportContactForm}
              importContactSent={importContactSent}
              setImportContactSent={setImportContactSent}
              sendImportContactMutation={sendImportContactMutation}
              uploadingImportAttachment={uploadingImportAttachment}
              handleImportAttachmentUpload={handleImportAttachmentUpload}
              removeImportAttachment={removeImportAttachment}
            />
          </div>
        )}
      </main>

      <BottomNav currentPage="ImportExport" unreadMessages={messages.length} />

      {/* Popup Limite Import Raggiunto */}
      <ImportLimitPopup
        open={showImportLimitPopup}
        onOpenChange={setShowImportLimitPopup}
        importLimit={importLimit}
        importContactForm={importContactForm}
        setImportContactForm={setImportContactForm}
        importContactSent={importContactSent}
        setImportContactSent={setImportContactSent}
        sendImportContactMutation={sendImportContactMutation}
        uploadingImportAttachment={uploadingImportAttachment}
        handleImportAttachmentUpload={handleImportAttachmentUpload}
        removeImportAttachment={removeImportAttachment}
      />
    </div>
  );
}