import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Gift, Search, Store, ShoppingCart, Utensils } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

// Insegne con loghi (brand principali)
const insegneConLogo = [
  { name: "Esselunga", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Esselunga_logo.svg/200px-Esselunga_logo.svg.png", type: "supermercato" },
  { name: "Conad", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Conad_logo.svg/200px-Conad_logo.svg.png", type: "supermercato" },
  { name: "Coop", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Logo_Coop_Italia.svg/200px-Logo_Coop_Italia.svg.png", type: "supermercato" },
  { name: "Carrefour", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Carrefour_logo.svg/200px-Carrefour_logo.svg.png", type: "supermercato" },
  { name: "Eurospin", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Eurospin_logo.svg/200px-Eurospin_logo.svg.png", type: "supermercato" },
  { name: "Penny Market", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Penny-Logo.svg/200px-Penny-Logo.svg.png", type: "supermercato" },
  { name: "Pam Panorama", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Logo_Pam_Panorama.svg/200px-Logo_Pam_Panorama.svg.png", type: "supermercato" },
  { name: "Bennet", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bennet_logo.svg/200px-Bennet_logo.svg.png", type: "supermercato" },
  { name: "Famila", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Famila.svg/200px-Famila.svg.png", type: "supermercato" },
  { name: "Sigma", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Sigma_supermarkets_logo.svg/200px-Sigma_supermarkets_logo.svg.png", type: "supermercato" },
  { name: "Despar", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Spar-logo.svg/200px-Spar-logo.svg.png", type: "supermercato" },
  { name: "Todis", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Todis_logo.svg/200px-Todis_logo.svg.png", type: "supermercato" },
  { name: "Old Wild West", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Old_Wild_West_logo.svg/200px-Old_Wild_West_logo.svg.png", type: "ristorante" },
  { name: "Roadhouse", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Roadhouse_Restaurant_logo.svg/200px-Roadhouse_Restaurant_logo.svg.png", type: "ristorante" },
  { name: "America Graffiti", logo: "https://www.americagraffiti.it/wp-content/uploads/2021/01/logo-america-graffiti.png", type: "ristorante" },
];

// Lista completa insegne dal PDF
const tutteLeInsegne = [
  "A Tavola Da Camst", "A&O", "AGLIETTI 1910 SRL", "Alì Supermercati", "America Graffiti", "Amort",
  "Bar Atlantic", "Bar con sapore Conad", "Bar Denise - Politecnico Torino", "Bar LO ZIO D'AMERICA",
  "Basko", "Basko Bistrot", "Bennet", "Billy Tacos", "BIOPHILIA STORE-L'ORTO BIOLOGICO", "Doro",
  "Borello Supermercati", "Buongusto", "Calavera", "Carrefour Express", "Carrefour Market", "CC Amort",
  "Chicken House", "Ciro Amodio", "Ciro Amodio Pane", "Coal", "Conad", "Coop", "Crai",
  "Caffè Trombetta supermercati", "Decò", "DECO' GOURMET", "DESPAR", "Dodeca", "Dok Supermercati",
  "Ekom", "Ekom Discount", "Emi Supermercato", "Emisfero", "Esselunga", "EUROSPAR", "Eurospin",
  "Famila", "Gustavo", "Hurrà", "Il castoro supermercati", "Il Gigante Supermercati", "Il Supermercato",
  "Iper Orvea", "Iper POLI", "Iper Tosano", "Iperal", "Ipercarni", "IPERCONVENIENTE", "Ipercoop",
  "Iperfamila", "Iperstore Decò", "Ipertosano", "Ipertriscount", "IT'S Market", "Italmark",
  "La Mimosa Supermercati", "La speseria", "Maxi Coal", "Mega", "Migross", "Mimosa", "NUMERI PRIMI",
  "Oasi", "Oasi Ipermercato", "Old Wild West", "Pam Panorama", "Penny Market", "Pewex", "Pizzikotto",
  "Roadhouse", "Rossotono", "Sapori & Dintorni Store", "Shi's", "Sigma", "Simply", "Smashie",
  "sole 365", "SuperA&O", "Superconviente", "Poli", "Bosco", "Etè", "Orvea", "Spesì", "Stella",
  "Eurospar", "Tavolamica", "Tigre", "Tigros", "TO.MARKET", "Todis", "Tosano", "Vendo Market",
  "Wiener Haus", "Winner"
];

export default function CatalogoBuoniPasto() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredInsegne = tutteLeInsegne.filter(insegna => 
    insegna.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredLogos = insegneConLogo.filter(insegna =>
    insegna.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('WelfareAziendale')} className="text-pink-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">Catalogo Buoni Pasto</h1>
        </div>

        {/* Hero Card */}
        <Card className="bg-gradient-to-br from-pink-500 to-rose-500 border-0 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">Dove usare i buoni</h2>
                <p className="text-white/80 text-sm">{tutteLeInsegne.length}+ partner convenzionati</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Barra di ricerca */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Cerca insegna..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Info personalizzazione locali */}
        {!searchTerm && (
          <Card className="bg-slate-800/80 border-slate-700 mb-6">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Utensils className="w-4 h-4 text-pink-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-sm mb-1">Scegli tu dove far spendere i tuoi dipendenti</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Puoi personalizzare liberamente i locali dove i tuoi dipendenti potranno utilizzare i buoni pasto. 
                    Se hai un ristorante, bar o esercizio di fiducia che non è ancora convenzionato, 
                    <span className="text-pink-400 font-medium"> segnalacelo e penseremo noi a contattarlo</span> per attivare la convenzione.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Brand principali con logo */}
        {!searchTerm && (
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Store className="w-5 h-5 text-pink-400" />
              Brand principali
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {insegneConLogo.map((insegna) => (
                <div 
                  key={insegna.name}
                  className="bg-white rounded-xl p-3 flex flex-col items-center justify-center aspect-square"
                >
                  <img 
                    src={insegna.logo} 
                    alt={insegna.name}
                    className="w-12 h-12 object-contain mb-2"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden w-12 h-12 bg-slate-200 rounded-lg items-center justify-center mb-2">
                    {insegna.type === 'ristorante' ? 
                      <Utensils className="w-6 h-6 text-slate-400" /> : 
                      <ShoppingCart className="w-6 h-6 text-slate-400" />
                    }
                  </div>
                  <span className="text-slate-800 text-xs font-medium text-center leading-tight">
                    {insegna.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista completa */}
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-pink-400" />
              {searchTerm ? `Risultati (${filteredInsegne.length})` : 'Elenco completo'}
            </h3>
            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {filteredInsegne.map((insegna) => (
                <div 
                  key={insegna}
                  className="bg-slate-700/50 rounded-lg px-2 py-1.5 text-slate-300 text-[11px] flex items-center gap-1.5"
                >
                  <Store className="w-2.5 h-2.5 text-pink-400 flex-shrink-0" />
                  <span className="break-words leading-tight uppercase">{insegna}</span>
                </div>
              ))}
            </div>
            {filteredInsegne.length === 0 && (
              <p className="text-slate-500 text-center py-4">Nessuna insegna trovata</p>
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav currentPage="RisparmioEnergetico" unreadMessages={messages.length} />
    </div>
  );
}