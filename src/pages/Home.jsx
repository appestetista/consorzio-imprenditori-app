import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Send, Sparkles, ArrowUp, Loader2, Menu, Mic, MicOff, X, LogOut, Settings, User, Eye, Phone, XCircle, Target, Scale, BarChart3, Globe, ShieldCheck, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { normalizeUser, isUserConsultant } from '../components/utils/normalizeUser';
import { cn } from '@/lib/utils';
import BottomNav from '../components/layout/BottomNav';
import ChatMessage from '../components/home/ChatMessage';
import DecisionResponse from '../components/home/DecisionResponse';
import CompareResult from '../components/home/CompareResult';
import ChatSidebar from '../components/home/ChatSidebar';
import GlobalTopIcons from '../components/layout/GlobalTopIcons';
import AIUsageBar, { AIUsageBadge } from '../components/home/AIUsageBar';
import MissingProfileDataModal, { getMissingFields } from '../components/home/MissingProfileDataModal';
import { classifyIntent, detectVagueness } from '../components/home/classifyIntent';
import { useQueryClient } from '@tanstack/react-query';

function SmartQuestionsCard({ data, onSubmit, onSkip, isTyping }) {
  const [risposte, setRisposte] = React.useState({});
  
  const tutteRisposte = data.domande.every(d => risposte[d.id] && risposte[d.id].trim() !== '');
  
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 max-w-[92%] space-y-3">
        <div className="bg-slate-800/60 rounded-2xl rounded-tl-sm px-4 py-3">
          <p className="text-sm text-slate-200 mb-3">{data.text}</p>
          
          {data.domande.map((domanda) => (
            <div key={domanda.id} className="mb-3 last:mb-0">
              <p className="text-xs font-semibold text-slate-400 mb-2">{domanda.testo}</p>
              <div className="flex flex-wrap gap-1.5">
                {domanda.opzioni.map((opzione) => (
                  <button
                    key={opzione}
                    onClick={() => setRisposte(prev => ({ ...prev, [domanda.id]: opzione }))}
                    disabled={isTyping}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      risposte[domanda.id] === opzione
                        ? 'border-[#d4af37] bg-[#d4af37]/20 text-[#d4af37] font-semibold'
                        : 'border-slate-600/50 bg-transparent text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {opzione}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => onSkip(data)}
            disabled={isTyping}
            className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 text-xs hover:border-slate-600 transition-colors disabled:opacity-30"
          >
            Rispondi senza dettagli
          </button>
          <button
            onClick={() => onSubmit(data, risposte)}
            disabled={!tutteRisposte || isTyping}
            className="px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-30"
            style={{
              backgroundColor: tutteRisposte ? '#d4af37' : '#334155',
              color: tutteRisposte ? '#0a0f1a' : '#94a3b8',
            }}
          >
            {isTyping ? 'Analisi in corso...' : 'Analizza con questi dettagli'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { impersonation, setCurrentUserRole, appMode } = useImpersonation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [lastCategory, setLastCategory] = useState(null);
  const [lastClassification, setLastClassification] = useState(null);
  const [activeConvData, setActiveConvData] = useState(null);
  const [missingFieldsPopup, setMissingFieldsPopup] = useState(null); // { fields: [], pendingMsg: string }
  const [compareMode, setCompareMode] = useState(false);
  const [scenarioA, setScenarioA] = useState('');
  const [scenarioB, setScenarioB] = useState('');
  // pannelli messaggi/notifiche gestiti globalmente via PanelProvider
  const [consulenzeUsate, setConsulenzeUsate] = useState(0);
  const [pianoAbbonamento, setPianoAbbonamento] = useState(null);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Caricamento utente
  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      try {
        const currentUser = await base44.auth.me();
        if (!currentUser) { setEffectiveUser(null); setLoading(false); return; }
        setUser(currentUser);
        setCurrentUserRole(currentUser.role);
        if (appMode === 'user-preview' && impersonation.previewUserId) {
          const users = await base44.entities.User.filter({ id: impersonation.previewUserId });
          setEffectiveUser(users.length > 0 ? normalizeUser(users[0]) : null);
        } else {
          setEffectiveUser(normalizeUser(currentUser));
        }
      } catch (e) { setEffectiveUser(null); }
      finally { setLoading(false); }
    };
    loadUser();
  }, [appMode, impersonation.previewUserId, setCurrentUserRole]);

  // Redirect admin
  useEffect(() => {
    if (!loading && effectiveUser?.role === 'admin' && !impersonation.active) {
      navigate(createPageUrl('AdminPanel'));
    }
  }, [loading, effectiveUser?.role, impersonation.active, navigate]);

  // Reset mensile consulenze + sync stato abbonamento
  useEffect(() => {
    if (!effectiveUser || effectiveUser.role === 'admin') return;
    const piano = effectiveUser.piano_abbonamento || 'free';
    setPianoAbbonamento(piano);
    setConsulenzeUsate(effectiveUser.consulenze_usate_mese || 0);

    // Controlla se il mese è cambiato → reset
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (effectiveUser.mese_reset_consulenze && effectiveUser.mese_reset_consulenze !== currentMonth) {
      // Reset asincrono
      (async () => {
        await base44.auth.updateMe({ consulenze_usate_mese: 0, mese_reset_consulenze: currentMonth });
        setConsulenzeUsate(0);
      })();
    } else if (!effectiveUser.mese_reset_consulenze) {
      // Prima volta: inizializza
      (async () => {
        await base44.auth.updateMe({ consulenze_usate_mese: 0, mese_reset_consulenze: currentMonth });
        setConsulenzeUsate(0);
      })();
    }
  }, [effectiveUser]);

  // (onboarding rimosso — ora i dati vengono chiesti contestualmente nella chat)

  // Assegnazione tipo utente
  useEffect(() => {
    const assignType = async () => {
      if (impersonation.active) return;
      try {
        const currentUser = await base44.auth.me();
        if (currentUser?.role === 'admin' || currentUser?.user_type) return;
        const result = await base44.functions.invoke('assignUserType', {});
        if (result.data?.already_assigned || result.data?.already_registered) return;
        if (result.data?.success && result.data?.message?.includes('Consulente autorizzato')) return;
        if (result.data?.blocked) { window.location.reload(); return; }
        if (result.data?.success && result.data?.user_type && result.data.user_type !== 'consulente') {
          navigate(createPageUrl('MyProfile'));
        }
      } catch (e) {}
    };
    assignType();
  }, [impersonation.active, navigate]);

  // Scroll automatico ai nuovi messaggi
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Gestisce parametri URL: loadConv (carica conversazione) e newChat (nuova chat)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const loadConvId = params.get('loadConv');
    const newChat = params.get('newChat');
    
    if (loadConvId && effectiveUser?.email) {
      // Carica la conversazione specificata
      (async () => {
        const convs = await base44.entities.ChatConversation.filter({ user_email: effectiveUser.email });
        const conv = convs.find(c => c.id === loadConvId);
        if (conv) {
          handleSelectConversation(conv);
        }
      })();
      // Pulisci URL
      const url = new URL(window.location);
      url.searchParams.delete('loadConv');
      window.history.replaceState({}, '', url.toString());
    } else if (newChat === '1') {
      handleNewChat();
      const url = new URL(window.location);
      url.searchParams.delete('newChat');
      window.history.replaceState({}, '', url.toString());
    }
  }, [effectiveUser?.email]);

  const buildUserContext = () => {
    if (!effectiveUser) return '';
    const fields = [
      ['azienda', effectiveUser.company_name],
      ['settore', effectiveUser.settore],
      ['forma giuridica', effectiveUser.forma_giuridica],
      ['fatturato annuo', effectiveUser.fatturato_annuo],
      ['dipendenti', effectiveUser.numero_dipendenti],
      ['zona', effectiveUser.zona],
      ['città', effectiveUser.city],
      ['regime fiscale', effectiveUser.regime_fiscale],
      ['obiettivo', effectiveUser.obiettivo_principale],
    ];
    const parts = fields.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
    return parts.length > 0 ? `CONTESTO AZIENDALE: ${parts.join(', ')}. Personalizza la risposta in base a questo contesto.\n\n` : '';
  };

  const runAnalysis = async ({ msg, category, sottocategoria, newMessages, convId }) => {
    const userContext = buildUserContext();

    // Storicità conversazione — ultime 3 coppie per dare contesto all'LLM
    let historyBlock = '';
    const previousMsgs = newMessages.slice(0, -1); // escludi il messaggio corrente
    if (previousMsgs.length > 0) {
      const recent = previousMsgs.slice(-6); // max 3 coppie domanda-risposta
      const historyParts = recent.map(m => {
        if (m.role === 'user') return 'UTENTE: ' + (m.content || '').substring(0, 150);
        if (m.role === 'assistant' && m.content) {
          const c = m.content;
          if (typeof c === 'object' && c.sintesi_decisionale) {
            return 'ASSISTENTE (sintesi): ' + c.sintesi_decisionale.substring(0, 200);
          }
          if (typeof c === 'string') return 'ASSISTENTE: ' + c.substring(0, 200);
        }
        return null;
      }).filter(Boolean);
      
      if (historyParts.length > 0) {
        historyBlock = 'CONVERSAZIONE PRECEDENTE (per contesto, rispondi SOLO alla domanda corrente):\n' 
          + historyParts.join('\n') + '\n\n';
      }
    }

    // KB contenuto verificato — passa dati reali all'LLM, non solo titoli
    let kbHint = '';
    try {
      const kbRecords = await base44.entities.KnowledgeBase.filter({ categoria: category, attivo: true });
      if (kbRecords.length > 0) {
        // Ricerca rilevanza: filtra schede che contengono parole della domanda
        const parole = msg.toLowerCase().split(' ').filter(w => w.length > 3);
        const rilevanti = kbRecords.filter(r => 
          parole.some(p => (r.titolo || '').toLowerCase().includes(p) || (r.contenuto || '').toLowerCase().includes(p))
        );
        const schedeDaUsare = rilevanti.length > 0 ? rilevanti.slice(0, 3) : kbRecords.slice(0, 2);
        
        kbHint = 'DATI NORMATIVI GIÀ VERIFICATI — usa questi come base affidabile, cerca online SOLO per aggiornamenti o dati non presenti qui:\n\n' 
          + schedeDaUsare.map(r => 
              '### ' + r.titolo + ' [affidabilità: ' + (r.livello_affidabilita || 'verificato') + ']\n' + (r.contenuto || '').substring(0, 800)
            ).join('\n\n') 
          + '\n\n';
      }
    } catch (e) { kbHint = ''; }

    // === MAPPA COMPLETA SEZIONI DEDICATE ===
    const SEZIONI_DEDICATE = [
      { keywords: ['tasse', 'imposte', 'iva', 'irpef', 'ires', 'irap', 'regime', 'forfettario', 'ordinario', 'aliquota', 'fisco', 'dichiarazione', 'f24', 'fattura'], nome: 'Simulatore Fiscale', pagina: 'SimulatoreFiscale', descrizione: 'Calcola le tue imposte e confronta i regimi fiscali', parametri: ['regime_fiscale', 'fatturato_annuo', 'forma_giuridica'] },
      { keywords: ['dipendente', 'assunzione', 'stipendio', 'busta paga', 'ccnl', 'costo personale', 'tfr', 'contributi previdenziali', 'part-time', 'apprendista'], nome: 'Costo del Personale', pagina: 'SimulatoreCostoPersonale', descrizione: 'Calcola il costo esatto di un dipendente con CCNL reali', parametri: ['numero_dipendenti', 'settore'] },
      { keywords: ['contratto', 'clausola', 'recesso', 'analisi contratto', 'penale contrattuale', 'inadempimento'], nome: 'Analisi Contratti', pagina: 'AnalisiContratti', descrizione: 'Analizza clausole e rischi dei tuoi contratti', parametri: [] },
      { keywords: ['bando', 'bandi', 'finanziamento', 'agevolazione', 'fondo perduto', 'contributo', 'pnrr', 'transizione 5.0', 'invitalia', 'simest', 'credito imposta'], nome: 'Bandi e Finanziamenti', pagina: 'FinanziamentiAgevolati', descrizione: 'Cerca bandi attivi e finanziamenti per la tua azienda', parametri: ['settore', 'fatturato_annuo', 'numero_dipendenti', 'forma_giuridica'] },
      { keywords: ['import', 'export', 'dazio', 'dogana', 'codice hs', 'internazional', 'estero', 'incoterms', 'commercio estero'], nome: 'Import / Export', pagina: 'ImportExport', descrizione: 'Analisi mercati, dazi doganali e codici HS ufficiali', parametri: ['settore'] },
      { keywords: ['compliance', 'sanzione', 'gdpr', 'privacy', 'sicurezza lavoro', '81/08', 'haccp', 'normativa', 'obbligo'], nome: 'Evita Sanzioni', pagina: 'ComplianceAziendale', descrizione: 'Verifica la tua compliance e previeni sanzioni', parametri: ['settore', 'numero_dipendenti'] },
      { keywords: ['welfare', 'benefit', 'buoni pasto', 'fringe benefit', 'premio produzione', 'flexible benefit'], nome: 'Benefit Dipendenti', pagina: 'WelfareAziendale', descrizione: 'Gestisci il welfare aziendale con vantaggi fiscali', parametri: ['numero_dipendenti', 'forma_giuridica'] },
      { keywords: ['fornitore', 'fornitura', 'preventivo', 'acquisto', 'appalto'], nome: 'Ricerca Fornitori', pagina: 'Fornitori', descrizione: 'Trova fornitori verificati nella tua zona', parametri: ['settore', 'zona'] },
      { keywords: ['consulente', 'consulenza', 'commercialista', 'avvocato', 'professionista'], nome: 'Consulenze', pagina: 'Consulenze', descrizione: 'Prenota una consulenza con un professionista', parametri: [] },
      { keywords: ['energia', 'bolletta', 'fotovoltaico', 'risparmio energetico', 'luce', 'gas'], nome: 'Risparmio Energetico', pagina: 'RisparmioEnergetico', descrizione: 'Confronta offerte e risparmia su luce e gas', parametri: [] },
      { keywords: ['asta', 'aste', 'immobiliare', 'tribunale', 'perizia', 'offerta minima'], nome: 'Aste Immobiliari', pagina: 'AsteImmobiliari', descrizione: 'Cerca aste immobiliari attive nella tua zona', parametri: ['zona'] },
      { keywords: ['marketplace', 'vendere', 'comprare', 'annuncio', 'offerta commerciale'], nome: 'Market Place', pagina: 'Marketplace', descrizione: 'Compra e vendi tra imprenditori del Consorzio', parametri: [] },
    ];

    const msgLower = msg.toLowerCase();
    let strumentoSuggerito = null;
    let bestKeywordCount = 0;
    
    for (const sez of SEZIONI_DEDICATE) {
      const matchCount = sez.keywords.filter(kw => msgLower.includes(kw)).length;
      if (matchCount > bestKeywordCount) {
        bestKeywordCount = matchCount;
        strumentoSuggerito = { nome: sez.nome, pagina: sez.pagina, descrizione: sez.descrizione, parametri: sez.parametri };
      }
    }

    if (strumentoSuggerito && strumentoSuggerito.parametri.length > 0) {
      const parametriDaPassare = {};
      for (const param of strumentoSuggerito.parametri) {
        if (effectiveUser?.[param]) parametriDaPassare[param] = effectiveUser[param];
      }
      const importoMatch = msg.match(/(\d[\d.,]*)\s*(?:€|euro)/i);
      if (importoMatch) parametriDaPassare._importo = importoMatch[1];
      const dipMatch = msg.match(/(\d+)\s*(?:dipendenti|dipendente|persone|collaboratori)/i);
      if (dipMatch) parametriDaPassare._num_dipendenti = dipMatch[1];
      strumentoSuggerito.parametri_utente = parametriDaPassare;
    }

    // Chiamata LLM con internet + schema JSON forzato
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Sei un consulente strategico senior per PMI italiane. Usa internet per verificare ogni dato.

PROTOCOLLO ANTI-ALLUCINAZIONE (OBBLIGATORIO):
1. Per ogni aliquota, importo o scadenza fiscale: CITA la fonte esatta (nome legge + articolo, oppure URL). Formato: [VERIFICATO — Nome Fonte, art. X]
2. Se la ricerca internet NON restituisce il dato specifico: scrivi "⚠️ Dato non disponibile — verificare con il proprio commercialista" — NON inventare MAI
3. Se trovi dati contrastanti tra fonti: segnala con [⚠️ FONTI DISCORDANTI — fonte1 dice X, fonte2 dice Y]
4. NON arrotondare aliquote fiscali, soglie INPS, importi di legge — sono numeri esatti per legge
5. Distingui SEMPRE tra: norma vigente 2025-2026, norma in discussione, norma scaduta
6. Ogni numero nel campo impatto_economico DEVE avere la fonte tra parentesi

STILE DI RISPOSTA:
- Linguaggio diretto, come un consulente che parla al suo cliente
- Usa "tu" e "la tua azienda", mai "il contribuente"
- Spiega i termini tecnici alla prima occorrenza
- La raccomandazione finale = prima azione concreta da fare domani mattina alle 9
- Non menzionare mai di essere un'AI

${historyBlock}${kbHint}${userContext}Categoria: ${category} — ${sottocategoria}.
Domanda: ${msg}`,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          categoria: { type: "string" },
          sintesi_decisionale: { type: "string", description: "max 5 righe con dati reali e tag [VERIFICATO — fonte] o [STIMA]" },
          impatto_economico: { type: "string", description: "cifre EUR con fonte o range stimato" },
          rischi_criticita: { type: "string", description: "rischi specifici con norme di riferimento" },
          tempo_attuazione: { type: "string", description: "timeline realistica" },
          raccomandazione_finale: { type: "string", description: "cosa fare DOMANI MATTINA alle 9 come primo passo" },
          fonti: { type: "array", items: { type: "object", properties: { nome: { type: "string" }, url: { type: "string" }, tipo: { type: "string" } } } },
          affidabilita: { type: "object", properties: { verificati: { type: "number" }, stimati: { type: "number" }, da_confermare: { type: "number" }, punteggio: { type: "number" } } },
          followup_questions: { type: "array", items: { type: "string" } },
          disclaimer_dati: { type: "string", description: "Se qualche dato non è stato trovato o verificato online, elencalo qui con il motivo. Se tutto verificato, scrivi: Tutti i dati citati sono stati verificati con fonti online" }
        }
      }
    });

    // Parsing sicuro — con response_json_schema il risultato è già un oggetto
    let parsed = result;
    if (typeof result === 'string') {
      try {
        let cleaned = result.trim();
        if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        parsed = JSON.parse(cleaned);
      } catch (e) { parsed = null; }
    }

    // Inietta strumento correlato se presente
    if (parsed && strumentoSuggerito) parsed.strumento_correlato = strumentoSuggerito;

    const newCount = (consulenzeUsate || 0) + 1;
    const assistantMsg = { role: 'assistant', content: parsed || result, isAI: true, usageCount: newCount };
    const updatedMessages = [...newMessages, assistantMsg];
    setMessages(updatedMessages);
    const rispostaStr = typeof (parsed || result) === 'string' ? (parsed || result) : JSON.stringify(parsed || result);
    await base44.entities.ChatConversation.update(convId, {
      messages: updatedMessages,
      categoria: category,
      sottocategoria,
      risposta_json: rispostaStr,
    });

    // Incrementa contatore consulenze
    setConsulenzeUsate(newCount);
    await base44.auth.updateMe({ consulenze_usate_mese: newCount });
  };

  const handleDisambiguationSelect = async (disambiguation, selectedCategory) => {
    setIsTyping(true);
    setLastCategory(selectedCategory);
    setLastClassification({ categoria: selectedCategory, sottocategoria: disambiguation.sottocategoria, confidenza: 100 });
    // Rimuovi il messaggio di disambiguazione e sostituiscilo dopo l'analisi
    const msgsWithoutDisambig = messages.filter(m => !m.disambiguation);
    setMessages(msgsWithoutDisambig);
    try {
      await runAnalysis({
        msg: disambiguation.originalMsg,
        category: selectedCategory,
        sottocategoria: disambiguation.sottocategoria,
        newMessages: msgsWithoutDisambig,
        convId: disambiguation.convId,
      });
    } catch (e) {
      console.error('>>> ERRORE:', e?.message || e);
      console.error('>>> DETTAGLIO:', JSON.stringify(e));
      const errMsg = { role: 'assistant', content: 'Mi dispiace, si è verificato un errore. Riprova tra un momento.' };
      const updated = [...msgsWithoutDisambig, errMsg];
      setMessages(updated);
      await base44.entities.ChatConversation.update(disambiguation.convId, { messages: updated });
    } finally {
      setIsTyping(false);
    }
  };

  const chatBlocked = false;

  const handleSend = async (text) => {
    const msg = text || inputText.trim();
    if (!msg || !effectiveUser?.email || chatBlocked || isTyping) return;

    const userMsg = { role: 'user', content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    // Se è una nuova conversazione, creala
    let convId = activeConversationId;
    if (!convId) {
      const titolo = msg.length > 50 ? msg.substring(0, 50) + '...' : msg;
      const conv = await base44.entities.ChatConversation.create({
        user_email: effectiveUser.email,
        titolo,
        messages: newMessages
      });
      convId = conv.id;
      setActiveConversationId(convId);
      queryClient.invalidateQueries({ queryKey: ['chatConversations'] });
    } else {
      await base44.entities.ChatConversation.update(convId, { messages: newMessages });
    }

    try {
      // FASE 1 – Classificazione intento (lato client, zero costo AI)
      console.log('>>> STEP 1: Classificazione locale');
      const classificazione = classifyIntent(msg);
      console.log('>>> STEP 2: Classificazione OK', classificazione);
      const category = classificazione.categoria;
      const confidenza = classificazione.confidenza;
      const sottocategoria = classificazione.sottocategoria;
      setLastCategory(category);
      setLastClassification({ categoria: category, sottocategoria, confidenza });

      // Se confidenza bassa, chiedi disambiguazione
      if (confidenza < 70) {
        const disambigMsg = {
          role: 'assistant',
          content: null,
          disambiguation: {
            text: "Per un'analisi più precisa, in quale area rientra la tua domanda?",
            categories: ['Fiscale', 'Legale', 'Operativa', 'Strategica'],
            originalMsg: msg,
            sottocategoria,
            convId,
          }
        };
        const updatedMessages = [...newMessages, disambigMsg];
        setMessages(updatedMessages);
        await base44.entities.ChatConversation.update(convId, { messages: updatedMessages });
        setIsTyping(false);
        return;
      }

      // FASE 1.5 – Controlla campi profilo mancanti
      const missing = getMissingFields(effectiveUser, category, msg);
      if (missing.length > 0) {
        // Pausa: mostra popup per raccogliere i dati, poi continua
        setIsTyping(false);
        setMissingFieldsPopup({
          fields: missing,
          pendingAnalysis: { msg, category, sottocategoria, newMessages, convId },
        });
        return;
      }

      // FASE 1.7 – Smart Questioning: la domanda è troppo vaga?
      const vagueness = detectVagueness(msg, category, effectiveUser);
      if (vagueness && vagueness.domande.length > 0) {
        const smartMsg = {
          role: 'assistant',
          content: null,
          smartQuestions: {
            text: "Per darti una risposta davvero utile, ho bisogno di qualche dettaglio:",
            domande: vagueness.domande,
            messaggioOriginale: msg,
            categoria: category,
            sottocategoria,
            convId,
            risposte: {},
          }
        };
        const updatedMessages = [...newMessages, smartMsg];
        setMessages(updatedMessages);
        await base44.entities.ChatConversation.update(convId, { messages: updatedMessages });
        setIsTyping(false);
        return;
      }

      // FASE 2 + 3 – Analisi con system prompt strutturato
      console.log('>>> STEP 3: Inizio analisi');
      await runAnalysis({ msg, category, sottocategoria, newMessages, convId });
    } catch (e) {
      console.error('>>> ERRORE:', e?.message || e);
      console.error('>>> DETTAGLIO:', JSON.stringify(e));
      const errMsg = { role: 'assistant', content: 'Mi dispiace, si è verificato un errore. Riprova tra un momento.' };
      const updatedMessages = [...newMessages, errMsg];
      setMessages(updatedMessages);
      await base44.entities.ChatConversation.update(convId, { messages: updatedMessages });
    } finally {
      setIsTyping(false);
    }
  };

  const handleCompare = async () => {
    const a = scenarioA.trim();
    const b = scenarioB.trim();
    if (!a || !b || !effectiveUser?.email || chatBlocked || isTyping) return;

    const userMsg = { role: 'user', content: `⚖️ Confronto:\nA: ${a}\nB: ${b}` };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsTyping(true);

    // Crea conversazione
    let convId = activeConversationId;
    if (!convId) {
      const titolo = `Confronto: ${a.substring(0, 25)} vs ${b.substring(0, 25)}`;
      const conv = await base44.entities.ChatConversation.create({
        user_email: effectiveUser.email,
        titolo,
        messages: newMessages,
      });
      convId = conv.id;
      setActiveConversationId(convId);
      queryClient.invalidateQueries({ queryKey: ['chatConversations'] });
    } else {
      await base44.entities.ChatConversation.update(convId, { messages: newMessages });
    }

    try {
      // Classificazione locale sul testo combinato (zero costo AI)
      const combinedText = `${a}. ${b}`;
      const classificazione2 = classifyIntent(combinedText);
      const category = classificazione2.categoria;
      const sottocategoria = classificazione2.sottocategoria;
      setLastCategory('Confronto');
      setLastClassification({ categoria: 'Confronto', sottocategoria: `${category} — ${sottocategoria}` });

      // Contesto utente
      const userContext = buildUserContext();

      // Dati normativi KB — limitati per non sovraccaricare il prompt
      let kbContext = '';
      try {
        const kbRecords = await base44.entities.KnowledgeBase.filter({ categoria: category, attivo: true });
        if (kbRecords.length > 0) {
          kbContext = 'Dati normativi verificati:\n' 
            + kbRecords.slice(0, 2).map(r => '- ' + r.titolo + ': ' + (r.contenuto || '').substring(0, 500)).join('\n') 
            + '\n\n';
        }
      } catch (e) { kbContext = ''; }

      // Confronto LLM con schema forzato
      const compareResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Confronta questi scenari per un imprenditore italiano di PMI. Usa internet per verificare dati reali. Dato trovato → [VERIFICATO — fonte]. Dato non trovato → [STIMA — base]. MAI inventare.
${userContext}${kbContext}
Scenario A: ${a}
Scenario B: ${b}`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            tema: { type: "string" },
            scenari: { type: "array", items: { type: "object", properties: { nome: { type: "string" }, costo: { type: "string" }, roi: { type: "string" }, tempo: { type: "string" }, rischio: { type: "string" }, vantaggio: { type: "string" }, punteggio: { type: "number" } } } },
            verdetto: { type: "string" },
            scenario_consigliato: { type: "string" },
            fonti: { type: "array", items: { type: "object", properties: { nome: { type: "string" }, url: { type: "string" }, tipo: { type: "string" } } } },
            affidabilita: { type: "object", properties: { verificati: { type: "number" }, stimati: { type: "number" }, da_confermare: { type: "number" }, punteggio: { type: "number" } } }
          }
        }
      });

      // Con response_json_schema il risultato è già un oggetto
      let parsedCompare = compareResult;
      if (typeof compareResult === 'string') {
        try {
          let cleaned = compareResult.trim();
          if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          parsedCompare = JSON.parse(cleaned);
        } catch (e) { parsedCompare = null; }
      }

      const newCount = (consulenzeUsate || 0) + 1;
      const result = parsedCompare || compareResult;
      const assistantMsg = { role: 'assistant', content: result, isCompare: !!parsedCompare, isAI: true, usageCount: newCount };
      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);

      const rispostaStr = typeof result === 'string' ? result : JSON.stringify(result);
      await base44.entities.ChatConversation.update(convId, {
        messages: updatedMessages,
        categoria: 'Confronto',
        sottocategoria: `${category} — ${sottocategoria}`,
        risposta_json: rispostaStr,
      });

      // Incrementa contatore consulenze
      setConsulenzeUsate(newCount);
      await base44.auth.updateMe({ consulenze_usate_mese: newCount });

      // Reset campi confronto
      setScenarioA('');
      setScenarioB('');
      setCompareMode(false);
    } catch (e) {
      console.error('>>> ERRORE:', e?.message || e);
      console.error('>>> DETTAGLIO:', JSON.stringify(e));
      const errMsg = { role: 'assistant', content: 'Mi dispiace, si è verificato un errore nel confronto. Riprova tra un momento.' };
      const updated = [...newMessages, errMsg];
      setMessages(updated);
      await base44.entities.ChatConversation.update(convId, { messages: updated });
    } finally {
      setIsTyping(false);
    }
  };

  // Callback quando l'utente completa i dati mancanti nel popup
  const handleMissingFieldsComplete = async (newData) => {
    // Aggiorna effectiveUser locale con i nuovi dati
    setEffectiveUser(prev => ({ ...prev, ...newData }));
    const pending = missingFieldsPopup?.pendingAnalysis;
    setMissingFieldsPopup(null);
    if (pending) {
      setIsTyping(true);
      try {
        await runAnalysis(pending);
      } catch (e) {
        console.error('>>> ERRORE:', e?.message || e);
        const errMsg = { role: 'assistant', content: 'Mi dispiace, si è verificato un errore. Riprova tra un momento.' };
        const updated = [...pending.newMessages, errMsg];
        setMessages(updated);
        await base44.entities.ChatConversation.update(pending.convId, { messages: updated });
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handleMissingFieldsSkip = async () => {
    const pending = missingFieldsPopup?.pendingAnalysis;
    setMissingFieldsPopup(null);
    if (pending) {
      setIsTyping(true);
      try {
        await runAnalysis(pending);
      } catch (e) {
        console.error('>>> ERRORE:', e?.message || e);
        const errMsg = { role: 'assistant', content: 'Mi dispiace, si è verificato un errore. Riprova tra un momento.' };
        const updated = [...pending.newMessages, errMsg];
        setMessages(updated);
        await base44.entities.ChatConversation.update(pending.convId, { messages: updated });
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handleSmartQuestionAnswer = async (smartData, risposte) => {
    setIsTyping(true);
    const msgsWithoutSmart = messages.filter(m => !m.smartQuestions);
    
    const dettagli = Object.entries(risposte)
      .filter(([, val]) => val && val.trim() !== '')
      .map(([id, val]) => {
        const domanda = smartData.domande.find(d => d.id === id);
        return domanda ? domanda.testo + ' → ' + val : id + ': ' + val;
      })
      .join('. ');
    
    const messaggioArricchito = smartData.messaggioOriginale + '\n\nDETTAGLI FORNITI DALL\'UTENTE: ' + dettagli;
    
    const detailMsg = { role: 'user', content: '📋 ' + dettagli, isDetail: true };
    const updatedMsgs = [...msgsWithoutSmart, detailMsg];
    setMessages(updatedMsgs);
    
    try {
      await runAnalysis({
        msg: messaggioArricchito,
        category: smartData.categoria,
        sottocategoria: smartData.sottocategoria,
        newMessages: updatedMsgs,
        convId: smartData.convId,
      });
    } catch (e) {
      console.error('>>> ERRORE:', e?.message || e);
      const errMsg = { role: 'assistant', content: 'Mi dispiace, si è verificato un errore. Riprova tra un momento.' };
      setMessages([...updatedMsgs, errMsg]);
      await base44.entities.ChatConversation.update(smartData.convId, { messages: [...updatedMsgs, errMsg] });
    } finally {
      setIsTyping(false);
    }
  };
  
  const handleSmartQuestionSkip = async (smartData) => {
    setIsTyping(true);
    const msgsWithoutSmart = messages.filter(m => !m.smartQuestions);
    setMessages(msgsWithoutSmart);
    
    try {
      await runAnalysis({
        msg: smartData.messaggioOriginale,
        category: smartData.categoria,
        sottocategoria: smartData.sottocategoria,
        newMessages: msgsWithoutSmart,
        convId: smartData.convId,
      });
    } catch (e) {
      console.error('>>> ERRORE:', e?.message || e);
      const errMsg = { role: 'assistant', content: 'Mi dispiace, si è verificato un errore. Riprova tra un momento.' };
      setMessages([...msgsWithoutSmart, errMsg]);
      await base44.entities.ChatConversation.update(smartData.convId, { messages: [...msgsWithoutSmart, errMsg] });
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Il tuo browser non supporta il riconoscimento vocale.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    let finalTranscript = '';
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInputText(prev => {
        const base = prev.endsWith(' ') || prev === '' ? prev : prev + ' ';
        return finalTranscript ? base.trimEnd() + (base ? ' ' : '') + finalTranscript : base + interim;
      });
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    setIsRecording(true);
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveConversationId(null);
    setActiveConvData(null);
    setInputText('');
  };

  const handleSelectConversation = (conv) => {
    setActiveConversationId(conv.id);
    setMessages(conv.messages || []);
    setActiveConvData(conv);
    setLastCategory(conv.categoria || null);
    setLastClassification(conv.categoria ? { categoria: conv.categoria, sottocategoria: conv.sottocategoria || '' } : null);
    setInputText('');
  };

  const userRegime = effectiveUser?.regime_fiscale || null;

  // Logo utente
  const DEFAULT_LOGO = "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop";
  const userLogo = effectiveUser?.company_logo || DEFAULT_LOGO;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  // Utente bloccato
  if (effectiveUser?.is_blocked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-white text-lg font-bold mb-2">Accesso non autorizzato</p>
          <p className="text-slate-400 text-sm mb-6">La tua email non è stata autorizzata. Contatta il consorzio per ottenere l'accesso.</p>
          <button onClick={() => base44.auth.logout()} className="px-6 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold">Esci</button>
        </div>
      </div>
    );
  }

  // Utente senza dati (non ancora caricato)
  if (!effectiveUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-white text-lg font-bold mb-2">Sessione scaduta</p>
          <p className="text-slate-400 text-sm mb-6">Effettua nuovamente l'accesso.</p>
          <button onClick={() => base44.auth.redirectToLogin()} className="px-6 py-2 bg-lime-500 text-slate-900 rounded-lg text-sm font-semibold">Accedi</button>
        </div>
      </div>
    );
  }

  const hasMessages = messages.length > 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0a0f1a' }}>
      
      {/* Sidebar */}
      <ChatSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userEmail={effectiveUser?.email}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />

      {/* Area messaggi / stato iniziale */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {!hasMessages ? (
          // Stato iniziale - schermata pulita stile ChatGPT
          <div className="flex-1 flex flex-col items-center justify-center px-5 pb-32">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center mb-4 shadow-lg shadow-[#d4af37]/20">
              <Target className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-white text-xl font-bold text-center mb-1.5 leading-tight">
              Centro Decisionale Imprenditore
            </h1>
            <p className="text-slate-400 text-sm text-center max-w-xs leading-relaxed">
              Come posso aiutarti oggi?
            </p>
          </div>
        ) : (
          // Conversazione attiva
          <div className="flex-1 overflow-y-auto px-4 pt-2 pb-32">
            <div className="max-w-2xl mx-auto space-y-4">
              {messages.map((msg, i) => (
                msg.smartQuestions ? (
                  <SmartQuestionsCard 
                    key={i} 
                    data={msg.smartQuestions} 
                    onSubmit={handleSmartQuestionAnswer}
                    onSkip={handleSmartQuestionSkip}
                    isTyping={isTyping}
                  />
                ) : msg.disambiguation ? (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 max-w-[92%] space-y-3">
                      <div className="bg-slate-800/60 rounded-2xl rounded-tl-sm px-4 py-3">
                        <p className="text-sm text-slate-200">{msg.disambiguation.text}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {msg.disambiguation.categories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => handleDisambiguationSelect(msg.disambiguation, cat)}
                            disabled={isTyping}
                            className="text-left text-sm text-white px-4 py-2.5 rounded-xl border border-slate-600/50 bg-transparent hover:border-[#C8A951] transition-colors disabled:opacity-50"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : msg.role === 'assistant' && msg.isCompare ? (
                  <CompareResult key={i} data={typeof msg.content === 'string' ? (() => { try { return JSON.parse(msg.content); } catch { return null; } })() : msg.content} />
                ) : msg.role === 'assistant' ? (
                  <div key={i} className="space-y-1.5">
                    <DecisionResponse message={msg} category={lastCategory} classification={lastClassification} onFollowup={(text) => handleSend(text)} conversationId={activeConversationId} existingPlan={activeConvData?.ha_piano ? activeConvData.piano_json : null} userQuestion={messages.slice(0, i).reverse().find(m => m.role === 'user')?.content} />
                    <AIUsageBadge isAIResponse={msg.isAI} usate={msg.usageCount || consulenzeUsate} />
                  </div>
                ) : (
                  <ChatMessage key={i} message={msg} />
                )
              ))}
              {isTyping && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-slate-800/60 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Campo di input */}
      <div className="fixed z-40 px-2 pb-1 pt-1 left-0 right-0" style={{ bottom: '141px', backgroundColor: '#0a0f1a' }}>
        <div className="max-w-2xl mx-auto space-y-1">
          {!compareMode ? (
            <>
              <div className="relative flex items-end rounded-xl border border-slate-700/60 bg-slate-800/80 backdrop-blur-lg overflow-hidden" style={isRecording ? { borderColor: '#ef4444' } : {}}>
                <button
                  onClick={toggleRecording}
                  className="flex-shrink-0 ml-2 mb-2 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                  style={{ backgroundColor: isRecording ? '#ef4444' : 'transparent' }}
                >
                  {isRecording ? (
                    <MicOff className="w-3.5 h-3.5 text-white" />
                  ) : (
                    <Mic className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isRecording ? "Sto ascoltando..." : "Chiedi qualsiasi cosa..."}
                  rows={1}
                  className="flex-1 bg-transparent text-white text-sm px-2 py-2.5 resize-none outline-none placeholder:text-slate-500 max-h-28"
                  style={{ scrollbarWidth: 'none' }}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!inputText.trim() || isTyping || chatBlocked}
                  className="flex-shrink-0 m-1 w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
                  style={{
                    backgroundColor: inputText.trim() && !isTyping && !chatBlocked ? '#d4af37' : '#334155',
                  }}
                >
                  {isTyping ? (
                    <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-[#d4af37]/30 bg-slate-800/80 backdrop-blur-lg p-4 space-y-3 relative">
              {/* X per chiudere */}
              <button
                onClick={() => { setCompareMode(false); setScenarioA(''); setScenarioB(''); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-700/80 hover:bg-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-slate-300" />
              </button>
              <div className="flex items-center gap-2 mb-1">
                <Scale className="w-4 h-4 text-[#d4af37]" />
                <span className="text-xs font-semibold text-[#d4af37] uppercase tracking-wider">Confronta Scenari</span>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={scenarioA}
                  onChange={(e) => setScenarioA(e.target.value)}
                  placeholder="Scenario A (es. Assumere dipendente)"
                  rows={2}
                  className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white text-sm px-3 py-2.5 resize-none outline-none placeholder:text-slate-500 focus:border-[#d4af37]/40"
                  style={{ scrollbarWidth: 'none' }}
                />
                <textarea
                  value={scenarioB}
                  onChange={(e) => setScenarioB(e.target.value)}
                  placeholder="Scenario B (es. Usare freelance)"
                  rows={2}
                  className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white text-sm px-3 py-2.5 resize-none outline-none placeholder:text-slate-500 focus:border-[#d4af37]/40"
                  style={{ scrollbarWidth: 'none' }}
                />
              </div>
              <div className="flex items-center justify-end">
                <button
                  onClick={handleCompare}
                  disabled={!scenarioA.trim() || !scenarioB.trim() || isTyping || chatBlocked}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-30"
                  style={{
                    backgroundColor: scenarioA.trim() && scenarioB.trim() && !isTyping && !chatBlocked ? '#d4af37' : '#334155',
                    color: scenarioA.trim() && scenarioB.trim() && !isTyping && !chatBlocked ? '#1a1a2e' : '#94a3b8',
                  }}
                >
                  <Send className="w-4 h-4" />
                  {isTyping ? 'Analisi...' : 'Confronta'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Menu Drawer rimosso - il pulsante Menu naviga direttamente a MyProfile */}

      {/* Pannelli messaggi/notifiche gestiti globalmente nel Layout */}

      {/* Bottom Nav */}
      <BottomNav currentPage="Home" onMenuOpen={() => window.location.href = createPageUrl('MyProfile')} menuOpen={false} bgColor="#0a0f1a" />

      {/* Missing Profile Data Modal */}
      {missingFieldsPopup && (
        <MissingProfileDataModal
          fields={missingFieldsPopup.fields}
          onComplete={handleMissingFieldsComplete}
          onSkip={handleMissingFieldsSkip}
          existingUserData={effectiveUser}
        />
      )}
    </div>
  );
}