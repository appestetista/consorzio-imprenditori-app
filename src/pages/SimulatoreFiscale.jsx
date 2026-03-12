import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Calculator } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Header from '../components/layout/Header';
import BottomNavWithMenu from '../components/layout/BottomNavWithMenu';
import { useImpersonation } from '../components/admin/ImpersonationContext';
import { normalizeUser } from '../components/utils/normalizeUser';
import SimulazioneForm from '../components/fiscale/SimulazioneForm';
import SimulazioneResult from '../components/fiscale/SimulazioneResult';
import StoricoSimulazioni from '../components/fiscale/StoricoSimulazioni';
import ConfrontoPrelievoSRL from '../components/fiscale/ConfrontoPrelievoSRL';
import MultiScenarioCompenso from '../components/fiscale/MultiScenarioCompenso';
import GestioneAliquoteIRAP from '../components/fiscale/GestioneAliquoteIRAP';
import AnalisiBilancio from '../components/fiscale/AnalisiBilancio';
import GlobalTopIcons from '../components/layout/GlobalTopIcons';
import { getTabsForSocieta, getTabImage } from '../components/fiscale/societaTabs';
import FiscalPreFlightPopup from '../components/fiscale/FiscalPreFlightPopup';
import AtecoInfoPopup from '../components/fiscale/AtecoInfoPopup';

export default function SimulatoreFiscale() {
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [view, setView] = useState(null);
  const [showPreFlight, setShowPreFlight] = useState(false);
  const { impersonation, appMode } = useImpersonation();

  // Tabs dinamici in base al tipo di società dell'utente
  const userFormaGiuridica = effectiveUser?.forma_giuridica || null;
  const tabs = useMemo(() => getTabsForSocieta(userFormaGiuridica), [userFormaGiuridica]);

  // Mostra popup pre-flight se manca qualsiasi dato fiscale essenziale
  useEffect(() => {
    if (effectiveUser && (!effectiveUser.forma_giuridica || !effectiveUser.regime_fiscale || (!effectiveUser.regione && !effectiveUser.region) || !effectiveUser.ateco_code)) {
      setShowPreFlight(true);
    }
  }, [effectiveUser]);

  // Imposta la prima tab quando i tabs cambiano
  useEffect(() => {
    if (tabs.length > 0 && (!view || view === null)) {
      setView(tabs[0].id);
    }
  }, [tabs]);

  const handlePreFlightComplete = (vals) => {
    setShowPreFlight(false);
    setEffectiveUser(prev => ({ ...prev, ...vals }));
    setView(null); // reset view so it picks up the first tab from new tabs
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

  const handleCalcola = async (formData) => {
    setLoading(true);
    setResult(null);
    const response = await base44.functions.invoke('calcolaImposte', formData);
    setResult(response.data);
    setLoading(false);
    setView('result');
  };

  const handleSelectStorico = (sim) => {
    setResult({
      success: true,
      simulazione_id: sim.id,
      utile: sim.utile,
      reddito_imponibile: sim.reddito_imponibile,
      imposte_totali: sim.imposte_totali,
      netto_finale: sim.netto_finale,
      pressione_fiscale: sim.fatturato > 0 ? Math.round((sim.imposte_totali / sim.fatturato) * 10000) / 100 : 0,
      dettaglio_calcolo: sim.dettaglio_calcolo
    });
    setView('result');
  };

  return (
    <div className="min-h-screen pb-64" style={{ backgroundColor: '#001d3b' }}>
      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Header pagina */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Esplora?tab=strumenti')} className="text-[#d4af37] p-3 -m-3 rounded-full back-arrow-tap">
              <ArrowLeft className="w-7 h-7" />
            </Link>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#d4af37]" />
              <h1 className="text-white text-xl font-bold">Simulatore Fiscale</h1>
            </div>
          </div>
          {/* Icone gestite dal GlobalHeader */}
        </div>

        {/* Popup pre-flight dati fiscali mancanti */}
        {showPreFlight && effectiveUser && (
          <FiscalPreFlightPopup user={effectiveUser} onComplete={handlePreFlightComplete} />
        )}

        {/* Riepilogo dati fiscali dal profilo */}
        {userFormaGiuridica && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[#d4af37] text-xs font-semibold bg-[#d4af37]/10 px-2 py-0.5 rounded">{userFormaGiuridica}</span>
            {effectiveUser?.regime_fiscale && (
              <span className="text-slate-300 text-xs bg-slate-800/80 px-2 py-0.5 rounded">{effectiveUser.regime_fiscale}</span>
            )}
            {(effectiveUser?.regione || effectiveUser?.region) && (
              <span className="text-slate-300 text-xs bg-slate-800/80 px-2 py-0.5 rounded">{effectiveUser.regione || effectiveUser.region}</span>
            )}
            {effectiveUser?.ateco_code && (
              <span className="text-slate-300 text-xs bg-slate-800/80 px-2 py-0.5 rounded inline-flex items-center">
                ATECO {effectiveUser.ateco_code}
                <AtecoInfoPopup atecoCode={effectiveUser.ateco_code} />
              </span>
            )}
            {effectiveUser?.periodicita_iva && (
              <span className="text-slate-300 text-xs bg-slate-800/80 px-2 py-0.5 rounded">IVA {effectiveUser.periodicita_iva}</span>
            )}
            {effectiveUser?.gestione_inps && (
              <span className="text-slate-300 text-xs bg-slate-800/80 px-2 py-0.5 rounded">{effectiveUser.gestione_inps}</span>
            )}
            {effectiveUser?.numero_soci && (
              <span className="text-slate-300 text-xs bg-slate-800/80 px-2 py-0.5 rounded">{effectiveUser.numero_soci} soci</span>
            )}
            {effectiveUser?.soci_accomandatari && (
              <span className="text-slate-300 text-xs bg-slate-800/80 px-2 py-0.5 rounded">{effectiveUser.soci_accomandatari} acc.ri / {effectiveUser.soci_accomandanti || 0} acc.ti</span>
            )}
            {effectiveUser?.capitale_sociale && (
              <span className="text-slate-300 text-xs bg-slate-800/80 px-2 py-0.5 rounded">Cap. €{Number(effectiveUser.capitale_sociale).toLocaleString('it-IT')}</span>
            )}
            {effectiveUser?.tipo_contabilita && (
              <span className="text-slate-300 text-xs bg-slate-800/80 px-2 py-0.5 rounded">Cont. {effectiveUser.tipo_contabilita}</span>
            )}
            {effectiveUser?.tipo_cooperativa && (
              <span className="text-slate-300 text-xs bg-slate-800/80 px-2 py-0.5 rounded">Coop. {effectiveUser.tipo_cooperativa}</span>
            )}
            {effectiveUser?.mutualita_prevalente && (
              <span className="text-green-300 text-xs bg-green-900/30 px-2 py-0.5 rounded">Mutualità prev.</span>
            )}
            {effectiveUser?.riduzione_contributiva_forfettario && (
              <span className="text-green-300 text-xs bg-green-900/30 px-2 py-0.5 rounded">INPS -35%</span>
            )}
            {effectiveUser?.ha_compenso_amministratore && (
              <span className="text-slate-300 text-xs bg-slate-800/80 px-2 py-0.5 rounded">Comp. Amm.</span>
            )}
          </div>
        )}

        {/* Tabs dinamici con icone */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {tabs.map(tab => {
            const img = getTabImage(tab.id);
            const isActive = view === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                className={`relative overflow-hidden rounded-2xl transition-all ${
                  isActive
                    ? 'bg-[#0a2540] border-2 border-[#d4af37] shadow-lg shadow-[#d4af37]/20'
                    : 'bg-[#0a2540] border border-[#1a3a5c] hover:border-[#d4af37]/40'
                }`}
              >
                <div className="flex flex-col items-center p-3 pb-2">
                  {img && (
                    <img src={img} alt={tab.label} className="w-28 h-28 object-contain" />
                  )}
                  <span className={`text-sm font-bold text-center leading-tight mt-1 whitespace-nowrap ${isActive ? 'text-[#d4af37]' : 'text-white'}`}>{tab.label}</span>
                  <span className={`text-[11px] text-center leading-tight mt-0.5 whitespace-nowrap ${isActive ? 'text-[#f0d060]' : 'text-slate-400'}`}>{tab.sub}</span>
                </div>
                {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d4af37]" />}
              </button>
            );
          })}
          {effectiveUser?.role === 'admin' && (
            <button
              onClick={() => setView('aliquote')}
              className={`relative overflow-hidden rounded-2xl transition-all ${
                view === 'aliquote'
                  ? 'bg-[#0a2540] border-2 border-[#d4af37] shadow-lg shadow-[#d4af37]/20'
                  : 'bg-[#0a2540] border border-[#1a3a5c] hover:border-[#d4af37]/40'
              }`}
            >
              <div className="flex flex-col items-center p-3 pb-2">
                <img src={getTabImage('irap')} alt="Aliquote" className="w-28 h-28 object-contain" />
                <span className={`text-sm font-bold text-center leading-tight mt-1 whitespace-nowrap ${view === 'aliquote' ? 'text-[#d4af37]' : 'text-white'}`}>Aliquote</span>
                <span className={`text-[11px] text-center leading-tight mt-0.5 whitespace-nowrap ${view === 'aliquote' ? 'text-[#f0d060]' : 'text-slate-400'}`}>Gestione IRAP</span>
              </div>
              {view === 'aliquote' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d4af37]" />}
            </button>
          )}
        </div>

        {/* Contenuto */}
        {view === 'bilancio' && <AnalisiBilancio />}

        {(view === 'iva' || view === 'iva_ue') && (
          <PlaceholderSection title={view === 'iva_ue' ? 'IVA UE' : 'IVA'} desc="Calcolo e monitoraggio IVA a debito/credito" />
        )}

        {(view === 'irpef' || view === 'compenso') && (
          <SimulazioneForm onSubmit={handleCalcola} loading={loading} userProfile={effectiveUser} />
        )}

        {view === 'result' && !loading && result && (
          <SimulazioneResult
            result={result}
            onNewScenario={() => { setView(tabs[0]?.id || 'bilancio'); setResult(null); }}
          />
        )}

        {view === 'ires' && <MultiScenarioCompenso />}

        {view === 'irap' && (
          <PlaceholderSection title="IRAP" desc="Imposta Regionale sulle Attività Produttive" />
        )}

        {view === 'inps' && (
          <PlaceholderSection title="Contributi INPS" desc="Simulazione contributi previdenziali" />
        )}

        {(view === 'dividendi' || view === 'ristorni') && <ConfrontoPrelievoSRL />}

        {view === 'netto' && (
          <StoricoSimulazioni
            userEmail={effectiveUser?.email}
            onSelect={handleSelectStorico}
          />
        )}

        {view === 'ricavi' && (
          <PlaceholderSection title="Ricavi" desc="Fatturato annuo e analisi ricavi" />
        )}

        {view === 'coefficiente' && (
          <PlaceholderSection title="Coefficiente di Redditività" desc="Percentuale di reddito imponibile sul fatturato" />
        )}

        {view === 'imposta_sost' && (
          <PlaceholderSection title="Imposta Sostitutiva" desc="Calcolo imposta sostitutiva 5% o 15%" />
        )}

        {view === 'aliquote' && effectiveUser?.role === 'admin' && (
          <GestioneAliquoteIRAP user={effectiveUser} />
        )}

        {loading && view !== 'result' && (
          <div className="bg-[#0a2540] border border-[#1a3a5c] rounded-xl p-6 text-center mb-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#d4af37] mx-auto mb-3"></div>
            <p className="text-white font-medium">Calcolo imposte in corso...</p>
            <p className="text-slate-400 text-sm mt-1">Formule deterministiche basate su aliquote vigenti</p>
          </div>
        )}
      </main>

      <BottomNavWithMenu currentPage="SimulatoreFiscale" />
    </div>
  );
}

function PlaceholderSection({ title, desc }) {
  return (
    <div className="bg-[#0a2540] border border-[#1a3a5c] rounded-xl p-6 text-center">
      <p className="text-white font-medium text-lg mb-1">{title}</p>
      <p className="text-slate-400 text-sm">Sezione in costruzione — {desc}</p>
    </div>
  );
}