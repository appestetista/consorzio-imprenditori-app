import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Zap, Lightbulb, Leaf, Shield, Flame, Sun, Phone, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import SectionConsultantPanel from '../components/consulenze/SectionConsultantPanel';

export default function RisparmioEnergetico() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    window.scrollTo(0, 0);
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

        {/* Services - 3D Buttons */}
        <div className="grid grid-cols-2 gap-6">
          {services.map((service, index) => (
            <Link 
              key={index} 
              to={createPageUrl('RisparmioDettaglio') + `?categoria=${encodeURIComponent(service.title)}`}
              className="flex flex-col items-center"
            >
              {/* Icona sopra il pulsante */}
              <div className="mb-2">
                <service.icon className="w-8 h-8 text-lime-400" />
              </div>
              
              {/* Pulsante 3D bianco */}
              <div 
                className="relative w-20 h-20 transition-transform duration-100 active:scale-95 active:translate-y-1"
              >
                {/* Ombra esterna per effetto 3D */}
                <div 
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    boxShadow: '0 8px 16px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.3)'
                  }}
                />
                
                {/* Bordo esterno sfumato */}
                <div 
                  className="absolute inset-0 rounded-2xl p-[3px]"
                  style={{
                    background: 'linear-gradient(145deg, #ffffff 0%, #e8e8e8 50%, #d0d0d0 100%)'
                  }}
                >
                  {/* Superficie interna con effetto 3D */}
                  <div 
                    className="relative w-full h-full rounded-[14px] overflow-hidden"
                    style={{
                      background: 'linear-gradient(145deg, #ffffff 0%, #f5f5f5 30%, #e8e8e8 70%, #d8d8d8 100%)',
                      boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.9), inset 0 -2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    {/* Riflesso superiore */}
                    <div 
                      className="absolute top-0 left-0 w-full h-[45%] pointer-events-none"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                        borderRadius: '14px 14px 50% 50%'
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Titolo sotto il pulsante */}
              <span className="mt-3 text-white font-semibold text-sm text-center leading-tight max-w-[90px]">
                {service.title}
              </span>
            </Link>
          ))}
        </div>

        {/* Pannello Consulenti per questa sezione */}
        {user && (
          <div className="mt-6">
            <SectionConsultantPanel 
              sectionId="risparmio_energetico" 
              sectionLabel="Risparmio Energetico" 
              user={user} 
            />
          </div>
        )}

        {/* Info */}
        <Card className="bg-slate-800/50 border-slate-700 mt-6">
          <CardContent className="p-4 text-center">
            <p className="text-slate-400 text-sm">
              Seleziona un servizio per caricare la tua bolletta e ricevere un'analisi gratuita con proposte di risparmio.
            </p>
          </CardContent>
        </Card>
      </main>

      <BottomNav currentPage="RisparmioEnergetico" unreadMessages={messages.length} />
    </div>
  );
}