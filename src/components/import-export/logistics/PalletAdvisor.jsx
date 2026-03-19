import React, { useState } from 'react';
import { Package, ChevronDown, ChevronUp, Check, AlertTriangle, Info } from 'lucide-react';

const PALLET_DB = [
  { id: 'epal1', name: 'Europallet (EPAL 1)', dim_cm: [120, 80], height_cm: 14.4, dynamic_kg: 1500, static_kg: 4000, max_h_truck: 260, max_h_container: 235 },
  { id: 'eur2', name: 'Industriale (EUR 2)', dim_cm: [120, 100], height_cm: 14, dynamic_kg: 2000, static_kg: 4000, max_h_truck: 260, max_h_container: 235 },
  { id: 'eur3', name: 'EUR 3', dim_cm: [100, 120], height_cm: 14, dynamic_kg: 1500, static_kg: 4000, max_h_truck: 260, max_h_container: 235 },
  { id: 'half', name: 'Mezzo pallet', dim_cm: [80, 60], height_cm: 14, dynamic_kg: 1000, static_kg: 2000, max_h_truck: 240, max_h_container: 220 },
  { id: 'gma', name: 'Pallet USA (GMA)', dim_cm: [121.9, 101.6], height_cm: 14, dynamic_kg: 1500, static_kg: 4000, max_h_truck: 260, max_h_container: 235 },
  { id: 'oneway', name: 'Pallet leggero (one-way)', dim_cm: [120, 80], height_cm: 13, dynamic_kg: 1000, static_kg: 2500, max_h_truck: 220, max_h_container: 220 },
];

// Dimensioni interne veicoli in cm
const VEHICLES = [
  { id: 'container20', name: "Container 20'", internal_l: 590, internal_w: 235, internal_h: 239, max_kg: 25000 },
  { id: 'container40', name: "Container 40' HC", internal_l: 1203, internal_w: 235, internal_h: 269, max_kg: 26480 },
  { id: 'truck', name: "Camion 13.6m", internal_l: 1360, internal_w: 245, internal_h: 270, max_kg: 24000 },
];

function calcPalletLayout(pallet, vehicle) {
  const [pl, pw] = pallet.dim_cm;
  const ph = pallet.height_cm;
  const { internal_l, internal_w, internal_h } = vehicle;
  const isContainer = vehicle.id.startsWith('container');
  const maxCargoH = isContainer ? pallet.max_h_container : pallet.max_h_truck;

  // Prova orientamento A: pallet length lungo lunghezza veicolo
  const rowsA_l = Math.floor(internal_l / pl);
  const rowsA_w = Math.floor(internal_w / pw);
  const countA = rowsA_l * rowsA_w;

  // Prova orientamento B: pallet ruotato 90°
  const rowsB_l = Math.floor(internal_l / pw);
  const rowsB_w = Math.floor(internal_w / pl);
  const countB = rowsB_l * rowsB_w;

  const perLayer = Math.max(countA, countB);
  const usableH = maxCargoH - ph; // altezza per merce sopra il pallet
  const layers = perLayer > 0 ? 1 : 0; // solo 1 strato di pallet a terra (carico sopra)

  return {
    pallet_per_layer: perLayer,
    total_pallets: perLayer, // un solo strato per piano di carico
    usable_height_cm: Math.round(usableH),
    volume_per_pallet_m3: Math.round((pl / 100) * (pw / 100) * (usableH / 100) * 1000) / 1000,
    max_weight_per_pallet: pallet.dynamic_kg,
  };
}

function PalletVehicleRow({ pallet, vehicle, weightKg, volumeM3 }) {
  const layout = calcPalletLayout(pallet, vehicle);
  if (layout.total_pallets === 0) return null;

  const totalVolAvail = layout.total_pallets * layout.volume_per_pallet_m3;
  const totalWeightAvail = layout.total_pallets * layout.max_weight_per_pallet;
  const palletsByVol = volumeM3 > 0 ? Math.ceil(volumeM3 / layout.volume_per_pallet_m3) : 0;
  const palletsByWt = weightKg > 0 ? Math.ceil(weightKg / layout.max_weight_per_pallet) : 0;
  const palletsNeeded = Math.max(palletsByVol, palletsByWt, 1);
  const vehiclesNeeded = Math.ceil(palletsNeeded / layout.total_pallets);
  const fits = palletsNeeded <= layout.total_pallets;

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
      <div className="flex-1">
        <p className="text-white text-[11px] font-medium">{vehicle.name}</p>
        <p className="text-slate-500 text-[9px]">{layout.total_pallets} pallet/veicolo • {layout.usable_height_cm} cm utili</p>
      </div>
      <div className="text-right">
        <p className={`text-xs font-bold ${fits ? 'text-green-400' : 'text-amber-400'}`}>
          {palletsNeeded} pallet → {vehiclesNeeded} {vehicle.id === 'truck' ? 'camion' : 'container'}
        </p>
        <p className="text-slate-500 text-[9px]">
          {layout.volume_per_pallet_m3} m³/pallet • max {layout.max_weight_per_pallet} kg/pallet
        </p>
      </div>
    </div>
  );
}

export default function PalletAdvisor({ volumeM3, weightKg, destCountry }) {
  const [expanded, setExpanded] = useState(false);
  const vol = parseFloat(volumeM3) || 0;
  const wt = parseFloat(weightKg) || 0;

  if (vol <= 0 && wt <= 0) return null;

  // Suggerisci pallet in base a destinazione
  const isUSA = destCountry && ['US', 'USA', 'United States', 'Canada', 'CA', 'MX', 'Mexico'].some(c =>
    destCountry.toUpperCase().includes(c.toUpperCase())
  );
  const recommended = isUSA ? 'gma' : 'epal1';
  const recPallet = PALLET_DB.find(p => p.id === recommended);

  // Calcola per pallet consigliato su ogni veicolo
  const recLayouts = VEHICLES.map(v => ({
    vehicle: v,
    layout: calcPalletLayout(recPallet, v),
  }));

  return (
    <div className="bg-slate-800/40 border border-white/5 rounded-xl p-4 mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2"
      >
        <Package className="w-4 h-4 text-orange-400" />
        <p className="text-white font-bold text-sm flex-1 text-left">Consulente Pallet</p>
        <span className="text-orange-400 text-[10px] font-bold bg-orange-500/15 px-2 py-0.5 rounded-full">
          Consigliato: {recPallet.name}
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Info pallet consigliato */}
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
            <div className="flex items-start gap-2 mb-2">
              <Check className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-300 text-xs font-bold">{recPallet.name}</p>
                <p className="text-slate-400 text-[10px]">
                  {isUSA ? 'Standard per mercato americano (GMA/ISPM 15)' : 'Standard europeo — il più diffuso a livello globale'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="bg-slate-900/40 rounded-lg p-2 text-center">
                <p className="text-slate-500">Dimensioni</p>
                <p className="text-white font-bold">{recPallet.dim_cm[0]}×{recPallet.dim_cm[1]} cm</p>
              </div>
              <div className="bg-slate-900/40 rounded-lg p-2 text-center">
                <p className="text-slate-500">Portata dinamica</p>
                <p className="text-white font-bold">{recPallet.dynamic_kg.toLocaleString()} kg</p>
              </div>
              <div className="bg-slate-900/40 rounded-lg p-2 text-center">
                <p className="text-slate-500">Altezza pallet</p>
                <p className="text-white font-bold">{recPallet.height_cm} cm</p>
              </div>
            </div>
          </div>

          {/* Calcolo per veicolo */}
          <div>
            <p className="text-slate-300 text-[11px] font-semibold mb-2">
              Disposizione con {recPallet.name} ({vol > 0 ? `${vol} m³` : ''}{vol > 0 && wt > 0 ? ' • ' : ''}{wt > 0 ? `${(wt / 1000).toFixed(1)} t` : ''})
            </p>
            <div className="space-y-0.5">
              {VEHICLES.map(v => (
                <PalletVehicleRow
                  key={v.id}
                  pallet={recPallet}
                  vehicle={v}
                  weightKg={wt}
                  volumeM3={vol}
                />
              ))}
            </div>
          </div>

          {/* Tabella comparativa tutti i pallet */}
          <div>
            <p className="text-slate-300 text-[11px] font-semibold mb-2 flex items-center gap-1">
              <Info className="w-3 h-3 text-slate-500" /> Confronto tutti i tipi di pallet
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[9px]">
                <thead>
                  <tr className="text-slate-500 border-b border-white/10">
                    <th className="text-left py-1 pr-2">Tipo</th>
                    <th className="text-center py-1 px-1">Dim. (cm)</th>
                    <th className="text-center py-1 px-1">Portata din.</th>
                    <th className="text-center py-1 px-1">20' pallet</th>
                    <th className="text-center py-1 px-1">40'HC pallet</th>
                    <th className="text-center py-1 px-1">Camion pallet</th>
                  </tr>
                </thead>
                <tbody>
                  {PALLET_DB.map(p => {
                    const l20 = calcPalletLayout(p, VEHICLES[0]);
                    const l40 = calcPalletLayout(p, VEHICLES[1]);
                    const lTr = calcPalletLayout(p, VEHICLES[2]);
                    const isRec = p.id === recommended;
                    return (
                      <tr key={p.id} className={`border-b border-white/5 ${isRec ? 'bg-orange-500/5' : ''}`}>
                        <td className={`py-1.5 pr-2 ${isRec ? 'text-orange-400 font-bold' : 'text-white'}`}>
                          {p.name} {isRec && '⭐'}
                        </td>
                        <td className="text-center text-slate-400">{p.dim_cm[0]}×{p.dim_cm[1]}</td>
                        <td className="text-center text-slate-400">{p.dynamic_kg.toLocaleString()} kg</td>
                        <td className="text-center text-green-400 font-bold">{l20.total_pallets}</td>
                        <td className="text-center text-blue-400 font-bold">{l40.total_pallets}</td>
                        <td className="text-center text-violet-400 font-bold">{lTr.total_pallets}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Note */}
          <div className="flex items-start gap-2 bg-slate-700/20 rounded-lg p-2">
            <AlertTriangle className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" />
            <p className="text-slate-500 text-[9px] leading-relaxed">
              Calcoli basati su dimensioni interne standard. Non considerano sovrapposizione pallet (solo 1 strato a terra).
              L'altezza utile è calcolata come altezza max carico meno altezza pallet.
              Per spedizioni ISPM 15 verificare trattamento fitosanitario obbligatorio.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}