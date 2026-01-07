import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Sparkles, AlertCircle, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import GrantCard from '../components/grants/GrantCard';
import GrantFilters from '../components/grants/GrantFilters';

export default function FinanziamentiAgevolati() {
  const [user, setUser] = useState(null);
  const [selectedGrant, setSelectedGrant] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    easyAccess: false,
    grantType: 'all',
    fundingType: 'all',
    status: 'all',
    accessMode: 'all',
    noCofinancing: false
  });

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

  const { data: allGrants = [], isLoading } = useQuery({
    queryKey: ['financial-grants'],
    queryFn: () => base44.entities.FinancialGrant.list('-created_date'),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleShowDetails = (grant) => {
    setSelectedGrant(grant);
    setShowDetails(true);
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

        {/* Profile Warning */}
        {hasIncompleteProfile && (
          <Alert className="mb-6 bg-yellow-500/20 border-yellow-500/30">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-yellow-400 text-sm">
              Completa il profilo aziendale per vedere bandi più pertinenti. 
              <Link to={createPageUrl('AdminPanel')} className="underline ml-1">
                Vai al profilo
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats */}
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

        {/* Filters */}
        <div className="mb-6">
          <GrantFilters filters={filters} onFilterChange={handleFilterChange} />
        </div>

        {/* Info Box */}
        <Alert className="mb-6 bg-lime-400/10 border-lime-400/30">
          <Info className="h-4 w-4 text-lime-400" />
          <AlertDescription className="text-slate-300 text-sm">
            I bandi mostrati sono già filtrati in base al tuo profilo aziendale (dimensione, regione, settore).
          </AlertDescription>
        </Alert>

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
            {filteredGrants.map((grant) => (
              <GrantCard
                key={grant.id}
                grant={grant}
                onDetails={handleShowDetails}
              />
            ))}
          </div>
        )}
      </main>

      {/* Grant Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="bg-slate-800 border-slate-700 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedGrant?.title}</DialogTitle>
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

      <BottomNav currentPage="FinanziamentiAgevolati" unreadMessages={messages.length} />
    </div>
  );
}