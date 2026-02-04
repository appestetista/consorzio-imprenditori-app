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
        <div className="grid grid-cols-2 gap-5 pt-4">
          {services.map((service, index) => (
            <Link 
              key={index} 
              to={createPageUrl('RisparmioDettaglio') + `?categoria=${encodeURIComponent(service.title)}`}
              className="flex flex-col items-center"
            >
              {/* Pulsante 3D bianco con icona e testo sovrapposti */}
              <div 
                className="relative w-36 h-36 transition-transform duration-100 active:scale-95 active:translate-y-1"
              >
                {/* Ombra esterna per effetto 3D bombato */}
                <div 
                  className="absolute inset-0 rounded-3xl"
                  style={{
                    boxShadow: '0 14px 28px rgba(0,0,0,0.5), 0 8px 12px rgba(0,0,0,0.35), 0 4px 6px rgba(0,0,0,0.2)'
                  }}
                />
                
                {/* Bordo esterno sfumato più marcato */}
                <div 
                  className="absolute inset-0 rounded-3xl p-[4px]"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 25%, #d8d8d8 50%, #c0c0c0 75%, #a8a8a8 100%)'
                  }}
                >
                  {/* Superficie interna bombata con gradiente più accentuato */}
                  <div 
                    className="relative w-full h-full rounded-[20px] overflow-hidden flex flex-col items-center justify-center"
                    style={{
                      background: 'radial-gradient(ellipse at 30% 20%, #ffffff 0%, #f8f8f8 20%, #ececec 40%, #e0e0e0 60%, #d0d0d0 80%, #c0c0c0 100%)',
                      boxShadow: 'inset 0 4px 8px rgba(255,255,255,1), inset 0 -4px 8px rgba(0,0,0,0.15), inset 2px 0 4px rgba(255,255,255,0.5), inset -2px 0 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    {/* Riflesso superiore più bombato */}
                    <div 
                      className="absolute top-0 left-[10%] w-[80%] h-[50%] pointer-events-none"
                      style={{
                        background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 30%, rgba(255,255,255,0.2) 60%, transparent 100%)',
                        borderRadius: '50% 50% 50% 50%'
                      }}
                    />
                    
                    {/* Icona centrata */}
                    <service.icon className="w-12 h-12 text-blue-600 relative z-10 mb-1" />
                    
                    {/* Titolo dentro il pulsante */}
                    <span className="text-blue-600 font-bold text-xs text-center leading-tight px-2 relative z-10 max-w-[90%]">
                      {service.title}
                    </span>
                  </div>
                </div>
              </div>
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