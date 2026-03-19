import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Zap, Lightbulb, Leaf, Shield, Flame, Sun, Phone, Wifi, Euro } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '../components/layout/Header';
import BottomNavWithMenu from '../components/layout/BottomNavWithMenu';
import SectionConsultantPanel from '../components/consulenze/SectionConsultantPanel';
import GlobalTopIcons from '../components/layout/GlobalTopIcons';

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
      icon: Lightbulb,
      title: 'Luce',
      description: 'Tariffe energia elettrica competitive per la tua azienda'
    },
    {
      icon: Euro,
      title: 'Fiscalità Energetica',
      description: 'Scopri le agevolazioni fiscali per l\'efficientamento',
      isSpecial: true,
      specialPage: 'FiscalitaEnergetica'
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
      icon: Shield,
      title: 'Assicurazioni',
      description: 'Polizze aziendali a condizioni vantaggiose per i membri'
    },
    {
      icon: Flame,
      title: 'Gas',
      description: 'Forniture gas metano a prezzi agevolati'
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
    <div className="min-h-screen pb-64" style={{ backgroundColor: 'var(--app-bg)' }}>
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl('Esplora?tab=strumenti')} className="text-lime-400 p-3 -m-3 rounded-full back-arrow-tap">
              <ArrowLeft className="w-7 h-7" />
            </Link>
            <h1 className="text-white text-xl font-bold">Risparmia con il Consorzio</h1>
          </div>
          {/* Icone gestite dal GlobalHeader */}
        </div>

        {/* Services - 3D Buttons */}
        <div className="grid grid-cols-2 gap-5 pt-4">
          {services.map((service, index) => (
            <Link 
              key={index} 
              to={service.specialPage ? createPageUrl(service.specialPage) : createPageUrl('RisparmioDettaglio') + `?categoria=${encodeURIComponent(service.title)}`}
              className="flex flex-col items-center"
            >
              {/* Pulsante 3D super bombato */}
              <div 
                className="relative w-40 h-40 transition-all duration-150 active:scale-95 active:translate-y-2 hover:scale-105 hover:-translate-y-1"
                style={{
                  perspective: '500px',
                  transformStyle: 'preserve-3d'
                }}
              >
                {/* Ombra profonda multi-layer */}
                <div 
                  className="absolute inset-0 rounded-[28px]"
                  style={{
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 12px 20px rgba(0,0,0,0.4), 0 6px 10px rgba(0,0,0,0.3), 0 2px 4px rgba(0,0,0,0.2)'
                  }}
                />
                
                {/* Anello esterno metallico - verde scuro per bottoni speciali */}
                <div 
                  className="absolute inset-0 rounded-[28px] p-[5px]"
                  style={{
                    background: service.isSpecial 
                      ? 'linear-gradient(145deg, #22c55e 0%, #16a34a 20%, #15803d 50%, #166534 70%, #15803d 85%, #16a34a 100%)'
                      : 'linear-gradient(145deg, #e8e8e8 0%, #d0d0d0 20%, #a0a0a0 50%, #888888 70%, #a0a0a0 85%, #c0c0c0 100%)',
                    boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8), inset 0 -1px 2px rgba(0,0,0,0.3)'
                  }}
                >
                  {/* Corpo del pulsante bombato */}
                  <div 
                    className="relative w-full h-full rounded-[23px] overflow-hidden flex flex-col items-center justify-center"
                    style={{
                      background: service.isSpecial
                        ? 'radial-gradient(ellipse 80% 60% at 35% 25%, #4ade80 0%, #22c55e 15%, #16a34a 30%, #15803d 50%, #166534 70%, #14532d 90%, #052e16 100%)'
                        : 'radial-gradient(ellipse 80% 60% at 35% 25%, #ffffff 0%, #fafafa 15%, #f0f0f0 30%, #e4e4e4 50%, #d4d4d4 70%, #c0c0c0 90%, #a8a8a8 100%)',
                      boxShadow: 'inset 0 8px 16px rgba(255,255,255,0.5), inset 0 -8px 16px rgba(0,0,0,0.3), inset 4px 0 8px rgba(255,255,255,0.3), inset -4px 0 8px rgba(0,0,0,0.2), inset 0 0 20px rgba(255,255,255,0.2)'
                    }}
                  >
                    {/* Riflesso superiore a cupola */}
                    <div 
                      className="absolute top-[5%] left-[15%] w-[70%] h-[45%] pointer-events-none"
                      style={{
                        background: 'radial-gradient(ellipse 100% 100% at 50% 0%, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 20%, rgba(255,255,255,0.4) 50%, transparent 80%)',
                        borderRadius: '50%',
                        filter: 'blur(1px)'
                      }}
                    />
                    
                    {/* Riflesso piccolo highlight */}
                    <div 
                      className="absolute top-[12%] left-[22%] w-[20%] h-[15%] pointer-events-none"
                      style={{
                        background: 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.9) 0%, transparent 70%)',
                        borderRadius: '50%'
                      }}
                    />
                    
                    {/* Icona centrata */}
                    <service.icon className={`w-14 h-14 relative z-10 mb-2 drop-shadow-sm ${service.isSpecial ? 'text-white' : 'text-blue-600'}`} />
                    
                    {/* Titolo dentro il pulsante */}
                    <span className={`font-bold text-sm text-center leading-tight px-3 relative z-10 max-w-[90%] drop-shadow-sm ${service.isSpecial ? 'text-white' : 'text-blue-700'}`}>
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

      <BottomNavWithMenu currentPage="RisparmioEnergetico" unreadMessages={messages.length} />
    </div>
  );
}