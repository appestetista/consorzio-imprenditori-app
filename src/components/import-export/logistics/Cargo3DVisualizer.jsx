import React, { useRef, useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { Package, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

// Dimensioni interne reali (in metri)
const VEHICLES = [
  {
    id: 'container20',
    label: "Container 20'",
    image: 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/c4d80d96e_images-removebg-preview1.png',
    internal: { l: 5.90, w: 2.35, h: 2.39 },
    volume: 33,
    maxWeight: 25000,
    color: '#22c55e',
  },
  {
    id: 'container40hc',
    label: "Container 40' HC",
    image: 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/5b89e95f5_40-hc-removebg-preview.png',
    internal: { l: 12.03, w: 2.35, h: 2.69 },
    volume: 76.3,
    maxWeight: 26480,
    color: '#3b82f6',
  },
  {
    id: 'truck',
    label: 'Camion Standard',
    image: 'https://media.base44.com/images/public/695e2f74bb7d2636b5606a98/0d373cd54_Vrachtwagen-breedte-removebg-preview.png',
    internal: { l: 13.6, w: 2.45, h: 2.70 },
    volume: 90,
    maxWeight: 24000,
    color: '#a855f7',
  },
];

function create3DScene(canvas, vehicle, cargoVolume) {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();

  // Camera
  const maxDim = Math.max(vehicle.internal.l, vehicle.internal.w, vehicle.internal.h);
  const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
  camera.position.set(maxDim * 1.4, maxDim * 0.9, maxDim * 1.4);
  camera.lookAt(0, vehicle.internal.h * 0.35, 0);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 8, 5);
  scene.add(dirLight);

  const { l, w: vw, h: vh } = vehicle.internal;

  // Container wireframe
  const boxGeo = new THREE.BoxGeometry(l, vh, vw);
  const edgesGeo = new THREE.EdgesGeometry(boxGeo);
  const edgesMat = new THREE.LineBasicMaterial({ color: new THREE.Color(vehicle.color), linewidth: 2, transparent: true, opacity: 0.7 });
  const wireframe = new THREE.LineSegments(edgesGeo, edgesMat);
  wireframe.position.y = vh / 2;
  scene.add(wireframe);

  // Transparent walls
  const wallMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(vehicle.color),
    transparent: true,
    opacity: 0.06,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const wallMesh = new THREE.Mesh(boxGeo, wallMat);
  wallMesh.position.y = vh / 2;
  scene.add(wallMesh);

  // Floor grid
  const gridHelper = new THREE.GridHelper(maxDim * 2, 20, 0x334155, 0x1e293b);
  gridHelper.position.y = -0.01;
  scene.add(gridHelper);

  // Cargo block inside
  if (cargoVolume > 0) {
    const vehicleVol = l * vw * vh;
    const fillRatio = Math.min(cargoVolume / vehicleVol, 1);
    // Fill from bottom-back, proportional height
    const cargoH = vh * fillRatio;
    const cargoGeo = new THREE.BoxGeometry(l * 0.96, cargoH, vw * 0.96);
    const cargoMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.55,
      roughness: 0.4,
      metalness: 0.1,
    });
    const cargoMesh = new THREE.Mesh(cargoGeo, cargoMat);
    cargoMesh.position.y = cargoH / 2;
    scene.add(cargoMesh);

    // Cargo edges
    const cargoEdges = new THREE.EdgesGeometry(cargoGeo);
    const cargoEdgesMat = new THREE.LineBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.9 });
    const cargoWire = new THREE.LineSegments(cargoEdges, cargoEdgesMat);
    cargoWire.position.y = cargoH / 2;
    scene.add(cargoWire);
  }

  // Animation rotation state
  let angleY = 0.4;
  let isDragging = false;
  let lastX = 0;

  const onPointerDown = (e) => { isDragging = true; lastX = e.clientX || e.touches?.[0]?.clientX || 0; };
  const onPointerMove = (e) => {
    if (!isDragging) return;
    const x = e.clientX || e.touches?.[0]?.clientX || 0;
    angleY += (x - lastX) * 0.008;
    lastX = x;
  };
  const onPointerUp = () => { isDragging = false; };

  canvas.addEventListener('mousedown', onPointerDown);
  canvas.addEventListener('mousemove', onPointerMove);
  canvas.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('mouseleave', onPointerUp);
  canvas.addEventListener('touchstart', onPointerDown, { passive: true });
  canvas.addEventListener('touchmove', onPointerMove, { passive: true });
  canvas.addEventListener('touchend', onPointerUp);

  let animId;
  const animate = () => {
    animId = requestAnimationFrame(animate);
    if (!isDragging) angleY += 0.003;
    const radius = maxDim * 1.8;
    camera.position.x = Math.sin(angleY) * radius;
    camera.position.z = Math.cos(angleY) * radius;
    camera.position.y = maxDim * 0.7;
    camera.lookAt(0, vh * 0.35, 0);
    renderer.render(scene, camera);
  };
  animate();

  return () => {
    cancelAnimationFrame(animId);
    canvas.removeEventListener('mousedown', onPointerDown);
    canvas.removeEventListener('mousemove', onPointerMove);
    canvas.removeEventListener('mouseup', onPointerUp);
    canvas.removeEventListener('mouseleave', onPointerUp);
    canvas.removeEventListener('touchstart', onPointerDown);
    canvas.removeEventListener('touchmove', onPointerMove);
    canvas.removeEventListener('touchend', onPointerUp);
    renderer.dispose();
  };
}

function VehicleCard({ vehicle, cargoVolume, cargoWeight }) {
  const canvasRef = useRef(null);
  const cleanupRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      if (cleanupRef.current) cleanupRef.current();
      cleanupRef.current = create3DScene(canvasRef.current, vehicle, cargoVolume);
    }
    return () => { if (cleanupRef.current) cleanupRef.current(); };
  }, [vehicle, cargoVolume]);

  const { l, w, h } = vehicle.internal;
  const vehicleVol = l * w * h;
  const fillPercent = cargoVolume > 0 ? Math.min((cargoVolume / vehicleVol) * 100, 100) : 0;
  const fits = cargoVolume <= vehicleVol && (!cargoWeight || cargoWeight <= vehicle.maxWeight);
  const volumeOk = cargoVolume <= vehicleVol;
  const weightOk = !cargoWeight || cargoWeight <= vehicle.maxWeight;

  return (
    <div className="bg-slate-800/60 border border-white/10 rounded-2xl overflow-hidden">
      {/* Header with image */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <img src={vehicle.image} alt={vehicle.label} className="w-14 h-10 object-contain" />
        <div className="flex-1">
          <p className="text-white font-bold text-sm">{vehicle.label}</p>
          <p className="text-slate-400 text-[10px]">{l} × {w} × {h} m — {vehicle.volume} m³</p>
        </div>
        <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${fits ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
          {fits ? '✓ Entra' : '✗ Non entra'}
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="relative" style={{ height: 220 }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ touchAction: 'none' }} />
        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
          <p className="text-white/60 text-[9px]">↔ Trascina per ruotare</p>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 space-y-2">
        {/* Fill bar */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-400 text-[10px]">Riempimento volume</span>
            <span className={`text-[10px] font-bold ${volumeOk ? 'text-amber-400' : 'text-red-400'}`}>{fillPercent.toFixed(1)}%</span>
          </div>
          <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(fillPercent, 100)}%`,
                background: fillPercent > 100 ? '#ef4444' : fillPercent > 80 ? '#f59e0b' : '#d4af37',
              }}
            />
          </div>
        </div>

        {/* Volume & weight details */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-700/40 rounded-lg p-2">
            <p className="text-slate-500 text-[9px]">Volume carico</p>
            <p className={`text-xs font-bold ${volumeOk ? 'text-white' : 'text-red-400'}`}>
              {cargoVolume > 0 ? `${cargoVolume.toFixed(1)} m³` : '—'}
              <span className="text-slate-500 font-normal"> / {vehicle.volume} m³</span>
            </p>
          </div>
          <div className="bg-slate-700/40 rounded-lg p-2">
            <p className="text-slate-500 text-[9px]">Peso max</p>
            <p className={`text-xs font-bold ${weightOk ? 'text-white' : 'text-red-400'}`}>
              {cargoWeight ? `${(cargoWeight / 1000).toFixed(1)} t` : '—'}
              <span className="text-slate-500 font-normal"> / {(vehicle.maxWeight / 1000).toFixed(1)} t</span>
            </p>
          </div>
        </div>

        {/* Remaining space */}
        {cargoVolume > 0 && volumeOk && (
          <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-2">
            <p className="text-green-400 text-[10px]">
              Spazio residuo: <strong>{(vehicleVol - cargoVolume).toFixed(1)} m³</strong> ({(100 - fillPercent).toFixed(1)}%)
            </p>
          </div>
        )}
        {cargoVolume > vehicleVol && (
          <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2">
            <p className="text-red-400 text-[10px]">
              Eccedenza: <strong>{(cargoVolume - vehicleVol).toFixed(1)} m³</strong> — servono più container o un mezzo più grande
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Cargo3DVisualizer({ volumeM3, weightKg }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const cargoVol = parseFloat(volumeM3) || 0;
  const cargoWt = parseFloat(weightKg) || 0;

  if (cargoVol <= 0) return null;

  const vehicle = VEHICLES[activeIdx];

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Package className="w-4 h-4 text-amber-400" />
        <p className="text-white font-bold text-sm">Visualizzazione Ingombro 3D</p>
      </div>

      {/* Vehicle selector tabs */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {VEHICLES.map((v, i) => (
          <button
            key={v.id}
            onClick={() => setActiveIdx(i)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium whitespace-nowrap transition-all ${
              i === activeIdx
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400'
                : 'bg-slate-700/40 border border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <img src={v.image} alt={v.label} className="w-8 h-6 object-contain" />
            {v.label}
          </button>
        ))}
      </div>

      {/* Active vehicle 3D card */}
      <VehicleCard vehicle={vehicle} cargoVolume={cargoVol} cargoWeight={cargoWt} />

      {/* Quick comparison summary */}
      <div className="mt-3 bg-slate-800/40 border border-white/5 rounded-xl p-3">
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Confronto rapido</p>
        <div className="space-y-1.5">
          {VEHICLES.map((v) => {
            const vVol = v.internal.l * v.internal.w * v.internal.h;
            const pct = (cargoVol / vVol) * 100;
            const ok = cargoVol <= vVol && (!cargoWt || cargoWt <= v.maxWeight);
            return (
              <div key={v.id} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-slate-300 text-[11px] flex-1">{v.label}</span>
                <span className="text-slate-400 text-[10px]">{v.volume} m³</span>
                <span className={`text-[10px] font-bold ${pct <= 100 ? 'text-amber-400' : 'text-red-400'}`}>
                  {pct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}