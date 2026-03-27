import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Calculator, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BottomNavWithMenu from '../components/layout/BottomNavWithMenu';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { normalizeUser } from '../components/utils/normalizeUser';
import SimulatoreInterattivo from '../components/fiscale/SimulatoreInterattivo';
import GestioneAliquoteIRAP from '../components/fiscale/GestioneAliquoteIRAP';
import FiscalPreFlightPopup from '../components/fiscale/FiscalPreFlightPopup';
import AtecoInfoPopup from '../components/fiscale/AtecoInfoPopup';
import QuickEditFiscale from '../components/fiscale/QuickEditFiscale';
import SimulatoreHero from '../components/fiscale/SimulatoreHero';
import NormativaWarningBanner from '../components/fiscale/NormativaWarningBanner';

export default function SimulatoreFiscale() {
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [showPreFlight, setShowPreFlight] = useState(false);
  const [showAliquote, setShowAliquote] = useState(false);
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const { impersonation, appMode } = useImpersonation();

  // Mostra popup pre-flight solo se manca la forma giuridica (unico dato indispensabile)
  useEffect(() => {
    if (effectiveUser && !effectiveUser.forma_giuridica) {
      setShowPreFlight(true);
    }
  }, [effectiveUser]);

  // Non impostiamo più un tab attivo automaticamente — l'utente sceglie

  const handlePreFlightComplete = (vals) => {
    setShowPreFlight(false);
    setEffectiveUser(prev => ({ ...prev, ...vals }));
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      if (appMode === 'user-preview' && impersonation.previewUserId) {
        const users = await base44.entities.User.filter({ id: impersonation.previewUserId });
        setEffectiveUser(normalizeUser(users.length > 0 ? users[0] : currentUser));
      } else {
        setEffectiveUser(normalizeUser(currentUser));
      }
    };
    loadUser();
  }, [appMode, impersonation.previewUserId]);

  return (
    <div className="min-h-screen pb-64" style={{ backgroundColor: 'var(--app-bg)' }}>
      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Header pagina */}
        <div className="flex items-center gap-3 mb-4">
          <Link to={createPageUrl('Esplora?tab=strumenti')} className="text-[#d4af37] p-3 -m-3 rounded-full back-arrow-tap">
            <ArrowLeft className="w-7 h-7" />
          </Link>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#d4af37]" />
            <h1 className="text-xl font-bold" style={{ color: 'var(--app-text-primary)' }}>Simulatore Fiscale</h1>
          </div>
        </div>

        {/* Hero visivo */}
        <SimulatoreHero />

        {/* Avviso normativa non aggiornata */}
        <NormativaWarningBanner />

        {/* Popup pre-flight dati fiscali mancanti */}
        {showPreFlight && effectiveUser && (
          <FiscalPreFlightPopup user={effectiveUser} onComplete={handlePreFlightComplete} />
        )}

        {/* Popup modifica rapida dati fiscali (pennetta) */}
        {showQuickEdit && effectiveUser && (
          <QuickEditFiscale
            user={effectiveUser}
            onSave={(updated) => {
              setEffectiveUser(prev => ({ ...prev, ...updated }));
              setShowQuickEdit(false);
            }}
            onClose={() => setShowQuickEdit(false)}
          />
        )}

        {/* Riepilogo dati fiscali dal profilo */}
        {effectiveUser?.forma_giuridica && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <button onClick={() => setShowQuickEdit(true)} className="text-[#d4af37] hover:text-[#f0d060] p-1 rounded-full bg-[#d4af37]/10 hover:bg-[#d4af37]/20 transition-all mr-1">
              <Pencil className="w-4 h-4" />
            </button>
            <span className="text-[#d4af37] text-xs font-semibold bg-[#d4af37]/10 px-2 py-0.5 rounded">{effectiveUser.forma_giuridica}</span>
            {effectiveUser?.regime_fiscale && (
              <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--app-text-primary)', backgroundColor: 'var(--app-bg-card)' }}>{effectiveUser.regime_fiscale}</span>
            )}
            {(effectiveUser?.regione || effectiveUser?.region) && (
              <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--app-text-primary)', backgroundColor: 'var(--app-bg-card)' }}>{effectiveUser.regione || effectiveUser.region}</span>
            )}
            {effectiveUser?.ateco_code && (
              <span className="text-xs px-2 py-0.5 rounded inline-flex items-center" style={{ color: 'var(--app-text-primary)', backgroundColor: 'var(--app-bg-card)' }}>
                ATECO {effectiveUser.ateco_code}
                <AtecoInfoPopup atecoCode={effectiveUser.ateco_code} />
              </span>
            )}
          </div>
        )}

        {/* Simulatore interattivo principale */}
        {effectiveUser && (
          <SimulatoreInterattivo user={effectiveUser} />
        )}

        {/* Admin: gestione aliquote */}
        {effectiveUser?.role === 'admin' && (
          <div className="mt-6">
            <button
              onClick={() => setShowAliquote(!showAliquote)}
              className="text-[#d4af37] text-xs font-semibold hover:underline mb-3"
            >
              {showAliquote ? 'Nascondi' : 'Gestione'} Aliquote IRAP (Admin)
            </button>
            {showAliquote && <GestioneAliquoteIRAP user={effectiveUser} />}
          </div>
        )}
      </main>

      <BottomNavWithMenu currentPage="SimulatoreFiscale" />
    </div>
  );
}