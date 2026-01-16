import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Sparkles, AlertCircle, Info, Briefcase, XCircle, Building2, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import GrantCard from '../components/grants/GrantCard';
import GrantFilters from '../components/grants/GrantFilters';

export default function FinanziamentiAgevolati() {
  const [user, setUser] = useState(null);
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
    noCofinancing: false
  });
  const queryClient = useQueryClient();

  useEffect(() => {
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
      
      await Promise.all(notificationPromises);
      
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

  // Automatic matching based on company profile
  const matchesCompanyProfile = (grant) => {
    // Check company size
    if (grant.eligible_company_sizes?.length > 0 && user?.company_size) {
      if (!grant.eligible_company_sizes.includes(user.company_size)) {
        return false;
      }
    }

    // Check region
    if (grant.eligible_regions?.length > 0 && user?.region) {
      if (!grant.eligible_regions.includes(user.region)) {
        return false;
      }
    }

    // Check ATECO code
    if (grant.eligible_ateco_codes?.length > 0 && user?.ateco_code) {
      const hasMatch = grant.eligible_ateco_codes.some(code => 
        user.ateco_code.startsWith(code) || code.startsWith(user.ateco_code.substring(0, 2))
      );
      if (!hasMatch) {
        return false;
      }
    }

    // Check legal form
    if (grant.eligible_legal_forms?.length > 0 && user?.legal_form) {
      if (!grant.eligible_legal_forms.includes(user.legal_form)) {
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

  const filteredGrants = allGrants
    .filter(matchesCompanyProfile)
    .filter(applyFilters);

  // Get AI recommendations when grants and user are loaded
  useEffect(() => {
    const getAIRecommendations = async () => {
      if (!user || !filteredGrants.length || loadingRecommendations || Object.keys(aiRecommendations).length > 0) return;
      
      setLoadingRecommendations(true);
      
      try {
        const userProfile = {
          company_name: user.company_name || 'N/A',
          company_size: user.company_size || 'N/A',
          region: user.region || 'N/A',
          ateco_code: user.ateco_code || 'N/A',
          legal_form: user.legal_form || 'N/A',
          sector: user.sector || 'N/A'
        };

        const grantsForAnalysis = filteredGrants.slice(0, 10).map(g => ({
          id: g.id,
          title: g.title,
          description: g.description,
          grant_type: g.grant_type,
          funding_type: g.funding_type,
          coverage_percentage: g.coverage_percentage,
          min_amount: g.min_amount,
          max_amount: g.max_amount,
          easy_access: g.easy_access,
          requires_cofinancing: g.requires_cofinancing
        }));

        const prompt = `Sei un consulente esperto di bandi e finanziamenti agevolati per PMI italiane.

Analizza il profilo aziendale e assegna un punteggio di rilevanza (da 0 a 100) a ciascun bando, considerando:
- Compatibilità con il settore e dimensione aziendale
- Facilità di accesso e requisiti
- Importo e copertura del finanziamento
- Coerenza con le esigenze tipiche del settore

PROFILO AZIENDALE:
${JSON.stringify(userProfile, null, 2)}

BANDI DISPONIBILI:
${JSON.stringify(grantsForAnalysis, null, 2)}

Per ogni bando, fornisci:
- relevance_score: punteggio 0-100
- reason: breve spiegazione (max 100 caratteri) del perché è rilevante`;

        const response = await base44.integrations.Core.InvokeLLM({
          prompt: prompt,
          response_json_schema: {
            type: "object",
            properties: {
              recommendations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    grant_id: { type: "string" },
                    relevance_score: { type: "number" },
                    reason: { type: "string" }
                  }
                }
              }
            }
          }
        });

        const recommendationsMap = {};
        response.recommendations.forEach(rec => {
          recommendationsMap[rec.grant_id] = {
            score: rec.relevance_score,
            reason: rec.reason
          };
        });
        
        setAiRecommendations(recommendationsMap);
      } catch (error) {
        console.error('Error getting AI recommendations:', error);
      } finally {
        setLoadingRecommendations(false);
      }
    };

    getAIRecommendations();
  }, [user, filteredGrants.length]);

  // Sort grants by AI recommendation score
  const sortedGrants = [...filteredGrants].sort((a, b) => {
    const scoreA = aiRecommendations[a.id]?.score || 0;
    const scoreB = aiRecommendations[b.id]?.score || 0;
    return scoreB - scoreA;
  });

  const topRecommendedGrants = sortedGrants.filter(g => 
    aiRecommendations[g.id]?.score >= 75
  ).slice(0, 3);

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

  const hasIncompleteProfile = !user?.company_size || !user?.region;

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('Home')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-white text-xl font-bold">Finanziamenti Agevolati</h1>
            <p className="text-slate-400 text-sm">Bandi compatibili con il tuo profilo</p>
          </div>
        </div>

        {/* Profile Warning - solo per utenti non admin */}
        {/* Data odierna */}
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-6 flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-lime-400" />
          <div>
            <p className="text-slate-400 text-xs">Data odierna</p>
            <p className="text-white font-bold text-lg">
              {format(new Date(), "EEEE d MMMM yyyy", { locale: it })}
            </p>
          </div>
        </div>

        {hasIncompleteProfile && user?.role !== 'admin' && (
            <Alert className="mb-6 bg-yellow-500/20 border-yellow-500/30">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-400 text-sm">
                Integra le informazioni della tua azienda per ricevere i bandi più appropriati.
                <Link to={createPageUrl('ProfiloBandi')} className="underline ml-1 font-semibold">
                  Configura profilo bandi
                </Link>
              </AlertDescription>
            </Alert>
          )}

        {/* Stats */}
        {user?.role === 'admin' ? (
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 mb-6">
            <div className="text-2xl font-bold text-lime-400 mb-2">{allGrants.length}</div>
            <div className="text-slate-400 text-sm mb-3">Totale bandi trovati dai siti</div>
            <div className="border-t border-slate-700 pt-3">
              <p className="text-slate-500 text-xs mb-2">Siti scansionati:</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">incentivi.gov.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">simest.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">invitalia.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.lombardia.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.veneto.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.emilia-romagna.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.piemonte.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.toscana.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.lazio.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.campania.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.sicilia.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.puglia.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.marche.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.liguria.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.fvg.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.abruzzo.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.umbria.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.calabria.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.sardegna.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.basilicata.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.molise.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">regione.vda.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">provincia.tn.it</Badge>
                <Badge variant="outline" className="text-xs text-slate-300 border-slate-600">provincia.bz.it</Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-2xl font-bold text-lime-400 mb-1">{filteredGrants.length}</div>
              <div className="text-slate-400 text-sm">Bandi compatibili</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <div className="text-2xl font-bold text-lime-400 mb-1">
                {filteredGrants.filter(g => g.easy_access).length}
              </div>
              <div className="text-slate-400 text-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Attivabili subito
              </div>
            </div>
          </div>
        )}

        {/* Filters - solo per utenti non admin */}
        {user?.role !== 'admin' && (
          <div className="mb-6">
            <GrantFilters filters={filters} onFilterChange={handleFilterChange} />
          </div>
        )}

        {/* Info Box - solo per utenti non admin */}
        {user?.role !== 'admin' && (
          <Alert className="mb-6 bg-lime-400/10 border-lime-400/30">
            <Info className="h-4 w-4 text-lime-400" />
            <AlertDescription className="text-slate-300 text-sm">
              I bandi mostrati sono già filtrati in base al tuo profilo aziendale (dimensione, regione, settore).
            </AlertDescription>
          </Alert>
        )}

        {/* AI Recommendations Loading */}
        {loadingRecommendations && (
          <Alert className="mb-6 bg-purple-500/10 border-purple-500/30">
            <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
            <AlertDescription className="text-purple-300 text-sm">
              🤖 Sto analizzando i bandi più adatti al tuo profilo...
            </AlertDescription>
          </Alert>
        )}

        {/* Top Recommended Grants */}
        {topRecommendedGrants.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h2 className="text-white font-bold">Consigliati per te</h2>
            </div>
            <div className="space-y-3">
              {topRecommendedGrants.map((grant) => {
                const interest = userInterests.find(i => i.grant_id === grant.id);
                const recommendation = aiRecommendations[grant.id];
                return (
                  <div key={grant.id} className="relative">
                    <div className="absolute -top-2 -right-2 z-10 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      🎯 {recommendation.score}% match
                    </div>
                    <GrantCard
                      grant={grant}
                      userInterest={interest}
                      onDetails={handleShowDetails}
                      onToggleAlerts={() => handleToggleAlerts(grant)}
                      onRequestConsultation={() => handleRequestConsultation(grant)}
                      aiRecommendation={recommendation}
                      isTopRecommended={true}
                      userProfile={user}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-4 border-t border-slate-700 pt-4">
              <h3 className="text-slate-400 font-medium mb-3">Altri bandi compatibili</h3>
            </div>
          </div>
        )}

        {/* Grants List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : filteredGrants.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Nessun bando compatibile trovato</p>
            <p className="text-slate-500 text-sm mt-2">
              Prova a modificare i filtri o completa il profilo aziendale
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedGrants.map((grant) => {
              if (topRecommendedGrants.find(g => g.id === grant.id)) return null;
              
              const interest = userInterests.find(i => i.grant_id === grant.id);
              const recommendation = aiRecommendations[grant.id];
              return (
                <GrantCard
                  key={grant.id}
                  grant={grant}
                  userInterest={interest}
                  onDetails={handleShowDetails}
                  onToggleAlerts={() => handleToggleAlerts(grant)}
                  onRequestConsultation={() => handleRequestConsultation(grant)}
                  aiRecommendation={recommendation}
                  userProfile={user}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Grant Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedGrant?.title}</DialogTitle>
          </DialogHeader>
          <button
            onClick={() => setShowDetails(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity z-10"
          >
            <XCircle className="h-4 w-4 text-slate-400" />
          </button>
          
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

      <BottomNav currentPage="FinanziamentiAgevolati" unreadMessages={messages.length} />
    </div>
  );
}