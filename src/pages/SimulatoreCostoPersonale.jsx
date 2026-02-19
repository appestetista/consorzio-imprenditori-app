import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import SimulatoreDipendente from '@/components/costo-personale/SimulatoreDipendente';
import SimulatoreAmministratore from '@/components/costo-personale/SimulatoreAmministratore';
import SimulatoreSocioLavoratore from '@/components/costo-personale/SimulatoreSocioLavoratore';
import SimulatoreGestioneSeparata from '@/components/costo-personale/SimulatoreGestioneSeparata';
import StoricoCalcoli from '@/components/costo-personale/StoricoCalcoli';

export default function SimulatoreCostoPersonale() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    base44.auth.me().then(setUser).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('Home')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">Costo del Personale</h1>
        </div>

        {/* Hero */}
        <Card className="bg-gradient-to-br from-violet-500 to-indigo-600 border-0 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">Simulatore Costo</h2>
                <p className="text-white/80 text-sm">Calcola il costo reale del personale</p>
              </div>
            </div>
          </CardContent>
        </Card>

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

      <BottomNav currentPage="SimulatoreCostoPersonale" />
    </div>
  );
}