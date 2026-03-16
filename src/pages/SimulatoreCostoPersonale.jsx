import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import BottomNavWithMenu from '@/components/layout/BottomNavWithMenu';
import SimulatoreDipendente from '@/components/costo-personale/SimulatoreDipendente';
import SimulatoreAmministratore from '@/components/costo-personale/SimulatoreAmministratore';
import SimulatoreSocioLavoratore from '@/components/costo-personale/SimulatoreSocioLavoratore';
import SimulatoreGestioneSeparata from '@/components/costo-personale/SimulatoreGestioneSeparata';
import StoricoCalcoli from '@/components/costo-personale/StoricoCalcoli';
import GlobalTopIcons from '../components/layout/GlobalTopIcons';

export default function SimulatoreCostoPersonale() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    base44.auth.me().then(setUser).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen pb-64" style={{ backgroundColor: 'var(--app-bg)' }}>
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Esplora?tab=strumenti')} className="text-lime-400 p-3 -m-3 rounded-full back-arrow-tap">
              <ArrowLeft className="w-7 h-7" />
            </Link>
            <h1 className="text-white text-xl font-bold">Simulatore di Costo</h1>
          </div>
          {/* Icone gestite dal GlobalHeader */}
        </div>

        <Tabs defaultValue="dipendente" className="w-full">
          <TabsList className="w-full bg-slate-800 border border-slate-700 mb-4 grid grid-cols-3 gap-1 h-auto p-1">
            <TabsTrigger value="dipendente" className="data-[state=active]:bg-lime-400 data-[state=active]:text-slate-900 text-white text-[10px] py-2 px-1">
              Dipendente
            </TabsTrigger>
            <TabsTrigger value="amministratore" className="data-[state=active]:bg-indigo-500 data-[state=active]:text-white text-white text-[10px] py-2 px-1">
              Amm. SRL
            </TabsTrigger>
            <TabsTrigger value="socio" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white text-white text-[10px] py-2 px-1">
              Socio Lav.
            </TabsTrigger>
            <TabsTrigger value="gestione_separata" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white text-white text-[10px] py-2 px-1">
              Gest. Sep.
            </TabsTrigger>
            <TabsTrigger value="storico" className="data-[state=active]:bg-slate-500 data-[state=active]:text-white text-white text-[10px] py-2 px-1 col-span-2">
              📋 Storico Calcoli
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dipendente">
            <SimulatoreDipendente />
          </TabsContent>

          <TabsContent value="amministratore">
            <SimulatoreAmministratore />
          </TabsContent>

          <TabsContent value="socio">
            <SimulatoreSocioLavoratore />
          </TabsContent>

          <TabsContent value="gestione_separata">
            <SimulatoreGestioneSeparata />
          </TabsContent>

          <TabsContent value="storico">
            <StoricoCalcoli />
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavWithMenu currentPage="SimulatoreCostoPersonale" />
    </div>
  );
}