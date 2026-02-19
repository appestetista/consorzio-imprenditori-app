import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Search, Eye, Users, Clock, Shield, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import SupplierRequestWizard from '../components/fornitori/SupplierRequestWizard';
import MyRequestsList from '../components/fornitori/MyRequestsList';
import OpenRequestsList from '../components/fornitori/OpenRequestsList';
import SupplierProfileSetup from '../components/fornitori/SupplierProfileSetup';
import SectionConsultantPanel from '../components/consulenze/SectionConsultantPanel';

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
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={effectiveUser || user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(createPageUrl('Home'))} className="text-lime-400">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lime-400 text-xl font-bold">Fornitori</h1>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-gradient-to-r from-lime-400/10 to-emerald-400/10 border border-lime-400/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-lime-400/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-lime-400" />
            </div>
            <div>
              <p className="text-white font-medium">Ricerca fornitori anonima</p>
              <p className="text-slate-400 text-sm">Trova fornitori seri partendo dal tuo problema. Tutto in anonimato finché non decidi tu.</p>
            </div>
          </div>
        </div>

        {/* Tabs per imprenditori e fornitori */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full bg-slate-800 border border-slate-700 mb-4">
            <TabsTrigger 
            value="my-requests" 
            className="flex-1 data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900"
            >
            <Search className="w-4 h-4 mr-2" />
            Richieste
            </TabsTrigger>
            {isSupplier && (
              <TabsTrigger 
                value="open-requests" 
                className="flex-1 data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900"
              >
                <Users className="w-4 h-4 mr-2" />
                Richieste aperte
              </TabsTrigger>
            )}
            {isSupplier && (
              <TabsTrigger 
                value="my-profile" 
                className="flex-1 data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900"
              >
                <Eye className="w-4 h-4 mr-2" />
                Profilo
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="my-requests" className="mt-0">
            {/* Pannello Consulenti per questa sezione */}
            {effectiveUser && (
              <div className="mb-6">
                <SectionConsultantPanel 
                  sectionId="fornitori" 
                  sectionLabel="Ricerca Fornitori" 
                  user={effectiveUser} 
                />
              </div>
            )}

            {!showNewRequest ? (
              <>
                <Button 
                  onClick={() => setShowNewRequest(true)}
                  className="w-full bg-lime-400 text-slate-900 hover:bg-lime-500 mb-4"
                >
                  <Plus className="w-4 h-4 mr-2" /> Nuova richiesta fornitore
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
          </TabsContent>

          {isSupplier && (
            <TabsContent value="open-requests" className="mt-0">
              <OpenRequestsList user={effectiveUser} supplierProfile={supplierProfile} />
            </TabsContent>
          )}

          {isSupplier && (
            <TabsContent value="my-profile" className="mt-0">
              <SupplierProfileSetup user={effectiveUser} existingProfile={supplierProfile} />
            </TabsContent>
          )}
        </Tabs>
      </main>

      <BottomNav currentPage="Fornitori" unreadMessages={messages.length} />
    </div>
  );
}