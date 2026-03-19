import React from 'react';
import { Package, Ruler, Truck, Scale, Check, Box } from 'lucide-react';
import InfoTooltipLogistics from './InfoTooltipLogistics';
import { Container20Icon, Container40Icon, TruckIcon } from './VehicleIllustrations';

function StatBox({ label, value, unit, color = 'text-white', tooltip }) {
  return (
    <div className="bg-slate-900/50 rounded-lg p-2 text-center">
      <p className="text-slate-500 text-[9px] flex items-center justify-center">
        {label}
        {tooltip && <InfoTooltipLogistics text={tooltip} />}
      </p>
      <p className={`${color} font-bold text-sm`}>{value}</p>
      {unit && <p className="text-slate-600 text-[8px]">{unit}</p>}
    </div>
  );
}

function calcColliPerPallet(data) {
  const pl = data.lunghezza_pallet;
  const pw = data.larghezza_pallet;
  const cl = data.lunghezza_collo;
  const cw = data.larghezza_collo;
  const ch = data.altezza_collo;

  const a_l = Math.floor(pl / cl);
  const a_w = Math.floor(pw / cw);
  const countA = a_l * a_w;

  const b_l = Math.floor(pl / cw);
  const b_w = Math.floor(pw / cl);
  const countB = b_l * b_w;

  const perLayer = Math.max(countA, countB);
  const bestIsA = countA >= countB;

  const palletH = data.pallet_info?.h_cm || 14;
  const usableH = data.altezza_max_pallet - palletH;
  const layers = ch > 0 ? Math.floor(usableH / ch) : 0;
  const colliPerPallet = perLayer * layers;

  return { perLayer, layers, colliPerPallet, usableH: Math.round(usableH), bestIsA, a_l, a_w, b_l, b_w, countA, countB };
}

function calcPalletsPerMezzo(data) {
  const pl = data.lunghezza_pallet;
  const pw = data.larghezza_pallet;
  const ml = data.lunghezza_mezzo;
  const mw = data.larghezza_mezzo;

  const a_l = Math.floor(ml / pl);
  const a_w = Math.floor(mw / pw);
  const countA = a_l * a_w;

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

  const weightPerPallet = palletCalc.colliPerPallet > 0
    ? (data.peso_collo * Math.min(palletCalc.colliPerPallet, data.quantita))
    : data.peso_totale_kg;

  const palletsActualPerMezzo = palletsPerMezzo > 0
    ? Math.min(palletsPerMezzo, palletsNeeded)
    : 0;
  const weightPerMezzo = weightPerPallet * palletsActualPerMezzo;
  const weightOverload = weightPerMezzo > data.peso_max_mezzo;

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
  const isContainer20 = mezzoName.includes("20");
  const isContainer40 = mezzoName.includes("40");

  return (
    <div className="space-y-3 mt-4">
      {/* Dati validati */}
      <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4 text-cyan-400" />
          <p className="text-white text-xs font-bold">Dati Validati</p>
          <Check className="w-3.5 h-3.5 text-green-400 ml-auto" />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <StatBox label="Collo" value={`${data.lunghezza_collo}×${data.larghezza_collo}×${data.altezza_collo}`} unit="cm" tooltip="Dimensioni di un singolo collo in centimetri (L × l × H)" />
          <StatBox label="Peso/collo" value={data.peso_collo} unit="kg" tooltip="Peso lordo di un singolo collo incluso l'imballo" />
          <StatBox label="Quantità" value={data.quantita} color="text-amber-400" />
          <StatBox label="Vol. collo" value={data.volume_collo_m3} unit="m³" tooltip="Volume calcolato: L × l × H ÷ 1.000.000" />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <StatBox label="Volume totale" value={data.volume_totale_m3} unit="m³" color="text-cyan-400" tooltip="Volume di un collo × quantità totale. Determina quanti container/camion servono." />
          <StatBox label="Peso totale" value={`${(data.peso_totale_kg / 1000).toFixed(2)}`} unit="tonnellate" color="text-blue-400" tooltip="Peso per collo × quantità. Confrontato con la portata massima del mezzo." />
        </div>
      </div>

      {/* Calcolo pallet — con formula visibile */}
      <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Ruler className="w-4 h-4 text-orange-400" />
          <p className="text-white text-xs font-bold flex items-center">
            Disposizione su Pallet
            <InfoTooltipLogistics text="Calcoliamo quanti colli entrano su un pallet considerando il miglior orientamento possibile. Proviano il collo dritto e ruotato di 90°, e scegliamo la disposizione che massimizza la capacità." />
          </p>
        </div>
        <p className="text-slate-400 text-[10px] mb-2">
          Pallet: <strong className="text-white">{data.lunghezza_pallet}×{data.larghezza_pallet} cm</strong> •
          Altezza utile: <strong className="text-white">{palletCalc.usableH} cm</strong>
        </p>

        {/* Formula dettagliata */}
        <div className="bg-slate-900/50 rounded-lg p-2.5 mb-3 space-y-1.5">
          <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Calcolo step-by-step</p>
          <p className="text-slate-400 text-[10px] font-mono">
            Orientamento A: ⌊{data.lunghezza_pallet}÷{data.lunghezza_collo}⌋ × ⌊{data.larghezza_pallet}÷{data.larghezza_collo}⌋ = <span className={palletCalc.bestIsA ? 'text-green-400 font-bold' : ''}>{palletCalc.countA} colli/strato</span>
          </p>
          <p className="text-slate-400 text-[10px] font-mono">
            Orientamento B: ⌊{data.lunghezza_pallet}÷{data.larghezza_collo}⌋ × ⌊{data.larghezza_pallet}÷{data.lunghezza_collo}⌋ = <span className={!palletCalc.bestIsA ? 'text-green-400 font-bold' : ''}>{palletCalc.countB} colli/strato</span>
          </p>
          <p className="text-slate-400 text-[10px] font-mono">
            Strati: ⌊{palletCalc.usableH}÷{data.altezza_collo}⌋ = <span className="text-white font-bold">{palletCalc.layers}</span>
          </p>
          <p className="text-white text-[11px] font-bold mt-1">
            → {palletCalc.perLayer} × {palletCalc.layers} = {palletCalc.colliPerPallet} colli/pallet
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Colli/strato" value={palletCalc.perLayer} color="text-orange-400" tooltip="Quanti colli stanno su un singolo strato orizzontale del pallet" />
          <StatBox label="Strati" value={palletCalc.layers} color="text-orange-400" tooltip="Quanti strati di colli impilabili nell'altezza utile" />
          <StatBox label="Colli/pallet" value={palletCalc.colliPerPallet} color="text-amber-400" tooltip="Colli per strato × numero strati = capacità totale pallet" />
        </div>
        <div className="mt-2 bg-orange-500/10 border border-orange-500/15 rounded-lg p-2 text-center">
          <p className="text-slate-400 text-[9px]">Pallet necessari</p>
          <p className="text-orange-400 font-black text-2xl">{palletsNeeded}</p>
          <p className="text-slate-500 text-[9px]">⌈{data.quantita} ÷ {palletCalc.colliPerPallet}⌉ = {palletsNeeded} pallet per {data.quantita} colli</p>
        </div>
      </div>

      {/* Calcolo mezzo — con illustrazione */}
      <div className="bg-slate-800/40 border border-white/5 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <Truck className="w-4 h-4 text-violet-400" />
          <p className="text-white text-xs font-bold flex items-center">
            Carico su {mezzoName}
            <InfoTooltipLogistics text="Calcoliamo quanti pallet entrano nel mezzo scelto (per area a pavimento), poi verifichiamo il limite di peso. Il fattore limitante (volume o peso) determina quanti mezzi servono realmente." />
          </p>
        </div>

        {/* Illustrazione mezzo */}
        <div className="flex justify-center my-2">
          {isContainer20 && <Container20Icon className="w-24 h-14" />}
          {isContainer40 && <Container40Icon className="w-28 h-14" />}
          {!isContainer20 && !isContainer40 && <TruckIcon className="w-28 h-14" />}
        </div>

        <p className="text-slate-400 text-[10px] mb-2">
          Interno: <strong className="text-white">{data.lunghezza_mezzo}×{data.larghezza_mezzo}×{data.altezza_mezzo} cm</strong> •
          Max: <strong className="text-white">{(data.peso_max_mezzo / 1000).toFixed(1)} t</strong>
        </p>

        {/* Formula pallet per mezzo */}
        <div className="bg-slate-900/50 rounded-lg p-2.5 mb-3">
          <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Calcolo</p>
          <p className="text-slate-400 text-[10px] font-mono">
            ⌊{data.lunghezza_mezzo}÷{data.lunghezza_pallet}⌋ × ⌊{data.larghezza_mezzo}÷{data.larghezza_pallet}⌋ = <span className="text-white font-bold">{palletsPerMezzo} pallet/mezzo</span>
          </p>
          <p className="text-slate-400 text-[10px] font-mono mt-1">
            ⌈{palletsNeeded} ÷ {palletsPerMezzo}⌉ = <span className="text-white font-bold">{mezziNeeded} {mezziNeeded === 1 ? 'mezzo' : 'mezzi'}</span> (per volume)
          </p>
          {weightOverload && (
            <p className="text-amber-400 text-[10px] font-mono mt-1">
              ⚖️ Verifica peso: {palletsPerMezzo} pallet × {Math.round(weightPerPallet)} kg = {Math.round(weightPerMezzo)} kg &gt; {data.peso_max_mezzo} kg → <span className="font-bold">{finalMezzi} mezzi</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Pallet/mezzo" value={palletsPerMezzo} color="text-violet-400" tooltip="Quanti pallet stanno a terra nel mezzo" />
          <StatBox label={finalMezzi === 1 ? 'Mezzo' : 'Mezzi necessari'} value={finalMezzi} color="text-green-400" tooltip="Il massimo tra mezzi calcolati per volume e per peso" />
          <StatBox label="Fattore lim." value={limitingFactor === 'peso' ? '⚖️ Peso' : '📦 Volume'} tooltip="Se 'Peso': il mezzo si riempie per peso prima che per volume. Se 'Volume': il volume è il vincolo principale." />
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