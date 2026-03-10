import React, { useState } from 'react';
import { Search, ShoppingBag, Utensils, Home, Sparkles, Fuel, ShoppingCart, Gamepad2, Baby, Tv, BookOpen, Music, Heart, Dumbbell, Cpu, Plane, PawPrint, Gift } from 'lucide-react';
import { Input } from '@/components/ui/input';
import BrandScrollBar from './BrandScrollBar';

const brandPerCategoria = {
  "Abbigliamento": ["Asos","Coin","Decathlon","Foot Locker","H&M","Mango","Nike","OVS","Scalo Milano","Zalando","Calzedonia","Coccinelle","Falconeri","Guess","Intimissimi","Kiabi","Marionnaud","Pittarosso","Primark","RayBan","Salmoiraghi e Viganò","Terranova","Tezenis","Upim","Rinascimento","YOOX","AW LAB","Bata","Scarpe&Scarpe","Calliope"],
  "Alimentari": ["Ali Supermercati","Almasicily","Bennet","Carrefour","Conad","Deliveroo","Despar","Esselunga","Il Viaggiator Goloso","Iper","Iperal","MD","Nespresso","Pam Panorama","Unes","SignorVino","Tannico","TheFork","Winelivery","Eurospin","Glovo","Coop","Cortilia","Etruria","Tigros","DECO'","Old Wild West","Il Gigante","Tosano","Crai","Famila","PENNY","Mercatò","Basko","Italmark","Rossetto"],
  "Animali": ["Zoologos","Arcaplanet"],
  "Arredamento": ["Brico io","Coin","IKEA","Bricocenter","Kasanova","Primark","Upim","Maisons du Monde"],
  "Bellezza": ["Acqua & Sapone","Coin","Douglas","EsserBella","Scalo Milano","Tigotà","Bottega Verde","L'Erbolario","NaturaSi","Sephora","Upim"],
  "Carburante": ["API IP","ENILIVE","Q8","Tamoil","Swish"],
  "E-commerce": ["Amazon","Asos","Bennet","Best Western","Bimbostore","Brico io","Decathlon","Deliveroo","Douglas","Esselunga","Flightgift","Flixbus","GameStop","Hotelgift","IKEA","la Feltrinelli","Mango","MD","Mediaworld","Mondadori","Nespresso","Nike","Prénatal","Snowit","Tigotà","Toys","Trenitalia","Unieuro","Zalando"],
  "Esperienze": ["Global Experiences Card","Smartbox","Snowit","QC Terme","Activitygift"],
  "Giochi": ["GameStop","MediaWorld","Unieuro","Nintendo","Trony","Xbox Game Pass Ultimate","Xbox Live","Expert","Lego"],
  "Infanzia": ["Bimbostore","Coin","OVS","Prénatal","Scalo Milano","Toys","Chicco","Upim","FAO Schwarz","Lego"],
  "Intrattenimento": ["La Feltrinelli","Unieuro","PlayStation","Spotify","Xbox Live","Dazn","UCI Cinemas","Photosì","Lego"],
  "Libri": ["La Feltrinelli","Mondadori","Giunti al punto","Happy Card IBS","Libraccio.it","PhotoSi"],
  "Salute e Benessere": ["Acqua & Sapone","EsserBella","Tigotà","L'Erbolario","NaturaSi","Salmoiraghi e Viganò","Salute Semplice","VisionOttica","Nau","Pharmanow"],
  "Sport": ["Asos","Decathlon","Scalo Milano","Snowit","AW LAB"],
  "Tecnologia": ["GameStop","Mediaworld","Unieuro","Nintendo","Trony","Xbox Game Pass Ultimate","Expert"],
  "Viaggi": ["Best Western","Flightgift","FlixBus","Hotelgift","Trenitalia","Boscolo","Ecobnb","Italo","Utravel","Airbnb","Lego"]
};

const categorieIcons = {
  "Abbigliamento": ShoppingBag, "Alimentari": Utensils, "Animali": PawPrint, "Arredamento": Home,
  "Bellezza": Sparkles, "Carburante": Fuel, "E-commerce": ShoppingCart, "Esperienze": Gift,
  "Giochi": Gamepad2, "Infanzia": Baby, "Intrattenimento": Tv, "Libri": BookOpen,
  "Salute e Benessere": Heart, "Sport": Dumbbell, "Tecnologia": Cpu, "Viaggi": Plane
};

const allBrands = [...new Set(Object.values(brandPerCategoria).flat())];

// Conta in quante categorie appare ogni brand
const brandFrequency = {};
Object.values(brandPerCategoria).flat().forEach(b => {
  brandFrequency[b] = (brandFrequency[b] || 0) + 1;
});

export default function WelfareCatalogoTab({ tipo }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const isBuoniPasto = tipo === 'buoni-pasto';

  // Buoni pasto: lista specifica di insegne
  const insegneBuoniPasto = [
    "Esselunga","Conad","Coop","Carrefour","Eurospin","Penny Market","Pam Panorama","Bennet","Famila","Sigma","Despar","Todis","MD","Iperal","Ali Supermercati","Basko","Crai","Il Gigante","Tigros","Tosano","Old Wild West","Roadhouse","DECO'","Mercatò","Italmark"
  ];

  const brands = isBuoniPasto ? insegneBuoniPasto : null;
  const categorie = isBuoniPasto ? null : Object.keys(brandPerCategoria);

  // Filtra brand per ricerca
  const filterBrands = (list) => {
    if (!searchTerm) return list;
    return list.filter(b => b.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  return (
    <div>
      {/* Contatore */}
      <div className="bg-slate-800/50 rounded-xl p-3 mb-4 text-center">
        <p className="text-pink-400 text-2xl font-bold">
          {isBuoniPasto ? insegneBuoniPasto.length : allBrands.length}+
        </p>
        <p className="text-slate-400 text-xs">
          {isBuoniPasto ? 'insegne convenzionate' : 'brand convenzionati in 16 categorie'}
        </p>
      </div>

      {/* Ricerca */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder={isBuoniPasto ? "Cerca insegna..." : "Cerca brand..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm h-9"
        />
      </div>

      {isBuoniPasto ? (
        /* Buoni Pasto: unica barra scrollabile */
        <BrandScrollBar
          brands={filterBrands(insegneBuoniPasto)}
          title="Supermercati & Ristoranti"
          subtitle="Dove usare i buoni pasto"
        />
      ) : (
        /* Marchi: una barra per categoria */
        <div className="space-y-2">
          {categorie.map(cat => {
            const filtered = filterBrands(brandPerCategoria[cat]).sort((a, b) => (brandFrequency[a] || 1) - (brandFrequency[b] || 1));
            if (filtered.length === 0) return null;
            const Icon = categorieIcons[cat] || Gift;
            return (
              <BrandScrollBar
                key={cat}
                brands={filtered}
                title={
                  <span className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-pink-400" />
                    {cat}
                    <span className="text-slate-500 font-normal text-xs">({filtered.length})</span>
                  </span>
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}