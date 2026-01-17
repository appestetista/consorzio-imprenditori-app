import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Zap, Lightbulb, Leaf, Shield, Flame, Sun, Phone, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

export default function RisparmioEnergetico() {
  const [user, setUser] = useState(null);

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

  const { data: messages = [] } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: () => base44.entities.Message.filter({ to_email: user?.email, is_read: false }),
    enabled: !!user?.email,
  });

  const services = [
    {
      icon: Shield,
      title: 'Assicurazioni',
      description: 'Polizze aziendali a condizioni vantaggiose per i membri'
    },
    {
      icon: Lightbulb,
      title: 'Luce',
      description: 'Tariffe energia elettrica competitive per la tua azienda'
    },
    {
      icon: Flame,
      title: 'Gas',
      description: 'Forniture gas metano a prezzi agevolati'
    },
    {
      icon: Leaf,
      title: 'Efficientamento Energetico',
      description: 'Interventi per ridurre i consumi e migliorare l\'efficienza'
    },
    {
      icon: Sun,
      title: 'Fotovoltaico',
      description: 'Soluzioni per l\'installazione di impianti fotovoltaici'
    },
    {
      icon: Phone,
      title: 'Spesa Telefonica',
      description: 'Piani tariffari telefonia mobile e fissa convenzionati'
    },
    {
      icon: Wifi,
      title: 'Internet',
      description: 'Connettività fibra e ADSL a tariffe dedicate'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('Home')} className="text-lime-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">Risparmio</h1>
        </div>

        {/* Hero Card */}
        <Card className="bg-gradient-to-br from-lime-400 to-green-500 border-0 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-slate-900 text-xl font-bold">Risparmia con il Consorzio</h2>
                <p className="text-slate-800">Servizi esclusivi per i membri del Consorzio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <div className="space-y-4">
          {services.map((service, index) => (
            <Card key={index} className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-lime-400/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <service.icon className="w-6 h-6 text-lime-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">{service.title}</h3>
                    <p className="text-slate-400 text-sm">{service.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <Card className="bg-slate-800 border-lime-400/30 mt-6">
          <CardContent className="p-6 text-center">
            <p className="text-slate-400 mb-4">Per maggiori informazioni contatta il Consorzio</p>
            <Link 
              to={createPageUrl('ContattaConsorzio')}
              className="inline-block bg-lime-400 hover:bg-lime-500 text-slate-900 font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Richiedi Informazioni
            </Link>
          </CardContent>
        </Card>
      </main>

      <BottomNav currentPage="RisparmioEnergetico" unreadMessages={messages.length} />
    </div>
  );
}