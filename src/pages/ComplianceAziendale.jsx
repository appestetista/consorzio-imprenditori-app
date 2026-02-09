import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Shield, Upload, FileText, AlertTriangle, CheckCircle, Clock, Plus, X, ChevronDown, ChevronUp, Trash2, Calendar, Sparkles, Loader2, Building2, MoreVertical, Pencil } from 'lucide-react';
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
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import SectionConsultantPanel from '../components/consulenze/SectionConsultantPanel';

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
  

  const [newBranch, setNewBranch] = useState({ 
    nome: '', 
    tipo_attivita: '', 
    codice_ateco: '', 
    indirizzo: '', 
    numero_dipendenti: '', 
    data_attivazione: '',
    // Campi aggiuntivi per compliance
    tipo_attivita_categoria: 'produttiva', // produttiva / servizi / commerciale
    presenza_lavoratori: true,
    presenza_sostanze_chimiche: false,
    presenza_rifiuti_speciali: false,
    presenza_emissioni_atmosfera: false,
    presenza_scarichi_industriali: false,
    presenza_rischio_incendio_non_basso: false
  });
  const { impersonation, appMode } = useImpersonation();
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
          queryClient.invalidateQueries({ queryKey: ['company-branches'] });
          queryClient.invalidateQueries({ queryKey: ['compliance-norms'] });
          // Se il ramo eliminato era selezionato, resetta la selezione
          setSelectedBranch('all');
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
              data_attivazione: '',
              tipo_attivita_categoria: 'produttiva',
              presenza_lavoratori: true,
              presenza_sostanze_chimiche: false,
              presenza_rifiuti_speciali: false,
              presenza_emissioni_atmosfera: false,
              presenza_scarichi_industriali: false,
              presenza_rischio_incendio_non_basso: false
            });
      setShowBranchManager(false);
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
          console.error('[ComplianceAziendale] tipoAttivita mancante');
          throw new Error('Tipo attività mancante');
        }

        const branch = branches.find(b => b.id === branchId);
        const ateco = codiceAteco || branch?.codice_ateco || '';
        const dataBase = dataAttivazione || new Date().toISOString().split('T')[0];
        
        // Estrai le caratteristiche per il prompt
        const caratteristiche = {
          tipo_categoria: branchData.tipo_attivita_categoria || 'produttiva',
          lavoratori: branchData.presenza_lavoratori !== false,
          sostanze_chimiche: branchData.presenza_sostanze_chimiche || false,
          rifiuti_speciali: branchData.presenza_rifiuti_speciali || false,
          emissioni_atmosfera: branchData.presenza_emissioni_atmosfera || false,
          scarichi_industriali: branchData.presenza_scarichi_industriali || false,
          rischio_incendio_non_basso: branchData.presenza_rischio_incendio_non_basso || false
        };
        
        const caratteristichePrompt = `
CARATTERISTICHE SPECIFICHE DELL'ATTIVITÀ:
- ATECO: ${ateco || 'non specificato'}
- Tipo attività: ${caratteristiche.tipo_categoria}
- Presenza lavoratori: ${caratteristiche.lavoratori ? 'SÌ' : 'NO'}
- Presenza sostanze chimiche: ${caratteristiche.sostanze_chimiche ? 'SÌ' : 'NO'}
- Presenza rifiuti speciali: ${caratteristiche.rifiuti_speciali ? 'SÌ' : 'NO'}
- Presenza emissioni in atmosfera: ${caratteristiche.emissioni_atmosfera ? 'SÌ' : 'NO'}
- Presenza scarichi industriali: ${caratteristiche.scarichi_industriali ? 'SÌ' : 'NO'}
- Presenza rischio incendio non basso: ${caratteristiche.rischio_incendio_non_basso ? 'SÌ' : 'NO'}`;

        try {
          console.log('[ComplianceAziendale] START Generazione adempimenti per:', { branchId, tipoAttivita, numeroDipendenti, dataAttivazione, ateco });

          const allAdempimenti = [];

          // FASE 1: Adempimenti Sicurezza sul Lavoro (D.Lgs. 81/08)
          console.log('[ComplianceAziendale] FASE 1: Sicurezza sul lavoro...');
          const sicurezzaResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Agisci come consulente senior di compliance aziendale italiana specializzato in Sicurezza sul lavoro (D.Lgs. 81/08).
Anno di riferimento: 2026. Usa ESCLUSIVAMENTE normativa italiana vigente. NO esempi esteri, NO buone pratiche volontarie, NO certificazioni facoltative (ISO, ESG).

DATI AZIENDA:
- Attività: ${tipoAttivita}
- Numero dipendenti: ${numeroDipendenti || 'non specificato'}
- Data inizio attività: ${dataBase}
${caratteristichePrompt}

GENERA GLI ADEMPIMENTI OBBLIGATORI PER LEGGE (D.Lgs. 81/08 e s.m.i.):

OBBLIGHI GENERALI (Art. 17, 18, 28, 36, 37):
- DVR - Documento Valutazione Rischi (Art. 17, 28)
- Nomina RSPP (Art. 17, 31-34)
- Nomina RLS o RLST (Art. 47-50)
- Formazione lavoratori Art. 37 - generale 4h + specifica (4/8/12h per rischio)
- Informazione lavoratori Art. 36
- Addetti Primo Soccorso + formazione DM 388/03
- Addetti Antincendio + formazione DM 02/09/2021
- Piano Emergenza ed Evacuazione (Art. 43-46)

OBBLIGHI SPECIFICI PER RISCHIO (se applicabili al codice ATECO):
- Valutazione rischio chimico (Titolo IX, Capo I) - ATECO 20.xx, 21.xx, 25.xx
- Valutazione rischio cancerogeno/mutageno (Titolo IX, Capo II)
- Valutazione ATEX (Titolo XI) - ATECO 20.xx, 45.xx (carburanti)
- Valutazione rumore (Titolo VIII, Capo II) - ATECO 25.xx-28.xx, 41.xx-43.xx
- Valutazione vibrazioni (Titolo VIII, Capo III)
- Valutazione MMC (Titolo VI) - movimentazione manuale carichi
- Valutazione VDT (Titolo VII) - videoterminali
- Valutazione rischio biologico (Titolo X) - ATECO 86.xx, 10.xx
- Nomina Medico Competente (Art. 18, 38-42) - obbligatorio se rischi specifici
- Sorveglianza sanitaria periodica (Art. 41)

FORMAZIONE SPECIFICA SETTORIALE:
- ATECO 41.xx-43.xx: Formazione ponteggi (Art. 136), POS, PSC
- ATECO 45.xx: Formazione attrezzature specifiche

Per ogni adempimento OBBLIGATORIO indica:
- nome: denominazione ufficiale
- descrizione: articolo di legge specifico (es. "Art. 28 D.Lgs. 81/08")
- frequenza_rinnovo_mesi: 0=una tantum, 12=annuale, 60=quinquennale, etc.
- sanzione_prevista: range sanzione (Art. 55-60 D.Lgs. 81/08)
- priorita: alta/media/bassa
- data_scadenza: ${dataBase} + frequenza in formato YYYY-MM-DD (null se una tantum)`,
            add_context_from_internet: false,
            response_json_schema: {
              type: "object",
              properties: {
                adempimenti: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      nome: { type: "string" },
                      descrizione: { type: "string" },
                      frequenza_rinnovo_mesi: { type: "number" },
                      sanzione_prevista: { type: "string" },
                      priorita: { type: "string" },
                      data_scadenza: { type: "string" }
                    }
                  }
                }
              }
            }
          });
          
          if (sicurezzaResult?.adempimenti) {
            sicurezzaResult.adempimenti.forEach(a => allAdempimenti.push({ ...a, categoria: 'Sicurezza sul lavoro' }));
            console.log('[ComplianceAziendale] Sicurezza:', sicurezzaResult.adempimenti.length, 'adempimenti');
          }

          // FASE 2: Adempimenti Ambientali (D.Lgs. 152/06)
          console.log('[ComplianceAziendale] FASE 2: Ambientale...');
          const ambientaleResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Agisci come consulente senior di compliance aziendale italiana specializzato in Ambiente (D.Lgs. 152/06 - Testo Unico Ambiente).
Anno di riferimento: 2026. Usa ESCLUSIVAMENTE normativa italiana ed europea vigente. NO esempi esteri, NO buone pratiche volontarie, NO certificazioni facoltative.

DATI AZIENDA:
- Attività: ${tipoAttivita}
- Data inizio attività: ${dataBase}
${caratteristichePrompt}

GENERA GLI ADEMPIMENTI AMBIENTALI OBBLIGATORI:

RIFIUTI (Parte IV D.Lgs. 152/06, Art. 188-266):
- Registro cronologico carico/scarico rifiuti (Art. 190) - produttori rifiuti pericolosi o >10 dipendenti
- Formulario Identificazione Rifiuti FIR (Art. 193)
- MUD - Modello Unico Dichiarazione ambientale (L. 70/94) - scadenza 30 aprile annuale
- Iscrizione RENTRI (nuovo dal 2025) - sostitutivo registro/FIR
- Classificazione rifiuti secondo Decisione 2014/955/UE (codici EER)
- Deposito temporaneo conforme (Art. 183, lett. bb)

EMISSIONI IN ATMOSFERA (Parte V D.Lgs. 152/06, Art. 267-281):
- Autorizzazione emissioni (Art. 269) - attività in deroga o ordinaria
- Autorizzazione Unica Ambientale AUA (DPR 59/2013) - PMI
- Piano Gestione Solventi (Art. 275) - se COV > soglie Allegato III Parte V

SCARICHI IDRICI (Parte III D.Lgs. 152/06):
- Autorizzazione allo scarico (Art. 124-127) - se scarichi in fognatura/acque superficiali

APPLICABILITÀ PER SETTORE:
- ATECO 20.xx (Chimica/Vernici): TUTTI gli adempimenti sopra + Piano Gestione Solventi
- ATECO 25.xx-28.xx (Metalmeccanica): Rifiuti + Emissioni (se verniciatura)
- ATECO 10.xx-11.xx (Alimentare): Rifiuti + Scarichi
- ATECO 45.xx (Autoriparazione): Rifiuti pericolosi (oli, batterie, filtri)
- ATECO 41.xx-43.xx (Edilizia): Rifiuti speciali cantiere

Per ogni adempimento OBBLIGATORIO indica:
- nome: denominazione ufficiale
- descrizione: articolo di legge specifico
- frequenza_rinnovo_mesi: 12=MUD, 0=una tantum, 60=AUA, 180=autorizzazione 15 anni
- sanzione_prevista: Art. 255-260 D.Lgs. 152/06
- priorita: alta/media/bassa
- data_scadenza: YYYY-MM-DD calcolata da ${dataBase} (null se una tantum)`,
            add_context_from_internet: false,
            response_json_schema: {
              type: "object",
              properties: {
                adempimenti: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      nome: { type: "string" },
                      descrizione: { type: "string" },
                      frequenza_rinnovo_mesi: { type: "number" },
                      sanzione_prevista: { type: "string" },
                      priorita: { type: "string" },
                      data_scadenza: { type: "string" }
                    }
                  }
                }
              }
            }
          });
          
          if (ambientaleResult?.adempimenti) {
            ambientaleResult.adempimenti.forEach(a => allAdempimenti.push({ ...a, categoria: 'Ambientale' }));
            console.log('[ComplianceAziendale] Ambientale:', ambientaleResult.adempimenti.length, 'adempimenti');
          }

          // FASE 3: Chimica REACH/CLP + Privacy + Antincendio + Amministrativo + Igiene
          console.log('[ComplianceAziendale] FASE 3: Chimica, Privacy, Antincendio, SUAP, Igiene...');
          const altroResult = await base44.integrations.Core.InvokeLLM({
            prompt: `Agisci come consulente senior di compliance aziendale italiana specializzato in: Chimica (REACH/CLP), Privacy (GDPR), Antincendio (VVF), Amministrativo-produttivo (SUAP), Igiene alimentare.
Anno di riferimento: 2026. Usa ESCLUSIVAMENTE normativa italiana ed europea vigente. NO esempi esteri, NO buone pratiche volontarie, NO certificazioni facoltative (ISO, ESG).

DATI AZIENDA:
- Attività: ${tipoAttivita}
- Data inizio attività: ${dataBase}
${caratteristichePrompt}

GENERA ADEMPIMENTI OBBLIGATORI PER LE SEGUENTI AREE:

1. CHIMICA - REACH/CLP (Reg. CE 1907/2006 e Reg. CE 1272/2008):
Se l'attività usa/produce sostanze chimiche (ATECO 20.xx, 21.xx, o utilizzatori a valle):
- Schede Dati di Sicurezza SDS conformi Reg. 2020/878 - categoria "Altro"
- Etichettatura CLP conforme Reg. 1272/2008 - categoria "Altro"
- Scenari di esposizione (se sostanze SVHC) - categoria "Altro"
- Notifica SCIP (Art. 9 Direttiva 2008/98/CE) - se articoli con SVHC >0,1%

2. PRIVACY - GDPR (Reg. UE 2016/679 + D.Lgs. 196/03 novellato):
OBBLIGATORIO per TUTTE le attività con dipendenti:
- Informativa privacy dipendenti Art. 13 GDPR - categoria "Privacy e GDPR"
- Registro trattamenti Art. 30 GDPR - categoria "Privacy e GDPR"
- Nomina autorizzati al trattamento - categoria "Privacy e GDPR"
- Nomina Responsabili esterni Art. 28 GDPR - categoria "Privacy e GDPR"
- DPO (se >250 dip. o trattamenti particolari) - categoria "Privacy e GDPR"

3. ANTINCENDIO - VVF (DPR 151/2011, DM 03/08/2015):
Se attività in Allegato I DPR 151/2011:
- SCIA Antincendio o CPI (cat. A/B/C) - categoria "Antincendio"
- Rinnovo periodico CPI (5 anni) - categoria "Antincendio"
- Registro controlli antincendio DM 02/09/2021 - categoria "Antincendio"

4. AMMINISTRATIVO - SUAP (DPR 160/2010):
- SCIA produttiva al SUAP - categoria "Altro"
- Agibilità/conformità urbanistica - categoria "Altro"
- Autorizzazione commercio (se ATECO 47.xx alimentari) - categoria "Altro"

5. IGIENE ALIMENTARE (Reg. CE 852/2004, 178/2002):
Se ATECO 10.xx, 11.xx, 47.xx alimentari, 55.xx, 56.xx:
- Registrazione/Notifica OSA alla ASL - categoria "Igiene e Sanità"
- Manuale autocontrollo HACCP - categoria "Igiene e Sanità"
- Tracciabilità Reg. CE 178/2002 - categoria "Igiene e Sanità"
- Formazione alimentaristi (Reg. CE 852/2004) - categoria "Igiene e Sanità"

Per ogni adempimento OBBLIGATORIO indica:
- nome: denominazione ufficiale
- descrizione: norma di riferimento specifica
- categoria: una tra "Privacy e GDPR", "Antincendio", "Igiene e Sanità", "Altro"
- frequenza_rinnovo_mesi: 0=una tantum, 60=CPI 5 anni, etc.
- sanzione_prevista: riferimento normativo sanzioni
- priorita: alta/media/bassa
- data_scadenza: YYYY-MM-DD calcolata da ${dataBase} (null se una tantum)`,
            add_context_from_internet: false,
            response_json_schema: {
              type: "object",
              properties: {
                adempimenti: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      nome: { type: "string" },
                      descrizione: { type: "string" },
                      categoria: { type: "string" },
                      frequenza_rinnovo_mesi: { type: "number" },
                      sanzione_prevista: { type: "string" },
                      priorita: { type: "string" },
                      data_scadenza: { type: "string" }
                    }
                  }
                }
              }
            }
          });
          
          if (altroResult?.adempimenti) {
            altroResult.adempimenti.forEach(a => allAdempimenti.push(a));
            console.log('[ComplianceAziendale] Altro:', altroResult.adempimenti.length, 'adempimenti');
          }

          // Salva tutti gli adempimenti
          console.log('[ComplianceAziendale] Totale adempimenti generati:', allAdempimenti.length);
          
          if (allAdempimenti.length === 0) {
            throw new Error('Nessun adempimento generato. Riprova.');
          }

          const validCategorie = ["Sicurezza sul lavoro", "Privacy e GDPR", "Ambientale", "Fiscale", "Igiene e Sanità", "Antincendio", "Formazione obbligatoria", "Altro"];

          for (const adempimento of allAdempimenti) {
            let categoria = adempimento.categoria || 'Altro';
            const categoriaLower = categoria.toLowerCase().trim();
            const matchedCategoria = validCategorie.find(c => c.toLowerCase() === categoriaLower);
            if (matchedCategoria) {
              categoria = matchedCategoria;
            } else {
              const partialMatch = validCategorie.find(c => 
                categoriaLower.includes(c.toLowerCase()) || c.toLowerCase().includes(categoriaLower)
              );
              categoria = partialMatch || 'Altro';
            }

            await base44.entities.ComplianceNorm.create({
              user_email: effectiveUser?.email,
              branch_id: branchId,
              nome: adempimento.nome,
              descrizione: adempimento.descrizione,
              categoria: categoria,
              frequenza_rinnovo_mesi: adempimento.frequenza_rinnovo_mesi || 12,
              sanzione_prevista: adempimento.sanzione_prevista,
              priorita: adempimento.priorita || 'media',
              stato: 'non_verificato',
              data_scadenza: adempimento.data_scadenza || null,
              is_locked: true,
              documenti_urls: [],
              documenti_nomi: []
            });
          }

          console.log('[ComplianceAziendale] Salvati', allAdempimenti.length, 'adempimenti per branch', branchId);
          
          try {
            queryClient.invalidateQueries({ queryKey: ['compliance-norms'] });
          } catch (qcError) {
            console.warn('[ComplianceAziendale] Errore invalidazione query (non critico):', qcError);
          }

          console.log('[ComplianceAziendale] Generazione completata con successo');

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

      const analysisResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Sei un esperto di compliance aziendale italiana. Analizza questo documento e verifica:

ADEMPIMENTO RICHIESTO: "${norm.nome}"
DESCRIZIONE: "${norm.descrizione || 'Non specificata'}"
CATEGORIA: "${norm.categoria}"

${aziendaInfo}

CONTROLLI DA EFFETTUARE IN ORDINE:

1. PERTINENZA: Il documento è pertinente a questo adempimento? (es: se serve un DVR e l'utente carica una fattura, NON è pertinente)

2. COERENZA AZIENDA: Se il documento è pertinente, verifica che i dati aziendali nel documento (ragione sociale, P.IVA, CF, indirizzo) corrispondano ai dati dell'azienda registrata sopra. 
   - Se trovi una ragione sociale diversa, P.IVA diversa, o dati di un'altra azienda → il documento NON appartiene a questa azienda
   - Sii rigoroso: anche piccole discrepanze nei dati identificativi (P.IVA, CF) indicano un documento di un'altra azienda

3. CONFORMITÀ: Se passa i controlli 1 e 2, verifica se il documento è conforme ai requisiti di legge
   - IMPORTANTE: Se il documento ha una data di scadenza e questa è PASSATA (nel passato rispetto ad oggi ${new Date().toISOString().split('T')[0]}), il documento è SCADUTO e quindi lo stato DEVE essere "non_conforme" (rosso)
   - Se il documento è valido e non scaduto → "conforme"
   - Se ci sono piccole mancanze ma non è scaduto → "da_migliorare"

4. SCADENZA: Cerca la data di scadenza/rinnovo nel documento (formato YYYY-MM-DD)

IMPORTANTE: Sii molto rigoroso. Un documento scaduto è SEMPRE non_conforme, non importa se era valido prima.`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            documento_pertinente: { type: "boolean" },
            motivo_non_pertinente: { type: "string" },
            documento_appartiene_azienda: { type: "boolean" },
            motivo_azienda_diversa: { type: "string" },
            dati_azienda_trovati: { type: "string", description: "Ragione sociale/P.IVA trovati nel documento" },
            documento_conforme: { type: "boolean" },
            stato_conformita: { type: "string", enum: ["conforme", "da_migliorare", "non_conforme"] },
            data_scadenza: { type: "string", description: "Data in formato YYYY-MM-DD se trovata" },
            criticita: { type: "array", items: { type: "string" } },
            note_analisi: { type: "string" }
          }
        }
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
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={effectiveUser || user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Home')} className="text-lime-400">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-lime-400 text-xl font-bold">Compliance Aziendale</h1>
          </div>
          <Button 
            onClick={() => setShowBranchManager(true)}
            className="bg-lime-400 text-slate-900 hover:bg-lime-500"
            size="sm"
          >
            <Building2 className="w-4 h-4 mr-1" /> Rami Azienda
          </Button>
        </div>

        {/* Banner Aggiungi primo ramo */}
        {branches.length === 0 && (
          <Card 
            className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/30 mb-6 cursor-pointer hover:border-blue-400/50 transition-colors"
            onClick={() => setShowBranchManager(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/30 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold">Aggiungi il primo Ramo Aziendale</h3>
                  <p className="text-slate-400 text-sm">Inserisci i rami della tua azienda per generare gli adempimenti obbligatori</p>
                </div>
                <ChevronDown className="w-5 h-5 text-blue-400" />
              </div>
            </CardContent>
          </Card>
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
            {/* Pannello Consulenti per questa sezione */}
            {effectiveUser && (
              <div className="mb-6">
                <SectionConsultantPanel 
                  sectionId="compliance" 
                  sectionLabel="Compliance Aziendale" 
                  user={effectiveUser} 
                />
              </div>
            )}

            {/* Grafico a torta */}
            <Card className="bg-slate-800 border-slate-700 mb-6">
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
                          <p className="text-slate-400 text-sm">{norm.categoria}</p>
                          <p className="text-xs mt-1" style={{ color: STATO_COLORS[norm.stato] }}>
                            {STATO_LABELS[norm.stato]}
                          </p>
                          {!isExpanded && (!norm.documenti_urls || norm.documenti_urls.length === 0) && (
                            <p className="text-xs mt-2 text-lime-400/80 flex items-center gap-1">
                              <Upload className="w-3 h-3" />
                              Tocca per caricare documenti
                            </p>
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
                                  className="bg-slate-800 border-slate-600 text-white mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-slate-400 text-xs">Descrizione</Label>
                                <Textarea
                                  value={editingNorm.descrizione || ''}
                                  onChange={(e) => setEditingNorm({...editingNorm, descrizione: e.target.value})}
                                  className="bg-slate-800 border-slate-600 text-white mt-1"
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
                                    className="bg-slate-800 border-slate-600 text-white mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-slate-400 text-xs">Frequenza rinnovo (mesi)</Label>
                                  <Input
                                    type="number"
                                    value={editingNorm.frequenza_rinnovo_mesi || ''}
                                    onChange={(e) => setEditingNorm({...editingNorm, frequenza_rinnovo_mesi: parseInt(e.target.value) || 0})}
                                    className="bg-slate-800 border-slate-600 text-white mt-1"
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
                                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white mt-1">
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
                                  className="bg-slate-800 border-slate-600 text-white mt-1"
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

                              {norm.sanzione_prevista && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <AlertTriangle className="w-4 h-4 text-red-400" />
                                    <p className="text-red-400 text-xs font-medium">Sanzione prevista</p>
                                  </div>
                                  <p className="text-red-300 text-sm">{norm.sanzione_prevista}</p>
                                </div>
                              )}
                            </>
                          )}

                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-slate-400 text-xs">Documenti allegati</Label>
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => handleDocumentUpload(e, norm.id)}
                                  disabled={uploadingDoc || analyzingDoc === norm.id}
                                />
                                <span className="text-lime-400 text-xs flex items-center gap-1 hover:underline">
                                  <Upload className="w-3 h-3" />
                                  {analyzingDoc === norm.id ? 'Analisi AI in corso...' : uploadingDoc ? 'Caricamento...' : 'Carica documento'}
                                </span>
                              </label>
                            </div>

                            {analyzingDoc === norm.id && (
                              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-2">
                                <div className="flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                                  <p className="text-blue-300 text-sm">L'AI sta analizzando il documento...</p>
                                </div>
                              </div>
                            )}
                            
                            {norm.documenti_urls?.length > 0 ? (
                              <div className="space-y-2">
                                {norm.documenti_urls.map((url, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-slate-900 rounded-lg p-2">
                                    <a 
                                      href={url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-lime-400 text-sm flex items-center gap-2 truncate hover:underline"
                                    >
                                      <FileText className="w-4 h-4 flex-shrink-0" />
                                      <span className="truncate">{norm.documenti_nomi?.[idx] || `Documento ${idx + 1}`}</span>
                                    </a>
                                    <button
                                      onClick={() => removeDocument(idx, norm.id)}
                                      className="text-red-400 hover:text-red-300 p-1"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-slate-500 text-sm">Nessun documento caricato</p>
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
      <Dialog open={showBranchManager} onOpenChange={setShowBranchManager}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-lime-400" />
              Rami Aziendali
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Rami esistenti ({branches.length})</Label>
              {branches.length === 0 ? (
                <p className="text-slate-500 text-sm py-2">Nessun ramo aziendale configurato. Aggiungine uno qui sotto.</p>
              ) : (
                branches.map(branch => (
                  <Card key={branch.id} className="bg-slate-900 border-slate-700">
                    <CardContent className="p-3">
                      {editingBranch?.id === branch.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editingBranch.nome || ''}
                            onChange={(e) => setEditingBranch({...editingBranch, nome: e.target.value})}
                            className="bg-slate-800 border-slate-600 text-white"
                            placeholder="Nome ramo"
                          />
                          <Textarea
                            value={editingBranch.tipo_attivita || ''}
                            onChange={(e) => setEditingBranch({...editingBranch, tipo_attivita: e.target.value})}
                            className="bg-slate-800 border-slate-600 text-white"
                            placeholder="Tipo attività"
                            rows={2}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              value={editingBranch.codice_ateco || ''}
                              onChange={(e) => setEditingBranch({...editingBranch, codice_ateco: e.target.value})}
                              className="bg-slate-800 border-slate-600 text-white"
                              placeholder="Codice ATECO"
                            />
                            <Input
                              type="number"
                              value={editingBranch.numero_dipendenti || ''}
                              onChange={(e) => setEditingBranch({...editingBranch, numero_dipendenti: e.target.value ? parseInt(e.target.value) : null})}
                              className="bg-slate-800 border-slate-600 text-white"
                              placeholder="N° dipendenti"
                              min="0"
                            />
                          </div>
                          <Input
                            value={editingBranch.indirizzo || ''}
                            onChange={(e) => setEditingBranch({...editingBranch, indirizzo: e.target.value})}
                            className="bg-slate-800 border-slate-600 text-white"
                            placeholder="Indirizzo"
                          />
                          <div>
                            <Label className="text-slate-400 text-xs mb-1 block">Data attivazione</Label>
                            <Input
                              type="date"
                              value={editingBranch.data_attivazione || ''}
                              onChange={(e) => setEditingBranch({...editingBranch, data_attivazione: e.target.value})}
                              className="bg-slate-800 border-slate-600 text-white"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => updateBranchMutation.mutate({ id: branch.id, data: editingBranch })} className="bg-lime-400 text-slate-900">
                              Salva
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingBranch(null)} className="border-slate-600 text-slate-300">
                              Annulla
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{branch.nome}</p>
                            <p className="text-slate-400 text-sm">{branch.tipo_attivita}</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {branch.codice_ateco && (
                                <span className="text-slate-500 text-xs bg-slate-800 px-2 py-0.5 rounded">ATECO: {branch.codice_ateco}</span>
                              )}
                              {branch.numero_dipendenti && (
                                <span className="text-slate-500 text-xs bg-slate-800 px-2 py-0.5 rounded">{branch.numero_dipendenti} dip.</span>
                              )}
                              {branch.data_attivazione && (
                                <span className="text-slate-500 text-xs bg-slate-800 px-2 py-0.5 rounded">Dal: {new Date(branch.data_attivazione).toLocaleDateString('it-IT')}</span>
                              )}
                            </div>
                            {branch.indirizzo && (
                              <p className="text-slate-500 text-xs mt-1">{branch.indirizzo}</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setEditingBranch(branch)} className="text-slate-400 hover:text-white">
                              ✏️
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => {
                                if (confirm(`Eliminare il ramo "${branch.nome}" e tutti i suoi adempimenti?`)) {
                                  deleteBranchMutation.mutate(branch.id);
                                }
                              }} 
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="border-t border-slate-700 pt-4">
              <Label className="text-slate-300 mb-2 block">Aggiungi nuovo ramo</Label>
              
              <div className="space-y-3">
                <Input
                  value={newBranch.nome}
                  onChange={(e) => setNewBranch({...newBranch, nome: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="Nome ramo (es: Sede Principale, Magazzino, Filiale Roma)"
                />
                
                <Textarea
                  value={newBranch.tipo_attivita}
                  onChange={(e) => setNewBranch({...newBranch, tipo_attivita: e.target.value})}
                  className="bg-slate-900 border-slate-700 text-white"
                  placeholder="Tipo di attività (es: Ristorante, Officina meccanica, Ufficio amministrativo)"
                  rows={2}
                />
                
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newBranch.codice_ateco}
                    onChange={(e) => setNewBranch({...newBranch, codice_ateco: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                    placeholder="Codice ATECO"
                  />
                  <Input
                    type="number"
                    value={newBranch.numero_dipendenti}
                    onChange={(e) => setNewBranch({...newBranch, numero_dipendenti: e.target.value})}
                    className="bg-slate-900 border-slate-700 text-white"
                    placeholder="N° dipendenti"
                    min="0"
                  />
                </div>
                
                <Input
                                        value={newBranch.indirizzo}
                                        onChange={(e) => setNewBranch({...newBranch, indirizzo: e.target.value})}
                                        className="bg-slate-900 border-slate-700 text-white"
                                        placeholder="Indirizzo (opzionale)"
                                      />

                                      <div>
                                          <Label className="text-slate-400 text-xs mb-1 block">Data di attivazione attività *</Label>
                                          <Input
                                            type="date"
                                            value={newBranch.data_attivazione}
                                            onChange={(e) => setNewBranch({...newBranch, data_attivazione: e.target.value})}
                                            className="bg-slate-900 border-slate-700 text-white"
                                            required
                                          />
                                          <p className="text-slate-500 text-xs mt-1">Data in cui è iniziata l'attività (per calcolare le scadenze)</p>
                                        </div>

                                        {/* Tipo attività */}
                                        <div>
                                          <Label className="text-slate-400 text-xs mb-1 block">Tipologia attività</Label>
                                          <Select
                                            value={newBranch.tipo_attivita_categoria}
                                            onValueChange={(value) => setNewBranch({...newBranch, tipo_attivita_categoria: value})}
                                          >
                                            <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-800 border-slate-700">
                                              <SelectItem value="produttiva" className="text-white">Produttiva (manifattura, industria)</SelectItem>
                                              <SelectItem value="servizi" className="text-white">Servizi (uffici, consulenza)</SelectItem>
                                              <SelectItem value="commerciale" className="text-white">Commerciale (vendita, negozio)</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        {/* Caratteristiche per compliance */}
                                        <div className="space-y-3 pt-2">
                                          <Label className="text-slate-400 text-xs">Caratteristiche dell'attività (per adempimenti specifici)</Label>

                                          <div className="grid grid-cols-1 gap-2">
                                            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={newBranch.presenza_lavoratori}
                                                onChange={(e) => setNewBranch({...newBranch, presenza_lavoratori: e.target.checked})}
                                                className="rounded border-slate-600 bg-slate-800"
                                              />
                                              Presenza lavoratori dipendenti
                                            </label>

                                            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={newBranch.presenza_sostanze_chimiche}
                                                onChange={(e) => setNewBranch({...newBranch, presenza_sostanze_chimiche: e.target.checked})}
                                                className="rounded border-slate-600 bg-slate-800"
                                              />
                                              Uso/stoccaggio sostanze chimiche pericolose
                                            </label>

                                            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={newBranch.presenza_rifiuti_speciali}
                                                onChange={(e) => setNewBranch({...newBranch, presenza_rifiuti_speciali: e.target.checked})}
                                                className="rounded border-slate-600 bg-slate-800"
                                              />
                                              Produzione rifiuti speciali/pericolosi
                                            </label>

                                            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={newBranch.presenza_emissioni_atmosfera}
                                                onChange={(e) => setNewBranch({...newBranch, presenza_emissioni_atmosfera: e.target.checked})}
                                                className="rounded border-slate-600 bg-slate-800"
                                              />
                                              Emissioni in atmosfera (fumi, vapori, COV)
                                            </label>

                                            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={newBranch.presenza_scarichi_industriali}
                                                onChange={(e) => setNewBranch({...newBranch, presenza_scarichi_industriali: e.target.checked})}
                                                className="rounded border-slate-600 bg-slate-800"
                                              />
                                              Scarichi industriali (acque reflue di processo)
                                            </label>

                                            <label className="flex items-center gap-2 text-white text-sm cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={newBranch.presenza_rischio_incendio_non_basso}
                                                onChange={(e) => setNewBranch({...newBranch, presenza_rischio_incendio_non_basso: e.target.checked})}
                                                className="rounded border-slate-600 bg-slate-800"
                                              />
                                              Rischio incendio medio/alto (DPR 151/2011)
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
                                                                <h3 className="text-white font-semibold text-lg mb-2">🤖 L'AI sta lavorando per te</h3>
                                                                <p className="text-slate-400 text-sm mb-3">Stiamo analizzando il tipo di attività e generando tutti gli adempimenti obbligatori per legge...</p>
                                                                <div className="flex items-center justify-center gap-2 text-purple-400 text-xs">
                                                                  <Loader2 className="w-4 h-4 animate-spin" />
                                                                  <span>Questo può richiedere qualche secondo</span>
                                                                </div>
                                                              </div>
                                                            ) : (
                                                              <Button
                                                                onClick={handleCreateBranch}
                                                                disabled={!newBranch.nome.trim() || !newBranch.tipo_attivita.trim() || !newBranch.data_attivazione}
                                                                className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500"
                                                              >
                                                                <Plus className="w-4 h-4 mr-2" />
                                                                Aggiungi Ramo e Genera Adempimenti
                                                              </Button>
                                                            )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav currentPage="ComplianceAziendale" unreadMessages={messages.length} />
    </div>
  );
}