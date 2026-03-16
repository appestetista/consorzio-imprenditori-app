import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Search, Eye, Users, Clock, Shield, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '../components/layout/Header';
import BottomNavWithMenu from '../components/layout/BottomNavWithMenu';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import SupplierRequestWizard from '../components/fornitori/SupplierRequestWizard';
import MyRequestsList from '../components/fornitori/MyRequestsList';
import OpenRequestsList from '../components/fornitori/OpenRequestsList';
import SupplierProfileSetup from '../components/fornitori/SupplierProfileSetup';
import SectionConsultantPanel from '../components/consulenze/SectionConsultantPanel';
import PremiumAIGate from '@/components/common/PremiumAIGate';
import GlobalTopIcons from '../components/layout/GlobalTopIcons';

export default function Fornitori() {
  const [user, setUser] = useState(null);
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [activeTab, setActiveTab] = useState('my-requests');
  const { impersonation, appMode } = useImpersonation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  // Controlla se l'utente ha un profilo fornitore
  const { data: supplierProfile } = useQuery({
    queryKey: ['supplier-profile', effectiveUser?.email],
    queryFn: async () => {
      const profiles = await base44.entities.SupplierProfile.filter({ user_email: effectiveUser?.email });
      return profiles[0] || null;
    },
    enabled: !!effectiveUser?.email,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', effectiveUser?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: effectiveUser?.email, is_read: false }),
    enabled: !!effectiveUser?.email,
  });

  const isSupplier = effectiveUser?.role === 'fornitore' || !!supplierProfile;

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
            <button onClick={() => {
              if (showNewRequest) {
                setShowNewRequest(false);
              } else {
                navigate(createPageUrl('Esplora?tab=strumenti'));
              }
            }} className="text-black p-3 -m-3 rounded-full back-arrow-tap">
              <ArrowLeft className="w-7 h-7" />
            </button>
            <h1 className="text-black text-xl font-bold">Ricerca Fornitori Anonima</h1>
          </div>
          {/* Icone gestite dal GlobalHeader */}
        </div>

        {/* Info banner */}
        <div className="bg-gradient-to-r from-lime-400/10 to-emerald-400/10 border border-lime-400/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-lime-400/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-lime-400" />
            </div>
            <div>
              <p className="text-black font-medium">Ricerca fornitori anonima</p>
              <p className="text-black/60 text-sm">Trova fornitori seri partendo dal tuo problema. Tutto in anonimato finché non decidi tu.</p>
            </div>
          </div>
        </div>

        {/* Sezione principale */}
        {/* Pannello Consulenti */}
        {effectiveUser && (
          <div className="mb-4">
            <SectionConsultantPanel 
              sectionId="fornitori" 
              sectionLabel="Ricerca Fornitori" 
              user={effectiveUser} 
            />
          </div>
        )}

        {/* Tab fornitori (solo se è fornitore) */}
        {isSupplier && (
          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              onClick={() => setActiveTab('my-requests')}
              className={`flex-1 text-xs ${activeTab === 'my-requests' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-black border border-black/15 hover:border-black/30'}`}
            >
              <Search className="w-3 h-3 mr-1" /> Cerca fornitore
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveTab('open-requests')}
              className={`flex-1 text-xs ${activeTab === 'open-requests' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-black border border-black/15 hover:border-black/30'}`}
            >
              <Users className="w-3 h-3 mr-1" /> Candidati
            </Button>
            <Button
              size="sm"
              onClick={() => setActiveTab('my-profile')}
              className={`flex-1 text-xs ${activeTab === 'my-profile' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-black border border-black/15 hover:border-black/30'}`}
            >
              <Eye className="w-3 h-3 mr-1" /> Profilo
            </Button>
          </div>
        )}

        {/* Gate Premium AI */}
        {effectiveUser?.piano_abbonamento !== 'impresa_39' && (
          <div className="mb-4">
            <PremiumAIGate user={effectiveUser} featureLabel="Ricerca fornitori verificati con analisi AI, confronto candidature e preventivi automatizzati" />
          </div>
        )}

        {/* Contenuto */}
        {activeTab === 'my-requests' && (
          <>
            {!showNewRequest ? (
              <>
                <Button 
                  onClick={() => setShowNewRequest(true)}
                  disabled={effectiveUser?.piano_abbonamento !== 'impresa_39'}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 mb-4"
                >
                  <Plus className="w-4 h-4 mr-2" /> Cerca nuovo fornitore
                </Button>
                <MyRequestsList user={effectiveUser} />
              </>
            ) : (
              <SupplierRequestWizard 
                user={effectiveUser} 
                onClose={() => setShowNewRequest(false)}
                onSuccess={() => {
                  setShowNewRequest(false);
                  queryClient.invalidateQueries({ queryKey: ['all-supplier-requests'] });
                }}
              />
            )}
          </>
        )}

        {isSupplier && activeTab === 'open-requests' && (
          <OpenRequestsList user={effectiveUser} supplierProfile={supplierProfile} />
        )}

        {isSupplier && activeTab === 'my-profile' && (
          <SupplierProfileSetup user={effectiveUser} existingProfile={supplierProfile} />
        )}
      </main>

      <BottomNavWithMenu currentPage="Fornitori" unreadMessages={messages.length} />
    </div>
  );
}