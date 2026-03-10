import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Logo URLs per brand noti (cercati via web/CDN affidabili)
const brandLogos = {
  // Alimentari / Supermercati
  "Esselunga": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Esselunga_logo.svg/200px-Esselunga_logo.svg.png",
  "Conad": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Conad_logo.svg/200px-Conad_logo.svg.png",
  "Coop": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Logo_Coop_Italia.svg/200px-Logo_Coop_Italia.svg.png",
  "Carrefour": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Carrefour_logo.svg/200px-Carrefour_logo.svg.png",
  "Eurospin": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Eurospin_logo.svg/200px-Eurospin_logo.svg.png",
  "Penny Market": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Penny-Logo.svg/200px-Penny-Logo.svg.png",
  "PENNY": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Penny-Logo.svg/200px-Penny-Logo.svg.png",
  "Bennet": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bennet_logo.svg/200px-Bennet_logo.svg.png",
  "Famila": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Famila.svg/200px-Famila.svg.png",
  "Despar": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Spar-logo.svg/200px-Spar-logo.svg.png",
  "DESPAR": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Spar-logo.svg/200px-Spar-logo.svg.png",
  "Sigma": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Sigma_supermarkets_logo.svg/200px-Sigma_supermarkets_logo.svg.png",
  "Todis": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Todis_logo.svg/200px-Todis_logo.svg.png",
  "Pam Panorama": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Logo_Pam_Panorama.svg/200px-Logo_Pam_Panorama.svg.png",
  "MD": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Logo_MD_SpA.svg/200px-Logo_MD_SpA.svg.png",
  "Iperal": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Logo_iperal.svg/200px-Logo_iperal.svg.png",
  // E-commerce / Tech
  "Amazon": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/200px-Amazon_logo.svg.png",
  "Zalando": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Zalando_logo.svg/200px-Zalando_logo.svg.png",
  "Nike": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/200px-Logo_NIKE.svg.png",
  "IKEA": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Ikea_logo.svg/200px-Ikea_logo.svg.png",
  "H&M": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/H%26M-Logo.svg/200px-H%26M-Logo.svg.png",
  "Decathlon": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Decathlon_Logo.svg/200px-Decathlon_Logo.svg.png",
  "Mediaworld": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/MediaWorld_Logo_2021.svg/200px-MediaWorld_Logo_2021.svg.png",
  "Spotify": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Spotify_logo_with_text.svg/200px-Spotify_logo_with_text.svg.png",
  "Deliveroo": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Deliveroo_logo_%282016%29.svg/200px-Deliveroo_logo_%282016%29.svg.png",
  "Glovo": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Glovo_logo.svg/200px-Glovo_logo.svg.png",
  "Airbnb": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Airbnb_Logo_B%C3%A9lo.svg/200px-Airbnb_Logo_B%C3%A9lo.svg.png",
  "Trenitalia": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Trenitalia_logo.svg/200px-Trenitalia_logo.svg.png",
  "Flixbus": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/FlixBus_201x_logo.svg/200px-FlixBus_201x_logo.svg.png",
  "Sephora": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Sephora_logo.svg/200px-Sephora_logo.svg.png",
  "Douglas": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Douglas_Logo.svg/200px-Douglas_Logo.svg.png",
  "Unieuro": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Unieuro_logo.svg/200px-Unieuro_logo.svg.png",
  "Nespresso": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Nespresso-logo.svg/200px-Nespresso-logo.svg.png",
  "OVS": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/OVS_%28company%29_logo.svg/200px-OVS_%28company%29_logo.svg.png",
  "Mondadori": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Mondadori_logo.svg/200px-Mondadori_logo.svg.png",
  "Italo": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Italo_logo.svg/200px-Italo_logo.svg.png",
  "TheFork": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/TheFork_logo.svg/200px-TheFork_logo.svg.png",
  "Old Wild West": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Old_Wild_West_logo.svg/200px-Old_Wild_West_logo.svg.png",
  "GameStop": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/GameStop_logo.svg/200px-GameStop_logo.svg.png",
  "Roadhouse": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Roadhouse_Restaurant_logo.svg/200px-Roadhouse_Restaurant_logo.svg.png",
};

// Colori pastello per le iniziali di brand senza logo
const pastelColors = [
  'from-rose-400 to-pink-500',
  'from-orange-400 to-amber-500',
  'from-emerald-400 to-green-500',
  'from-sky-400 to-blue-500',
  'from-violet-400 to-purple-500',
  'from-teal-400 to-cyan-500',
  'from-fuchsia-400 to-pink-500',
  'from-lime-400 to-green-500',
  'from-indigo-400 to-blue-500',
  'from-red-400 to-rose-500',
];

function BrandCard({ name, index }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = brandLogos[name];
  const colorIdx = index % pastelColors.length;
  const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="flex-shrink-0 w-[100px] snap-start">
      <div 
        className="relative w-[100px] h-[100px] rounded-2xl overflow-hidden transition-transform duration-200 active:scale-95"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(240,240,245,0.9))',
          boxShadow: '4px 4px 12px rgba(0,0,0,0.15), -2px -2px 8px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}
      >
        <div className="flex flex-col items-center justify-center h-full p-2">
          {logoUrl && !imgError ? (
            <img 
              src={logoUrl} 
              alt={name}
              className="w-12 h-12 object-contain mb-1"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pastelColors[colorIdx]} flex items-center justify-center mb-1 shadow-inner`}>
              <span className="text-white font-bold text-base drop-shadow">{initials}</span>
            </div>
          )}
          <span className="text-[10px] text-slate-700 font-semibold text-center leading-tight line-clamp-2 w-full px-1">
            {name}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function BrandScrollBar({ brands, title, subtitle }) {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -260 : 260;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  return (
    <div className="mb-6">
      {title && (
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-white font-bold text-sm">{title}</h3>
            {subtitle && <p className="text-slate-400 text-xs">{subtitle}</p>}
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => scroll('left')} 
              className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => scroll('right')} 
              className="w-7 h-7 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      <div 
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {brands.map((brand, i) => (
          <BrandCard key={brand} name={brand} index={i} />
        ))}
      </div>
    </div>
  );
}