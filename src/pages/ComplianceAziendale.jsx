import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Shield, Upload, FileText, AlertTriangle, CheckCircle, Clock, Plus, X, ChevronDown, ChevronUp, Trash2, Calendar, Sparkles, Loader2, Building2, MoreVertical, Pencil, Camera, Image, RefreshCw, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import Header from '../components/layout/Header';
import BottomNavWithMenu from '../components/layout/BottomNavWithMenu';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import SectionConsultantPanel from '../components/consulenze/SectionConsultantPanel';
import PremiumAIGate from '@/components/common/PremiumAIGate';
import ConsultantBubble from '../components/compliance/ConsultantBubble';
import GlobalTopIcons from '../components/layout/GlobalTopIcons';
import TipoAttivitaSelector from '../components/compliance/TipoAttivitaSelector';
import StampPhotoExtractor from '../components/compliance/StampPhotoExtractor';
import { useTheme } from '../components/context/ThemeContext';

const CATEGORIE = [
  "Sicurezza sul lavoro",
  "Privacy e GDPR", 
  "Ambientale",
  "Fiscale",
  "Igiene e Sanità",
  "Antincendio",
  "Formazione obbligatoria",
  "Altro"
];

const STATO_COLORS = {
  conforme: '#22c55e',
  da_migliorare: '#f97316',
  non_conforme: '#ef4444',
  non_verificato: '#6b7280'
};

const STATO_LABELS = {
  conforme: 'Conforme',
  da_migliorare: 'Da migliorare',
  non_conforme: 'Non conforme',
  non_verificato: 'Non verificato'
};

export default function ComplianceAziendale() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [expandedNorm, setExpandedNorm] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState('all');
  
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [generatingNorms, setGeneratingNorms] = useState(false);
  const [activityType, setActivityType] = useState('');
  const [employeesCount, setEmployeesCount] = useState('');
  const [analyzingDoc, setAnalyzingDoc] = useState(null);
  const [showBranchManager, setShowBranchManager] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [editingNorm, setEditingNorm] = useState(null);
  const [showStampScanner, setShowStampScanner] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [stampDataUsed, setStampDataUsed] = useState(false);
  

  const [newBranch, setNewBranch] = useState({ 
    nome: '', 
    tipo_attivita: '', 
    codice_ateco: '', 
    indirizzo: '', 
    numero_dipendenti: '', 
    superficie_mq: '',
    data_attivazione: '',
    // Categoria attività
    tipo_attivita_categoria: 'produttiva', // produttiva / servizi / commerciale
    // Rischi REALI dichiarati
    presenza_lavoratori: true,
    presenza_macchinari: false,
    presenza_rumore: false,
    presenza_vibrazioni: false,
    presenza_sostanze_chimiche: false,
    presenza_movimentazione_carichi: false,
    presenza_videoterminali: false,
    presenza_lavori_quota: false,
    presenza_spazi_confinati: false,
    presenza_rischio_biologico: false,
    presenza_campi_elettromagnetici: false,
    presenza_radiazioni_ottiche: false,
    presenza_microclima_severo: false,
    presenza_atmosfere_esplosive: false,
    // Ambientale
    presenza_rifiuti_speciali: false,
    presenza_emissioni_atmosfera: false,
    presenza_scarichi_industriali: false,
    // Antincendio
    presenza_rischio_incendio_non_basso: false,
    // Privacy/IT
    presenza_sistemi_it_cloud: false,
    trattamento_dati_sensibili: false
  });
  const { impersonation, appMode } = useImpersonation();
  const { isDark } = useTheme();
  const queryClient = useQueryClient();

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadUser = async () => {
      setLoading(true);
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (appMode === 'user-preview' && impersonation.previewUserId) {
          const users = await base44.entities.User.filter({ id: impersonation.previewUserId });
          setEffectiveUser(users[0] || currentUser);
        } else {
          setEffectiveUser(currentUser);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [appMode, impersonation.previewUserId]);

  const { data: norms = [], isLoading: loadingNorms } = useQuery({
    queryKey: ['compliance-norms', effectiveUser?.email],
    queryFn: async () => {
      const rawNorms = await base44.entities.ComplianceNorm.filter({ user_email: effectiveUser?.email });
      
      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);
      
      for (const norm of rawNorms) {
        // Aggiorna lo stato a non_conforme SOLO se ci sono documenti caricati e la scadenza è passata
        if (norm.data_scadenza && norm.stato !== 'non_conforme' && norm.documenti_urls?.length > 0) {
          const scadenza = new Date(norm.data_scadenza);
          scadenza.setHours(0, 0, 0, 0);
          
          if (scadenza < oggi) {
            await base44.entities.ComplianceNorm.update(norm.id, { stato: 'non_conforme' });
            norm.stato = 'non_conforme';
          }
        }
      }
      
      return rawNorms;
    },
    enabled: !!effectiveUser?.email,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', effectiveUser?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: effectiveUser?.email, is_read: false }),
    enabled: !!effectiveUser?.email,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['company-branches', effectiveUser?.email],
    queryFn: () => base44.entities.CompanyBranch.filter({ user_email: effectiveUser?.email, is_active: true }),
    enabled: !!effectiveUser?.email,
  });

  const createBranchMutation = useMutation({
    mutationFn: (data) => base44.entities.CompanyBranch.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-branches'] });
      setNewBranch({ nome: '', tipo_attivita: '', codice_ateco: '', indirizzo: '', numero_dipendenti: '' });
    }
  });

  const updateBranchMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CompanyBranch.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-branches'] });
      setEditingBranch(null);
    }
  });

  const deleteBranchMutation = useMutation({
        mutationFn: async (branchId) => {
          // Elimina tutti gli adempimenti associati a questo ramo
          const branchNorms = norms.filter(n => n.branch_id === branchId);
          for (const norm of branchNorms) {
            await base44.entities.ComplianceNorm.delete(norm.id);
          }
          // Elimina definitivamente il ramo
          await base44.entities.CompanyBranch.delete(branchId);
        },
        onSuccess: () => {
          // Ricarica la pagina per pulire lo stato
          window.location.reload();
        }
      });

  const updateNormMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ComplianceNorm.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-norms'] });
    }
  });

  const deleteNormMutation = useMutation({
    mutationFn: (id) => base44.entities.ComplianceNorm.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-norms'] });
      setExpandedNorm(null);
    }
  });

  const handleAutoGenerate = async (branchId) => {
    if (!activityType.trim()) return;
    
    setGeneratingNorms(true);
    try {
      // Usa la stessa funzione di generazione
      await generateNormsForBranch(branchId, activityType, employeesCount);
      setShowAutoGenerate(false);
      setActivityType('');
      setEmployeesCount('');
    } catch (error) {
      console.error('Errore generazione:', error);
      alert('Errore nella generazione. Riprova.');
    } finally {
      setGeneratingNorms(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranch.nome.trim() || !newBranch.tipo_attivita.trim()) return;
    
    setGeneratingNorms(true);
    
    try {
      const tipoAttivita = newBranch.tipo_attivita;
      const numeroDipendenti = newBranch.numero_dipendenti || '';
      
      const createdBranch = await base44.entities.CompanyBranch.create({
                  user_email: effectiveUser?.email,
                  ...newBranch,
                  numero_dipendenti: newBranch.numero_dipendenti ? parseInt(newBranch.numero_dipendenti) : null,
                  data_attivazione: newBranch.data_attivazione || null,
                  is_active: true
                });
      
      console.log('[ComplianceAziendale] Branch creato:', createdBranch.id);
      
      queryClient.invalidateQueries({ queryKey: ['company-branches'] });
      
      await generateNormsForBranch(createdBranch.id, tipoAttivita, numeroDipendenti, newBranch.data_attivazione, newBranch.codice_ateco, newBranch);
      
      setNewBranch({ 
              nome: '', 
              tipo_attivita: '', 
              codice_ateco: '', 
              indirizzo: '', 
              numero_dipendenti: '', 
              superficie_mq: '',
              data_attivazione: '',
              tipo_attivita_categoria: 'produttiva',
              presenza_lavoratori: true,
              presenza_macchinari: false,
              presenza_rumore: false,
              presenza_vibrazioni: false,
              presenza_sostanze_chimiche: false,
              presenza_movimentazione_carichi: false,
              presenza_videoterminali: false,
              presenza_lavori_quota: false,
              presenza_spazi_confinati: false,
              presenza_rischio_biologico: false,
              presenza_campi_elettromagnetici: false,
              presenza_radiazioni_ottiche: false,
              presenza_microclima_severo: false,
              presenza_atmosfere_esplosive: false,
              presenza_rifiuti_speciali: false,
              presenza_emissioni_atmosfera: false,
              presenza_scarichi_industriali: false,
              presenza_rischio_incendio_non_basso: false,
              presenza_sistemi_it_cloud: false,
              trattamento_dati_sensibili: false
            });
      setShowBranchManager(false);
      setShowBranchForm(false);
      setShowStampScanner(false);
      setStampDataUsed(false);
      // Seleziona automaticamente il ramo appena creato per mostrare gli adempimenti
      setSelectedBranch(createdBranch.id);
    } catch (error) {
      console.error('[ComplianceAziendale] Errore creazione ramo:', error);
      console.error('[ComplianceAziendale] Error message:', error?.message);
      alert('Errore nella generazione degli adempimenti: ' + (error?.message || 'Errore sconosciuto. Riprova.'));
    } finally {
      setGeneratingNorms(false);
    }
    };
  
  const generateNormsForBranch = async (branchId, tipoAttivita, numeroDipendenti, dataAttivazione, codiceAteco, branchData = {}) => {
        if (!tipoAttivita || !tipoAttivita.trim()) {
          throw new Error('Tipo attività mancante');
        }

        const branch = branches.find(b => b.id === branchId);
        const ateco = codiceAteco || branch?.codice_ateco || '';

        if (!ateco) {
          throw new Error('Codice ATECO mancante. Inserisci il codice ATECO per generare gli adempimenti.');
        }

        const rischi = {
          lavoratori: branchData.presenza_lavoratori !== false,
          macchinari: branchData.presenza_macchinari || false,
          rumore: branchData.presenza_rumore || false,
          vibrazioni: branchData.presenza_vibrazioni || false,
          sostanze_chimiche: branchData.presenza_sostanze_chimiche || false,
          movimentazione_carichi: branchData.presenza_movimentazione_carichi || false,
          videoterminali: branchData.presenza_videoterminali || false,
          lavori_quota: branchData.presenza_lavori_quota || false,
          spazi_confinati: branchData.presenza_spazi_confinati || false,
          rischio_biologico: branchData.presenza_rischio_biologico || false,
          campi_elettromagnetici: branchData.presenza_campi_elettromagnetici || false,
          radiazioni_ottiche: branchData.presenza_radiazioni_ottiche || false,
          microclima_severo: branchData.presenza_microclima_severo || false,
          atmosfere_esplosive: branchData.presenza_atmosfere_esplosive || false,
          rifiuti_speciali: branchData.presenza_rifiuti_speciali || false,
          emissioni_atmosfera: branchData.presenza_emissioni_atmosfera || false,
          scarichi_industriali: branchData.presenza_scarichi_industriali || false,
          rischio_incendio_non_basso: branchData.presenza_rischio_incendio_non_basso || false,
          sistemi_it_cloud: branchData.presenza_sistemi_it_cloud || false,
          dati_sensibili: branchData.trattamento_dati_sensibili || false
        };

        try {
          console.log('[ComplianceAziendale] Chiamo ChatGPT per generare adempimenti ATECO:', ateco);

          const response = await base44.functions.invoke('generateComplianceNorms', {
            codice_ateco: ateco,
            tipo_attivita: tipoAttivita,
            tipo_attivita_categoria: branchData.tipo_attivita_categoria || 'produttiva',
            numero_dipendenti: numeroDipendenti || 0,
            superficie_mq: branchData.superficie_mq || 0,
            data_attivazione: dataAttivazione || new Date().toISOString().split('T')[0],
            rischi
          });

          const result = response.data;

          if (!result.success || !result.adempimenti?.length) {
            throw new Error(result.error || 'Nessun adempimento generato. Riprova.');
          }

          console.log('[ComplianceAziendale] ChatGPT ha generato', result.adempimenti.length, 'adempimenti');

          const validCategorie = ["Sicurezza sul lavoro", "Privacy e GDPR", "Ambientale", "Fiscale", "Igiene e Sanità", "Antincendio", "Formazione obbligatoria", "Altro"];

          for (const adempimento of result.adempimenti) {
            let categoria = adempimento.categoria || 'Altro';
            if (!validCategorie.includes(categoria)) {
              const partial = validCategorie.find(c => 
                categoria.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(categoria.toLowerCase())
              );
              categoria = partial || 'Altro';
            }

            await base44.entities.ComplianceNorm.create({
              user_email: effectiveUser?.email,
              branch_id: branchId,
              nome: adempimento.nome,
              descrizione: adempimento.descrizione,
              categoria: categoria,
              frequenza_rinnovo_mesi: adempimento.frequenza_rinnovo_mesi || 0,
              sanzione_prevista: adempimento.sanzione_prevista,
              priorita: adempimento.priorita || 'media',
              stato: 'non_verificato',
              data_scadenza: adempimento.data_scadenza || null,
              is_locked: true,
              documenti_urls: [],
              documenti_nomi: [],
              stato_affidabilita: adempimento.stato_affidabilita || 'non_verificato',
              riferimento_normativo: adempimento.riferimento_normativo || 'non disponibile',
              fonte_ufficiale: adempimento.fonte_ufficiale || 'non verificata',
              link_verifica: adempimento.link_verifica || null,
              ente_controllo: adempimento.ente_controllo || ''
            });
          }

          console.log('[ComplianceAziendale] Salvati', result.adempimenti.length, 'adempimenti per branch', branchId);
          queryClient.invalidateQueries({ queryKey: ['compliance-norms'] });

        } catch (error) {
          console.error('[ComplianceAziendale] ERRORE generazione:', error);
          throw error;
        }
      };

  const handleDocumentUpload = async (e, normId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const norm = norms.find(n => n.id === normId);
    if (!norm) return;

    const isAdminMode = user?.role === 'admin' && !impersonation.active;

    setUploadingDoc(true);
    setAnalyzingDoc(normId);
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const aziendaInfo = `
DATI AZIENDA REGISTRATA:
- Ragione sociale: ${effectiveUser?.company_name || 'Non specificata'}
- Partita IVA: ${effectiveUser?.vat_number || 'Non specificata'}
- Codice Fiscale: ${effectiveUser?.fiscal_code || 'Non specificato'}
- Indirizzo: ${effectiveUser?.address || 'Non specificato'}
- Città: ${effectiveUser?.city || 'Non specificata'}
- Email: ${effectiveUser?.email || 'Non specificata'}
- Codice ATECO: ${effectiveUser?.ateco_code || 'Non specificato'}
- Forma giuridica: ${effectiveUser?.legal_form || 'Non specificata'}`;

      const currentYear = new Date().getFullYear();
      const todayDate = new Date().toISOString().split('T')[0];
      
      // PRIMA ANALISI
      const firstAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un esperto di compliance aziendale italiana. Analizza questo documento e verifica LA CONFORMITÀ SECONDO LA NORMATIVA VIGENTE AGGIORNATA AL ${currentYear}.

ADEMPIMENTO RICHIESTO: "${norm.nome}"
DESCRIZIONE: "${norm.descrizione || 'Non specificata'}"
CATEGORIA: "${norm.categoria}"

${aziendaInfo}

DATA DI OGGI: ${todayDate}

REGOLE FONDAMENTALI:
- NON INVENTARE MAI informazioni non presenti nel documento
- Se non riesci a leggere o estrarre un dato, indica "non rilevabile" 
- Basa le tue conclusioni SOLO su ciò che è effettivamente scritto nel documento

CONTROLLI DA EFFETTUARE:

1. PERTINENZA: Il documento è pertinente a questo adempimento? (es: se serve un DVR e l'utente carica una fattura, NON è pertinente)

2. COERENZA AZIENDA: I dati aziendali nel documento corrispondono a quelli dell'azienda registrata?

3. CONFORMITÀ: Il documento rispetta i requisiti normativi vigenti al ${currentYear}?
   - Se ha data scadenza PASSATA rispetto a ${todayDate} → "non_conforme"
   - Se valido e non scaduto → "conforme"
   - Se mancanze minori → "da_migliorare"

4. SCADENZA: Estrai la data di scadenza se presente (YYYY-MM-DD)

5. CRITICITÀ: Elenca eventuali problemi riscontrati`,
        file_urls: [file_url],
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            documento_pertinente: { type: "boolean" },
            motivo_non_pertinente: { type: "string" },
            documento_appartiene_azienda: { type: "boolean" },
            motivo_azienda_diversa: { type: "string" },
            dati_azienda_trovati: { type: "string" },
            stato_conformita: { type: "string", enum: ["conforme", "da_migliorare", "non_conforme"] },
            data_scadenza: { type: "string" },
            criticita: { type: "array", items: { type: "string" } },
            note_analisi: { type: "string" }
          }
        }
      });

      // SECONDA ANALISI (VERIFICA)
      const secondAnalysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un revisore di compliance aziendale italiana. VERIFICA INDIPENDENTEMENTE questo documento.

ADEMPIMENTO RICHIESTO: "${norm.nome}"
CATEGORIA: "${norm.categoria}"

${aziendaInfo}

DATA DI OGGI: ${todayDate}

ISTRUZIONI CRITICHE:
- Questa è una SECONDA VERIFICA indipendente
- NON INVENTARE informazioni non presenti nel documento
- Se un dato non è leggibile/presente, scrivi "non rilevabile"
- Sii CONSERVATIVO: nel dubbio, indica "da_migliorare" invece di "conforme"

VERIFICA:
1. Il documento è pertinente all'adempimento "${norm.nome}"?
2. I dati aziendali corrispondono?
3. Il documento è conforme alla normativa ${currentYear}?
4. C'è una data di scadenza? Se sì, è passata rispetto a ${todayDate}?`,
        file_urls: [file_url],
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            documento_pertinente: { type: "boolean" },
            documento_appartiene_azienda: { type: "boolean" },
            stato_conformita: { type: "string", enum: ["conforme", "da_migliorare", "non_conforme"] },
            data_scadenza: { type: "string" },
            criticita: { type: "array", items: { type: "string" } }
          }
        }
      });

      // CONFRONTO RISULTATI - usa il più conservativo
      const analysisResult = {
        documento_pertinente: firstAnalysis.documento_pertinente && secondAnalysis.documento_pertinente,
        motivo_non_pertinente: firstAnalysis.motivo_non_pertinente || '',
        documento_appartiene_azienda: firstAnalysis.documento_appartiene_azienda && secondAnalysis.documento_appartiene_azienda,
        motivo_azienda_diversa: firstAnalysis.motivo_azienda_diversa || '',
        dati_azienda_trovati: firstAnalysis.dati_azienda_trovati || '',
        // Stato: prendi il più conservativo (non_conforme > da_migliorare > conforme)
        stato_conformita: (() => {
          const stati = [firstAnalysis.stato_conformita, secondAnalysis.stato_conformita];
          if (stati.includes('non_conforme')) return 'non_conforme';
          if (stati.includes('da_migliorare')) return 'da_migliorare';
          return 'conforme';
        })(),
        data_scadenza: firstAnalysis.data_scadenza || secondAnalysis.data_scadenza || null,
        criticita: [...new Set([...(firstAnalysis.criticita || []), ...(secondAnalysis.criticita || [])])],
        note_analisi: firstAnalysis.note_analisi || ''
      };

      console.log('[ComplianceAziendale] Doppia verifica completata:', {
        prima: firstAnalysis.stato_conformita,
        seconda: secondAnalysis.stato_conformita,
        finale: analysisResult.stato_conformita
      });

      if (!analysisResult.documento_pertinente) {
        alert(`⚠️ Documento non valido!\n\n${analysisResult.motivo_non_pertinente || 'Il documento caricato non corrisponde all\'adempimento richiesto. Assicurati di caricare il documento corretto per: ' + norm.nome}`);
        return;
      }

      if (!analysisResult.documento_appartiene_azienda && !isAdminMode) {
        alert(`⚠️ Documento di un'altra azienda!\n\n${analysisResult.motivo_azienda_diversa || 'I dati nel documento non corrispondono alla tua azienda.'}\n\n${analysisResult.dati_azienda_trovati ? 'Dati trovati nel documento: ' + analysisResult.dati_azienda_trovati : ''}\n\nControlla di aver caricato il documento corretto.`);
        return;
      }

      const newUrls = [...(norm.documenti_urls || []), file_url];
      const newNames = [...(norm.documenti_nomi || []), file.name];
      
      let statoFinale = analysisResult.stato_conformita || 'conforme';
      if (analysisResult.data_scadenza) {
        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);
        const scadenza = new Date(analysisResult.data_scadenza);
        scadenza.setHours(0, 0, 0, 0);
        
        if (scadenza < oggi) {
          statoFinale = 'non_conforme';
        }
      }
      
      const updateData = { 
        documenti_urls: newUrls, 
        documenti_nomi: newNames,
        stato: statoFinale,
        note: analysisResult.note_analisi || '',
        data_ultima_verifica: new Date().toISOString().split('T')[0]
      };

      if (analysisResult.data_scadenza) {
        updateData.data_scadenza = analysisResult.data_scadenza;
      }

      await updateNormMutation.mutateAsync({ id: normId, data: updateData });

      if (statoFinale === 'conforme') {
        alert(`✅ Documento analizzato!\n\nStato: CONFORME\n${analysisResult.data_scadenza ? 'Scadenza: ' + analysisResult.data_scadenza : ''}\n\n${analysisResult.note_analisi || ''}`);
      } else if (statoFinale === 'non_conforme') {
        const isScaduto = analysisResult.data_scadenza && new Date(analysisResult.data_scadenza) < new Date();
        alert(`🔴 Documento analizzato!\n\nStato: NON CONFORME${isScaduto ? ' (SCADUTO)' : ''}\n\nCriticità:\n${analysisResult.criticita?.join('\n') || analysisResult.note_analisi || 'Documento scaduto o non conforme'}`);
      } else {
        alert(`⚠️ Documento analizzato!\n\nStato: DA MIGLIORARE\n\nCriticità:\n${analysisResult.criticita?.join('\n') || analysisResult.note_analisi || 'Verifica necessaria'}`);
      }

    } catch (error) {
      console.error('Errore upload/analisi:', error);
      alert('Errore durante l\'analisi del documento. Riprova.');
    } finally {
      setUploadingDoc(false);
      setAnalyzingDoc(null);
    }
  };

  const removeDocument = (index, normId) => {
    const norm = norms.find(n => n.id === normId);
    const newUrls = norm.documenti_urls.filter((_, i) => i !== index);
    const newNames = norm.documenti_nomi.filter((_, i) => i !== index);
    updateNormMutation.mutate({ id: normId, data: { documenti_urls: newUrls, documenti_nomi: newNames }});
  };

  // Filtra per ramo selezionato e ordina per scadenza
  // Mostra solo adempimenti di rami ancora esistenti
  const existingBranchIds = branches.map(b => b.id);
  const filteredNorms = norms
    .filter(n => {
      // Escludi adempimenti di rami eliminati
      if (n.branch_id && !existingBranchIds.includes(n.branch_id)) return false;
      const matchBranch = selectedBranch === 'all' || n.branch_id === selectedBranch;
      const matchCategoria = selectedCategoria === 'all' || n.categoria === selectedCategoria;
      return matchBranch && matchCategoria;
    })
    .sort((a, b) => {
      // Prima quelli con scadenza (dal più vicino al più lontano)
      // Poi quelli senza scadenza
      if (!a.data_scadenza && !b.data_scadenza) return 0;
      if (!a.data_scadenza) return 1; // a va dopo
      if (!b.data_scadenza) return -1; // b va dopo
      return new Date(a.data_scadenza) - new Date(b.data_scadenza);
    });

  // Calcola statistiche basate sugli adempimenti filtrati
  // Gli adempimenti senza documenti caricati sono sempre considerati "non_verificato" per il grafico
  const stats = {
    conforme: filteredNorms.filter(n => n.stato === 'conforme' && n.documenti_urls?.length > 0).length,
    da_migliorare: filteredNorms.filter(n => n.stato === 'da_migliorare' && n.documenti_urls?.length > 0).length,
    non_conforme: filteredNorms.filter(n => n.stato === 'non_conforme' && n.documenti_urls?.length > 0).length,
    non_verificato: filteredNorms.filter(n => n.stato === 'non_verificato' || !n.documenti_urls?.length).length,
  };

  const pieData = [
    { name: 'Non verificato', value: stats.non_verificato, color: STATO_COLORS.non_verificato },
    { name: 'Conforme', value: stats.conforme, color: STATO_COLORS.conforme },
    { name: 'Da migliorare', value: stats.da_migliorare, color: STATO_COLORS.da_migliorare },
    { name: 'Non conforme', value: stats.non_conforme, color: STATO_COLORS.non_conforme },
  ].filter(d => d.value > 0);

  const getTimelinePosition = (norm) => {
    if (!norm.data_scadenza) return null;
    
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const scadenza = new Date(norm.data_scadenza);
    scadenza.setHours(0, 0, 0, 0);
    
    const giorniMancanti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    
    if (giorniMancanti < 0) {
      return { percentuale: 100, color: 'red', giorniMancanti, scadenza };
    }
    
    const frequenzaGiorni = (norm.frequenza_rinnovo_mesi || 12) * 30;
    const inizioPeriodo = new Date(scadenza);
    inizioPeriodo.setDate(inizioPeriodo.getDate() - frequenzaGiorni);
    
    const totale = scadenza - inizioPeriodo;
    const trascorso = oggi - inizioPeriodo;
    const percentuale = Math.min(Math.max((trascorso / totale) * 100, 0), 100);
    
    let color = 'green';
    if (percentuale > 85) color = 'red';
    else if (percentuale > 60) color = 'orange';
    
    return { percentuale, color, giorniMancanti, scadenza };
  };

  if (loading || !effectiveUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-64" style={{ backgroundColor: 'var(--app-bg)' }}>
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Esplora?tab=strumenti')} className="text-lime-400 p-3 -m-3 rounded-full back-arrow-tap">
              <ArrowLeft className="w-7 h-7" />
            </Link>
            <h1 className="text-lime-400 text-xl font-bold">Evita Sanzioni</h1>
          </div>
          <div className="flex items-center gap-1">
            {/* Icone gestite dal GlobalHeader */}
          </div>
        </div>

        {/* Barra riempimento rami aziendali */}
        <Card className="bg-slate-800 border-slate-700 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Rami Aziendali</span>
              <span className="text-lime-400 text-sm font-medium">{branches.length}/5</span>
            </div>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-all ${
                    i < branches.length 
                      ? 'bg-lime-400' 
                      : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
            {branches.length >= 5 && (
              <p className="text-amber-400 text-xs mt-2">⚠️ Limite massimo raggiunto</p>
            )}
          </CardContent>
        </Card>

        {/* Hero spiegazione sezione + Pulsante */}
        {branches.length === 0 && (
          <div className="mb-6 space-y-4">
            {/* Hero con immagine sovrapposta e testo a fianco */}
            <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1a2744 50%, #0f172a 100%)' }}>
              <div className="relative min-h-[280px]">
                {/* Testo */}
                <div className="relative z-10 p-5 pr-[45%]">
                  <h2 className="text-white font-extrabold text-3xl leading-none tracking-tight">Evita sanzioni</h2>
                  <h2 className="text-lime-400 font-extrabold text-3xl leading-none tracking-tight mt-1">dormi tranquillo</h2>
                  <p className="text-slate-300 text-base leading-relaxed mt-4">
                    Scopri in automatico <span className="text-lime-400 font-semibold">tutti gli obblighi</span> della tua azienda e controlla con l'AI se i documenti che hai sono in regola.
                  </p>
                </div>

                {/* Immagine vigile grande sovrapposta a destra */}
                <img 
                  src="https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/22d2f500e_ChatGPT_Image_19_mar_2026__12_32_18-removebg-preview.png" 
                  alt="Evita sanzioni" 
                  className="absolute right-[-16px] top-[-10px] w-56 h-56 object-contain drop-shadow-2xl pointer-events-none"
                />
              </div>
            </div>

            {/* Pulsante Aggiungi primo ramo */}
            <button
              onClick={() => setShowBranchManager(true)}
              className="w-full py-4 px-4 rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-3"
              style={{
                background: 'linear-gradient(180deg, #5a4a1a 0%, #3d3210 40%, #2a2208 100%)',
                boxShadow: '0 6px 0 #1a1505, 0 10px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
              }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(212,175,55,0.2)', border: '1px solid rgba(212,175,55,0.3)' }}>
                <Plus className="w-6 h-6 text-amber-300" />
              </div>
              <span className="text-amber-100 font-semibold text-base tracking-wide">Inizia — Aggiungi il tuo primo ramo</span>
            </button>
          </div>
        )}

        {/* Selezione Ramo con bottoni */}
        {branches.length > 0 && (
          <div className="mb-4">
            <Label className="text-slate-400 text-xs mb-2 block">Filtra per Ramo Aziendale</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedBranch === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedBranch('all')}
                className={selectedBranch === 'all' ? 'bg-lime-400 text-slate-900 hover:bg-lime-500' : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
              >
                Tutti i rami
              </Button>
              {branches.map(branch => (
                <Button
                  key={branch.id}
                  variant={selectedBranch === branch.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedBranch(branch.id)}
                  className={selectedBranch === branch.id ? 'bg-lime-400 text-slate-900 hover:bg-lime-500' : 'border-slate-600 text-slate-300 hover:bg-slate-700'}
                >
                  {branch.nome}
                </Button>
              ))}
            </div>
            
            {selectedBranch !== 'all' && (
              <div className="mt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-700">
                      <MoreVertical className="w-4 h-4 mr-1" />
                      Gestisci ramo
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-slate-800 border-slate-700">
                    <DropdownMenuItem 
                      onClick={() => {
                        const branch = branches.find(b => b.id === selectedBranch);
                        if (branch) {
                          setEditingBranch(branch);
                          setShowBranchManager(true);
                        }
                      }}
                      className="text-white hover:bg-slate-700 cursor-pointer"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Modifica ramo
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        const branch = branches.find(b => b.id === selectedBranch);
                        if (branch && confirm(`Eliminare il ramo "${branch.nome}" e tutti i suoi adempimenti?`)) {
                          deleteBranchMutation.mutate(branch.id);
                        }
                      }}
                      className="text-red-400 hover:bg-red-500/20 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Elimina ramo
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        )}

        {/* Messaggio se nessun ramo selezionato */}
        {branches.length > 0 && selectedBranch === 'all' && (
          <Card className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30 mb-6">
            <CardContent className="p-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <ChevronUp className="w-8 h-8 text-amber-400 animate-bounce" />
                <h3 className="text-white font-semibold text-lg">Scegli il Ramo Aziendale</h3>
                <p className="text-slate-400 text-sm">Seleziona un ramo dal menu a tendina qui sopra per visualizzare i relativi adempimenti</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contenuto visibile solo se selezionato un ramo specifico */}
        {(branches.length === 0 || selectedBranch !== 'all') && (
          <>
            {/* Pannello Consulenti rimosso - ora c'è la bolla flottante */}

            {/* Grafico a torta */}
            <Card className="bg-slate-900 border-slate-900 mb-6">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-4 text-center">Stato Conformità</h3>
                
                {filteredNorms.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Nessuna normativa inserita</p>
                    <p className="text-slate-500 text-sm">Aggiungi un ramo aziendale per generare gli adempimenti</p>
                  </div>
                ) : (
                  <>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-slate-300 text-sm">Conforme ({stats.conforme})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                        <span className="text-slate-300 text-sm">Da migliorare ({stats.da_migliorare})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span className="text-slate-300 text-sm">Non conforme ({stats.non_conforme})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                        <span className="text-slate-300 text-sm">Non verificato ({stats.non_verificato})</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Filtro categoria */}
            {filteredNorms.length > 0 && (
              <div className="mb-4 overflow-x-auto pb-2">
                <div className="flex gap-2 min-w-max">
                  <Button
                    variant={selectedCategoria === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategoria('all')}
                    className={selectedCategoria === 'all' ? 'bg-slate-700 text-white' : 'border-slate-600 text-slate-300'}
                  >
                    Tutte
                  </Button>
                  {CATEGORIE.map((cat) => {
                    const count = norms.filter(n => (selectedBranch === 'all' || n.branch_id === selectedBranch) && n.categoria === cat).length;
                    if (count === 0) return null;
                    return (
                      <Button
                        key={cat}
                        variant={selectedCategoria === cat ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategoria(cat)}
                        className={selectedCategoria === cat ? 'bg-slate-700 text-white' : 'border-slate-600 text-slate-300'}
                      >
                        {cat} ({count})
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lista normative */}
            <div className="space-y-3">
              {filteredNorms.map((norm) => {
                const timeline = getTimelinePosition(norm);
                const isExpanded = expandedNorm === norm.id;
                
                return (
                  <Card key={norm.id} className="bg-slate-800 border-slate-700 overflow-hidden">
                    <CardContent className="p-0">
                      <button
                        onClick={() => setExpandedNorm(isExpanded ? null : norm.id)}
                        className="w-full p-4 flex items-start gap-3 text-left"
                      >
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0 mt-1"
                          style={{ backgroundColor: STATO_COLORS[norm.stato] }}
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-white font-medium truncate">{norm.nome}</h4>
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-slate-400 text-sm">{norm.categoria}</p>
                            {norm.stato_affidabilita === 'verificato' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                                <CheckCircle className="w-2.5 h-2.5" />
                                Verificato
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Non verificato
                              </span>
                            )}
                          </div>

                          {/* Preview 3 righe con spiegazione e ente accertatore */}
                          {!isExpanded && (
                            <div className="mt-2 text-xs space-y-1">
                              <p className="text-slate-300 line-clamp-2">{norm.descrizione || 'Adempimento normativo obbligatorio'}</p>
                              {norm.riferimento_normativo && norm.riferimento_normativo !== 'non disponibile' && (
                                <p className="text-blue-400 text-[10px]">📜 {norm.riferimento_normativo}</p>
                              )}
                              <p className="text-amber-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span className="font-medium">
                                  Ente: {norm.ente_controllo || (
                                    norm.categoria === 'Sicurezza sul lavoro' ? 'ASL/Ispettorato del Lavoro' :
                                    norm.categoria === 'Ambientale' ? 'ARPA/Provincia' :
                                    norm.categoria === 'Antincendio' ? 'Vigili del Fuoco (VVF)' :
                                    norm.categoria === 'Privacy e GDPR' ? 'Garante Privacy' :
                                    norm.categoria === 'Igiene e Sanità' ? 'ASL/NAS' :
                                    'Autorità competente'
                                  )}
                                </span>
                              </p>
                            </div>
                          )}

                          <p className="text-xs mt-1" style={{ color: STATO_COLORS[norm.stato] }}>
                            {STATO_LABELS[norm.stato]}
                          </p>
                          {!isExpanded && (!norm.documenti_urls || norm.documenti_urls.length === 0) && (
                            <p className="text-xs mt-2 text-lime-400/80 flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              Tocca per scattare o caricare documenti
                            </p>
                          )}
                          {!isExpanded && norm.documenti_urls?.length > 0 && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex -space-x-2">
                                {norm.documenti_urls.slice(0, 3).map((url, idx) => {
                                  const fileName = norm.documenti_nomi?.[idx] || '';
                                  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url) || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
                                  return (
                                    <div key={idx} className="w-8 h-8 rounded-md border-2 border-slate-800 overflow-hidden bg-slate-700">
                                      {isImage ? (
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                          <FileText className="w-4 h-4 text-lime-400/60" />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                              <span className="text-xs text-slate-400">
                                {norm.documenti_urls.length} {norm.documenti_urls.length === 1 ? 'documento' : 'documenti'}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Mostra timeline solo se ci sono documenti caricati */}
                                              {timeline && norm.documenti_urls?.length > 0 && (
                                                <div className="px-4 pb-3">
                                                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                                                    <span>Inizio periodo</span>
                                                    <span className="flex items-center gap-1">
                                                      <Calendar className="w-3 h-3" />
                                                      Scadenza: {new Date(timeline.scadenza).toLocaleDateString('it-IT')}
                                                    </span>
                                                  </div>
                                                  <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
                                                    <div 
                                                      className="absolute inset-y-0 left-0 rounded-full"
                                                      style={{
                                                        width: `${timeline.percentuale}%`,
                                                        background: timeline.color === 'green' 
                                                          ? 'linear-gradient(90deg, #22c55e, #22c55e)'
                                                          : timeline.color === 'orange'
                                                            ? 'linear-gradient(90deg, #22c55e, #f97316)'
                                                            : 'linear-gradient(90deg, #22c55e, #f97316, #ef4444)'
                                                      }}
                                                    />
                                                    <div 
                                                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-slate-900 shadow-lg"
                                                      style={{ left: `calc(${timeline.percentuale}% - 8px)` }}
                                                    />
                                                  </div>
                                                  <p className={`text-xs mt-1 text-right ${
                                                    timeline.color === 'red' ? 'text-red-400' :
                                                    timeline.color === 'orange' ? 'text-orange-400' : 'text-green-400'
                                                  }`}>
                                                    {timeline.giorniMancanti > 0 
                                                      ? `${timeline.giorniMancanti} giorni alla scadenza`
                                                      : timeline.giorniMancanti === 0 
                                                        ? 'Scade oggi!'
                                                        : `Scaduto da ${Math.abs(timeline.giorniMancanti)} giorni`
                                                    }
                                                  </p>
                                                </div>
                                              )}

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-slate-700 pt-4 space-y-4">
                          {/* Mostra form di modifica o dettagli */}
                          {editingNorm?.id === norm.id ? (
                            <div className="space-y-3 bg-slate-900/50 rounded-lg p-3">
                              <div>
                                <Label className="text-slate-400 text-xs">Nome adempimento</Label>
                                <Input
                                  value={editingNorm.nome || ''}
                                  onChange={(e) => setEditingNorm({...editingNorm, nome: e.target.value})}
                                  className="bg-slate-800 border-slate-600 text-slate-900 mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-slate-400 text-xs">Descrizione</Label>
                                <Textarea
                                  value={editingNorm.descrizione || ''}
                                  onChange={(e) => setEditingNorm({...editingNorm, descrizione: e.target.value})}
                                  className="bg-slate-800 border-slate-600 text-slate-900 mt-1"
                                  rows={3}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-slate-400 text-xs">Data scadenza</Label>
                                  <Input
                                    type="date"
                                    value={editingNorm.data_scadenza || ''}
                                    onChange={(e) => setEditingNorm({...editingNorm, data_scadenza: e.target.value})}
                                    className="bg-slate-800 border-slate-600 text-slate-900 mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-slate-400 text-xs">Frequenza rinnovo (mesi)</Label>
                                  <Input
                                    type="number"
                                    value={editingNorm.frequenza_rinnovo_mesi || ''}
                                    onChange={(e) => setEditingNorm({...editingNorm, frequenza_rinnovo_mesi: parseInt(e.target.value) || 0})}
                                    className="bg-slate-800 border-slate-600 text-slate-900 mt-1"
                                    min="0"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-slate-400 text-xs">Stato</Label>
                                <Select
                                  value={editingNorm.stato || 'non_verificato'}
                                  onValueChange={(value) => setEditingNorm({...editingNorm, stato: value})}
                                >
                                  <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-900 mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-800 border-slate-700">
                                    <SelectItem value="conforme" className="text-green-400">✅ Conforme</SelectItem>
                                    <SelectItem value="da_migliorare" className="text-orange-400">🟠 Da migliorare</SelectItem>
                                    <SelectItem value="non_conforme" className="text-red-400">🔴 Non conforme</SelectItem>
                                    <SelectItem value="non_verificato" className="text-slate-400">⚪ Non verificato</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-slate-400 text-xs">Note</Label>
                                <Textarea
                                  value={editingNorm.note || ''}
                                  onChange={(e) => setEditingNorm({...editingNorm, note: e.target.value})}
                                  className="bg-slate-800 border-slate-600 text-slate-900 mt-1"
                                  rows={2}
                                  placeholder="Aggiungi note..."
                                />
                              </div>
                              <div className="flex gap-2 pt-2">
                                <Button
                                  size="sm"
                                  onClick={async () => {
                                    await updateNormMutation.mutateAsync({ 
                                      id: norm.id, 
                                      data: {
                                        nome: editingNorm.nome,
                                        descrizione: editingNorm.descrizione,
                                        data_scadenza: editingNorm.data_scadenza || null,
                                        frequenza_rinnovo_mesi: editingNorm.frequenza_rinnovo_mesi,
                                        stato: editingNorm.stato,
                                        note: editingNorm.note
                                      }
                                    });
                                    setEditingNorm(null);
                                  }}
                                  className="bg-lime-400 text-slate-900 hover:bg-lime-500"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Salva modifiche
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingNorm(null)}
                                  className="border-slate-600 text-slate-300"
                                >
                                  Annulla
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {/* Pulsante modifica */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingNorm({...norm})}
                                className="w-full border-lime-500/50 text-lime-400 hover:bg-lime-500/20 mb-3"
                              >
                                <Pencil className="w-4 h-4 mr-2" />
                                Modifica adempimento
                              </Button>

                              {norm.descrizione && (
                                <div>
                                  <p className="text-slate-400 text-xs mb-1">Descrizione</p>
                                  <p className="text-white text-sm">{norm.descrizione}</p>
                                </div>
                              )}

                              {/* Badge affidabilità + riferimento normativo */}
                              <div className={`rounded-lg p-3 ${
                                norm.stato_affidabilita === 'verificato' 
                                  ? 'bg-green-500/10 border border-green-500/30' 
                                  : 'bg-amber-500/10 border border-amber-500/30'
                              }`}>
                                <div className="flex items-center gap-2 mb-2">
                                  {norm.stato_affidabilita === 'verificato' ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 text-green-400" />
                                      <p className="text-green-400 text-xs font-semibold">Fonte verificata</p>
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                                      <p className="text-amber-400 text-xs font-semibold">Fonte non verificata</p>
                                    </>
                                  )}
                                </div>
                                {norm.riferimento_normativo && norm.riferimento_normativo !== 'non disponibile' && (
                                  <p className="text-slate-300 text-xs mb-1">📜 <span className="font-medium">{norm.riferimento_normativo}</span></p>
                                )}
                                {norm.fonte_ufficiale && norm.fonte_ufficiale !== 'non verificata' && (
                                  <p className="text-slate-400 text-xs mb-1">Fonte: {norm.fonte_ufficiale}</p>
                                )}
                                {norm.link_verifica && (
                                  <a href={norm.link_verifica} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs underline">
                                    🔗 Verifica su fonte ufficiale
                                  </a>
                                )}
                                {norm.ente_controllo && (
                                  <p className="text-slate-400 text-xs mt-1">Ente controllo: {norm.ente_controllo}</p>
                                )}
                                {norm.stato_affidabilita !== 'verificato' && (
                                  <p className="text-amber-300/70 text-[10px] mt-2 italic">⚠️ Adempimento basato su conoscenza AI - si consiglia verifica con un professionista</p>
                                )}
                              </div>

                              {norm.sanzione_prevista && (
                                <div className={`rounded-lg p-3 ${
                                  norm.sanzione_prevista.toLowerCase().includes('non verificata')
                                    ? 'bg-amber-500/10 border border-amber-500/30'
                                    : 'bg-red-500/10 border border-red-500/30'
                                }`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <AlertTriangle className={`w-4 h-4 ${
                                      norm.sanzione_prevista.toLowerCase().includes('non verificata') ? 'text-amber-400' : 'text-red-400'
                                    }`} />
                                    <p className={`text-xs font-medium ${
                                      norm.sanzione_prevista.toLowerCase().includes('non verificata') ? 'text-amber-400' : 'text-red-400'
                                    }`}>Sanzione prevista</p>
                                  </div>
                                  <p className={`text-sm ${
                                    norm.sanzione_prevista.toLowerCase().includes('non verificata') ? 'text-amber-300' : 'text-red-300'
                                  }`}>{norm.sanzione_prevista}</p>
                                </div>
                              )}
                            </>
                          )}

                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <Label className="text-slate-400 text-xs">Documenti allegati</Label>
                              <div className="flex items-center gap-2">
                                {/* Pulsante Fotocamera */}
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    onChange={(e) => handleDocumentUpload(e, norm.id)}
                                    disabled={uploadingDoc || analyzingDoc === norm.id}
                                  />
                                  <span className="bg-blue-500/20 text-blue-400 text-xs flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-blue-500/30 transition-colors">
                                    <Camera className="w-3 h-3" />
                                    Scatta
                                  </span>
                                </label>
                                {/* Pulsante Carica File */}
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept="image/*,.pdf,.doc,.docx"
                                    className="hidden"
                                    onChange={(e) => handleDocumentUpload(e, norm.id)}
                                    disabled={uploadingDoc || analyzingDoc === norm.id}
                                  />
                                  <span className="bg-lime-500/20 text-lime-400 text-xs flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-lime-500/30 transition-colors">
                                    <Upload className="w-3 h-3" />
                                    Carica
                                  </span>
                                </label>
                              </div>
                            </div>

                            {analyzingDoc === norm.id && (
                              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-3">
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                  <p className="text-blue-300 text-sm">L'AI sta analizzando il documento...</p>
                                </div>
                              </div>
                            )}
                            
                            {norm.documenti_urls?.length > 0 ? (
                              <div className="grid grid-cols-2 gap-2">
                                {norm.documenti_urls.map((url, idx) => {
                                  const fileName = norm.documenti_nomi?.[idx] || `Documento ${idx + 1}`;
                                  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(url) || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
                                  
                                  return (
                                    <div key={idx} className="relative group bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
                                      {/* Miniatura o icona */}
                                      <a 
                                        href={url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="block"
                                      >
                                        {isImage ? (
                                          <div className="aspect-square relative">
                                            <img 
                                              src={url} 
                                              alt={fileName}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                              }}
                                            />
                                            <div className="hidden w-full h-full items-center justify-center bg-slate-800">
                                              <FileText className="w-8 h-8 text-slate-500" />
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="aspect-square flex items-center justify-center bg-slate-800">
                                            <FileText className="w-10 h-10 text-lime-400/60" />
                                          </div>
                                        )}
                                      </a>
                                      
                                      {/* Nome file */}
                                      <div className="p-2">
                                        <p className="text-slate-300 text-xs truncate" title={fileName}>
                                          {fileName}
                                        </p>
                                      </div>
                                      
                                      {/* Pulsanti azione overlay */}
                                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* Pulsante Sostituisci */}
                                        <label className="cursor-pointer">
                                          <input
                                            type="file"
                                            accept="image/*,.pdf,.doc,.docx"
                                            className="hidden"
                                            onChange={(e) => {
                                              if (e.target.files?.[0]) {
                                                removeDocument(idx, norm.id);
                                                handleDocumentUpload(e, norm.id);
                                              }
                                            }}
                                            disabled={uploadingDoc || analyzingDoc === norm.id}
                                          />
                                          <span className="bg-blue-500 text-white p-1.5 rounded-md flex items-center justify-center hover:bg-blue-600 transition-colors">
                                            <RefreshCw className="w-3 h-3" />
                                          </span>
                                        </label>
                                        {/* Pulsante Elimina */}
                                        <button
                                          onClick={() => removeDocument(idx, norm.id)}
                                          className="bg-red-500 text-white p-1.5 rounded-md hover:bg-red-600 transition-colors"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-lg p-6 text-center">
                                <Image className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                                <p className="text-slate-500 text-sm">Nessun documento caricato</p>
                                <p className="text-slate-600 text-xs mt-1">Usa i pulsanti sopra per scattare una foto o caricare un file</p>
                              </div>
                            )}
                          </div>

                          {norm.documenti_urls?.length > 0 && norm.stato !== 'non_verificato' && (
                            <div className="bg-slate-900 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-sm font-medium ${
                                  norm.stato === 'conforme' ? 'text-green-400' :
                                  norm.stato === 'da_migliorare' ? 'text-orange-400' : 'text-red-400'
                                }`}>
                                  {norm.stato === 'conforme' ? '✅ Documento a norma' :
                                   norm.stato === 'da_migliorare' ? '🟠 Da migliorare' : '🔴 Non conforme'}
                                </span>
                                {norm.data_ultima_verifica && (
                                  <span className="text-slate-500 text-xs">
                                    Verificato: {new Date(norm.data_ultima_verifica).toLocaleDateString('it-IT')}
                                  </span>
                                )}
                              </div>
                              
                              {norm.note && (
                                <p className="text-slate-400 text-xs mb-2">{norm.note}</p>
                              )}
                            </div>
                          )}

                          {editingNorm?.id !== norm.id && (
                            <>
                              {norm.data_scadenza && timeline && timeline.giorniMancanti <= 7 && timeline.giorniMancanti >= 0 && !norm.notifica_disabilitata && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateNormMutation.mutate({ id: norm.id, data: { notifica_disabilitata: true }})}
                                  className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/20"
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Ho preso visione - Disabilita notifica
                                </Button>
                              )}

                              {!norm.is_locked && (
                                <div className="flex gap-2 pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm('Eliminare questa normativa?')) {
                                        deleteNormMutation.mutate(norm.id);
                                      }
                                    }}
                                    className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Elimina
                                  </Button>
                                </div>
                              )}
                              {norm.is_locked && (
                                <p className="text-slate-500 text-xs italic pt-2">
                                  🔒 Adempimento obbligatorio - puoi modificare date e stato
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Dialog Gestione Rami Aziendali */}
      <Dialog open={showBranchManager} onOpenChange={(open) => { setShowBranchManager(open); if (!open) { setShowBranchForm(false); setShowStampScanner(false); setStampDataUsed(false); } }}>
        <DialogContent className="fixed inset-0 w-full h-full max-w-none max-h-none rounded-none border-none overflow-y-auto p-0 translate-x-0 translate-y-0 top-0 left-0" style={{ background: isDark ? '#0a0f1a' : '#fef200' }}>
          <DialogHeader className="sticky top-0 z-10 px-5 pt-5 pb-3" style={{ background: isDark ? '#0a0f1a' : '#fef200' }}>
            <DialogTitle className={`flex items-center gap-2 text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Building2 className={`w-6 h-6 ${isDark ? 'text-lime-400' : 'text-amber-700'}`} />
              Rami Aziendali
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 px-5 pb-8">

            {branches.length < 5 && (
            <div className="pt-2">
              <Label className={`font-semibold mb-3 block ${isDark ? 'text-slate-300' : 'text-amber-900'}`}>Come vuoi inserire i dati? ({branches.length}/5)</Label>
              
              {/* Tre pulsanti: Scatta foto / Carica da galleria / Compila manualmente */}
              {!showBranchForm && !showStampScanner && (
                <div className="flex flex-col gap-3 mb-3">
                  {/* Scatta foto (camera) */}
                  <label
                    className="w-full py-4 px-4 rounded-2xl flex items-start gap-4 transition-all duration-150 active:scale-[0.98] text-left cursor-pointer"
                    style={{
                      background: isDark ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(180deg, #3d3210 0%, #2a2208 100%)',
                      boxShadow: isDark ? '0 4px 0 #020617, 0 6px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)' : '0 4px 0 #1a1505, 0 6px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
                      border: isDark ? '1px solid rgba(100,116,139,0.3)' : '1px solid rgba(212,175,55,0.25)',
                    }}
                  >
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { setShowStampScanner(true); window.__stampFile = e.target.files[0]; }}} />
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: isDark ? 'rgba(132,255,0,0.15)' : 'rgba(212,175,55,0.2)' }}>
                      <Camera className={`w-5 h-5 ${isDark ? 'text-lime-400' : 'text-amber-300'}`} />
                    </div>
                    <div>
                      <span className={`text-sm font-semibold block ${isDark ? 'text-white' : 'text-amber-100'}`}>📸 Scatta foto al timbro</span>
                      <span className={`text-xs block mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-amber-300/80'}`}>Apri la fotocamera e fotografa il timbro aziendale</span>
                    </div>
                  </label>
                  {/* Carica da galleria */}
                  <label
                    className="w-full py-4 px-4 rounded-2xl flex items-start gap-4 transition-all duration-150 active:scale-[0.98] text-left cursor-pointer"
                    style={{
                      background: isDark ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(180deg, #3d3210 0%, #2a2208 100%)',
                      boxShadow: isDark ? '0 4px 0 #020617, 0 6px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)' : '0 4px 0 #1a1505, 0 6px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
                      border: isDark ? '1px solid rgba(100,116,139,0.3)' : '1px solid rgba(212,175,55,0.25)',
                    }}
                  >
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { setShowStampScanner(true); window.__stampFile = e.target.files[0]; }}} />
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: isDark ? 'rgba(132,255,0,0.15)' : 'rgba(212,175,55,0.2)' }}>
                      <Upload className={`w-5 h-5 ${isDark ? 'text-lime-400' : 'text-amber-300'}`} />
                    </div>
                    <div>
                      <span className={`text-sm font-semibold block ${isDark ? 'text-white' : 'text-amber-100'}`}>🖼️ Carica dalla galleria</span>
                      <span className={`text-xs block mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-amber-300/80'}`}>Scegli una foto del timbro già salvata sul tuo dispositivo</span>
                    </div>
                  </label>
                  {/* Compila manualmente */}
                  <button
                    onClick={() => setShowBranchForm(true)}
                    className="w-full py-4 px-4 rounded-2xl flex items-start gap-4 transition-all duration-150 active:scale-[0.98] text-left"
                    style={{
                      background: isDark ? 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)' : 'linear-gradient(180deg, #4a3d18 0%, #33280e 100%)',
                      boxShadow: isDark ? '0 4px 0 #020617, 0 6px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)' : '0 4px 0 #1a1505, 0 6px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
                      border: isDark ? '1px solid rgba(100,116,139,0.3)' : '1px solid rgba(212,175,55,0.25)',
                    }}
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: isDark ? 'rgba(132,255,0,0.15)' : 'rgba(212,175,55,0.2)' }}>
                      <Pencil className={`w-5 h-5 ${isDark ? 'text-lime-400' : 'text-amber-300'}`} />
                    </div>
                    <div>
                      <span className={`text-sm font-semibold block ${isDark ? 'text-white' : 'text-amber-100'}`}>✏️ Compila manualmente</span>
                      <span className={`text-xs block mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-amber-300/80'}`}>Inserisci tu stesso il codice ATECO, tipo di attività e rischi presenti</span>
                    </div>
                  </button>
                </div>
              )}

              {showStampScanner && !showBranchForm && (
                <StampPhotoExtractor
                  onClose={() => setShowStampScanner(false)}
                  onDataExtracted={(data) => {
                   setNewBranch(prev => ({
                     ...prev,
                     nome: data.ragione_sociale || prev.nome,
                     tipo_attivita: data.descrizione_ateco || prev.tipo_attivita,
                     indirizzo: [data.indirizzo, data.cap, data.citta, data.provincia].filter(Boolean).join(', ') || prev.indirizzo,
                     codice_ateco: data.codice_ateco || prev.codice_ateco,
                     data_attivazione: data.anno_attivazione || prev.data_attivazione,
                     tipo_attivita_categoria: data.tipo_attivita_categoria || prev.tipo_attivita_categoria,
                   }));
                   setStampDataUsed(true);
                   setShowStampScanner(false);
                   setShowBranchForm(true);
                  }}
                />
              )}

              {showBranchForm && (
              <div className="space-y-3">
                {/* Se i dati vengono dallo scanner, mostra riepilogo compatto */}
                {stampDataUsed && (newBranch.nome || newBranch.codice_ateco || newBranch.tipo_attivita) && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-xs font-semibold">Dati compilati automaticamente</span>
                    </div>
                    {newBranch.nome && <p className="text-slate-300 text-xs"><span className="text-slate-500">Ragione sociale:</span> {newBranch.nome}</p>}
                    {newBranch.codice_ateco && <p className="text-slate-300 text-xs"><span className="text-slate-500">ATECO:</span> {newBranch.codice_ateco}</p>}
                    {newBranch.tipo_attivita && <p className="text-slate-300 text-xs"><span className="text-slate-500">Attività:</span> {newBranch.tipo_attivita}</p>}
                    {newBranch.indirizzo && <p className="text-slate-300 text-xs"><span className="text-slate-500">Indirizzo:</span> {newBranch.indirizzo}</p>}
                    {newBranch.data_attivazione && <p className="text-slate-300 text-xs"><span className="text-slate-500">Anno attivazione:</span> {newBranch.data_attivazione}</p>}
                    {newBranch.tipo_attivita_categoria && <p className="text-slate-300 text-xs"><span className="text-slate-500">Tipologia:</span> {newBranch.tipo_attivita_categoria}</p>}
                    <button onClick={() => setStampDataUsed(false)} className="text-blue-400 text-[10px] underline mt-1">Modifica dati manualmente</button>
                  </div>
                )}

                {/* Campi editabili: mostra SOLO quelli non compilati dalla foto, oppure tutti se compilazione manuale */}
                {(!stampDataUsed || !newBranch.nome) && (
                  <Input
                    value={newBranch.nome}
                    onChange={(e) => setNewBranch({...newBranch, nome: e.target.value})}
                    className="bg-white/80 border-amber-300 text-slate-900 placeholder:text-amber-700/40"
                    placeholder="Nome ramo (es: Sede Principale, Magazzino, Filiale Roma)"
                  />
                )}
                
                {(!stampDataUsed || !newBranch.tipo_attivita) && (
                  <Textarea
                    value={newBranch.tipo_attivita}
                    onChange={(e) => setNewBranch({...newBranch, tipo_attivita: e.target.value})}
                    className="bg-white/80 border-amber-300 text-slate-900 placeholder:text-amber-700/40"
                    placeholder="Tipo di attività (es: Ristorante, Officina meccanica, Ufficio amministrativo)"
                    rows={2}
                  />
                )}
                
                {(!stampDataUsed || !newBranch.codice_ateco || !newBranch.numero_dipendenti) && (
                  <div className="grid grid-cols-2 gap-2">
                    {(!stampDataUsed || !newBranch.codice_ateco) && (
                      <div>
                        <Input
                          value={newBranch.codice_ateco}
                          onChange={(e) => setNewBranch({...newBranch, codice_ateco: e.target.value})}
                          className="bg-white/80 border-amber-300 text-slate-900 placeholder:text-amber-700/40"
                          placeholder="Codice ATECO *"
                          required
                        />
                        <p className="text-amber-700/60 text-[10px] mt-0.5">Es: 56.10, 43.21, 25.11</p>
                      </div>
                    )}
                    <Input
                      type="number"
                      value={newBranch.numero_dipendenti}
                      onChange={(e) => setNewBranch({...newBranch, numero_dipendenti: e.target.value})}
                      className="bg-white/80 border-amber-300 text-slate-900 placeholder:text-amber-700/40"
                      placeholder="N° dipendenti *"
                      min="0"
                    />
                  </div>
                )}
                
                {(!stampDataUsed || !newBranch.indirizzo) && (
                  <Input
                    value={newBranch.indirizzo}
                    onChange={(e) => setNewBranch({...newBranch, indirizzo: e.target.value})}
                    className="bg-white/80 border-amber-300 text-slate-900 placeholder:text-amber-700/40"
                    placeholder="Indirizzo (opzionale)"
                  />
                )}

                {(!stampDataUsed || !newBranch.data_attivazione) && (
                  <div>
                    <Label className="text-amber-800 text-xs mb-1 block">Anno di attivazione attività *</Label>
                    <Input
                      type="number"
                      value={newBranch.data_attivazione}
                      onChange={(e) => setNewBranch({...newBranch, data_attivazione: e.target.value})}
                      className="bg-white/80 border-amber-300 text-slate-900 placeholder:text-amber-700/40"
                      placeholder="es: 2020"
                      min="1900"
                      max={new Date().getFullYear()}
                      required
                    />
                    <p className="text-amber-700/60 text-xs mt-1">Anno in cui è iniziata l'attività</p>
                  </div>
                )}

                {/* Tipo attività — mostra solo se non compilato */}
                {(!stampDataUsed || !newBranch.tipo_attivita_categoria) && (
                  <div>
                    <Label className="text-amber-800 text-xs mb-1 block">Tipologia attività</Label>
                    <div className="mt-2">
                      <TipoAttivitaSelector
                        value={newBranch.tipo_attivita_categoria}
                        onChange={(val) => setNewBranch({...newBranch, tipo_attivita_categoria: val})}
                      />
                    </div>
                  </div>
                )}

                {/* Superficie — sempre visibile (non recuperabile online) */}
                <div>
                  <Label className="text-amber-800 text-xs mb-1 block">Superficie stabilimento (mq)</Label>
                  <Input
                    type="number"
                    value={newBranch.superficie_mq}
                    onChange={(e) => setNewBranch({...newBranch, superficie_mq: e.target.value})}
                    className="bg-white/80 border-amber-300 text-slate-900 placeholder:text-amber-700/40"
                    placeholder="es: 500"
                    min="0"
                  />
                </div>

                                        {/* RISCHI REALI - Sezione completa */}
                                        <div className="space-y-4 pt-2">
                                          <Label className="text-amber-900 text-sm font-medium">RISCHI PRESENTI (dichiara solo quelli effettivi)</Label>
                                          
                                          {/* Sezione Base */}
                                          <div className="bg-white/40 rounded-lg p-3 space-y-2 border border-amber-300/30">
                                            <p className="text-amber-800 text-xs font-semibold mb-2">👷 SICUREZZA LAVORO</p>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_lavoratori} onChange={(e) => setNewBranch({...newBranch, presenza_lavoratori: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Presenza lavoratori dipendenti
                                            </label>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_macchinari} onChange={(e) => setNewBranch({...newBranch, presenza_macchinari: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Presenza macchinari (presse, torni, frese, ecc.)
                                            </label>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_rumore} onChange={(e) => setNewBranch({...newBranch, presenza_rumore: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Presenza rumore elevato
                                            </label>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_vibrazioni} onChange={(e) => setNewBranch({...newBranch, presenza_vibrazioni: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Uso utensili vibranti o mezzi
                                            </label>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_sostanze_chimiche} onChange={(e) => setNewBranch({...newBranch, presenza_sostanze_chimiche: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Uso/stoccaggio sostanze chimiche
                                            </label>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_movimentazione_carichi} onChange={(e) => setNewBranch({...newBranch, presenza_movimentazione_carichi: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Movimentazione manuale carichi
                                            </label>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_videoterminali} onChange={(e) => setNewBranch({...newBranch, presenza_videoterminali: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Uso videoterminali (&gt;20 ore/sett.)
                                            </label>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_lavori_quota} onChange={(e) => setNewBranch({...newBranch, presenza_lavori_quota: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Lavori in quota (&gt;2 metri)
                                            </label>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_spazi_confinati} onChange={(e) => setNewBranch({...newBranch, presenza_spazi_confinati: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Spazi confinati/sospetti inquinamento
                                            </label>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_rischio_biologico} onChange={(e) => setNewBranch({...newBranch, presenza_rischio_biologico: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Rischio biologico
                                            </label>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_campi_elettromagnetici} onChange={(e) => setNewBranch({...newBranch, presenza_campi_elettromagnetici: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Campi elettromagnetici (saldatura, forni induzione)
                                            </label>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_radiazioni_ottiche} onChange={(e) => setNewBranch({...newBranch, presenza_radiazioni_ottiche: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Radiazioni ottiche (saldatura, laser)
                                            </label>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_microclima_severo} onChange={(e) => setNewBranch({...newBranch, presenza_microclima_severo: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Microclima severo (caldo/freddo)
                                            </label>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_atmosfere_esplosive} onChange={(e) => setNewBranch({...newBranch, presenza_atmosfere_esplosive: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Atmosfere esplosive (ATEX)
                                            </label>
                                          </div>
                                          
                                          {/* Sezione Ambientale */}
                                          <div className="bg-white/40 rounded-lg p-3 space-y-2 border border-amber-300/30">
                                            <p className="text-green-700 text-xs font-semibold mb-2">🌿 AMBIENTALE</p>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_rifiuti_speciali} onChange={(e) => setNewBranch({...newBranch, presenza_rifiuti_speciali: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Produzione rifiuti speciali/pericolosi
                                            </label>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_emissioni_atmosfera} onChange={(e) => setNewBranch({...newBranch, presenza_emissioni_atmosfera: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Emissioni in atmosfera (fumi, vapori, COV)
                                            </label>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_scarichi_industriali} onChange={(e) => setNewBranch({...newBranch, presenza_scarichi_industriali: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Scarichi industriali (acque reflue)
                                            </label>
                                          </div>
                                          
                                          {/* Sezione Antincendio */}
                                          <div className="bg-white/40 rounded-lg p-3 space-y-2 border border-amber-300/30">
                                            <p className="text-orange-700 text-xs font-semibold mb-2">🔥 ANTINCENDIO</p>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_rischio_incendio_non_basso} onChange={(e) => setNewBranch({...newBranch, presenza_rischio_incendio_non_basso: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Rischio incendio medio/alto (DPR 151/2011)
                                            </label>
                                          </div>
                                          
                                          {/* Sezione Privacy/IT */}
                                          <div className="bg-white/40 rounded-lg p-3 space-y-2 border border-amber-300/30">
                                            <p className="text-blue-700 text-xs font-semibold mb-2">🔐 PRIVACY / IT</p>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.presenza_sistemi_it_cloud} onChange={(e) => setNewBranch({...newBranch, presenza_sistemi_it_cloud: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Uso sistemi informatici / cloud / fornitori esterni
                                            </label>
                                            
                                            <label className="flex items-center gap-2 text-slate-900 text-sm cursor-pointer">
                                              <input type="checkbox" checked={newBranch.trattamento_dati_sensibili} onChange={(e) => setNewBranch({...newBranch, trattamento_dati_sensibili: e.target.checked})} className="rounded border-amber-400 bg-white/60" />
                                              Trattamento dati sensibili/particolari su larga scala
                                            </label>
                                          </div>
                                        </div>

                                        {generatingNorms ? (
                                                              <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 rounded-xl p-6 text-center">
                                                                <div className="relative w-16 h-16 mx-auto mb-4">
                                                                  <div className="absolute inset-0 bg-purple-500/30 rounded-full animate-ping"></div>
                                                                  <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                                                                    <Sparkles className="w-8 h-8 text-white animate-pulse" />
                                                                  </div>
                                                                </div>
                                                                <h3 className="text-white font-semibold text-lg mb-2">🤖 ChatGPT sta analizzando il codice ATECO</h3>
                                                                <p className="text-slate-400 text-sm mb-3">Stiamo cercando tutte le normative obbligatorie per il tuo codice ATECO e tipo di attività...</p>
                                                                <div className="flex items-center justify-center gap-2 text-purple-400 text-xs">
                                                                  <Loader2 className="w-4 h-4 animate-spin" />
                                                                  <span>Questo può richiedere qualche secondo</span>
                                                                </div>
                                                              </div>
                                                            ) : (
                      <Button
                        onClick={handleCreateBranch}
                        disabled={!newBranch.nome.trim() || !newBranch.tipo_attivita.trim() || !newBranch.codice_ateco.trim() || !newBranch.data_attivazione || branches.length >= 5 || effectiveUser?.piano_abbonamento !== 'impresa_39'}
                        className="w-full text-slate-900 hover:opacity-90"
                        style={{ background: 'linear-gradient(180deg, #f0e68c 0%, #d4af37 50%, #b8860b 100%)', boxShadow: '0 4px 0 #8b6914, inset 0 1px 0 rgba(255,255,255,0.3)' }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Aggiungi Ramo e Genera Adempimenti
                      </Button>
                    )}
                  </div>
              )}
            </div>
            )}

              {branches.length >= 5 && (
                <div className="border-t border-amber-400/40 pt-4">
                  <div className="bg-white/40 border border-amber-400/40 rounded-lg p-4 text-center">
                    <AlertTriangle className="w-8 h-8 text-amber-700 mx-auto mb-2" />
                    <p className="text-amber-900 font-medium">Limite massimo raggiunto</p>
                    <p className="text-amber-800/70 text-sm mt-1">Puoi gestire al massimo 5 rami aziendali. Elimina un ramo esistente per aggiungerne uno nuovo.</p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

      {/* Bolla flottante consulente */}
      {effectiveUser && (
        <ConsultantBubble 
          sectionId="compliance" 
          sectionLabel="Compliance Aziendale" 
          user={effectiveUser} 
        />
      )}

      <BottomNavWithMenu currentPage="ComplianceAziendale" unreadMessages={messages.length} />
    </div>
  );
}