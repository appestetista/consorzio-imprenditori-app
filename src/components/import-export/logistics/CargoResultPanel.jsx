import React from 'react';
import { Package, Ruler, Truck, Scale, Check, Box } from 'lucide-react';

function StatBox({ label, value, unit, color = 'text-white' }) {
  return (
    <div className="bg-slate-900/50 rounded-lg p-2 text-center">
      <p className="text-slate-500 text-[9px]">{label}</p>
      <p className={`${color} font-bold text-sm`}>{value}</p>
      {unit && <p className="text-slate-600 text-[8px]">{unit}</p>}
    </div>
  );
}

function calcColliPerPallet(data) {
  // Quanti colli stanno su un piano del pallet?
  const pl = data.lunghezza_pallet;
  const pw = data.larghezza_pallet;
  const cl = data.lunghezza_collo;
  const cw = data.larghezza_collo;
  const ch = data.altezza_collo;

  // Orientamento A
  const a_l = Math.floor(pl / cl);
  const a_w = Math.floor(pw / cw);
  const countA = a_l * a_w;

  // Orientamento B (collo ruotato 90°)
  const b_l = Math.floor(pl / cw);
  const b_w = Math.floor(pw / cl);
  const countB = b_l * b_w;

  const perLayer = Math.max(countA, countB);

  // Altezza utile per i colli sopra il pallet
  const palletH = data.pallet_info?.h_cm || 14;
  const usableH = data.altezza_max_pallet - palletH;
  const layers = ch > 0 ? Math.floor(usableH / ch) : 0;
  const colliPerPallet = perLayer * layers;

  return { perLayer, layers, colliPerPallet, usableH: Math.round(usableH) };
}

function calcPalletsPerMezzo(data) {
  const pl = data.lunghezza_pallet;
  const pw = data.larghezza_pallet;
  const ml = data.lunghezza_mezzo;
  const mw = data.larghezza_mezzo;

  // Orientamento A
  const a_l = Math.floor(ml / pl);
  const a_w = Math.floor(mw / pw);
  const countA = a_l * a_w;

  // Orientamento B
  const b_l = Math.floor(ml / pw);
  const b_w = Math.floor(mw / pl);
  const countB = b_l * b_w;

  return Math.max(countA, countB);
}

export default function CargoResultPanel({ data }) {
  if (!data || !data.lunghezza_collo) return null;

  const palletCalc = calcColliPerPallet(data);
  const palletsPerMezzo = calcPalletsPerMezzo(data);

  const palletsNeeded = palletCalc.colliPerPallet > 0
    ? Math.ceil(data.quantita / palletCalc.colliPerPallet)
    : 0;

  const mezziNeeded = palletsPerMezzo > 0
    ? Math.ceil(palletsNeeded / palletsPerMezzo)
    : 0;

  // Peso totale per mezzo (con verifica portata)
  const weightPerPallet = palletCalc.colliPerPallet > 0
    ? (data.peso_collo * Math.min(palletCalc.colliPerPallet, data.quantita))
    : data.peso_totale_kg;

  const palletsActualPerMezzo = palletsPerMezzo > 0
    ? Math.min(palletsPerMezzo, palletsNeeded)
    : 0;
  const weightPerMezzo = weightPerPallet * palletsActualPerMezzo;
  const weightOverload = weightPerMezzo > data.peso_max_mezzo;

  // Se c'è sovrappeso, ricalcola mezzi necessari per peso
  let mezziByWeight = 0;
  if (data.peso_max_mezzo > 0 && weightPerPallet > 0) {
    const maxPalletsByWeight = Math.floor(data.peso_max_mezzo / weightPerPallet);
    if (maxPalletsByWeight > 0) {
      mezziByWeight = Math.ceil(palletsNeeded / maxPalletsByWeight);
    }
  }
  const finalMezzi = Math.max(mezziNeeded, mezziByWeight);
  const limitingFactor = finalMezzi > mezziNeeded ? 'peso' : 'volume';

  const mezzoName = data.mezzo_info?.name || 'Mezzo personalizzato';

  return (
    <div className="space-y-3 mt-4">
      {/* Riepilogo collo */}
      <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-cyan-400" />
          <p className="text-white text-xs font-bold">Dati Validati</p>
          <Check className="w-3.5 h-3.5 text-green-400 ml-auto" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <StatBox label="Collo" value={`${data.lunghezza_collo}×${data.larghezza_collo}×${data.altezza_collo}`} unit="cm" />
          <StatBox label="Peso/collo" value={data.peso_collo} unit="kg" />
          <StatBox label="Quantità" value={data.quantita} color="text-amber-400" />
          <StatBox label="Vol. collo" value={data.volume_collo_m3} unit="m³" />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <StatBox label="Volume totale" value={data.volume_totale_m3} unit="m³" color="text-cyan-400" />
          <StatBox label="Peso totale" value={`${(data.peso_totale_kg / 1000).toFixed(2)}`} unit="tonnellate" color="text-blue-400" />
        </div>
      </div>

      {/* Calcolo pallet */}
      <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Ruler className="w-4 h-4 text-orange-400" />
          <p className="text-white text-xs font-bold">Disposizione su Pallet</p>
        </div>
        <p className="text-slate-400 text-[10px] mb-2">
          Pallet: <strong className="text-white">{data.lunghezza_pallet}×{data.larghezza_pallet} cm</strong> •
          Altezza utile: <strong className="text-white">{palletCalc.usableH} cm</strong>
        </p>
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Colli/strato" value={palletCalc.perLayer} color="text-orange-400" />
          <StatBox label="Strati" value={palletCalc.layers} color="text-orange-400" />
          <StatBox label="Colli/pallet" value={palletCalc.colliPerPallet} color="text-amber-400" />
        </div>
        <div className="mt-2 bg-orange-500/10 border border-orange-500/15 rounded-lg p-2 text-center">
          <p className="text-slate-400 text-[9px]">Pallet necessari</p>
          <p className="text-orange-400 font-black text-2xl">{palletsNeeded}</p>
          <p className="text-slate-500 text-[9px]">per {data.quantita} colli</p>
        </div>
      </div>

      {/* Calcolo mezzo */}
      <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Truck className="w-4 h-4 text-violet-400" />
          <p className="text-white text-xs font-bold">Carico su {mezzoName}</p>
        </div>
        <p className="text-slate-400 text-[10px] mb-2">
          Interno: <strong className="text-white">{data.lunghezza_mezzo}×{data.larghezza_mezzo}×{data.altezza_mezzo} cm</strong> •
          Max: <strong className="text-white">{(data.peso_max_mezzo / 1000).toFixed(1)} t</strong>
        </p>
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Pallet/mezzo" value={palletsPerMezzo} color="text-violet-400" />
          <StatBox label={finalMezzi === 1 ? 'Mezzo' : 'Mezzi necessari'} value={finalMezzi} color="text-green-400" />
          <StatBox label="Fattore lim." value={limitingFactor === 'peso' ? '⚖️ Peso' : '📦 Volume'} />
        </div>

        {weightOverload && (
          <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-lg p-2 flex items-start gap-2">
            <Scale className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-200 text-[10px]">
              Attenzione: {palletsPerMezzo} pallet a pieno carico superano il peso max del mezzo 
              ({Math.round(weightPerMezzo).toLocaleString()} kg vs {data.peso_max_mezzo.toLocaleString()} kg). 
              Servono {finalMezzi} mezzi per rispettare il limite di peso.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}