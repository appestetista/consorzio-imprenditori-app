import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Calculator, History, AlertCircle } from 'lucide-react';
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
import { getTabsForSocieta } from '../components/fiscale/societaTabs';

export default function SimulatoreFiscale() {
  const [effectiveUser, setEffectiveUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [view, setView] = useState(null);
  const { impersonation, appMode } = useImpersonation();

  // Tabs dinamici in base al tipo di società dell'utente
  const userFormaGiuridica = effectiveUser?.forma_giuridica || null;
  const tabs = useMemo(() => getTabsForSocieta(userFormaGiuridica), [userFormaGiuridica]);

  // Imposta la prima tab quando i tabs cambiano
  useEffect(() => {
    if (tabs.length > 0 && (!view || view === null)) {
      setView(tabs[0].id);
    }
  }, [tabs]);

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

        {/* Banner se tipo società non configurato */}
        {!userFormaGiuridica && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-amber-300 text-sm font-medium">Tipo di società non impostato</p>
              <p className="text-slate-400 text-xs mt-1">Vai nel tuo <Link to={createPageUrl('MyProfile')} className="text-[#d4af37] underline">Profilo</Link> e seleziona il tipo di società per vedere i pulsanti personalizzati.</p>
            </div>
          </div>
        )}

        {/* Tipo società selezionato */}
        {userFormaGiuridica && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-slate-500 text-xs">Tipo società:</span>
            <span className="text-[#d4af37] text-xs font-semibold bg-[#d4af37]/10 px-2 py-0.5 rounded">{userFormaGiuridica}</span>
          </div>
        )}

        {/* Tabs dinamici */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`py-3 px-3 rounded-xl text-left transition-all ${
                view === tab.id
                  ? 'bg-[#d4af37] text-slate-900 shadow-lg shadow-[#d4af37]/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
              }`}
            >
              <span className="block text-sm font-semibold leading-tight">{tab.label}</span>
              <span className={`block text-[10px] mt-0.5 leading-tight ${view === tab.id ? 'text-slate-700' : 'text-slate-500'}`}>{tab.sub}</span>
            </button>
          ))}
          {effectiveUser?.role === 'admin' && (
            <button
              onClick={() => setView('aliquote')}
              className={`py-3 px-3 rounded-xl text-left transition-all ${
                view === 'aliquote'
                  ? 'bg-[#d4af37] text-slate-900 shadow-lg shadow-[#d4af37]/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80'
              }`}
            >
              <span className="block text-sm font-semibold leading-tight">Aliquote</span>
              <span className={`block text-[10px] mt-0.5 leading-tight ${view === 'aliquote' ? 'text-slate-700' : 'text-slate-500'}`}>Gestione IRAP</span>
            </button>
          )}
        </div>

        {/* Contenuto */}
        {view === 'bilancio' && <AnalisiBilancio />}

        {view === 'iva' && (
          <div className="bg-[#0a2540] border border-[#1a3a5c] rounded-xl p-6 text-center">
            <p className="text-white font-medium text-lg mb-1">IVA</p>
            <p className="text-slate-400 text-sm">Sezione in costruzione — Calcolo e monitoraggio IVA a debito/credito</p>
          </div>
        )}

        {view === 'irpef' && (
          <SimulazioneForm onSubmit={handleCalcola} loading={loading} />
        )}

        {view === 'result' && !loading && result && (
          <SimulazioneResult
            result={result}
            onNewScenario={() => { setView('irpef'); setResult(null); }}
          />
        )}

        {view === 'ires' && <MultiScenarioCompenso />}

        {view === 'inps' && (
          <div className="bg-[#0a2540] border border-[#1a3a5c] rounded-xl p-6 text-center">
            <p className="text-white font-medium text-lg mb-1">Contributi Pensione</p>
            <p className="text-slate-400 text-sm">Sezione in costruzione — Simulazione contributi INPS</p>
          </div>
        )}

        {view === 'dividendi' && <ConfrontoPrelievoSRL />}

        {view === 'netto' && (
          <StoricoSimulazioni
            userEmail={effectiveUser?.email}
            onSelect={handleSelectStorico}
          />
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