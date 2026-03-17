import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { TrendingUp, Loader2, CheckCircle, AlertTriangle, Package, MapPin, X } from 'lucide-react';
import { useAILimits } from '@/components/hooks/useAILimits';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import SectionConsultantPanel from '../consulenze/SectionConsultantPanel';
import HSCodeClassifier from './HSCodeClassifier';
import { fetchTradeData, computeMetrics, interpretData, fetchMacroData, enrichMetricsWithDemand } from './ExportDataFetcher';

import { ALL_COUNTRIES } from './CountrySearchSelect';
import CountryInfoCard from './CountryInfoCard';


import ExportAnalysisResult from './ExportAnalysisResult';
import ExportVerdictCard from './ExportVerdictCard';
import ExportContactCard from './ExportContactCard';
import { buildExportSummary } from './buildAnalysisSummary';
import WorldMapExplorer from './WorldMapExplorer';
import AnalysisErrorBoundary from './AnalysisErrorBoundary';
import ExportAnalysisProgress from './ExportAnalysisProgress';

const SETTORI = [
  'Alimentare e bevande', 'Moda e tessile', 'Arredamento e design',
  'Meccanica e automazione', 'Cosmetica e cura persona', 'Tecnologia e elettronica',
  'Automotive e componentistica', 'Farmaceutico e medicale', 'Agricoltura e agroalimentare',
  'Chimica e materiali', 'Metallurgia e lavorazioni metalli', 'Plastica e gomma',
  'Vetro, ceramiche e materiali lapidei', 'Carta, cartone e imballaggi',
  'Edilizia e materiali da costruzione', 'Energia e ambiente', 'Altro'
];

export default function ExportSection({ user, exportManagers, selectedMapCountry, setSelectedMapCountry, onMapInteraction, initialSnapshot, onClearSnapshot }) {
  const [exportForm, setExportForm] = useState(
    initialSnapshot?.exportForm || {
      settore: '', prodotto: '', capacita_produttiva: '', unita_capacita: '',
      posizionamento: '', prezzo_medio: '', certificazioni: [], business_model: '', canale_preferito: '', margine_disponibile: '', costo_industriale: '',
      peso_kg: '', lunghezza_cm: '', larghezza_cm: '', altezza_cm: '',
      shelf_life_valore: '', shelf_life_unita: '',
      esperienza_export: '', obiettivo_export: ''
    }
  );
  const [showHSClassifier, setShowHSClassifier] = useState(false);
  const [exportValidationErrors, setExportValidationErrors] = useState({});
  const [analyzing, setAnalyzing] = useState(false);
  const [exportStep, setExportStep] = useState('');
  const [analysisResult, setAnalysisResult] = useState(initialSnapshot?.analysisResult || null);
  const [tradeData, setTradeData] = useState(initialSnapshot?.tradeData || null);
  const [tradeMetrics, setTradeMetrics] = useState(initialSnapshot?.tradeMetrics || null);
  const [confirmedExportHS, setConfirmedExportHS] = useState(initialSnapshot?.confirmedHS || null);
  const [periodoAnalisi] = useState('5');
  const [macroData, setMacroData] = useState(initialSnapshot?.macroData || {});

  const [contactForm, setContactForm] = useState({ subject: '', message: '', exportManagerId: '', attachments: [] });
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const queryClient = useQueryClient();

  const { usageCount: exportUsage, limit: exportLimit, isLimitReached: exportLimitReached, trackUsage: trackExportUsage } = useAILimits(user?.email, 'export_analysis');

  const handleAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAttachment(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setContactForm(prev => ({ ...prev, attachments: [...prev.attachments, { name: file.name, url: file_url }] }));
    } catch (err) { console.error('Errore upload:', err); }
    finally { setUploadingAttachment(false); e.target.value = ''; }
  };

  const removeAttachment = (index) => {
    setContactForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));
  };

  const sendContactMutation = useMutation({
    mutationFn: async () => {
      const exportManager = exportManagers.find(e => e.id === contactForm.exportManagerId);
      if (!exportManager) throw new Error('Seleziona un Export Manager');
      const analysisSummary = (confirmedExportHS || tradeData || tradeMetrics || analysisResult)
        ? '\n\n' + buildExportSummary({ confirmedHS: confirmedExportHS, tradeData, tradeMetrics, analysisResult, exportForm, MERCATI_TARGET: ALL_COUNTRIES })
        : '';
      await base44.entities.Message.create({
        from_email: user.email, to_email: exportManager.email,
        content: `**Richiesta consulenza Export**\n\nOggetto: ${contactForm.subject}\n\n${contactForm.message}${analysisSummary}\n\n---\nInviato da: ${user.company_name || user.full_name}\nEmail: ${user.email}`,
        source: 'import_export', source_reference: 'Export',
        attachments: contactForm.attachments.map(a => ({ url: a.url, name: a.name, type: 'document' }))
      });
      await base44.integrations.Core.SendEmail({ to: exportManager.email, subject: `Nuova richiesta consulenza Export: ${contactForm.subject}`, body: `Hai ricevuto una nuova richiesta di consulenza export.\n\nDa: ${user.company_name || user.full_name}\nEmail: ${user.email}\n\nOggetto: ${contactForm.subject}\n\n${contactForm.message}\n\nAccedi all'app per rispondere.` });
      await base44.entities.Notification.create({ user_email: exportManager.email, type: 'consultation', title: 'Nuova richiesta consulenza Export', content: `${user.company_name || user.full_name} richiede consulenza export: ${contactForm.subject}` });
    },
    onSuccess: () => {
      setContactSent(true);
      setContactForm({ subject: '', message: '', exportManagerId: '', attachments: [] });
      queryClient.invalidateQueries({ queryKey: ['import-unread-count'] });
    }
  });

  const handleExportHSConfirm = (hsData) => {
    setConfirmedExportHS(hsData);
    analyzeExportPotential(hsData);
  };

  const analyzeExportPotential = async (hsData) => {
    const mercatiInteresse = selectedMapCountry ? [selectedMapCountry.iso_a2] : (user?.export_mercati_target || []);
    const exporterCountry = user?.export_paese_esportatore || 'IT';
    if (!exportForm.settore || !exportForm.prodotto || mercatiInteresse.length === 0) return;
    if (!hsData || exportLimitReached) return;

    setAnalyzing(true); setTradeData(null); setTradeMetrics(null); setAnalysisResult(null); setMacroData({});
    const mercatiNames = mercatiInteresse.map(code => { if (code === 'WLD') return 'World'; const c = ALL_COUNTRIES.find(c => c.code === code); return c ? c.name : code; });
    let interpretationSucceeded = false;

    try {
      const usageLogId = await trackExportUsage({ search_label: `${exportForm.prodotto} → ${mercatiNames.slice(0, 3).join(', ')}`, search_meta: { prodotto: exportForm.prodotto, settore: exportForm.settore, hs_code: hsData.hs_code, mercati: mercatiNames } });
      setExportStep('fetching');
      const [rawData, macro] = await Promise.all([ fetchTradeData(hsData.hs_code, mercatiInteresse, mercatiNames, exporterCountry, parseInt(periodoAnalisi)), fetchMacroData(mercatiInteresse) ]);
      setTradeData(rawData); setMacroData(macro || {});

      setExportStep('computing');
      const metricsRaw = computeMetrics(rawData);
      const metrics = enrichMetricsWithDemand(metricsRaw, macro || {});
      setTradeMetrics(metrics);

      setExportStep('interpreting');
      const interpretation = await interpretData(rawData, metrics, hsData.hs_code, hsData.descrizione_ufficiale, {
        settore: exportForm.settore, prodotto: exportForm.prodotto, descrizione: '',
        fatturato_annuo: user?.export_fatturato_annuo || '', esperienza_export: user?.export_esperienza || '',
        certificazioni: (Array.isArray(exportForm.certificazioni) ? exportForm.certificazioni.join(', ') : exportForm.certificazioni) || user?.export_certificazioni || '',
        capacita_produttiva: exportForm.capacita_produttiva, unita_capacita: exportForm.unita_capacita,
        posizionamento: exportForm.posizionamento, prezzo_medio: exportForm.prezzo_medio,
        business_model: exportForm.business_model, canale_preferito: exportForm.canale_preferito
      }, macro || {});

      if (interpretation && interpretation.mercati_analisi?.length > 0) {
        interpretationSucceeded = true;
        setAnalysisResult(interpretation);
      } else {
        setAnalysisResult({ _api_error: true, _error_message: 'Nessun risultato dai moduli di analisi' });
        return;
      }

      // Salva snapshot nel UsageLog
      if (usageLogId) {
        try {
          await base44.entities.UsageLog.update(usageLogId, {
            analysis_snapshot: {
              analysisResult: interpretation, tradeMetrics: metrics, tradeData: rawData,
              macroData: macro || {}, confirmedHS: hsData, exportForm: { ...exportForm }
            }
          });
        } catch (e2) { console.error('[Export] Errore salvataggio snapshot:', e2); }
      }
    } catch (e) {
      console.error('[Export] Errore analisi:', e);
      if (!interpretationSucceeded) {
        setAnalysisResult({ _api_error: true, _error_message: e?.message || 'Errore sconosciuto' });
      }
    }
    finally { setAnalyzing(false); setExportStep(''); }
  };

  const resetAnalysis = () => {
    setAnalysisResult(null); setConfirmedExportHS(null); setTradeData(null); setTradeMetrics(null);
    setMacroData({});
    setExportForm({ settore: '', prodotto: '', capacita_produttiva: '', unita_capacita: '', posizionamento: '', prezzo_medio: '', certificazioni: [], business_model: '', canale_preferito: '', margine_disponibile: '', costo_industriale: '', peso_kg: '', lunghezza_cm: '', larghezza_cm: '', altezza_cm: '', shelf_life_valore: '', shelf_life_unita: '', esperienza_export: '', obiettivo_export: '' });
    setSelectedMapCountry(null); setShowHSClassifier(false); setExportValidationErrors({});
    if (onClearSnapshot) onClearSnapshot();
  };

  // L'analisi è finita ma i risultati stanno ancora renderizzando
  // Timeout di sicurezza: se dopo 2 secondi tradeMetrics non c'è, mostriamo comunque
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  React.useEffect(() => {
    if (analysisResult && !analysisResult._api_error && !tradeMetrics && !analyzing) {
      const timer = setTimeout(() => setLoadingTimeout(true), 3000);
      return () => clearTimeout(timer);
    }
    setLoadingTimeout(false);
  }, [analysisResult, tradeMetrics, analyzing]);

  const isLoadingResults = !analyzing && analysisResult && !analysisResult._api_error && !tradeMetrics && !loadingTimeout;

  return (
    <>
      {/* Progress bar inline analisi in corso — non blocca la pagina */}

      {/* Ricerca rapida export */}
      {!analysisResult && !analyzing && (
        <div className="mb-5 space-y-3">
          <p className="text-black font-semibold text-sm">Cosa vuoi esportare?</p>
          <div>
            <Input placeholder="Es. Olio d'oliva, macchine tessili, vino..." value={exportForm.prodotto}
              onChange={(e) => { setExportForm({ ...exportForm, prodotto: e.target.value }); setExportValidationErrors(prev => ({ ...prev, prodotto: '' })); }}
              className={`bg-slate-800/60 text-white h-11 rounded-xl placeholder:text-white/50 ${exportValidationErrors.prodotto ? 'border-red-500 border-2' : 'border-white/10'}`} />
            {exportValidationErrors.prodotto && <p className="text-red-400 text-xs mt-1">{exportValidationErrors.prodotto}</p>}
          </div>
          <p className="font-semibold text-sm" style={{ color: 'var(--app-text-primary)' }}>Indica dove</p>
          <WorldMapExplorer onCountrySelect={(country) => {
            setSelectedMapCountry(country);
          }} />

          {selectedMapCountry && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--app-bg-card)', border: '1px solid var(--app-border-accent)' }}>
              <img
                src={`https://flagcdn.com/w80/${selectedMapCountry.iso_a2?.toLowerCase()}.png`}
                alt={selectedMapCountry.name}
                className="w-10 h-7 rounded object-cover flex-shrink-0"
                style={{ border: '1px solid var(--app-border)' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--app-accent)' }}>Mercato di riferimento</p>
                <p className="font-bold text-sm" style={{ color: 'var(--app-text-primary)' }}>{selectedMapCountry.name}</p>
              </div>
              <button onClick={() => setSelectedMapCountry(null)} style={{ color: 'var(--app-text-muted)' }}><X className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      )}

      {/* Settore chips */}
      {!analysisResult && !analyzing && (
        <div className="mt-4 mb-2">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-black font-semibold text-sm">Settore *</p>
            {exportValidationErrors.settore && <p className="text-red-400 text-xs">{exportValidationErrors.settore}</p>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {SETTORI.map((s) => (
              <button key={s} onClick={() => { setExportForm({ ...exportForm, settore: exportForm.settore === s ? '' : s }); setExportValidationErrors(prev => ({ ...prev, settore: '' })); }}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all border text-center ${exportForm.settore === s ? 'bg-gradient-to-b from-blue-500 to-blue-700 text-white border-blue-800 shadow-[0_4px_0_0_#1e40af] active:shadow-[0_1px_0_0_#1e40af] active:translate-y-[3px]' : 'bg-gradient-to-b from-white to-gray-100 text-black border-gray-300 shadow-[0_4px_0_0_#9ca3af] active:shadow-[0_1px_0_0_#9ca3af] active:translate-y-[3px] hover:from-gray-50 hover:to-gray-200'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pannello Consulenti */}
      {user && <div className="mb-6"><SectionConsultantPanel sectionId="import_export" sectionLabel="Import / Export" user={user} /></div>}

      {!analysisResult && !analyzing ? (
        exportLimitReached ? (
          <div className="space-y-4">
            <Card className="bg-slate-800/60 border-white/5 backdrop-blur-sm">
              <CardContent className="p-5 text-center">
                <p className="text-slate-400 text-sm">Le analisi si ricaricheranno il prossimo mese. Puoi comunque contattare i nostri consulenti export per assistenza personalizzata.</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-black text-xs font-medium mb-1.5 block">Capacità produttiva per export</label>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Es. 1000/mese" value={exportForm.capacita_produttiva}
                  onChange={(e) => setExportForm({ ...exportForm, capacita_produttiva: e.target.value })}
                  className="bg-slate-800/60 border-white/10 text-white h-11 rounded-xl" />
                <Select value={exportForm.unita_capacita || undefined} onValueChange={(v) => setExportForm({ ...exportForm, unita_capacita: v })}>
                  <SelectTrigger className="bg-slate-800/60 border-white/10 text-white h-11 rounded-xl text-xs"><SelectValue placeholder="Unità di misura" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pezzi/anno">Pezzi/anno</SelectItem>
                    <SelectItem value="kg/anno">kg/anno</SelectItem>
                    <SelectItem value="t/anno">t/anno</SelectItem>
                    <SelectItem value="L/anno">L/anno</SelectItem>
                    <SelectItem value="m³/anno">m³/anno</SelectItem>
                    <SelectItem value="m²/anno">m²/anno</SelectItem>
                    <SelectItem value="kWh/anno">kWh/anno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-black text-xs font-medium mb-1.5 block">Posizionamento di prezzo</label>
              <div className="grid grid-cols-4 gap-2">
                {['Entry Level', 'Mid-range', 'Premium', 'Luxury'].map(p => (
                  <button key={p} onClick={() => setExportForm({ ...exportForm, posizionamento: exportForm.posizionamento === p ? '' : p })}
                    className={`px-2 py-2 rounded-xl text-[11px] font-medium transition-all border text-center ${exportForm.posizionamento === p ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20' : 'bg-white text-black border-black/15 hover:border-black/30'}`}>{p}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-black text-xs font-medium mb-1.5 block">Prezzo medio dei prodotti (€)</label>
              <Input type="number" step="0.01" min="0" placeholder="Es. 15.00" value={exportForm.prezzo_medio}
                onChange={(e) => setExportForm({ ...exportForm, prezzo_medio: e.target.value })}
                className="bg-slate-800/60 border-white/10 text-white h-11 rounded-xl placeholder:text-white/50" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-black text-xs font-medium mb-1.5 block">Business Model</label>
                <div className="grid grid-cols-2 gap-2">
                  {['B2B', 'B2C'].map(bm => (
                    <button key={bm} onClick={() => setExportForm({ ...exportForm, business_model: exportForm.business_model === bm ? '' : bm })}
                      className={`px-2 py-2 rounded-xl text-xs font-bold transition-all border text-center ${exportForm.business_model === bm ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-black border-black/15 hover:border-black/30'}`}>{bm}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-black text-xs font-medium mb-1.5 block">Canale preferito</label>
                <Select value={exportForm.canale_preferito} onValueChange={(v) => setExportForm({ ...exportForm, canale_preferito: v })}>
                  <SelectTrigger className="bg-slate-800/60 border-white/10 text-white h-10 rounded-xl text-xs"><SelectValue placeholder="Seleziona" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Online">Online / Marketplace</SelectItem>
                    <SelectItem value="Distributore">Distributore / Agente</SelectItem>
                    <SelectItem value="Retail">Retail fisico / GDO</SelectItem>
                    <SelectItem value="Diretto">Export diretto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-black text-xs font-medium mb-1.5 block">Costo industriale per unità – COGS (€)</label>
              <p className="text-slate-400 text-[10px] mb-2 leading-relaxed">
                È il costo reale per produrre una singola unità del tuo prodotto. Include: materie prime, manodopera, lavorazione e confezionamento. Esempio: se produci una sedia e spendi 50 € tra materiali, lavoro e packaging → il tuo COGS è 50 €. È il punto di partenza per calcolare il margine reale sull'export.
              </p>
              <Input type="number" step="0.01" min="0" placeholder="Costo per unità (es. 5.00 €)" value={exportForm.costo_industriale}
                onChange={(e) => setExportForm({ ...exportForm, costo_industriale: e.target.value })}
                className="bg-slate-800/60 border-white/10 text-white h-11 rounded-xl placeholder:text-white/50" />
            </div>

            <div>
              <label className="text-black text-xs font-medium mb-1.5 block">Margine disponibile (%)</label>
              <p className="text-slate-400 text-[10px] mb-2 leading-relaxed">
                È la differenza tra il tuo prezzo di vendita e il costo di produzione, espressa in percentuale sul prezzo. Formula: (Prezzo − Costo) / Prezzo × 100. Serve a capire quanto spazio hai per assorbire i costi di esportazione (logistica, dazi, intermediari) senza andare in perdita.
              </p>
              <div className="flex gap-2 mb-2">
                {[
                  { label: 'Basso', sublabel: '10–20%', value: '15' },
                  { label: 'Medio', sublabel: '20–40%', value: '30' },
                  { label: 'Alto', sublabel: '40%+', value: '50' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setExportForm({ ...exportForm, margine_disponibile: opt.value })}
                    className={`flex-1 px-2 py-2 rounded-xl text-center transition-all border ${exportForm.margine_disponibile === opt.value ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20' : 'bg-white text-black border-black/15 hover:border-black/30'}`}>
                    <span className="text-xs font-bold block">{opt.label}</span>
                    <span className="text-[10px] opacity-70">{opt.sublabel}</span>
                  </button>
                ))}
              </div>
              <Input type="number" step="1" min="0" max="100" placeholder="Es. 30%" value={exportForm.margine_disponibile}
                onChange={(e) => setExportForm({ ...exportForm, margine_disponibile: e.target.value })}
                className="bg-slate-800/60 border-white/10 text-white h-11 rounded-xl placeholder:text-white/50" />
            </div>

            <div>
              <label className="text-black text-xs font-medium mb-1.5 block">Peso e dimensioni prodotto</label>
              <p className="text-slate-400 text-[10px] mb-2 leading-relaxed">
                Servono per stimare i costi di trasporto e logistica. Il volume viene calcolato automaticamente dalle dimensioni. Più il prodotto è pesante o voluminoso, più incidono i costi di spedizione — utile per capire se mercati lontani sono sostenibili.
              </p>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <Input type="number" step="0.01" min="0" placeholder="Peso (kg)" value={exportForm.peso_kg}
                    onChange={(e) => setExportForm({ ...exportForm, peso_kg: e.target.value })}
                    className="bg-slate-800/60 border-white/10 text-white h-11 rounded-xl placeholder:text-white/50" />
                </div>
                <div>
                  <Input type="number" step="0.1" min="0" placeholder="Lunghezza (cm)" value={exportForm.lunghezza_cm}
                    onChange={(e) => setExportForm({ ...exportForm, lunghezza_cm: e.target.value })}
                    className="bg-slate-800/60 border-white/10 text-white h-11 rounded-xl placeholder:text-white/50" />
                </div>
                <div>
                  <Input type="number" step="0.1" min="0" placeholder="Larghezza (cm)" value={exportForm.larghezza_cm}
                    onChange={(e) => setExportForm({ ...exportForm, larghezza_cm: e.target.value })}
                    className="bg-slate-800/60 border-white/10 text-white h-11 rounded-xl placeholder:text-white/50" />
                </div>
                <div>
                  <Input type="number" step="0.1" min="0" placeholder="Altezza (cm)" value={exportForm.altezza_cm}
                    onChange={(e) => setExportForm({ ...exportForm, altezza_cm: e.target.value })}
                    className="bg-slate-800/60 border-white/10 text-white h-11 rounded-xl placeholder:text-white/50" />
                </div>
              </div>
              {exportForm.lunghezza_cm && exportForm.larghezza_cm && exportForm.altezza_cm && (
                <div className="bg-slate-800/40 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="text-slate-400 text-[10px]">Volume calcolato:</span>
                  <span className="text-white font-bold text-xs">
                    {(parseFloat(exportForm.lunghezza_cm) * parseFloat(exportForm.larghezza_cm) * parseFloat(exportForm.altezza_cm)).toLocaleString('it-IT')} cm³
                  </span>
                  <span className="text-slate-500 text-[10px]">
                    ({((parseFloat(exportForm.lunghezza_cm) * parseFloat(exportForm.larghezza_cm) * parseFloat(exportForm.altezza_cm)) / 1000000).toFixed(4)} m³)
                  </span>
                </div>
              )}
            </div>

            {(exportForm.settore === 'Alimentare e bevande' || exportForm.settore === 'Agricoltura e agroalimentare') && (
              <div>
                <label className="text-black text-xs font-medium mb-1.5 block">Shelf Life (durata del prodotto)</label>
                <p className="text-slate-400 text-[10px] mb-2 leading-relaxed">
                  È il tempo massimo entro cui il prodotto resta vendibile dalla data di produzione. Serve a determinare quali mercati puoi raggiungere: una shelf life breve limita l'export a paesi vicini o richiede trasporto aereo (più costoso).
                </p>
                <div className="grid grid-cols-5 gap-2">
                  <div className="col-span-2">
                    <Input type="number" min="1" placeholder="Es. 12" value={exportForm.shelf_life_valore}
                      onChange={(e) => setExportForm({ ...exportForm, shelf_life_valore: e.target.value })}
                      className="h-11 rounded-xl text-center font-bold" style={{ background: 'var(--app-bg-input)', border: '1px solid var(--app-border)', color: 'var(--app-text-primary)' }} />
                  </div>
                  {['giorni', 'mesi', 'anni'].map(u => (
                    <button key={u} onClick={() => setExportForm({ ...exportForm, shelf_life_unita: u })}
                      className={`h-11 rounded-xl text-xs font-bold transition-all border text-center capitalize ${exportForm.shelf_life_unita === u ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20' : 'bg-white text-black border-black/15 hover:border-black/30'}`}>
                      {u}
                    </button>
                  ))}
                </div>
                {exportForm.shelf_life_valore && exportForm.shelf_life_unita && (() => {
                  const giorni = exportForm.shelf_life_unita === 'giorni' ? Number(exportForm.shelf_life_valore) : exportForm.shelf_life_unita === 'mesi' ? Number(exportForm.shelf_life_valore) * 30 : Number(exportForm.shelf_life_valore) * 365;
                  if (giorni < 30) return (
                    <div className="mt-2 bg-red-500/15 border border-red-500/30 rounded-xl px-3 py-2">
                      <p className="text-red-400 text-[10px] font-semibold">⚠️ Shelf life molto breve (&lt;30 giorni): l'export è limitato a mercati vicini o richiede trasporto aereo con costi elevati.</p>
                    </div>
                  );
                  if (giorni < 90) return (
                    <div className="mt-2 bg-yellow-500/15 border border-yellow-500/30 rounded-xl px-3 py-2">
                      <p className="text-yellow-400 text-[10px] font-semibold">⚡ Shelf life breve (&lt;90 giorni): valuta attentamente i tempi di trasporto e sdoganamento.</p>
                    </div>
                  );
                  return null;
                })()}
              </div>
            )}

            <div>
              <label className="text-black text-xs font-medium mb-1.5 block">Esperienza Export</label>
              <p className="text-slate-400 text-[10px] mb-2 leading-relaxed">
                Il livello di esperienza della tua azienda nell'export. Serve ad adattare la strategia: se non hai mai esportato ti verranno suggeriti mercati più accessibili, se hai esperienza Extra UE potrai valutare mercati più complessi.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Nessuna', value: 'nessuna' },
                  { label: 'Europa (UE)', value: 'europa' },
                  { label: 'Extra UE', value: 'extra_ue' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setExportForm({ ...exportForm, esperienza_export: exportForm.esperienza_export === opt.value ? '' : opt.value })}
                    className={`px-2 py-2.5 rounded-xl text-xs font-medium transition-all border text-center ${exportForm.esperienza_export === opt.value ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20' : 'bg-white text-black border-black/15 hover:border-black/30'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-black text-xs font-medium mb-1.5 block">Obiettivo Export</label>
              <p className="text-slate-400 text-[10px] mb-2 leading-relaxed">
                Perché vuoi esportare? L'obiettivo influenza la strategia consigliata: un test di mercato richiede un approccio diverso rispetto a una distribuzione stabile o allo smaltimento di stock in eccesso.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Test mercato', value: 'test_mercato' },
                  { label: 'Crescita', value: 'crescita' },
                  { label: 'Distribuzione stabile', value: 'distribuzione_stabile' },
                  { label: 'Smaltire stock', value: 'smaltire_stock' },
                ].map(opt => (
                  <button key={opt.value} onClick={() => setExportForm({ ...exportForm, obiettivo_export: exportForm.obiettivo_export === opt.value ? '' : opt.value })}
                    className={`px-2 py-2.5 rounded-xl text-xs font-medium transition-all border text-center ${exportForm.obiettivo_export === opt.value ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20' : 'bg-white text-black border-black/15 hover:border-black/30'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-black text-xs font-medium mb-1.5 block">Certificazioni possedute</label>
              <p className="text-slate-400 text-[10px] mb-2 leading-relaxed">
                Seleziona le certificazioni che la tua azienda possiede. Influenzano i mercati raggiungibili e i requisiti normativi.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'CE', label: 'CE', desc: 'Conformità Europea' },
                  { value: 'ISO 9001', label: 'ISO 9001', desc: 'Qualità aziendale' },
                  { value: 'BIO', label: 'BIO', desc: 'Biologico' },
                  { value: 'FDA', label: 'FDA', desc: 'USA alim./farmaceutico' },
                  { value: 'HACCP', label: 'HACCP', desc: 'Sicurezza alimentare' },
                  { value: 'ISO 14001', label: 'ISO 14001', desc: 'Ambiente' },
                  { value: 'ISO 22000', label: 'ISO 22000', desc: 'Sicurezza alimentare' },
                  { value: 'REACH', label: 'REACH', desc: 'Sostanze chimiche UE' },
                ].map(cert => {
                  const certs = Array.isArray(exportForm.certificazioni) ? exportForm.certificazioni : [];
                  const isSelected = certs.includes(cert.value);
                  return (
                    <button key={cert.value} onClick={() => {
                      const updated = isSelected ? certs.filter(c => c !== cert.value) : [...certs, cert.value];
                      setExportForm({ ...exportForm, certificazioni: updated });
                    }}
                      className={`px-3 py-2 rounded-xl text-left transition-all border ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20' : 'bg-white text-black border-black/15 hover:border-black/30'}`}>
                      <span className="text-xs font-bold block">{cert.label}</span>
                      <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>{cert.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {!exportLimitReached && !analyzing && !confirmedExportHS && !showHSClassifier && (
              <Button onClick={() => {
                const errors = {};
                if (!exportForm.prodotto?.trim()) errors.prodotto = 'Inserisci il prodotto da esportare';
                if (!exportForm.settore) errors.settore = 'Seleziona un settore';
                if (!selectedMapCountry && (user?.export_mercati_target || []).length === 0) errors.mercato = true;
                setExportValidationErrors(errors);
                if (Object.keys(errors).length > 0) return;
                setShowHSClassifier(true);
              }} className="w-full bg-gradient-to-b from-[#8b6914] to-[#4a3609] hover:from-[#9a7518] hover:to-[#5a4410] text-white font-bold h-12 rounded-xl shadow-[0_5px_0_0_#2e2205] active:shadow-[0_1px_0_0_#2e2205] active:translate-y-[4px] transition-all">
                <TrendingUp className="w-5 h-5 mr-2" /> Avvia Analisi Export
              </Button>
            )}

            {exportValidationErrors.mercato && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-red-400 text-xs font-medium">Seleziona un paese dalla mappa oppure imposta i mercati target nel tuo profilo.</p>
                <Link to={createPageUrl('MyProfile')} className="text-lime-400 text-xs hover:underline mt-1 inline-block">Vai al profilo →</Link>
              </div>
            )}

            {showHSClassifier && !analyzing && !confirmedExportHS && (
              <HSCodeClassifier productDescription={`${exportForm.prodotto} (Settore: ${exportForm.settore})`} onConfirm={handleExportHSConfirm} onError={() => {}} autoStart={true} />
            )}



          </div>
        )
      ) : (analyzing || analysisResult) && !analysisResult?._api_error ? (
        <div className="space-y-4" ref={el => { if (el && !analyzing) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
          {/* Progress inline durante l'analisi */}
          {analyzing && (
            <div className="bg-slate-800/60 border border-lime-400/20 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="w-6 h-6 animate-spin text-lime-400" />
                <div>
                  <p className="text-white font-bold text-sm">Analisi in corso...</p>
                  <p className="text-slate-400 text-[10px]">Recupero e analisi dati reali</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {['fetching', 'computing', 'interpreting'].map((step, i) => {
                  const labels = { fetching: 'Recupero dati ufficiali', computing: 'Calcolo metriche', interpreting: 'Elaborazione analisi' };
                  const isActive = exportStep === step;
                  const isDone = ['fetching', 'computing', 'interpreting'].indexOf(exportStep) > i;
                  return (
                    <div key={step} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${isActive ? 'bg-lime-400/10 text-lime-400' : isDone ? 'bg-green-500/10 text-green-400' : 'text-slate-500'}`}>
                      {isActive ? <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" /> : isDone ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border border-slate-600 block flex-shrink-0" />}
                      {labels[step]}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {confirmedExportHS && (
            <div className="flex items-center gap-3 bg-[#5a4410] border border-[#8b6914]/40 rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-lg bg-[#8b6914]/30 flex items-center justify-center"><Package className="w-4 h-4 text-amber-300" /></div>
              <div className="flex-1 min-w-0">
                <p className="text-amber-300 text-[10px] font-semibold uppercase tracking-wider">Codice HS</p>
                <p className="text-white font-mono font-bold text-sm">{confirmedExportHS.hs_code}</p>
                <p className="text-white/70 text-[10px] truncate">{confirmedExportHS.descrizione_ufficiale}</p>
              </div>
            </div>
          )}

          {tradeMetrics?.anomalie_presenti && Array.isArray(tradeMetrics.anomalie) && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <h3 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2 text-xs"><AlertTriangle className="w-4 h-4" /> Anomalie nel dataset</h3>
              <ul className="text-yellow-200/80 text-xs space-y-1">{tradeMetrics.anomalie.map((a, i) => <li key={i}>• {a}</li>)}</ul>
            </div>
          )}

          {Array.isArray(tradeMetrics?.metriche) && tradeMetrics.metriche.length > 0 && (
            <AnalysisErrorBoundary>
              <div className="space-y-3">{tradeMetrics.metriche.map(m => (
                m?.paese_code ? <CountryInfoCard key={m.paese_code} countryCode={m.paese_code} countryName={m.paese_nome} macroData={macroData?.[m.paese_code]} metrics={m} isCompact={false} /> : null
              ))}</div>
            </AnalysisErrorBoundary>
          )}

          {analysisResult && !analyzing && (
            <AnalysisErrorBoundary>
              <ExportVerdictCard analysisResult={analysisResult} tradeData={tradeData} exportForm={exportForm} macroData={macroData} />
              <ExportAnalysisResult analysisResult={analysisResult} tradeMetrics={tradeMetrics} macroData={macroData} confirmedExportHS={confirmedExportHS} tradeData={tradeData} exportForm={exportForm} />
              <ExportContactCard contactForm={contactForm} setContactForm={setContactForm} contactSent={contactSent} setContactSent={setContactSent} sendContactMutation={sendContactMutation} uploadingAttachment={uploadingAttachment} handleAttachmentUpload={handleAttachmentUpload} removeAttachment={removeAttachment} exportManagers={exportManagers} />
            </AnalysisErrorBoundary>
          )}
          <Button onClick={resetAnalysis} variant="outline" className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-600">Nuova Analisi</Button>
        </div>
      ) : analysisResult?._api_error ? (
        <div className="space-y-4">
          <Card className="bg-amber-500/10 border-amber-500/30"><CardContent className="p-6 text-center"><AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-3" /><h3 className="text-amber-400 font-bold text-base mb-2">Si è verificato un problema durante l'analisi</h3><p className="text-slate-400 text-sm">L'analisi non è riuscita a completarsi. Puoi riprovare oppure contattare un consulente export per assistenza.</p></CardContent></Card>
          <Button onClick={resetAnalysis} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-xl">Riprova Analisi</Button>
        </div>
      ) : (
        null
      )}
    </>
  );
}