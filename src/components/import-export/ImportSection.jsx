import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Ship, FileText, Loader2, CheckCircle, AlertTriangle, Target, Package, ArrowRight, Search, Paperclip, Camera, Send, X } from 'lucide-react';
import { useAILimits } from '@/components/hooks/useAILimits';
import LimitReachedBanner from '@/components/common/LimitReachedBanner';
import UsageCounter from '@/components/common/UsageCounter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import HSCodeClassifier from './HSCodeClassifier';
import { fetchImportData, computeLandedCost, interpretImportData } from './ImportDataFetcher';
import LandedCostTable from './LandedCostTable';
import ImportMarketIndicators from './ImportMarketIndicators';
import ImportTopImportersChart from './ImportTopImportersChart';
import ImportTradeChart from './ImportTradeChart';
import ImportLimitPopup from './ImportLimitPopup';
import { buildImportSummary } from './buildAnalysisSummary';

export default function ImportSection({ user, exportManagers }) {
  const [importForm, setImportForm] = useState({
    tipo_richiesta: '', descrizione_prodotto: '', quantita: '', frequenza: '',
    tempo_attesa: '', budget: '', esperienza_import: '', requisiti: ''
  });
  const [analyzingImport, setAnalyzingImport] = useState(false);
  const [importStep, setImportStep] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importRawData, setImportRawData] = useState(null);
  const [importLandedCost, setImportLandedCost] = useState(null);
  const [confirmedImportHS, setConfirmedImportHS] = useState(null);
  const [importContactForm, setImportContactForm] = useState({ subject: '', message: '', attachments: [] });
  const [uploadingImportAttachment, setUploadingImportAttachment] = useState(false);
  const [importContactSent, setImportContactSent] = useState(false);
  const [showImportLimitPopup, setShowImportLimitPopup] = useState(false);
  const queryClient = useQueryClient();

  const { usageCount: importUsage, limit: importLimit, isLimitReached: importLimitReached, trackUsage: trackImportUsage } = useAILimits(user?.email, 'import_analysis');

  const handleImportAttachmentUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingImportAttachment(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImportContactForm(prev => ({ ...prev, attachments: [...prev.attachments, { name: file.name, url: file_url }] }));
    } catch (err) { console.error('Errore upload:', err); }
    finally { setUploadingImportAttachment(false); e.target.value = ''; }
  };

  const removeImportAttachment = (index) => {
    setImportContactForm(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));
  };

  const sendImportContactMutation = useMutation({
    mutationFn: async () => {
      const importConsultant = exportManagers[0];
      const targetEmail = importConsultant?.email || 'import@consorzio.it';
      const analysisSummary = (confirmedImportHS || importRawData || importLandedCost || importResult)
        ? '\n\n' + buildImportSummary({ confirmedHS: confirmedImportHS, importRawData, importLandedCost, importResult, importForm })
        : '';
      await base44.entities.Message.create({
        from_email: user.email, to_email: targetEmail,
        content: `**Richiesta Import dalla Cina**\n\nOggetto: ${importContactForm.subject}\n\n${importContactForm.message}${analysisSummary}\n\n---\nInviato da: ${user.company_name || user.full_name}\nEmail: ${user.email}`,
        source: 'import_export', source_reference: 'Import dalla Cina',
        attachments: importContactForm.attachments.map(a => ({ url: a.url, name: a.name, type: 'document' }))
      });
      await base44.entities.Notification.create({ user_email: targetEmail, type: 'consultation', title: 'Nuova richiesta Import Cina', content: `${user.company_name || user.full_name} richiede consulenza import: ${importContactForm.subject}` });
      await base44.integrations.Core.SendEmail({ to: targetEmail, subject: `Nuova richiesta Import Cina: ${importContactForm.subject}`, body: `Hai ricevuto una nuova richiesta di consulenza per import dalla Cina.\n\nDa: ${user.company_name || user.full_name}\nEmail: ${user.email}\n\nOggetto: ${importContactForm.subject}\n\nProdotto: ${importForm.descrizione_prodotto}\nQuantità: ${importForm.quantita}\n\n${importContactForm.message}\n\nAccedi all'app per rispondere.` });
    },
    onSuccess: () => {
      setImportContactSent(true);
      setImportContactForm({ subject: '', message: '', attachments: [] });
      queryClient.invalidateQueries({ queryKey: ['import-unread-count'] });
    }
  });

  const handleImportHSConfirm = (hsData) => {
    setConfirmedImportHS(hsData);
    analyzeImportFeasibility(hsData);
  };

  const analyzeImportFeasibility = async (hsData) => {
    if (!importForm.descrizione_prodotto || !importForm.quantita || !importForm.tipo_richiesta) return;
    if (!hsData || importLimitReached) return;
    setAnalyzingImport(true); setImportRawData(null); setImportLandedCost(null); setImportResult(null);

    try {
      await trackImportUsage({ search_label: `Import: ${importForm.descrizione_prodotto.substring(0, 60)}`, search_meta: { prodotto: importForm.descrizione_prodotto, hs_code: hsData.hs_code, tipo_richiesta: importForm.tipo_richiesta } });
      setImportStep('fetching');
      const rawData = await fetchImportData(hsData.hs_code, hsData.descrizione_ufficiale);
      if (rawData?._api_error) { setImportRawData(rawData); setImportResult({ _api_error: true }); return; }
      setImportRawData(rawData);

      setImportStep('computing');
      const landed = computeLandedCost(rawData, importForm.quantita, importForm.budget);
      if (landed?._api_error) { setImportLandedCost(landed); setImportResult({ _api_error: true }); return; }
      setImportLandedCost(landed);

      setImportStep('interpreting');
      const interpretation = await interpretImportData(rawData, landed, hsData.hs_code, hsData.descrizione_ufficiale, importForm);
      if (interpretation?._api_error) { setImportResult({ _api_error: true }); return; }
      setImportResult(interpretation);
    } catch (e) { console.error('[Import] Errore analisi:', e); setImportResult({ _api_error: true }); }
    finally { setAnalyzingImport(false); setImportStep(''); }
  };

  const resetImport = () => { setImportResult(null); setImportRawData(null); setImportLandedCost(null); setConfirmedImportHS(null); };

  return (
    <div className="space-y-4">
      {importLimitReached && !importResult && <LimitReachedBanner actionType="import_analysis" usageCount={importUsage} limit={importLimit} isWeekly={true} />}

      <Card className="bg-gradient-to-br from-red-500 to-red-700 border-0">
        <CardContent className="p-4"><div className="flex items-center gap-3"><span className="text-4xl">🇨🇳</span><div><h3 className="text-white font-bold">Import dalla Cina</h3><p className="text-white/80 text-sm">Produci su misura o trova prodotti esistenti</p></div></div></CardContent>
      </Card>

      <div className="flex justify-center">
        <img
          src="https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/b6039f2e3_generated_image.png"
          alt="Mappa 3D della Cina"
          className="w-52 h-auto object-contain"
        />
      </div>

      {importResult?._api_error ? (
        <div className="space-y-4">
          <Card className="bg-red-500/15 border-red-500/40"><CardContent className="p-6 text-center"><AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" /><h3 className="text-red-400 font-bold text-lg mb-2">Dati temporaneamente non disponibili dal database ufficiale.</h3><p className="text-slate-400 text-sm">Non è possibile completare l'analisi. Riprova tra qualche minuto.</p></CardContent></Card>
          <Button onClick={resetImport} variant="outline" className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-600">Riprova</Button>
        </div>
      ) : !importResult ? (
        importLimitReached ? (
          <div className="space-y-4">
            <Card className="bg-slate-800/60 border-white/5 backdrop-blur-sm"><CardContent className="p-5 text-center">
              <p className="text-slate-400 text-sm mb-3">Le analisi si ricaricheranno la prossima settimana. Puoi comunque contattare i nostri consulenti specializzati per assistenza.</p>
              <Button onClick={() => setShowImportLimitPopup(true)} className="bg-blue-600 hover:bg-blue-700 text-white">Contatta i nostri consulenti</Button>
            </CardContent></Card>
          </div>
        ) : (
          <div className="space-y-4">
            <Card className="bg-slate-800 border-slate-700"><CardContent className="p-4">
              <h3 className="text-white font-semibold mb-3">Cosa vuoi fare?</h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setImportForm({ ...importForm, tipo_richiesta: 'produzione_custom' })} className={`p-4 rounded-lg text-center transition-all ${importForm.tipo_richiesta === 'produzione_custom' ? 'bg-blue-600 text-white' : 'bg-white text-black border border-black/15 hover:border-black/30'}`}>
                  <Package className="w-8 h-8 mx-auto mb-2" /><p className="text-sm font-medium">Produzione su misura</p><p className="text-xs opacity-70 mt-1">Da disegni/specifiche</p>
                </button>
                <button onClick={() => setImportForm({ ...importForm, tipo_richiesta: 'prodotto_esistente' })} className={`p-4 rounded-lg text-center transition-all ${importForm.tipo_richiesta === 'prodotto_esistente' ? 'bg-blue-600 text-white' : 'bg-white text-black border border-black/15 hover:border-black/30'}`}>
                  <Search className="w-8 h-8 mx-auto mb-2" /><p className="text-sm font-medium">Prodotto esistente</p><p className="text-xs opacity-70 mt-1">Già disponibile</p>
                </button>
              </div>
            </CardContent></Card>

            <div className="rounded-xl overflow-hidden border border-slate-700">
              <div className="relative w-full" style={{ paddingBottom: '177.78%' }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/CO5CydPnHYs?start=45"
                  title="Import dalla Cina"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>

            <Card className="bg-gradient-to-br from-slate-800 to-red-900/30 border-red-500/20"><CardContent className="p-4">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-red-400" /> Richiedi il tuo Import dalla Cina</h3>
              <p className="text-slate-400 text-xs mb-4">La nostra agenzia ti segue in ogni fase fino alla consegna in Italia.</p>
              <div className="space-y-4">
                <div><label className="text-white text-sm mb-1 block">Descrizione prodotto *</label><Textarea placeholder="Descrivi il prodotto che vuoi importare/produrre..." value={importForm.descrizione_prodotto} onChange={(e) => setImportForm({ ...importForm, descrizione_prodotto: e.target.value })} className="bg-slate-900 border-slate-700 text-white min-h-[80px] placeholder:text-white/50" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-white text-sm mb-1 block">Quantità richiesta *</label><Select value={importForm.quantita} onValueChange={(v) => setImportForm({ ...importForm, quantita: v })}><SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue placeholder="Pezzi" /></SelectTrigger><SelectContent><SelectItem value="100-500">100 - 500 pz</SelectItem><SelectItem value="500-1000">500 - 1.000 pz</SelectItem><SelectItem value="1000-5000">1.000 - 5.000 pz</SelectItem><SelectItem value="5000-10000">5.000 - 10.000 pz</SelectItem><SelectItem value="10000-50000">10.000 - 50.000 pz</SelectItem><SelectItem value="50000+">Oltre 50.000 pz</SelectItem></SelectContent></Select></div>
                  <div><label className="text-white text-sm mb-1 block">Frequenza ordini</label><Select value={importForm.frequenza} onValueChange={(v) => setImportForm({ ...importForm, frequenza: v })}><SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue placeholder="Seleziona" /></SelectTrigger><SelectContent><SelectItem value="una_tantum">Una tantum</SelectItem><SelectItem value="trimestrale">Trimestrale</SelectItem><SelectItem value="semestrale">Semestrale</SelectItem><SelectItem value="annuale">Annuale</SelectItem><SelectItem value="continuativo">Continuativo</SelectItem></SelectContent></Select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-white text-sm mb-1 block">Tempo massimo attesa</label><Select value={importForm.tempo_attesa} onValueChange={(v) => setImportForm({ ...importForm, tempo_attesa: v })}><SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue placeholder="Seleziona" /></SelectTrigger><SelectContent><SelectItem value="2-4_settimane">2-4 settimane</SelectItem><SelectItem value="1-2_mesi">1-2 mesi</SelectItem><SelectItem value="2-3_mesi">2-3 mesi</SelectItem><SelectItem value="3-6_mesi">3-6 mesi</SelectItem><SelectItem value="flessibile">Flessibile</SelectItem></SelectContent></Select></div>
                  <div><label className="text-white text-sm mb-1 block">Budget indicativo</label><Select value={importForm.budget} onValueChange={(v) => setImportForm({ ...importForm, budget: v })}><SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue placeholder="Seleziona" /></SelectTrigger><SelectContent><SelectItem value="< 5000">{"< 5.000€"}</SelectItem><SelectItem value="5000-15000">5.000 - 15.000€</SelectItem><SelectItem value="15000-50000">15.000 - 50.000€</SelectItem><SelectItem value="50000-100000">50.000 - 100.000€</SelectItem><SelectItem value="> 100000">{"> 100.000€"}</SelectItem></SelectContent></Select></div>
                </div>
                <div><label className="text-white text-sm mb-1 block">Hai già esperienza di import?</label><Select value={importForm.esperienza_import} onValueChange={(v) => setImportForm({ ...importForm, esperienza_import: v })}><SelectTrigger className="bg-slate-900 border-slate-700 text-white"><SelectValue placeholder="Seleziona" /></SelectTrigger><SelectContent><SelectItem value="nessuna">Nessuna esperienza</SelectItem><SelectItem value="poca">Poca (1-2 ordini)</SelectItem><SelectItem value="media">Media (3-10 ordini)</SelectItem><SelectItem value="consolidata">Consolidata (10+ ordini)</SelectItem></SelectContent></Select></div>
                <div><label className="text-white text-sm mb-1 block">Requisiti specifici</label><Textarea placeholder="Certificazioni richieste, materiali particolari, standard di qualità..." value={importForm.requisiti} onChange={(e) => setImportForm({ ...importForm, requisiti: e.target.value })} className="bg-slate-900 border-slate-700 text-white min-h-[60px] placeholder:text-white/50" /></div>

                {/* Sezione contatto integrata */}
                <div className="border-t border-white/10 pt-4 mt-2">
                  <p className="text-slate-300 text-sm font-medium mb-3">Messaggio per il consulente (opzionale)</p>
                  {importContactSent ? (
                    <div className="bg-green-500/15 border border-green-500/30 rounded-xl p-4 text-center">
                      <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                      <p className="text-green-400 font-bold">Richiesta inviata!</p>
                      <p className="text-slate-400 text-xs mt-1">Verrete ricontattati entro 48 ore.</p>
                      <Button onClick={() => setImportContactSent(false)} variant="ghost" className="mt-2 text-green-400 text-xs hover:text-green-300">Invia altra richiesta</Button>
                    </div>
                  ) : (<div className="space-y-3">
                  <Input
                    placeholder="Oggetto (es. Richiesta preventivo import gadget)"
                    value={importContactForm.subject}
                    onChange={(e) => setImportContactForm({ ...importContactForm, subject: e.target.value })}
                    className="bg-slate-900 border-slate-700 text-white placeholder:text-white/50 mb-3"
                  />
                  <Textarea
                    placeholder="Note aggiuntive, dettagli specifici..."
                    value={importContactForm.message}
                    onChange={(e) => setImportContactForm({ ...importContactForm, message: e.target.value })}
                    className="bg-slate-900 border-slate-700 text-white placeholder:text-white/50 min-h-[70px]"
                  />
                  <div className="flex gap-2 mt-3">
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white py-2 px-3 rounded-lg transition-colors text-sm">
                        <Paperclip className="w-4 h-4" /> Allega documento
                      </div>
                      <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx" onChange={handleImportAttachmentUpload} className="hidden" disabled={uploadingImportAttachment} />
                    </label>
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white py-2 px-3 rounded-lg transition-colors text-sm h-full">
                        <Camera className="w-4 h-4" /> Scatta foto
                      </div>
                      <input type="file" accept="image/*" capture="environment" onChange={handleImportAttachmentUpload} className="hidden" disabled={uploadingImportAttachment} />
                    </label>
                  </div>
                  {uploadingImportAttachment && (
                    <div className="flex items-center gap-2 text-white/70 text-sm mt-2"><Loader2 className="w-4 h-4 animate-spin" /> Caricamento...</div>
                  )}
                  {importContactForm.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {importContactForm.attachments.map((att, idx) => (
                        <div key={idx} className="bg-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-white" />
                          <span className="text-white truncate max-w-[120px]">{att.name}</span>
                          <button onClick={() => removeImportAttachment(idx)} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    onClick={() => sendImportContactMutation.mutate()}
                    disabled={!importContactForm.subject || !importContactForm.message || sendImportContactMutation.isPending || uploadingImportAttachment}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold h-11 mt-2"
                  >
                    {sendImportContactMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Invio in corso...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" />Invia Richiesta Import</>
                    )}
                  </Button>
                  </div>
                  )}
                </div>
              </div>
            </CardContent></Card>

            {importForm.descrizione_prodotto && importForm.quantita && importForm.tipo_richiesta && !analyzingImport && !confirmedImportHS && (
              <HSCodeClassifier productDescription={`${importForm.descrizione_prodotto}${importForm.requisiti ? ' - Requisiti: ' + importForm.requisiti : ''}`} onConfirm={handleImportHSConfirm} onError={() => {}} />
            )}

            {analyzingImport && (
              <Card className="bg-slate-800 border-slate-700"><CardContent className="p-4"><div className="space-y-3">
                <div className="flex items-center gap-3"><Loader2 className="w-5 h-5 animate-spin text-lime-400" /><p className="text-white font-semibold text-sm">Analisi import in corso...</p></div>
                <div className="space-y-2">{['fetching', 'computing', 'interpreting'].map((step, i) => {
                  const labels = { fetching: '1. Recupero dati ufficiali...', computing: '2. Calcolo costi...', interpreting: '3. Valutazione fattibilità...' };
                  const isActive = importStep === step; const isDone = ['fetching', 'computing', 'interpreting'].indexOf(importStep) > i;
                  return (<div key={step} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${isActive ? 'bg-lime-400/10 text-lime-400' : isDone ? 'bg-green-500/10 text-green-400' : 'text-slate-500'}`}>
                    {isActive ? <Loader2 className="w-3 h-3 animate-spin" /> : isDone ? <CheckCircle className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-slate-600 block" />}{labels[step]}
                  </div>);
                })}</div>
              </div></CardContent></Card>
            )}
          </div>
        )
      ) : (
        <div className="space-y-4">
          {confirmedImportHS && (
            <Card className="bg-amber-500/10 border-amber-500/30"><CardContent className="p-3 flex items-center gap-3">
              <span className="text-amber-400 text-lg">📦</span><div><p className="text-amber-400 text-xs font-semibold">Codice HS confermato</p><p className="text-white font-mono font-bold text-sm">{confirmedImportHS.hs_code}</p><p className="text-slate-400 text-[10px]">{confirmedImportHS.descrizione_ufficiale}</p></div>
            </CardContent></Card>
          )}

          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 overflow-hidden"><CardContent className="p-0">
            <div className="bg-gradient-to-r from-red-500/20 to-orange-500/10 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20"><Ship className="w-7 h-7 text-white" /></div>
                  <div><p className="text-slate-400 text-xs uppercase tracking-wider">Analisi Import</p><h3 className="text-white font-bold text-lg">Fattibilità</h3></div>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-black ${importResult.punteggio_fattibilita >= 7 ? 'text-green-400' : importResult.punteggio_fattibilita >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {importResult.punteggio_fattibilita}<span className="text-lg text-slate-500">/10</span>
                  </div>
                  <div className={`text-xs font-medium mt-1 px-2 py-0.5 rounded-full inline-block ${importResult.punteggio_fattibilita >= 7 ? 'bg-green-500/20 text-green-400' : importResult.punteggio_fattibilita >= 5 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                    {importResult.punteggio_fattibilita >= 7 ? 'Alta fattibilità' : importResult.punteggio_fattibilita >= 5 ? 'Media fattibilità' : 'Bassa fattibilità'}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4">
              <p className="text-slate-300 text-sm leading-relaxed">{importResult.valutazione_generale}</p>
              {importResult.motivazione_punteggio && <p className="text-slate-400 text-xs mt-2 italic">{importResult.motivazione_punteggio}</p>}
            </div>
          </CardContent></Card>

          <Card className={`border-2 ${importResult.consigliato ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/30' : 'bg-gradient-to-br from-orange-500/10 to-amber-500/5 border-orange-500/30'}`}><CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${importResult.consigliato ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                {importResult.consigliato ? <CheckCircle className="w-5 h-5 text-green-400" /> : <AlertTriangle className="w-5 h-5 text-orange-400" />}
              </div>
              <div>
                <h3 className={`font-bold text-base ${importResult.consigliato ? 'text-green-400' : 'text-orange-400'}`}>{importResult.consigliato ? '✓ Import Consigliato' : '⚠ Valuta con attenzione'}</h3>
                <p className={`text-sm mt-1 leading-relaxed ${importResult.consigliato ? 'text-green-200/80' : 'text-orange-200/80'}`}>{importResult.raccomandazione}</p>
              </div>
            </div>
          </CardContent></Card>

          {importResult.vantaggi?.length > 0 && (
            <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/30"><CardContent className="p-4">
              <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Vantaggi</h3>
              <div className="space-y-2">{importResult.vantaggi.map((v, i) => (<div key={i} className="flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" /><p className="text-emerald-100/90 text-sm">{v}</p></div>))}</div>
            </CardContent></Card>
          )}

          <ImportMarketIndicators chinaMacro={importRawData?.china_macro} topImportatori={importRawData?.top_importatori_mondiali} />
          <LandedCostTable landedCost={importLandedCost} importData={importRawData} />
          <ImportTradeChart flussiComtrade={importRawData?.flussi_comtrade} flussiConvertitiEur={importLandedCost?.flussi_convertiti_eur} tassoCambio={importLandedCost?.tasso_cambio} unita={importRawData?.flussi_comtrade?.import_italia_da_cina_unita} />
          <ImportTopImportersChart topImportatori={importRawData?.top_importatori_mondiali} landedCost={importLandedCost} />

          {importLandedCost?.anomalie_presenti && (
            <Card className="bg-yellow-500/15 border-yellow-500/40"><CardContent className="p-4">
              <h3 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Dataset presenta anomalie statistiche</h3>
              <ul className="text-yellow-200/80 text-sm space-y-1">{importLandedCost.anomalie.map((a, i) => <li key={i}>• {a}</li>)}</ul>
            </CardContent></Card>
          )}

          {importRawData?.dati_non_disponibili?.length > 0 && (
            <Card className="bg-slate-700/30 border-slate-600"><CardContent className="p-3">
              <p className="text-slate-500 text-xs mb-1.5">⚠ Dati non reperiti:</p>
              <div className="space-y-1">{importRawData.dati_non_disponibili.map((d, i) => <p key={i} className="text-slate-500 text-[10px]">• {d}</p>)}</div>
            </CardContent></Card>
          )}

          <Card className="bg-slate-800/80 border-slate-700"><CardContent className="p-4">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Package className="w-5 h-5 text-blue-400" /> Tempi e Logistica</h3>
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-xl p-3"><div className="flex justify-between items-center mb-2"><span className="text-slate-400 text-xs uppercase tracking-wider">MOQ Tipico</span><span className="text-white font-semibold">{importResult.moq_tipico}</span></div><div className="h-1 bg-slate-600 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full w-3/4" /></div></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/50 rounded-xl p-3"><p className="text-slate-400 text-xs mb-1">⚙️ Produzione</p><p className="text-white font-semibold text-sm">{importResult.tempi_produzione}</p></div>
                <div className="bg-slate-700/50 rounded-xl p-3"><p className="text-slate-400 text-xs mb-1">🚢 Via mare</p><p className="text-white font-semibold text-sm">{importResult.tempi_spedizione_mare || importResult.tempi_spedizione}</p></div>
                {importResult.tempi_spedizione_aerea && <div className="bg-slate-700/50 rounded-xl p-3"><p className="text-slate-400 text-xs mb-1">✈️ Via aerea</p><p className="text-white font-semibold text-sm">{importResult.tempi_spedizione_aerea}</p></div>}
                <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/10 rounded-xl p-3 border border-blue-500/30"><p className="text-blue-300 text-xs mb-1">⏱ Tempo totale</p><p className="text-blue-400 font-bold text-sm">{importResult.tempo_totale}</p></div>
              </div>
            </div>
          </CardContent></Card>

          {importResult.criticita?.length > 0 && (
            <Card className="bg-gradient-to-br from-red-500/10 to-rose-500/5 border-red-500/30"><CardContent className="p-4">
              <h3 className="text-red-400 font-bold mb-3 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Criticità da considerare</h3>
              <div className="space-y-2">{importResult.criticita.map((c, i) => (<div key={i} className="flex items-start gap-2 bg-red-500/10 rounded-lg p-2"><span className="text-red-400 text-xs font-bold mt-0.5">!</span><p className="text-red-200/90 text-sm">{c}</p></div>))}</div>
            </CardContent></Card>
          )}

          {importResult.requisiti_necessari?.length > 0 && (
            <Card className="bg-slate-800/80 border-slate-700"><CardContent className="p-4">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2"><FileText className="w-5 h-5 text-purple-400" /> Requisiti necessari</h3>
              <div className="grid gap-2">{importResult.requisiti_necessari.map((r, i) => (<div key={i} className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2"><div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0"><span className="text-purple-400 text-xs font-bold">{i + 1}</span></div><p className="text-slate-200 text-sm">{r}</p></div>))}</div>
            </CardContent></Card>
          )}

          {importResult.prossimi_passi?.length > 0 && (
            <Card className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/30"><CardContent className="p-4">
              <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2"><ArrowRight className="w-5 h-5" /> Prossimi passi</h3>
              <div className="space-y-3">{importResult.prossimi_passi.map((p, i) => (<div key={i} className="flex items-start gap-3"><div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20"><span className="text-white text-sm font-bold">{i + 1}</span></div><div className="flex-1 bg-blue-500/10 rounded-lg p-3 border-l-2 border-blue-500"><p className="text-blue-100 text-sm">{p}</p></div></div>))}</div>
            </CardContent></Card>
          )}

          {(importRawData?.taric?.fonte || importRawData?.flussi_comtrade?.fonte || importRawData?.iva?.base_normativa) && (
            <Card className="bg-slate-800/50 border-slate-700"><CardContent className="p-3">
              <p className="text-slate-500 text-xs mb-2">📚 Fonti dati utilizzate:</p>
              <div className="flex flex-wrap gap-1">
                {importRawData.taric?.fonte && <span className="bg-slate-700/50 text-slate-400 text-xs px-2 py-0.5 rounded">{importRawData.taric.fonte}</span>}
                {importRawData.flussi_comtrade?.fonte && <span className="bg-slate-700/50 text-slate-400 text-xs px-2 py-0.5 rounded">{importRawData.flussi_comtrade.fonte}</span>}
                {importRawData.iva?.base_normativa && <span className="bg-slate-700/50 text-slate-400 text-xs px-2 py-0.5 rounded">{importRawData.iva.base_normativa}</span>}
              </div>
            </CardContent></Card>
          )}

          <Button onClick={resetImport} variant="outline" className="w-full bg-blue-600 hover:bg-blue-700 text-white border-blue-600">Nuova Valutazione</Button>

          <Card className="bg-gradient-to-br from-red-600 to-orange-600 border-0 shadow-xl shadow-red-500/20">
            <CardContent className="p-5">
              <div className="text-center mb-3">
                <h3 className="text-white font-bold text-lg">Vuoi procedere con l'import?</h3>
                <p className="text-white/80 text-sm">Contattaci per avviare la pratica.</p>
              </div>
              {importContactSent ? (
                <div className="bg-white/20 rounded-xl p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-white mx-auto mb-2" />
                  <p className="text-white font-bold">Richiesta inviata!</p>
                  <p className="text-white/80 text-xs mt-1">Verrete ricontattati entro 48 ore.</p>
                  <Button onClick={() => setImportContactSent(false)} variant="ghost" className="mt-2 text-white/80 text-xs hover:text-white">Invia altra richiesta</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input placeholder="Oggetto" value={importContactForm.subject} onChange={(e) => setImportContactForm({ ...importContactForm, subject: e.target.value })} className="bg-white/10 border-white/20 text-white placeholder:text-white/50" />
                  <Textarea placeholder="Note o dettagli aggiuntivi..." value={importContactForm.message} onChange={(e) => setImportContactForm({ ...importContactForm, message: e.target.value })} className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[70px]" />
                  <div className="flex gap-2">
                    <label className="flex-1 cursor-pointer"><div className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 px-3 rounded-lg transition-colors text-sm"><Paperclip className="w-4 h-4" /> Allega</div><input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx" onChange={handleImportAttachmentUpload} className="hidden" disabled={uploadingImportAttachment} /></label>
                    <label className="flex-1 cursor-pointer"><div className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2 px-3 rounded-lg transition-colors text-sm h-full"><Camera className="w-4 h-4" /> Foto</div><input type="file" accept="image/*" capture="environment" onChange={handleImportAttachmentUpload} className="hidden" disabled={uploadingImportAttachment} /></label>
                  </div>
                  {uploadingImportAttachment && <div className="flex items-center gap-2 text-white/70 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Caricamento...</div>}
                  {importContactForm.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">{importContactForm.attachments.map((att, idx) => (
                      <div key={idx} className="bg-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm"><FileText className="w-4 h-4 text-white" /><span className="text-white truncate max-w-[120px]">{att.name}</span><button onClick={() => removeImportAttachment(idx)} className="text-white/70 hover:text-white"><X className="w-4 h-4" /></button></div>
                    ))}</div>
                  )}
                  <Button onClick={() => sendImportContactMutation.mutate()} disabled={!importContactForm.subject || !importContactForm.message || sendImportContactMutation.isPending || uploadingImportAttachment} className="w-full bg-white hover:bg-white/90 text-red-600 font-bold h-11">
                    {sendImportContactMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Invio...</> : <><Send className="w-4 h-4 mr-2" />Invia Richiesta Import</>}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <ImportLimitPopup open={showImportLimitPopup} onOpenChange={setShowImportLimitPopup} importLimit={importLimit} importContactForm={importContactForm} setImportContactForm={setImportContactForm} importContactSent={importContactSent} setImportContactSent={setImportContactSent} sendImportContactMutation={sendImportContactMutation} uploadingImportAttachment={uploadingImportAttachment} handleImportAttachmentUpload={handleImportAttachmentUpload} removeImportAttachment={removeImportAttachment} />
    </div>
  );
}