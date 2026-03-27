import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Sparkles, AlertCircle, Info, Briefcase, XCircle, Building2, CalendarDays, MessageSquare, Mail, Eye, Trash2, User, Phone, Search, Loader2, Plus, Edit, Share2, Archive, ExternalLink, CheckCircle2, ChevronDown, Filter, SlidersHorizontal } from 'lucide-react';

import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
// Header rimosso
import BottomNavWithMenu from '../components/layout/BottomNavWithMenu';
import GrantCard from '../components/grants/GrantCard';
import GrantFilters from '../components/grants/GrantFilters';
import GrantDecisionHero from '../components/grants/GrantDecisionHero';
import GrantRecommendedCard from '../components/grants/GrantRecommendedCard';
import GrantCardCompact from '../components/grants/GrantCardCompact';
import BandoStats from '../components/admin/BandoStats';
import BandoForm from '../components/admin/BandoForm';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import SectionConsultantPanel from '../components/consulenze/SectionConsultantPanel';
import GlobalTopIcons from '../components/layout/GlobalTopIcons';
import { useAuth } from '@/lib/AuthContext';

export default function FinanziamentiAgevolati() {
  const { user } = useAuth();
  const [userLoaded, setUserLoaded] = useState(!!user);
  const [selectedGrant, setSelectedGrant] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showConsultationDialog, setShowConsultationDialog] = useState(false);
  const [selectedGrantForConsultation, setSelectedGrantForConsultation] = useState(null);
  const [aiRecommendations, setAiRecommendations] = useState({});
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [filters, setFilters] = useState({
        easyAccess: false,
        grantType: 'all',
        fundingType: 'all',
        status: 'all',
        accessMode: 'all',
        noCofinancing: false,
        sortBy: 'deadline_asc'
      });
  const [showConsultationMessages, setShowConsultationMessages] = useState(false);
  const [showOnlyMatching, setShowOnlyMatching] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [matchedGrantIds, setMatchedGrantIds] = useState([]);
  const [showAllGrants, setShowAllGrants] = useState(false); // "Esplora altri bandi"
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const autoMatchTriggered = useRef(false);
  
  // Stati per gestione bandi admin
  const [showBandoForm, setShowBandoForm] = useState(false);
  const [editingBando, setEditingBando] = useState(null);
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [showMatchingPreview, setShowMatchingPreview] = useState(false);
  const [selectedBandoForPreview, setSelectedBandoForPreview] = useState(null);
  
  const queryClient = useQueryClient();
  const { impersonation } = useImpersonation();
  
  // L'admin vede la sezione richieste solo se NON sta impersonificando
  const isRealAdmin = user?.role === 'admin' && !impersonation.active;

  // Sync userLoaded quando user cambia
  useEffect(() => {
    if (user) setUserLoaded(true);
  }, [user]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!user) return;
    
    // Aggiorna timestamp ultima visita per utenti non admin (anche in impersonation)
    const effectiveRole = impersonation.active ? impersonation.role : user?.role;
    const effectiveEmail = impersonation.active ? impersonation.targetEmail : user?.email;
    
    if (effectiveRole !== 'admin' && effectiveEmail) {
      (async () => {
        const views = await base44.entities.UserGrantView.filter({ user_email: effectiveEmail });
        if (views.length > 0) {
          await base44.entities.UserGrantView.update(views[0].id, { last_viewed_at: new Date().toISOString() });
        } else {
          await base44.entities.UserGrantView.create({ user_email: effectiveEmail, last_viewed_at: new Date().toISOString() });
        }
        queryClient.invalidateQueries({ queryKey: ['user-grant-view', effectiveEmail] });
        queryClient.invalidateQueries({ queryKey: ['new-grants-count'] });
      })();
    }
  }, [user, impersonation.active, impersonation.role, impersonation.targetEmail]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: allGrants = [], isLoading } = useQuery({
    queryKey: ['financial-grants'],
    queryFn: async () => {
      const grants = await base44.entities.FinancialGrant.list('-created_date');
      
      // Filtra bandi scaduti e eliminali dal database
      const validGrants = [];
      const expiredGrantIds = [];
      
      for (const grant of grants) {
        if (grant.deadline) {
          const deadlineDate = new Date(grant.deadline);
          deadlineDate.setHours(0, 0, 0, 0);
          if (deadlineDate < today) {
            expiredGrantIds.push(grant.id);
            continue;
          }
        }
        validGrants.push(grant);
      }
      
      // Elimina bandi scaduti in background
      if (expiredGrantIds.length > 0) {
        Promise.all(expiredGrantIds.map(id => 
          base44.entities.FinancialGrant.delete(id).catch(e => console.error('Error deleting expired grant:', e))
        ));
      }
      
      // Deduplica nel frontend per sicurezza
      return deduplicateGrants(validGrants);
    },
  });

  // Funzione per deduplicare bandi (titoli simili)
  const deduplicateGrants = (grants) => {
    const seen = new Map();
    
    for (const grant of grants) {
      const normalizedTitle = grant.title?.toLowerCase()
        .replace(/[^a-z0-9àèéìòù]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (!normalizedTitle) continue;
      
      // Se già visto, tieni quello più recente o completo
      if (!seen.has(normalizedTitle)) {
        seen.set(normalizedTitle, grant);
      }
    }
    
    return Array.from(seen.values());
  };

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  const { data: userInterests = [] } = useQuery({
    queryKey: ['user-grant-interests', user?.email],
    queryFn: () => base44.entities.GrantInterest.filter({ user_email: user?.email }),
    enabled: !!user?.email,
  });




  
  // Stato per popup profilo incompleto
  const [showProfilePopup, setShowProfilePopup] = useState(false);

  // Richieste consulenza per admin (con info utente e bando)
  const { data: consultationRequests = [] } = useQuery({
    queryKey: ['admin-consultation-requests-grants'],
    queryFn: async () => {
      const requests = await base44.entities.GrantInterest.filter({ 
        requested_consultation: true,
        consultation_status: 'pending'
      });
      
      const users = await base44.entities.User.list();
      const grants = await base44.entities.FinancialGrant.list();
      
      return requests.map(req => ({
        ...req,
        user: users.find(u => u.email === req.user_email),
        grant: grants.find(g => g.id === req.grant_id)
      }));
    },
    enabled: isRealAdmin,
  });

  const markConsultationReadMutation = useMutation({
    mutationFn: async (requestId) => {
      await base44.entities.GrantInterest.update(requestId, { consultation_status: 'accepted' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-consultation-requests-grants'] });
    }
  });

  const deleteConsultationRequestMutation = useMutation({
    mutationFn: async (requestId) => {
      await base44.entities.GrantInterest.delete(requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-consultation-requests-grants'] });
    }
  });

  // Query per tutti gli utenti (per matching admin)
  const { data: allUsersForMatching = [] } = useQuery({
    queryKey: ['all-users-for-matching'],
    queryFn: () => base44.entities.User.list(),
    enabled: isRealAdmin,
  });

  // Mutations per gestione bandi admin
  const createBandoMutation = useMutation({
    mutationFn: async (data) => {
      const newGrant = await base44.entities.FinancialGrant.create({
        ...data,
        created_by_email: user.email,
        last_modified_by_email: user.email
      });
      
      // Invia notifica a tutti gli utenti per il nuovo bando
      const allUsers = await base44.entities.User.list();
      const notificationPromises = allUsers.map(u =>
        base44.entities.Notification.create({
          user_email: u.email,
          type: 'event',
          title: 'Nuovo bando disponibile',
          content: `È stato pubblicato un nuovo bando: ${data.title}`,
          reference_id: newGrant.id
        })
      );
      
      await Promise.all(notificationPromises);
      
      return newGrant;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-grants'] });
      setShowBandoForm(false);
      setEditingBando(null);
      toast.success('Bando creato con successo');
    }
  });

  const updateBandoMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.FinancialGrant.update(id, {
        ...data,
        last_modified_by_email: user.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-grants'] });
      setShowBandoForm(false);
      setEditingBando(null);
      toast.success('Bando aggiornato');
    }
  });

  const archiveBandoMutation = useMutation({
    mutationFn: async (id) => {
      return base44.entities.FinancialGrant.update(id, { is_archived: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-grants'] });
      toast.success('Bando archiviato');
    }
  });

  // Handlers per gestione bandi admin
  const handleBandoFormSubmit = (data) => {
    if (editingBando) {
      updateBandoMutation.mutate({ id: editingBando.id, data });
    } else {
      createBandoMutation.mutate(data);
    }
  };

  const handleEditBando = (bando) => {
    setEditingBando(bando);
    setShowBandoForm(true);
  };

  const handleShareBando = async (bando) => {
    const shareText = `📢 Bando: ${bando.title}\n\n${bando.description || ''}\n\n💰 ${bando.funding_type || 'Agevolazione'}\n📍 ${bando.livello || ''} - ${bando.ente_erogatore || ''}\n\n${bando.website_url || ''}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: bando.title,
          text: shareText,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          await navigator.clipboard.writeText(shareText);
          toast.success('Testo copiato negli appunti');
        }
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success('Testo copiato negli appunti');
    }
  };

  const handleArchiveBando = (id) => {
    if (confirm('Archiviare questo bando?')) {
      archiveBandoMutation.mutate(id);
    }
  };

  const getMatchingUsersForBando = (bando) => {
    return allUsersForMatching.filter(u => {
      if (bando.eligible_company_sizes?.length > 0 && u.company_size) {
        if (!bando.eligible_company_sizes.includes(u.company_size)) return false;
      }
      if (bando.eligible_regions?.length > 0 && u.region) {
        if (!bando.eligible_regions.includes(u.region)) return false;
      }
      if (bando.eligible_ateco_codes?.length > 0 && u.ateco_code) {
        const hasMatch = bando.eligible_ateco_codes.some(code => 
          u.ateco_code.startsWith(code) || code.startsWith(u.ateco_code.substring(0, 2))
        );
        if (!hasMatch) return false;
      }
      if (bando.eligible_legal_forms?.length > 0 && u.legal_form) {
        if (!bando.eligible_legal_forms.includes(u.legal_form)) return false;
      }
      return true;
    });
  };

  // Filtro admin per ricerca bandi
  const adminFilteredGrants = allGrants
    .filter(g => {
      if (!adminSearchTerm) return true;
      const searchLower = adminSearchTerm.toLowerCase();
      return g.title?.toLowerCase().includes(searchLower) || 
             g.description?.toLowerCase().includes(searchLower);
    })
    .sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });

  const toggleAlertsMutation = useMutation({
    mutationFn: async ({ grantId, currentState }) => {
      const existing = userInterests.find(i => i.grant_id === grantId);
      if (existing) {
        return base44.entities.GrantInterest.update(existing.id, {
          wants_alerts: !currentState
        });
      } else {
        return base44.entities.GrantInterest.create({
          grant_id: grantId,
          user_email: user.email,
          wants_alerts: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-grant-interests'] });
    }
  });

  const requestConsultationMutation = useMutation({
    mutationFn: async ({ grantId, grantTitle }) => {
      const existing = userInterests.find(i => i.grant_id === grantId);
      
      const adminUsers = await base44.entities.User.filter({ role: 'admin' });
      
      const notificationPromises = adminUsers.map(admin =>
        base44.entities.Notification.create({
          user_email: admin.email,
          type: 'consultation',
          title: 'Richiesta consulenza bando',
          content: `${user.company_name || user.full_name} ha richiesto assistenza per il bando: ${grantTitle}`,
          reference_id: grantId
        })
      );
      
      // Crea anche un messaggio diretto all'admin per il pannello messaggi
      const messagePromises = adminUsers.map(admin =>
        base44.entities.Message.create({
          from_email: user.email,
          to_email: admin.email,
          content: `🔔 RICHIESTA CONSULENZA BANDO\n\nHo richiesto assistenza per il bando:\n"${grantTitle}"\n\nContattami per procedere con la consulenza.`,
          conversation_id: `consultation_${user.email}_${grantId}`
        })
      );
      
      await Promise.all([...notificationPromises, ...messagePromises]);
      
      // Invia email di notifica
      await base44.integrations.Core.SendEmail({
        to: 'consorzioimprenditori@gmail.com',
        subject: '🔔 Nuova Richiesta Consulenza Bando',
        body: `
          <h2>Nuova Richiesta di Consulenza</h2>
          <p><strong>Azienda:</strong> ${user.company_name || user.full_name}</p>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Bando richiesto:</strong> ${grantTitle}</p>
          <p><strong>Data richiesta:</strong> ${new Date().toLocaleDateString('it-IT')}</p>
          <br>
          <p>Accedi al pannello amministratore per visualizzare i dettagli completi.</p>
        `
      });
      
      if (existing) {
        return base44.entities.GrantInterest.update(existing.id, {
          requested_consultation: true,
          consultation_status: 'pending'
        });
      } else {
        return base44.entities.GrantInterest.create({
          grant_id: grantId,
          user_email: user.email,
          requested_consultation: true,
          consultation_status: 'pending'
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-grant-interests'] });
      setShowConsultationDialog(false);
    }
  });

  // Fetch fresh user data when impersonating to get latest profile changes
  const { data: impersonatedUserData } = useQuery({
    queryKey: ['impersonated-user-fresh', impersonation.targetEmail],
    queryFn: async () => {
      const users = await base44.entities.User.filter({ email: impersonation.targetEmail });
      return users[0] || null;
    },
    enabled: impersonation.active && !!impersonation.targetEmail,
    staleTime: 0, // Always refetch
  });

  // Automatic matching based on company profile
  // Usa il profilo dell'utente impersonificato se in impersonation mode
  const getEffectiveUserProfile = () => {
    console.log('[FinanziamentiAgevolati] getEffectiveUserProfile called:', {
      impersonationActive: impersonation.active,
      hasImpersonatedUserData: !!impersonatedUserData,
      impersonatedUserData: impersonatedUserData
    });
    
    // Usa i dati freschi dell'utente impersonificato
    if (impersonation.active && impersonatedUserData) {
      console.log('[FinanziamentiAgevolati] Using FRESH impersonated user profile:', {
        interested_regions: impersonatedUserData.interested_regions,
        region: impersonatedUserData.region,
        company_size: impersonatedUserData.company_size
      });
      return impersonatedUserData;
    }
    
    // Fallback ai dati dell'impersonation context (potrebbero essere stale)
    if (impersonation.active && impersonation.targetUserData) {
      console.log('[FinanziamentiAgevolati] Using CACHED impersonated user profile:', {
        interested_regions: impersonation.targetUserData.interested_regions,
        region: impersonation.targetUserData.region,
        company_size: impersonation.targetUserData.company_size
      });
      return impersonation.targetUserData;
    }
    
    console.log('[FinanziamentiAgevolati] Using REAL user profile:', {
      interested_regions: user?.interested_regions,
      region: user?.region
    });
    return user;
  };

  const matchesCompanyProfile = (grant) => {
    const effectiveUser = getEffectiveUserProfile();
    
    // Check company size
    if (grant.eligible_company_sizes?.length > 0 && effectiveUser?.company_size) {
      if (!grant.eligible_company_sizes.includes(effectiveUser.company_size)) {
        return false;
      }
    }

    // FILTRO REGIONE:
    // 1. Se is_national=true O livello Nazionale/Europeo → visibile a TUTTI
    // 2. Altrimenti se ha regioni specifiche → verifica match con regioni utente
    
    const isNationalGrant = grant.is_national === true || 
                           grant.livello === 'Nazionale' || 
                           grant.livello === 'Europeo';
    
    if (!isNationalGrant && grant.eligible_regions?.length > 0) {
      // Bando regionale con regioni specifiche - deve matchare
      const userInterestedRegions = effectiveUser?.interested_regions || 
                                    (effectiveUser?.region ? [effectiveUser.region] : []);
      
      // Se l'utente ha regioni specificate, filtra
      if (userInterestedRegions.length > 0) {
        const hasRegionMatch = grant.eligible_regions.some(region => 
          userInterestedRegions.includes(region)
        );
        if (!hasRegionMatch) {
          return false;
        }
      }
    }

    // Check ATECO code
    if (grant.eligible_ateco_codes?.length > 0 && effectiveUser?.ateco_code) {
      const hasMatch = grant.eligible_ateco_codes.some(code => 
        effectiveUser.ateco_code.startsWith(code) || code.startsWith(effectiveUser.ateco_code.substring(0, 2))
      );
      if (!hasMatch) {
        return false;
      }
    }

    // Check legal form
    if (grant.eligible_legal_forms?.length > 0 && effectiveUser?.legal_form) {
      if (!grant.eligible_legal_forms.includes(effectiveUser.legal_form)) {
        return false;
      }
    }

    return true;
  };

  // Apply advanced filters
  const applyFilters = (grant) => {
    if (filters.easyAccess && !grant.easy_access) {
      return false;
    }

    if (filters.grantType !== 'all' && grant.grant_type !== filters.grantType) {
      return false;
    }

    if (filters.fundingType !== 'all' && grant.funding_type !== filters.fundingType) {
      return false;
    }

    if (filters.status !== 'all' && grant.status !== filters.status) {
      return false;
    }

    if (filters.accessMode !== 'all' && grant.access_mode !== filters.accessMode) {
      return false;
    }

    if (filters.noCofinancing && grant.requires_cofinancing) {
      return false;
    }

    return true;
  };

  // Filtra per confidence_level: utenti vedono solo alto/medio, admin vedono tutto
  const grantsFilteredByConfidence = allGrants.filter(g => {
    // Admin vede tutti i bandi
    if (isRealAdmin) return true;
    // Utenti vedono solo bandi con confidence alto o medio (o null per retrocompatibilità)
    return !g.confidence_level || g.confidence_level === 'alto' || g.confidence_level === 'medio';
  });

  // Applica filtri avanzati
  const filteredGrants = grantsFilteredByConfidence.filter(applyFilters);

  // RIMOSSO: AI recommendations automatiche - ora l'utente deve cliccare il pulsante manualmente

  // Funzione per determinare se un bando è della regione dell'utente
  const isUserRegionGrant = (grant) => {
    const effectiveUser = getEffectiveUserProfile();
    const userRegions = effectiveUser?.interested_regions || 
                        (effectiveUser?.region ? [effectiveUser.region] : []);
    
    if (!grant.eligible_regions?.length || userRegions.length === 0) return false;
    
    // Verifica se almeno una regione del bando corrisponde alle regioni dell'utente
    return grant.eligible_regions.some(region => userRegions.includes(region));
  };

  // Funzione per determinare livello del bando
  const getGrantLevel = (grant) => {
    const effectiveUser = getEffectiveUserProfile();
    const userRegions = effectiveUser?.interested_regions || 
                        (effectiveUser?.region ? [effectiveUser.region] : []);
    
    // 1. Bando della regione dell'utente
    if (grant.eligible_regions?.length > 0 && userRegions.length > 0) {
      if (grant.eligible_regions.some(r => userRegions.includes(r))) {
        return 1; // Regione utente - priorità massima
      }
    }
    
    // 2. Bando nazionale
    if (grant.livello === 'Nazionale' || grant.is_national) {
      return 2;
    }
    
    // 3. Bando europeo
    if (grant.livello === 'Europeo') {
      return 3;
    }
    
    // 4. Altre regioni
    return 4;
  };

  // Sort grants based on selected sorting option
  const sortedGrants = [...filteredGrants].sort((a, b) => {
    // PRIMA: Ordina per livello geografico (regione utente > nazionale > europeo > altre)
    const levelA = getGrantLevel(a);
    const levelB = getGrantLevel(b);
    if (levelA !== levelB) return levelA - levelB;

    // Se ci sono raccomandazioni AI e nessun ordinamento specifico, usa quelle
    if (filters.sortBy === 'created_date_desc' && Object.keys(aiRecommendations).length > 0) {
      const scoreA = aiRecommendations[a.id]?.score || 0;
      const scoreB = aiRecommendations[b.id]?.score || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
    }

    switch (filters.sortBy) {
      case 'created_date_desc':
        return new Date(b.created_date || 0) - new Date(a.created_date || 0);
      case 'created_date_asc':
        return new Date(a.created_date || 0) - new Date(b.created_date || 0);
      case 'deadline_asc':
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      case 'deadline_desc':
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(b.deadline) - new Date(a.deadline);
      case 'max_amount_desc':
        return (b.max_amount || 0) - (a.max_amount || 0);
      case 'max_amount_asc':
        if (!a.max_amount) return 1;
        if (!b.max_amount) return -1;
        return (a.max_amount || 0) - (b.max_amount || 0);
      case 'coverage_desc':
        return (b.coverage_percentage || 0) - (a.coverage_percentage || 0);
      case 'coverage_asc':
        if (!a.coverage_percentage) return 1;
        if (!b.coverage_percentage) return -1;
        return (a.coverage_percentage || 0) - (b.coverage_percentage || 0);
      default:
        return 0;
    }
  });

  // Funzione per eseguire match deterministico con il profilo (senza LLM)
  const handleMatchWithProfile = async () => {
    setLoadingMatch(true);
    try {
      const effectiveUser = getEffectiveUserProfile();
      
      // Matching algoritmico deterministico
      const compatibleIds = filteredGrants.filter(grant => {
        // 1. Check dimensione aziendale
        if (grant.eligible_company_sizes?.length > 0 && effectiveUser?.company_size) {
          if (!grant.eligible_company_sizes.includes(effectiveUser.company_size)) {
            return false;
          }
        }
        
        // 2. Check regione - bandi nazionali/europei sono sempre ok
        const isNationalGrant = grant.is_national === true || 
                               grant.livello === 'Nazionale' || 
                               grant.livello === 'Europeo';
        
        if (!isNationalGrant && grant.eligible_regions?.length > 0) {
          const userRegions = effectiveUser?.interested_regions || 
                             (effectiveUser?.region ? [effectiveUser.region] : []);
          if (userRegions.length > 0) {
            const hasRegionMatch = grant.eligible_regions.some(r => userRegions.includes(r));
            if (!hasRegionMatch) return false;
          }
        }
        
        // 3. Check codice ATECO
        if (grant.eligible_ateco_codes?.length > 0 && effectiveUser?.ateco_code) {
          const hasAtecoMatch = grant.eligible_ateco_codes.some(code => 
            effectiveUser.ateco_code.startsWith(code) || 
            code.startsWith(effectiveUser.ateco_code.substring(0, 2))
          );
          if (!hasAtecoMatch) return false;
        }
        
        // 4. Check forma giuridica
        if (grant.eligible_legal_forms?.length > 0 && effectiveUser?.legal_form) {
          if (!grant.eligible_legal_forms.includes(effectiveUser.legal_form)) {
            return false;
          }
        }
        
        // 5. Check anni di attività
        if (grant.min_years_activity && effectiveUser?.years_of_activity) {
          if (effectiveUser.years_of_activity < grant.min_years_activity) {
            return false;
          }
        }
        
        return true;
      }).map(g => g.id);

      setMatchedGrantIds(compatibleIds);
      setShowOnlyMatching(true);
    } catch (error) {
      console.error('Error matching grants:', error);
    } finally {
      setLoadingMatch(false);
    }
  };

  // Filtra i bandi se è attivo il filtro match
  const displayGrants = showOnlyMatching && matchedGrantIds.length > 0
    ? sortedGrants.filter(g => matchedGrantIds.includes(g.id))
    : sortedGrants;



  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleShowDetails = (grant) => {
    setSelectedGrant(grant);
    setShowDetails(true);
  };

  const handleToggleAlerts = (grant) => {
    const interest = userInterests.find(i => i.grant_id === grant.id);
    toggleAlertsMutation.mutate({
      grantId: grant.id,
      currentState: interest?.wants_alerts || false
    });
  };

  const handleRequestConsultation = (grant) => {
    setSelectedGrantForConsultation(grant);
    setShowConsultationDialog(true);
  };

  const confirmConsultationRequest = () => {
    requestConsultationMutation.mutate({
      grantId: selectedGrantForConsultation.id,
      grantTitle: selectedGrantForConsultation.title
    });
  };

  // Verifica profilo incompleto - usa i dati dell'utente impersonificato se attivo
  const effectiveUserForProfile = getEffectiveUserProfile();
  const hasIncompleteProfile = !effectiveUserForProfile?.company_size || 
                                !effectiveUserForProfile?.region || 
                                !effectiveUserForProfile?.sector || 
                                !effectiveUserForProfile?.ateco_code ||
                                !effectiveUserForProfile?.interested_regions?.length;

  // Gestione autoSearch da URL (dopo compilazione profilo)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoSearch') === 'ai' && !hasIncompleteProfile && !loadingMatch && !showOnlyMatching && user) {
      // Rimuovi il parametro dall'URL
      window.history.replaceState({}, '', window.location.pathname);
      // Avvia automaticamente la ricerca AI
      handleMatchWithProfile();
    }
  }, [hasIncompleteProfile, loadingMatch, showOnlyMatching, user]);

  // Auto-match al caricamento per utenti non-admin con profilo completo
  useEffect(() => {
    if (autoMatchTriggered.current) return;
    if (!userLoaded || !user || isRealAdmin || hasIncompleteProfile || loadingMatch || isLoading) return;
    if (allGrants.length === 0) return;
    autoMatchTriggered.current = true;
    handleMatchWithProfile();
  }, [userLoaded, user, isRealAdmin, hasIncompleteProfile, allGrants, isLoading]);

  // Bandi compatibili (matched) da mostrare nel decision hero e consigliato
  const matchedGrants = matchedGrantIds.length > 0
    ? sortedGrants.filter(g => matchedGrantIds.includes(g.id))
    : [];

  // Bando consigliato = quello con max_amount più alto tra i compatibili, preferendo easy_access
  const recommendedGrant = (() => {
    if (matchedGrants.length === 0) return null;
    const sorted = [...matchedGrants].sort((a, b) => {
      // Preferisci easy_access
      if (a.easy_access && !b.easy_access) return -1;
      if (!a.easy_access && b.easy_access) return 1;
      // Poi per importo max
      return (b.max_amount || 0) - (a.max_amount || 0);
    });
    return sorted[0];
  })();

  // Altri bandi (escluso il consigliato)
  const otherMatchedGrants = matchedGrants.filter(g => g.id !== recommendedGrant?.id);

  return (
    <div className="min-h-screen pb-64" style={{ backgroundColor: 'var(--app-bg)' }}>
      <main className="px-4 pt-16 pb-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-black text-lg font-bold">Bandi e Agevolazioni</h1>
        </div>

        {/* SEZIONE ADMIN: Gestione Bandi */}
        {isRealAdmin && (
          <>
            {/* Pulsante Nuovo Bando */}
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => {
                  setEditingBando(null);
                  setShowBandoForm(true);
                }}
                className="bg-lime-400 hover:bg-lime-500 text-slate-900"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuovo Bando
              </Button>
            </div>

            {/* Dashboard Stats Admin */}
            <div className="mb-6">
              <BandoStats grants={allGrants} />
            </div>

            {/* Search Admin */}
            <Card className="bg-slate-800 border-slate-700 mb-6">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Cerca bandi..."
                    value={adminSearchTerm}
                    onChange={(e) => setAdminSearchTerm(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Lista Bandi Admin */}
            <div className="space-y-3 mb-8">
              {adminFilteredGrants.map((grant) => {
                const matchingUsers = getMatchingUsersForBando(grant);
                const daysUntilDeadline = grant.deadline 
                  ? Math.ceil((new Date(grant.deadline) - new Date()) / (1000 * 60 * 60 * 24))
                  : null;

                return (
                  <Card key={grant.id} className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="text-white font-medium break-words">{grant.title}</h3>
                            {grant.easy_access && (
                              <Badge className="bg-lime-400 text-slate-900 text-xs">Attivabile</Badge>
                            )}
                            <Badge className={
                              grant.status === 'Aperto' ? 'bg-green-500' :
                              grant.status === 'In apertura' ? 'bg-yellow-500' : 'bg-red-500'
                            }>
                              {grant.status}
                            </Badge>
                          </div>
                          <p className="text-slate-400 text-sm line-clamp-2 mb-1">{grant.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span className="text-slate-400">{grant.ente_erogatore}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400">{grant.livello}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400">{grant.grant_type}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-lime-400">{matchingUsers.length} aziende compatibili</span>
                          </div>
                          {grant.website_url && (
                            <a 
                              href={grant.website_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 text-xs underline mt-1 inline-flex items-center gap-1 break-all"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{grant.website_url}</span>
                            </a>
                          )}
                          <div className="flex items-center gap-2 text-xs mt-1">
                            <CalendarDays className="w-3.5 h-3.5 text-orange-400" />
                            <span className="text-orange-400 font-medium">
                              Scadenza: {grant.deadline && !isNaN(new Date(grant.deadline).getTime()) 
                                ? format(new Date(grant.deadline), 'd MMM yyyy', { locale: it }) 
                                : 'A esaurimento fondi'}
                            </span>
                          </div>
                          {(grant.prezzo_istruttoria || grant.percentuale_erogazione) && (
                            <div className="flex flex-wrap gap-3 text-xs mt-2">
                              {grant.prezzo_istruttoria && (
                                <span className="text-blue-400">
                                  Istruttoria: {grant.prezzo_istruttoria.toLocaleString('it-IT')} €
                                </span>
                              )}
                              {grant.percentuale_erogazione && (
                                <span className="text-blue-400">
                                  Success fee: {grant.percentuale_erogazione}%
                                </span>
                              )}
                            </div>
                          )}
                          {daysUntilDeadline !== null && daysUntilDeadline > 0 && daysUntilDeadline <= 30 && (
                            <Alert className="mt-2 bg-orange-500/20 border-orange-500/30 py-2">
                              <AlertDescription className="text-orange-400 text-xs">
                                Scadenza tra {daysUntilDeadline} giorni
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300 h-8 px-2 text-xs"
                          onClick={() => handleEditBando(grant)}
                        >
                          <Edit className="w-3.5 h-3.5 mr-1" />
                          Modifica
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-300 h-8 px-2 text-xs"
                          onClick={() => {
                            setSelectedBandoForPreview(grant);
                            setShowMatchingPreview(true);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Anteprima ({matchingUsers.length})
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-lime-400 text-lime-400 h-8 px-2 text-xs"
                          onClick={() => handleShareBando(grant)}
                        >
                          <Share2 className="w-3.5 h-3.5 mr-1" />
                          Condividi
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-400 h-8 px-2 text-xs"
                          onClick={() => handleArchiveBando(grant.id)}
                          disabled={archiveBandoMutation.isPending}
                        >
                          <Archive className="w-3.5 h-3.5 mr-1" />
                          Archivia
                        </Button>
                        {grant.website_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-500 text-blue-400 h-8 px-2 text-xs"
                            onClick={() => window.open(grant.website_url, '_blank')}
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            Link ufficiale
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="border-t border-slate-700 my-6 pt-6">
              <h2 className="text-white font-semibold mb-4">Vista Utente</h2>
            </div>
          </>
        )}

        {/* ===== ADMIN: sezioni admin-only ===== */}
        {isRealAdmin && (
          <>
            {/* Data odierna */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-4 flex items-center gap-3">
              <CalendarDays className="w-6 h-6 text-lime-400" />
              <div>
                <p className="text-slate-400 text-xs">Data odierna</p>
                <p className="text-white font-bold text-lg">
                  {format(new Date(), "EEEE d MMMM yyyy", { locale: it })}
                </p>
              </div>
            </div>

            {/* Richieste Consulenza Admin */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <MessageSquare className={`w-5 h-5 ${consultationRequests.length > 0 ? 'text-lime-400' : 'text-slate-400'}`} />
                    {consultationRequests.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold animate-pulse">
                        {consultationRequests.length}
                      </span>
                    )}
                  </div>
                  <span className="text-white font-medium">Richieste Consulenza</span>
                </div>
                <Button size="sm" variant="outline" className="border-lime-400 text-lime-400 hover:bg-lime-400/20" onClick={() => setShowConsultationMessages(true)}>
                  <Mail className="w-4 h-4 mr-1" />
                  Vedi tutte ({consultationRequests.length})
                </Button>
              </div>
              {consultationRequests.length === 0 ? (
                <p className="text-slate-400 text-sm">Nessuna nuova richiesta di consulenza</p>
              ) : (
                <div className="space-y-2">
                  {consultationRequests.slice(0, 3).map((req) => (
                    <div key={req.id} className="bg-lime-400/10 border border-lime-400/30 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{req.user?.company_name || 'N/A'}</p>
                          <p className="text-slate-400 text-xs">👤 {req.user?.referente || req.user?.full_name || 'N/A'}</p>
                          <p className="text-lime-400 text-xs mt-1 truncate">📋 {req.grant?.title || 'Bando non trovato'}</p>
                        </div>
                        <span className="bg-lime-400 text-slate-900 text-xs font-bold px-2 py-0.5 rounded flex-shrink-0">NUOVO</span>
                      </div>
                    </div>
                  ))}
                  {consultationRequests.length > 3 && (
                    <p className="text-lime-400 text-xs text-center">+ altre {consultationRequests.length - 3} richieste</p>
                  )}
                </div>
              )}
            </div>

            {/* Stats Admin */}
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-6">
              <div className="text-2xl font-bold text-lime-400 mb-2">{allGrants.length}</div>
              <div className="text-slate-400 text-sm mb-3">Totale bandi trovati dai siti</div>
              <div className="border-t border-slate-700 pt-3">
                <p className="text-slate-500 text-xs mb-2">Siti scansionati:</p>
                <div className="flex flex-wrap gap-2">
                  {['incentivi.gov.it','simest.it','invitalia.it','regione.lombardia.it','regione.veneto.it','regione.emilia-romagna.it','regione.piemonte.it','regione.toscana.it','regione.lazio.it','regione.campania.it','regione.sicilia.it','regione.puglia.it','regione.marche.it','regione.liguria.it','regione.fvg.it','regione.abruzzo.it','regione.umbria.it','regione.calabria.it','regione.sardegna.it','regione.basilicata.it','regione.molise.it','regione.vda.it','provincia.tn.it','provincia.bz.it'].map(s => (
                    <Badge key={s} variant="outline" className="text-xs text-slate-300 border-slate-600">{s}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Filters + full list for admin */}
            <div className="mb-6">
              <GrantFilters filters={filters} onFilterChange={handleFilterChange} />
            </div>

            {/* Grants List Admin — usa GrantCard originale con tutte le info */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {displayGrants.map((grant) => {
                  const interest = userInterests.find(i => i.grant_id === grant.id);
                  return (
                    <GrantCard
                      key={grant.id}
                      grant={grant}
                      userInterest={interest}
                      onDetails={handleShowDetails}
                      onToggleAlerts={() => handleToggleAlerts(grant)}
                      onRequestConsultation={() => handleRequestConsultation(grant)}
                      userProfile={user}
                      isAdmin={isRealAdmin}
                    />
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ===== UTENTE: Design decision-first ===== */}
        {!isRealAdmin && (
          <>
            {/* 0. BANNER BANDI DISPONIBILI + PROFILO */}
            <div className="mb-6">
              <Card className="bg-slate-900 border-slate-900">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white text-2xl font-bold">
                      {loadingMatch ? '...' : matchedGrants.length > 0 ? matchedGrants.length : filteredGrants.length}
                    </p>
                    <p className="text-lime-300 text-sm">
                      {matchedGrants.length > 0 ? 'bandi compatibili con il tuo profilo' : 'bandi disponibili'}
                    </p>
                  </div>
                  <Link to={createPageUrl('MyProfile?tab=profilo&scrollTo=bandi')}>
                    <Button variant="outline" size="sm" className="border-lime-400/50 text-lime-400 hover:bg-lime-400/10">
                      <Briefcase className="w-4 h-4 mr-2" />
                      Vedi il tuo profilo
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* 1. HERO DECISIONALE */}
            <div className="mb-6">
              <GrantDecisionHero
                matchedGrants={matchedGrants}
                isMatching={loadingMatch}
                hasIncompleteProfile={hasIncompleteProfile}
                onCompleteProfile={() => setShowProfilePopup(true)}
                onShowBestGrant={(g) => { 
                  if (g) handleShowDetails(g); 
                  else setShowAllGrants(true); 
                }}
                totalGrants={filteredGrants.length}
              />
            </div>

            {/* 2. BANDO CONSIGLIATO */}
            {!loadingMatch && !hasIncompleteProfile && recommendedGrant && (
              <div className="mb-6">
                <GrantRecommendedCard
                  grant={recommendedGrant}
                  onDetails={handleShowDetails}
                  onRequestConsultation={() => handleRequestConsultation(recommendedGrant)}
                  userInterest={userInterests.find(i => i.grant_id === recommendedGrant.id)}
                />
              </div>
            )}

            {/* 3. CONSULENTI */}
            {user && (
              <div className="mb-6">
                <SectionConsultantPanel 
                  sectionId="finanziamenti" 
                  sectionLabel="Finanziamenti Agevolati" 
                  user={user} 
                />
              </div>
            )}

            {/* LINK PROFILO BANDI rimosso */}

            {/* 5. TUTTI I BANDI COMPATIBILI — uno sotto l'altro */}
            {!loadingMatch && matchedGrants.length > 0 && otherMatchedGrants.length > 0 && (
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-lime-300 text-sm font-medium">
                    Altri {otherMatchedGrants.length} bandi compatibili
                  </p>
                  <button
                    onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                    className="flex items-center gap-1.5 text-xs text-lime-300 hover:text-lime-100 transition-colors"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filtra</span>
                  </button>
                </div>
                {showFiltersPanel && (
                  <GrantFilters filters={filters} onFilterChange={handleFilterChange} />
                )}
                {otherMatchedGrants.map((grant) => (
                  <GrantCardCompact
                    key={grant.id}
                    grant={grant}
                    onDetails={handleShowDetails}
                  />
                ))}
              </div>
            )}

            {/* 6. Se nessun match ma ci sono bandi → mostra elenco completo */}
            {!loadingMatch && matchedGrants.length === 0 && !hasIncompleteProfile && filteredGrants.length > 0 && (
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-lime-300 text-sm font-medium">
                    Tutti i {filteredGrants.length} bandi disponibili
                  </p>
                  <button
                    onClick={() => setShowFiltersPanel(!showFiltersPanel)}
                    className="flex items-center gap-1.5 text-xs text-lime-300 hover:text-lime-100 transition-colors"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filtra</span>
                  </button>
                </div>
                {showFiltersPanel && (
                  <GrantFilters filters={filters} onFilterChange={handleFilterChange} />
                )}
                {sortedGrants.map((grant) => (
                  <GrantCardCompact
                    key={grant.id}
                    grant={grant}
                    onDetails={handleShowDetails}
                  />
                ))}
              </div>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full mx-auto"></div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Grant Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle className="text-white pr-8">{selectedGrant?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedGrant && (
            <div className="space-y-4 mt-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={selectedGrant.status === 'Aperto' ? 'bg-green-500' : 'bg-yellow-500'}>
                  {selectedGrant.status}
                </Badge>
                {selectedGrant.easy_access && (
                  <Badge className="bg-lime-400 text-slate-900">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Attivabile Subito
                  </Badge>
                )}
              </div>

              {/* Ente Erogatore in evidenza */}
              {selectedGrant.ente_erogatore && (
                <div className="bg-amber-500/20 border border-amber-500/40 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-amber-400 text-sm font-medium">Ente Erogatore</p>
                      <p className="text-white font-bold text-lg">{selectedGrant.ente_erogatore}</p>
                      {selectedGrant.livello && (
                        <p className="text-slate-400 text-xs">Livello: {selectedGrant.livello}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-900 rounded-lg p-4 space-y-3 text-sm">
                <div>
                  <span className="text-slate-400">Tipologia:</span>
                  <span className="text-white ml-2">{selectedGrant.grant_type}</span>
                </div>
                <div>
                  <span className="text-slate-400">Forma agevolazione:</span>
                  <span className="text-white ml-2">{selectedGrant.funding_type}</span>
                </div>
                {selectedGrant.coverage_percentage && (
                  <div>
                    <span className="text-slate-400">Copertura:</span>
                    <span className="text-lime-400 ml-2 font-bold">{selectedGrant.coverage_percentage}%</span>
                  </div>
                )}
                {selectedGrant.min_amount && selectedGrant.max_amount && (
                  <div>
                    <span className="text-slate-400">Importo:</span>
                    <span className="text-white ml-2">
                      {selectedGrant.min_amount.toLocaleString('it-IT')} - {selectedGrant.max_amount.toLocaleString('it-IT')} €
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400">Modalità accesso:</span>
                  <span className="text-white ml-2">{selectedGrant.access_mode}</span>
                </div>
                <div>
                  <span className="text-slate-400">Cofinanziamento:</span>
                  <span className={`${selectedGrant.requires_cofinancing ? 'text-yellow-400' : 'text-green-400'} ml-2`}>
                    {selectedGrant.requires_cofinancing ? 'Richiesto' : 'Non richiesto'}
                  </span>
                </div>
                {selectedGrant.deadline && (
                  <div>
                    <span className="text-slate-400">Scadenza:</span>
                    <span className="text-white ml-2">
                      {new Date(selectedGrant.deadline).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-slate-400 text-sm mb-2">Descrizione</h4>
                <p className="text-slate-300 text-sm">{selectedGrant.description}</p>
              </div>

              {(selectedGrant.prezzo_istruttoria || selectedGrant.percentuale_erogazione) && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-blue-400 font-medium mb-3">💼 Costi Assistenza Consulenza</h4>
                  <div className="space-y-2 text-sm">
                    {selectedGrant.prezzo_istruttoria && (
                      <div className="flex justify-between">
                        <span className="text-slate-300">Prezzo istruttoria:</span>
                        <span className="text-white font-bold">{selectedGrant.prezzo_istruttoria.toLocaleString('it-IT')} €</span>
                      </div>
                    )}
                    {selectedGrant.percentuale_erogazione && (
                      <div className="flex justify-between">
                        <span className="text-slate-300">% su erogazione fondi:</span>
                        <span className="text-white font-bold">{selectedGrant.percentuale_erogazione}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedGrant.website_url && (
                <Button
                  className="w-full bg-lime-400 hover:bg-lime-500 text-slate-900"
                  onClick={() => window.open(selectedGrant.website_url, '_blank')}
                >
                  Vai al bando ufficiale
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Consultation Request Dialog */}
      <Dialog open={showConsultationDialog} onOpenChange={setShowConsultationDialog}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">Richiedi Assistenza Consulenza</DialogTitle>
          </DialogHeader>
          <button
            onClick={() => setShowConsultationDialog(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity z-10"
          >
            <XCircle className="h-4 w-4 text-slate-400" />
          </button>
          
          {selectedGrantForConsultation && (
            <div className="space-y-5 mt-4">
              <Alert className="bg-blue-500/10 border-blue-500/30">
                <AlertDescription className="text-slate-300 text-sm">
                  Bando selezionato: <span className="font-bold text-white">{selectedGrantForConsultation.title}</span>
                </AlertDescription>
              </Alert>

              {/* Costi e condizioni del bando */}
              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-2 border-amber-500/40 rounded-xl p-6 shadow-lg">
                <h3 className="text-amber-400 font-bold text-lg mb-5 flex items-center gap-2">
                  <Briefcase className="w-6 h-6" />
                  Costi e condizioni del bando
                </h3>
                
                <div className="space-y-4">
                  {/* Costo Istruttoria */}
                  <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-700">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="text-white font-semibold text-base">Costo istruttoria:</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lime-400 font-bold text-2xl">
                          € {selectedGrantForConsultation.prezzo_istruttoria?.toLocaleString('it-IT') || '0'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Compenso a Successo */}
                  <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex-1">
                        <p className="text-white font-semibold text-base">Compenso consulente a successo:</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lime-400 font-bold text-2xl">
                          {selectedGrantForConsultation.percentuale_erogazione || '0'}%
                        </span>
                      </div>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/30 rounded px-3 py-2 mt-3">
                      <p className="text-green-300 text-sm">
                        ✓ Applicata solo in caso di ottenimento del contributo
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p className="text-slate-300 text-sm">
                  Un consulente specializzato ti contatterà entro 48 ore per valutare la tua candidatura e fornirti assistenza completa nella preparazione e presentazione della domanda.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConsultationDialog(false)}
              className="border-slate-600 text-slate-300"
            >
              Annulla
            </Button>
            <Button
              onClick={confirmConsultationRequest}
              disabled={requestConsultationMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {requestConsultationMutation.isPending ? 'Invio...' : 'Conferma richiesta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Richieste Consulenza - Solo Admin */}
      <Dialog open={showConsultationMessages} onOpenChange={setShowConsultationMessages}>
        <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Richieste Consulenza Bandi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {consultationRequests.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nessuna richiesta di consulenza pendente</p>
            ) : (
              consultationRequests.map((req) => (
                <div key={req.id} className="bg-lime-400/10 border border-lime-400/30 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="text-white font-bold text-lg">{req.user?.company_name || 'Azienda N/A'}</h3>
                      <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                        <User className="w-4 h-4" />
                        <span>{req.user?.referente || req.user?.full_name || 'N/A'}</span>
                      </div>
                      {req.user?.telefono_referente && (
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <Phone className="w-4 h-4" />
                          <span>{req.user.telefono_referente}</span>
                        </div>
                      )}
                      <p className="text-lime-400 text-xs mt-1">{req.user?.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-lime-400 text-slate-900 text-xs font-bold px-2 py-1 rounded">NUOVO</span>
                      <button
                        onClick={() => {
                          if (confirm('Eliminare questa richiesta?')) {
                            deleteConsultationRequestMutation.mutate(req.id);
                          }
                        }}
                        className="text-red-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Info Bando */}
                  <div className="bg-slate-900 rounded-lg p-3 mb-3">
                    <p className="text-slate-400 text-xs mb-1">Bando richiesto:</p>
                    <p className="text-white font-medium">{req.grant?.title || 'Bando non trovato'}</p>
                    {req.grant && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                          {req.grant.grant_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                          {req.grant.funding_type}
                        </Badge>
                        {req.grant.max_amount && (
                          <Badge variant="outline" className="text-xs border-lime-400/50 text-lime-400">
                            Max €{req.grant.max_amount.toLocaleString('it-IT')}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-slate-500 text-xs">
                      {req.created_date ? new Date(req.created_date).toLocaleDateString('it-IT', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'N/A'}
                    </p>
                    <Button
                      size="sm"
                      className="bg-lime-400 hover:bg-lime-500 text-slate-900"
                      onClick={() => markConsultationReadMutation.mutate(req.id)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Presa in carico
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Bando Form Dialog - Admin */}
      <Dialog open={showBandoForm} onOpenChange={(open) => {
        setShowBandoForm(open);
        if (!open) setEditingBando(null);
      }}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingBando ? 'Modifica Bando' : 'Nuovo Bando'}
            </DialogTitle>
          </DialogHeader>
          <BandoForm
            bando={editingBando}
            onSubmit={handleBandoFormSubmit}
            onCancel={() => {
              setShowBandoForm(false);
              setEditingBando(null);
            }}
            isSubmitting={createBandoMutation.isPending || updateBandoMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Matching Preview Dialog - Admin */}
      <Dialog open={showMatchingPreview} onOpenChange={setShowMatchingPreview}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              Anteprima Matching: {selectedBandoForPreview?.title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedBandoForPreview && (
            <div className="space-y-4 mt-4">
              <div className="bg-slate-900 rounded-lg p-4">
                <h4 className="text-lime-400 font-medium mb-2">Criteri di Eligibilità</h4>
                <div className="space-y-2 text-sm">
                  {selectedBandoForPreview.eligible_company_sizes?.length > 0 && (
                    <div>
                      <span className="text-slate-400">Dimensioni:</span>
                      <span className="text-white ml-2">{selectedBandoForPreview.eligible_company_sizes.join(', ')}</span>
                    </div>
                  )}
                  {selectedBandoForPreview.eligible_regions?.length > 0 && (
                    <div>
                      <span className="text-slate-400">Regioni:</span>
                      <span className="text-white ml-2">{selectedBandoForPreview.eligible_regions.join(', ')}</span>
                    </div>
                  )}
                  {selectedBandoForPreview.eligible_ateco_codes?.length > 0 && (
                    <div>
                      <span className="text-slate-400">ATECO:</span>
                      <span className="text-white ml-2">{selectedBandoForPreview.eligible_ateco_codes.join(', ')}</span>
                    </div>
                  )}
                  {selectedBandoForPreview.eligible_legal_forms?.length > 0 && (
                    <div>
                      <span className="text-slate-400">Forme giuridiche:</span>
                      <span className="text-white ml-2">{selectedBandoForPreview.eligible_legal_forms.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-3">
                  Aziende Compatibili ({getMatchingUsersForBando(selectedBandoForPreview).length})
                </h4>
                <div className="space-y-2">
                  {getMatchingUsersForBando(selectedBandoForPreview).length === 0 ? (
                    <Alert className="bg-yellow-500/20 border-yellow-500/30">
                      <AlertDescription className="text-yellow-400 text-sm">
                        Attenzione: nessuna azienda corrisponde ai criteri. Verifica i requisiti.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    getMatchingUsersForBando(selectedBandoForPreview).map((u) => (
                      <div key={u.id} className="bg-slate-700 rounded-lg p-3">
                        <p className="text-white font-medium">{u.company_name || u.full_name}</p>
                        <div className="flex gap-3 text-xs text-slate-400 mt-1">
                          {u.company_size && <span>Dim: {u.company_size}</span>}
                          {u.region && <span>• {u.region}</span>}
                          {u.ateco_code && <span>• ATECO: {u.ateco_code}</span>}
                          {u.legal_form && <span>• {u.legal_form}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Popup Profilo Incompleto */}
      <Dialog open={showProfilePopup} onOpenChange={setShowProfilePopup}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-center">⚠️ Profilo Bandi Incompleto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-slate-300 text-sm text-center">
              Per utilizzare la ricerca AI dei bandi compatibili, devi prima completare il tuo Profilo Bandi con i dati della tua azienda.
            </p>
            <div className="bg-slate-900 rounded-lg p-3 space-y-2">
              <p className="text-slate-400 text-xs">Dati richiesti:</p>
              <ul className="text-slate-300 text-sm space-y-1">
                <li className="flex items-center gap-2">
                  {effectiveUserForProfile?.company_size ? '✅' : '❌'} Dimensione azienda
                </li>
                <li className="flex items-center gap-2">
                  {effectiveUserForProfile?.region ? '✅' : '❌'} Regione sede legale
                </li>
                <li className="flex items-center gap-2">
                  {effectiveUserForProfile?.interested_regions?.length > 0 ? '✅' : '❌'} Regioni di interesse
                </li>
                <li className="flex items-center gap-2">
                  {effectiveUserForProfile?.sector ? '✅' : '❌'} Settore
                </li>
                <li className="flex items-center gap-2">
                  {effectiveUserForProfile?.ateco_code ? '✅' : '❌'} Codice ATECO
                </li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Link 
              to={createPageUrl('ProfiloBandi') + '?from=ai'} 
              className="w-full"
              onClick={() => setShowProfilePopup(false)}
            >
              <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold">
                <Sparkles className="w-4 h-4 mr-2" />
                Compila il Profilo Bandi
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNavWithMenu currentPage="FinanziamentiAgevolati" unreadMessages={messages.length} />
    </div>
  );
}