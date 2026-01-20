import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Gift, Search, ShoppingBag, Utensils, Home, Sparkles, Fuel, ShoppingCart, Gamepad2, Baby, Tv, BookOpen, Music, Heart, Dumbbell, Cpu, Plane, PawPrint } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';

// Dati brand divisi per categoria
const brandPerCategoria = {
  "Abbigliamento": [
    "Asos", "Coin", "Decathlon", "Foot Locker", "H&M", "Mango", "Nike", "OVS", "Scalo Milano", "Zalando",
    "Calzedonia", "Coccinelle", "Falconeri", "Guess", "Intimissimi", "Kiabi", "Marionnaud", "Pittarosso",
    "Primark", "RayBan", "Salmoiraghi e Viganò", "Terranova", "Tezenis", "Upim", "Rinascimento", "YOOX",
    "Du Pareil Au Meme", "AW LAB", "Bata", "Scarpe&Scarpe", "Tigros", "Il Gigante", "Calliope", "Conad"
  ],
  "Alimentari": [
    "Ali Supermercati", "Almasicily", "Bennet", "Carrefour", "Conad", "Deliveroo", "Despar", "Esselunga",
    "Il Viaggiator Goloso", "Iper", "Iperal", "MD", "Nespresso", "Pam Panorama", "Unes", "SignorVino",
    "Tannico", "TheFork", "Winelivery", "Eurospin", "Glovo", "COOP", "Cortilia", "Etruria", "Tigros",
    "DECO'", "SuperConveniente", "Bofrost", "Il Gigante", "Tosano", "Supermercati Poli", "Borello",
    "Old Wild West", "Shi's", "Pizzikotto", "Ciro Amodio", "Fratelli La Bufala", "Crai", "Famila",
    "Dok Supermercati", "PENNY", "Mercatò", "Basko", "Italmark", "Martinelli Supermercati", "Pim",
    "Gruppo Unicomm Famila Emisfero SuperA&O Mega Hurrà Emi", "Atlantic", "Rossetto"
  ],
  "Animali": ["Zoologos", "Arcaplanet"],
  "Arredamento": ["Brico io", "Coin", "IKEA", "Bricocenter", "Kasanova", "Primark", "Upim", "Maisons du Monde"],
  "Bellezza": [
    "Acqua & Sapone", "Coin", "Douglas", "EsserBella", "Scalo Milano", "Tigotà", "Bottega Verde",
    "L'Erbolario", "NaturaSi", "Sephora", "Upim"
  ],
  "Carburante": ["API IP", "ENILIVE", "Q8", "Tamoil", "Swish"],
  "E-commerce": [
    "Amazon", "Asos", "Bennet", "Best Western", "Bimbostore", "Brico io", "Decathlon", "Deliveroo",
    "Douglas", "Esselunga", "Flightgift", "Flixbus", "GameStop", "Hotelgift", "IKEA", "la Feltrinelli",
    "Mango", "MD", "Mediaworld", "Mondadori", "Nespresso", "Nike", "Prénatal", "Snowit", "Tigotà",
    "Toys", "Trenitalia", "Unieuro", "Zalando", "Calzedonia", "Chicco", "Falconeri", "Guess",
    "Intimissimi", "Italo", "Nintendo", "PlayStation", "Sephora", "SignorVino", "Spotify", "Tannico",
    "Terranova", "TheFork", "Trony", "Winelivery", "Airbnb", "Glovo", "Happy Card IBS", "Libraccio.it",
    "Expert", "Dazn", "Luxury Zone", "Nau", "SuperConveniente", "Rinascimento", "YOOX", "PhotoSi",
    "FAO Schwarz", "Supermercati Poli", "PENNY", "Du Pareil Au Meme", "Mercatò", "AW LAB",
    "Gruppo Unicomm Famila Emisfero SuperA&O Mega Hurrà Emi", "Calliope", "Activitygift"
  ],
  "Esperienze": [
    "Global Experiences Card", "Smartbox", "Snowit", "Modena Shopping Card", "EquoTube", "QC Terme", "Activitygift"
  ],
  "Giochi": [
    "Bimbostore", "GameStop", "la Feltrinelli", "Prénatal", "Toys", "Nintendo", "PlayStation",
    "Xbox Game Pass Ultimate", "Xbox Live", "FAO Schwarz", "Lego"
  ],
  "Infanzia": [
    "Bimbostore", "Coin", "OVS", "Prénatal", "Scalo Milano", "Toys", "Chicco", "Upim",
    "FAO Schwarz", "Du Pareil Au Meme", "Lego"
  ],
  "Intrattenimento": [
    "la Feltrinelli", "Unieuro", "PlayStation", "Spotify", "Xbox Live", "Dazn", "UCI Cinemas", "PhotoSi", "Lego"
  ],
  "Libri": ["la Feltrinelli", "Mondadori", "Giunti al punto", "Happy Card IBS", "Libraccio.it", "PhotoSi"],
  "Musica": ["Mondadori", "Unieuro", "Spotify"],
  "Salute e Benessere": [
    "Acqua & Sapone", "EsserBella", "Tigotà", "L'Erbolario", "NaturaSi", "Salmoiraghi e Viganò",
    "Salute Semplice", "VisionOttica", "Nau", "Psicon", "Pharmanow"
  ],
  "Sport": ["Asos", "Decathlon", "Scalo Milano", "Snowit", "AW LAB"],
  "Tecnologia": [
    "GameStop", "Mediaworld", "Unieuro", "Nintendo", "Trony", "Xbox Game Pass Ultimate", "Xbox Live", "Expert"
  ],
  "Viaggi": [
    "Best Western", "Flightgift", "Flixbus", "Hotelgift", "Trenitalia", "Boscolo", "Ecobnb",
    "Italo", "Utravel", "Airbnb", "EquoTube"
  ]
};

const categorieIcons = {
  "Abbigliamento": ShoppingBag,
  "Alimentari": Utensils,
  "Animali": PawPrint,
  "Arredamento": Home,
  "Bellezza": Sparkles,
  "Carburante": Fuel,
  "E-commerce": ShoppingCart,
  "Esperienze": Gift,
  "Giochi": Gamepad2,
  "Infanzia": Baby,
  "Intrattenimento": Tv,
  "Libri": BookOpen,
  "Musica": Music,
  "Salute e Benessere": Heart,
  "Sport": Dumbbell,
  "Tecnologia": Cpu,
  "Viaggi": Plane
};

export default function WelfareTipologie() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('tutti');

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

  // Conta totale brand unici
  const allBrands = [...new Set(Object.values(brandPerCategoria).flat())];
  const totalBrands = allBrands.length;

  // Filtra brand per ricerca
  const getFilteredBrands = (categoria) => {
    const brands = brandPerCategoria[categoria] || [];
    if (!searchTerm) return brands;
    return brands.filter(brand => 
      brand.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Tutte le categorie
  const categorie = Object.keys(brandPerCategoria);

  return (
    <div className="min-h-screen bg-slate-900 pb-24">
      <Header user={user} />
      
      <main className="px-4 py-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('WelfareAziendale')} className="text-pink-400">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-white text-xl font-bold">Catalogo Marchi</h1>
        </div>

        {/* Hero Card */}
        <Card className="bg-gradient-to-br from-pink-500 to-rose-500 border-0 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-white text-xl font-bold">Fringe Benefit</h2>
                <p className="text-white/80 text-sm">{totalBrands}+ brand convenzionati</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Barra di ricerca */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Cerca brand..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Tabs per categorie */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-slate-800 p-2 rounded-xl mb-4">
            <TabsTrigger 
              value="tutti" 
              className="flex-grow text-xs px-2 py-1.5 data-[state=active]:bg-pink-500 data-[state=active]:text-white"
            >
              Tutti
            </TabsTrigger>
            {categorie.map((cat) => (
              <TabsTrigger 
                key={cat} 
                value={cat}
                className="flex-grow text-xs px-2 py-1.5 data-[state=active]:bg-pink-500 data-[state=active]:text-white"
              >
                {cat.length > 10 ? cat.substring(0, 10) + '...' : cat}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab Tutti */}
          <TabsContent value="tutti" className="space-y-4">
            {categorie.map((categoria) => {
              const filteredBrands = getFilteredBrands(categoria);
              if (searchTerm && filteredBrands.length === 0) return null;
              const Icon = categorieIcons[categoria] || Gift;
              
              return (
                <Card key={categoria} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Icon className="w-5 h-5 text-pink-400" />
                      {categoria}
                      <span className="text-slate-500 text-sm font-normal">({filteredBrands.length})</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {filteredBrands.map((brand) => (
                        <span 
                          key={brand}
                          className="bg-slate-700/50 text-slate-300 text-xs px-2 py-1 rounded-lg"
                        >
                          {brand}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Tab per ogni categoria */}
          {categorie.map((categoria) => {
            const Icon = categorieIcons[categoria] || Gift;
            const filteredBrands = getFilteredBrands(categoria);
            
            return (
              <TabsContent key={categoria} value={categoria}>
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Icon className="w-5 h-5 text-pink-400" />
                      {categoria}
                      <span className="text-slate-500 text-sm font-normal">({filteredBrands.length} brand)</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {filteredBrands.map((brand) => (
                        <div 
                          key={brand}
                          className="bg-slate-700/50 rounded-lg px-3 py-2 text-slate-300 text-sm flex items-center gap-2"
                        >
                          <Icon className="w-3 h-3 text-pink-400 flex-shrink-0" />
                          <span className="truncate">{brand}</span>
                        </div>
                      ))}
                    </div>
                    {filteredBrands.length === 0 && (
                      <p className="text-slate-500 text-center py-4">Nessun brand trovato</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      </main>

      <BottomNav currentPage="WelfareAziendale" unreadMessages={messages.length} />
    </div>
  );
}