import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Logo URLs — generati o da CDN affidabili
const brandLogos = {
  // === ALIMENTARI / SUPERMERCATI ===
  "Esselunga": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/f57a9a96a_generated_image.png",
  "Conad": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/c36593136_generated_image.png",
  "Coop": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/58a31f249_generated_image.png",
  "Carrefour": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/2d60cc052_generated_image.png",
  "Eurospin": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/50a1b3e42_generated_image.png",
  "Penny Market": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/c1be845a8_generated_image.png",
  "PENNY": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/c1be845a8_generated_image.png",
  "Bennet": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/92efdeb43_generated_image.png",
  "Despar": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/55baedcc9_generated_image.png",
  "DESPAR": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/55baedcc9_generated_image.png",
  "MD": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/833c46a48_generated_image.png",
  "Pam Panorama": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/e8809b78c_generated_image.png",
  "Glovo": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/284a353f3_generated_image.png",
  "Deliveroo": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/2389fc081_generated_image.png",
  // === MODA / SPORT ===
  "Nike": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/5b2e5191a_generated_image.png",
  "IKEA": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/73ba06bf5_generated_image.png",
  "H&M": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/945ac1e3f_generated_image.png",
  "Decathlon": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/c3c80fb95_generated_image.png",
  "Amazon": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/ad64732d3_generated_image.png",
  "Zalando": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/b3e856912_generated_image.png",
  "Sephora": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/bd59cf5a1_generated_image.png",
  "Douglas": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/04fc94fdd_generated_image.png",
  "OVS": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/d506d1282_generated_image.png",
  "Coin": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/c1c06f629_generated_image.png",
  "Upim": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/aa359648d_generated_image.png",
  "Smartbox": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/f25a65ffa_generated_image.png",
  "Primark": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/7a7b8a674_generated_image.png",
  "Kasanova": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/b3cf28f6e_generated_image.png",
  "Maisons du Monde": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/dec8c1643_generated_image.png",
  "Brico io": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/021ae4ffc_generated_image.png",
  "Bricocenter": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/6a720033f_generated_image.png",
  "Arcaplanet": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/1a77be69f_generated_image.png",
  "Zoologos": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/67ee594cf_generated_image.png",
  "Bottega Verde": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/16a95609e_generated_image.png",
  "L'Erbolario": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/733ed1308_generated_image.png",
  "NaturaSi": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/88be4f8e7_generated_image.png",
  "Tigotà": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/9591870ee_generated_image.png",
  "Scalo Milano": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/a447e38df_generated_image.png",
  "Acqua & Sapone": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/91e469e52_generated_image.png",
  "Foot Locker": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/ba7c34f1f_generated_image.png",
  "Mango": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/60fec7fea_generated_image.png",
  "Calzedonia": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/00d6eaccb_generated_image.png",
  "Guess": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/16789d865_generated_image.png",
  "Intimissimi": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/16ed432cd_generated_image.png",
  "Asos": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/c05d297f4_generated_image.png",
  "Tezenis": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/6a92aa077_generated_image.png",
  "Terranova": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/c2435cb6d_generated_image.png",
  "RayBan": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/f077e057c_generated_image.png",
  "QC Terme": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/70a88d92e_generated_image.png",
  "Snowit": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/97370d3ae_generated_image.png",
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

// Brand name styling — colori per brand noti per il fallback tipografico
const brandStyles = {
  "Esselunga": { color: '#e30613', weight: 700 },
  "Conad": { color: '#003da5', weight: 700 },
  "Coop": { color: '#e2001a', weight: 800 },
  "Carrefour": { color: '#004e9a', weight: 700 },
  "Eurospin": { color: '#003399', weight: 800 },
  "Nike": { color: '#111', weight: 900 },
  "IKEA": { color: '#0058a3', weight: 900, bg: '#ffcc00' },
  "H&M": { color: '#e50010', weight: 900 },
  "Decathlon": { color: '#0082c3', weight: 700 },
  "Amazon": { color: '#232f3e', weight: 800 },
  "Zalando": { color: '#ff6900', weight: 700 },
  "Sephora": { color: '#000', weight: 700 },
  "Douglas": { color: '#000', weight: 600 },
  "Coin": { color: '#000', weight: 800 },
  "Upim": { color: '#fff', weight: 800, bg: '#333' },
  "Guess": { color: '#fff', weight: 800, bg: '#e4002b' },
  "Primark": { color: '#00a0df', weight: 600 },
  "OVS": { color: '#000', weight: 800 },
  "GameStop": { color: '#000', weight: 800 },
  "Penny Market": { color: '#cc0000', weight: 800 },
  "PENNY": { color: '#cc0000', weight: 800 },
  "Maisons du Monde": { color: '#fff', weight: 700, bg: '#333' },
  "NaturaSi": { color: '#fff', weight: 700, bg: '#4a7c2e' },
  "AW LAB": { color: '#fff', weight: 800, bg: '#0060c0' },
};

function BrandCard({ name, index }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = brandLogos[name];
  const style = brandStyles[name];

  const showLogo = logoUrl && !imgError;

  return (
    <div className="flex-shrink-0 w-[100px] snap-start">
      {/* Card 3D - effetto tasto fisico come nelle immagini */}
      <div 
        className="relative w-[100px] h-[80px] rounded-xl overflow-hidden transition-transform duration-150 active:scale-[0.96] active:translate-y-[2px]"
        style={{
          background: style?.bg && !showLogo
            ? style.bg
            : 'linear-gradient(180deg, #ffffff 0%, #f8f8fa 60%, #eeeff2 100%)',
          boxShadow: '0 4px 0 0 #c8c9cc, 0 6px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 2px rgba(0,0,0,0.04)',
          border: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-center justify-center h-full p-2.5">
          {showLogo ? (
            <img 
              src={logoUrl} 
              alt={name}
              className="max-w-[70px] max-h-[50px] object-contain"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <span 
              className="text-center leading-[1.1] px-1 select-none"
              style={{
                color: style?.color || '#222',
                fontWeight: style?.weight || 700,
                fontSize: name.length > 12 ? '10px' : name.length > 8 ? '12px' : '14px',
                letterSpacing: '-0.02em',
                textTransform: name === name.toUpperCase() ? 'uppercase' : 'none',
              }}
            >
              {name}
            </span>
          )}
        </div>
      </div>
      <p className="text-[9px] text-slate-500 text-center mt-1.5 leading-tight line-clamp-1 px-0.5 font-medium">
        {name}
      </p>
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