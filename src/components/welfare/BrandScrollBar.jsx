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
  // === ALIMENTARI (nuovi) ===
  "Ali Supermercati": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/69e2612f7_generated_image.png",
  "Almasicily": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/5d55ea95d_generated_image.png",
  "Iper": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/bb68e4c11_generated_image.png",
  "Iperal": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/9345e72a5_generated_image.png",
  "Il Viaggiator Goloso": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/b30e35724_generated_image.png",
  "Nespresso": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/a1a4bfca7_generated_image.png",
  "Unes": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/86f379244_generated_image.png",
  "SignorVino": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/bdfc40ae3_generated_image.png",
  "Tannico": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/3da6de2ad_generated_image.png",
  "TheFork": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/cbcb9c1ed_generated_image.png",
  "Winelivery": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/64e8533fc_generated_image.png",
  "Cortilia": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/1da7835cd_generated_image.png",
  "Etruria": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/af93e06e5_generated_image.png",
  "Tigros": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/de31d9e32_generated_image.png",
  "DECO'": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/255d05502_generated_image.png",
  "Old Wild West": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/1ea237516_generated_image.png",
  "Il Gigante": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/eb379b82d_generated_image.png",
  "Tosano": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/9b7d3fc46_generated_image.png",
  "Crai": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/edf00fb0a_generated_image.png",
  "Famila": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/2f138236a_generated_image.png",
  "Mercatò": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/e03563d64_generated_image.png",
  "Basko": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/4516bbebe_generated_image.png",
  "Italmark": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/f8d93550a_generated_image.png",
  "Rossetto": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/5bf7aa3fd_generated_image.png",
  // === ABBIGLIAMENTO (nuovi) ===
  "Coccinelle": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/283f92e9a_generated_image.png",
  "Falconeri": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/860cbdacc_generated_image.png",
  "Kiabi": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/bb0539d6e_generated_image.png",
  "Marionnaud": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/96a787a9d_generated_image.png",
  "Pittarosso": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/da82c83f7_generated_image.png",
  "Salmoiraghi e Viganò": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/e9b821886_generated_image.png",
  "Rinascimento": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/9b3cd29d8_generated_image.png",
  "YOOX": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/1246922e4_generated_image.png",
  "AW LAB": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/c0ddbfe8c_generated_image.png",
  "Bata": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/0197ec2c0_generated_image.png",
  "Scarpe&Scarpe": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/e3e4988a5_generated_image.png",
  "Calliope": "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/695e2f74bb7d2636b5606a98/5cd74bf31_generated_image.png",
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
  const showLogo = logoUrl && !imgError;
  const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const colorIdx = index % pastelColors.length;

  const [pressed, setPressed] = useState(false);

  return (
    <div className="flex-shrink-0 w-[108px] snap-start">
      {/* Card 3D — effetto tasto fisico con prospettiva */}
      <div
        className="relative w-[108px] h-[90px] cursor-pointer select-none"
        style={{ perspective: '600px' }}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '16px',
            background: pressed ? '#f0f0f2' : '#ffffff',
            boxShadow: pressed
              ? `
                0 1px 0 0 #c0c2c7,
                0 2px 4px rgba(0,0,0,0.08),
                inset 0 1px 2px rgba(0,0,0,0.04)
              `
              : `
                0 1px 0 0 #e8e9ec,
                0 4px 0 0 #d0d2d7,
                0 5px 0 0 #c4c6cb,
                0 7px 14px rgba(0,0,0,0.10),
                0 12px 24px rgba(0,0,0,0.06),
                inset 0 2px 0 rgba(255,255,255,0.9),
                inset 0 -1px 2px rgba(0,0,0,0.02)
              `,
            border: '1px solid rgba(0,0,0,0.05)',
            transform: pressed
              ? 'translateY(3px) rotateX(2deg)'
              : 'translateY(0) rotateX(0deg)',
            transition: 'all 0.12s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          <div className="flex items-center justify-center h-full p-1.5">
            {showLogo ? (
              <img 
                src={logoUrl} 
                alt={name}
                className="max-w-[92px] max-h-[68px] object-contain"
                style={{ filter: pressed ? 'brightness(0.95)' : 'none' }}
                onError={() => setImgError(true)}
                loading="lazy"
                draggable={false}
              />
            ) : (
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${pastelColors[colorIdx]} flex items-center justify-center`}
                style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}
              >
                <span className="text-white font-bold text-lg drop-shadow-sm">{initials}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <p className="text-[9px] text-slate-400 text-center mt-1.5 leading-tight line-clamp-1 px-0.5 font-medium tracking-tight">
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