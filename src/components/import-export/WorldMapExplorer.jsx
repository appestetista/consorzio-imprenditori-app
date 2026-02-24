import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Globe, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import * as THREE from 'three';
import GlobeCountryPanel from './GlobeCountryPanel';

const GEOJSON_URL = 'https://raw.githubusercontent.com/datasets/geo-countries/main/data/countries.geojson';

// Converti lat/lng in coordinate 3D sulla sfera
function latLngToVector3(lat, lng, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Crea linee dai confini GeoJSON
function createCountryLines(feature, radius) {
  const coords = [];
  const geom = feature.geometry;
  
  const processRing = (ring) => {
    const points = [];
    for (let i = 0; i < ring.length; i++) {
      points.push(latLngToVector3(ring[i][1], ring[i][0], radius));
    }
    return points;
  };

  if (geom.type === 'Polygon') {
    geom.coordinates.forEach(ring => coords.push(processRing(ring)));
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach(polygon => {
      polygon.forEach(ring => coords.push(processRing(ring)));
    });
  }

  return coords;
}

// Crea mesh cliccabile per ogni paese (facce riempite)
function createCountryMesh(feature, radius) {
  const geom = feature.geometry;
  const meshes = [];

  const processRing = (ring) => {
    // Triangolazione semplice tramite fan dal centroide
    if (ring.length < 3) return null;
    const vertices = [];
    const indices = [];
    
    for (let i = 0; i < ring.length; i++) {
      const v = latLngToVector3(ring[i][1], ring[i][0], radius * 0.999);
      vertices.push(v.x, v.y, v.z);
    }
    
    // Fan triangulation dal primo punto
    for (let i = 1; i < ring.length - 1; i++) {
      indices.push(0, i, i + 1);
    }
    
    if (vertices.length < 9) return null;
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return geometry;
  };

  const rings = [];
  if (geom.type === 'Polygon') {
    rings.push(...geom.coordinates);
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach(p => rings.push(...p));
  }

  rings.forEach(ring => {
    const g = processRing(ring);
    if (g) meshes.push(g);
  });

  return meshes;
}

export default function WorldMapExplorer() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const globeGroupRef = useRef(null);
  const countryMeshesRef = useRef([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const hoveredRef = useRef(null);
  const selectedMeshRef = useRef(null);
  const animFrameRef = useRef(null);

  const [loadingGeo, setLoadingGeo] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countryData, setCountryData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [hoveredName, setHoveredName] = useState('');

  // Drag state
  const isDragging = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const previousMouse = useRef({ x: 0, y: 0 });
  const rotationVelocity = useRef({ x: 0, y: 0 });
  const autoRotate = useRef(true);

  // Fetch dati paese al click
  useEffect(() => {
    if (!selectedCountry) {
      setCountryData(null);
      return;
    }
    let cancelled = false;
    const fetchData = async () => {
      setLoadingData(true);
      setCountryData(null);
      const code = selectedCountry.iso_a2 && selectedCountry.iso_a2 !== '-99'
        ? selectedCountry.iso_a2 : selectedCountry.iso_a3;
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Fornisci dati economici sintetici per il paese con codice ISO "${code}" (nome: "${selectedCountry.name}").
REGOLE: usa SOLO dati che conosci con certezza. Se un dato non è disponibile scrivi "N/D". NON inventare.
Rispondi in italiano.`,
        response_json_schema: {
          type: "object",
          properties: {
            country_name: { type: "string" },
            kpis: {
              type: "array",
              items: { type: "object", properties: { label: { type: "string" }, value: { type: "string" } } }
            },
            items: {
              type: "array",
              items: { type: "object", properties: { title: { type: "string" }, value: { type: "string" }, url: { type: "string" } } }
            }
          }
        }
      });
      if (!cancelled) {
        setCountryData(result);
        setLoadingData(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [selectedCountry]);

  // Init Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = 420;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 3;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(5, 3, 5);
    scene.add(directional);

    // Globe group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // Sfera oceano - tema chiaro
    const sphereGeom = new THREE.SphereGeometry(1, 64, 64);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0xd4eaf7,
      transparent: true,
      opacity: 0.95,
      shininess: 40,
    });
    const sphere = new THREE.Mesh(sphereGeom, sphereMat);
    globeGroup.add(sphere);

    // Atmosfera glow
    const glowGeom = new THREE.SphereGeometry(1.03, 64, 64);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
    });
    globeGroup.add(new THREE.Mesh(glowGeom, glowMat));

    // Griglia lat/lng
    const gridMat = new THREE.LineBasicMaterial({ color: 0xbfdbfe, transparent: true, opacity: 0.25 });
    for (let lat = -80; lat <= 80; lat += 20) {
      const pts = [];
      for (let lng = -180; lng <= 180; lng += 2) {
        pts.push(latLngToVector3(lat, lng, 1.001));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      globeGroup.add(new THREE.Line(geom, gridMat));
    }
    for (let lng = -180; lng < 180; lng += 30) {
      const pts = [];
      for (let lat = -90; lat <= 90; lat += 2) {
        pts.push(latLngToVector3(lat, lng, 1.001));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      globeGroup.add(new THREE.Line(geom, gridMat));
    }

    // Carica GeoJSON
    const loadGeoJSON = async () => {
      const res = await fetch(GEOJSON_URL);
      const data = await res.json();
      
      const borderMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.45 });
      const defaultMat = new THREE.MeshPhongMaterial({
        color: 0x6ee7b7,
        transparent: true,
        opacity: 0.75,
        shininess: 15,
        side: THREE.DoubleSide,
      });

      const meshEntries = [];

      data.features.forEach(feature => {
        const props = feature.properties || {};
        const name = props.ADMIN || props.name || '';
        
        // Bordi
        const lineGroups = createCountryLines(feature, 1.002);
        lineGroups.forEach(points => {
          if (points.length < 2) return;
          const geom = new THREE.BufferGeometry().setFromPoints(points);
          globeGroup.add(new THREE.Line(geom, borderMat));
        });

        // Facce cliccabili
        const geometries = createCountryMesh(feature, 1);
        geometries.forEach(g => {
          const mat = defaultMat.clone();
          const mesh = new THREE.Mesh(g, mat);
          mesh.userData = {
            countryName: name,
            iso_a2: props.ISO_A2 || props.iso_a2 || '-99',
            iso_a3: props.ISO_A3 || props.iso_a3 || '-99',
          };
          globeGroup.add(mesh);
          meshEntries.push(mesh);
        });
      });

      countryMeshesRef.current = meshEntries;
      setLoadingGeo(false);
    };
    loadGeoJSON();

    // Animate
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (autoRotate.current && !isDragging.current) {
        globeGroup.rotation.y += 0.002;
      }

      // Inerzia
      if (!isDragging.current) {
        globeGroup.rotation.y += rotationVelocity.current.x;
        globeGroup.rotation.x += rotationVelocity.current.y;
        rotationVelocity.current.x *= 0.95;
        rotationVelocity.current.y *= 0.95;
      }

      // Clamp rotazione X
      globeGroup.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, globeGroup.rotation.x));

      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const handleResize = () => {
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Mouse/Touch handlers
  const getPointerPos = useCallback((e, rect) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * 2 - 1,
      y: -((clientY - rect.top) / rect.height) * 2 + 1,
      px: clientX,
      py: clientY,
    };
  }, []);

  const handlePointerDown = useCallback((e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const pos = getPointerPos(e, rect);
    isDragging.current = true;
    startMouse.current = { x: pos.px, y: pos.py };
    previousMouse.current = { x: pos.px, y: pos.py };
    autoRotate.current = false;
    rotationVelocity.current = { x: 0, y: 0 };
  }, [getPointerPos]);

  const handlePointerMove = useCallback((e) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const pos = getPointerPos(e, rect);

    if (isDragging.current && globeGroupRef.current) {
      const dx = pos.px - previousMouse.current.x;
      const dy = pos.py - previousMouse.current.y;
      globeGroupRef.current.rotation.y += dx * 0.005;
      globeGroupRef.current.rotation.x += dy * 0.005;
      rotationVelocity.current = { x: dx * 0.002, y: dy * 0.002 };
      previousMouse.current = { x: pos.px, y: pos.py };
    }

    // Hover detection
    mouseRef.current.set(pos.x, pos.y);
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(countryMeshesRef.current);
    
    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const name = mesh.userData.countryName;
      
      // Reset previous hover
      if (hoveredRef.current && hoveredRef.current !== mesh && hoveredRef.current !== selectedMeshRef.current) {
        hoveredRef.current.material.color.setHex(0x6ee7b7);
        hoveredRef.current.material.opacity = 0.75;
      }
      
      if (mesh !== selectedMeshRef.current) {
        mesh.material.color.setHex(0x34d399);
        mesh.material.opacity = 0.9;
      }
      hoveredRef.current = mesh;
      setHoveredName(name);
      container.style.cursor = 'pointer';
    } else {
      if (hoveredRef.current && hoveredRef.current !== selectedMeshRef.current) {
        hoveredRef.current.material.color.setHex(0x1e3a2f);
        hoveredRef.current.material.opacity = 0.7;
      }
      hoveredRef.current = null;
      setHoveredName('');
      container.style.cursor = 'grab';
    }
  }, [getPointerPos]);

  const handlePointerUp = useCallback((e) => {
    const wasDragging = isDragging.current;
    isDragging.current = false;

    if (!wasDragging) return;
    
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    
    let clientX, clientY;
    if (e.changedTouches) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Tolleranza drag dal punto iniziale
    const dx = Math.abs(clientX - startMouse.current.x);
    const dy = Math.abs(clientY - startMouse.current.y);
    
    if (dx > 8 || dy > 8) return;

    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    
    raycasterRef.current.setFromCamera(mouse, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(countryMeshesRef.current);
    
    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      
      // Deseleziona precedente
      if (selectedMeshRef.current) {
        // Reset tutti i mesh con lo stesso paese
        countryMeshesRef.current.forEach(m => {
          if (m.userData.countryName === selectedMeshRef.current.userData.countryName) {
            m.material.color.setHex(0x1e3a2f);
            m.material.opacity = 0.7;
            m.material.emissive?.setHex(0x000000);
          }
        });
      }

      // Seleziona nuovo
      countryMeshesRef.current.forEach(m => {
        if (m.userData.countryName === mesh.userData.countryName) {
          m.material.color.setHex(0x065f46);
          m.material.opacity = 1;
        }
      });
      selectedMeshRef.current = mesh;

      setSelectedCountry({
        name: mesh.userData.countryName,
        iso_a2: mesh.userData.iso_a2,
        iso_a3: mesh.userData.iso_a3,
      });
    }
  }, []);

  // Registra i listener touch correttamente con passive: false
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        handlePointerDown(e);
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 1) {
        e.preventDefault();
        handlePointerMove(e);
      }
    };
    const onTouchEnd = (e) => {
      handlePointerUp(e);
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  const closePanel = useCallback(() => {
    if (selectedMeshRef.current) {
      countryMeshesRef.current.forEach(m => {
        if (m.userData.countryName === selectedMeshRef.current.userData.countryName) {
          m.material.color.setHex(0x1e3a2f);
          m.material.opacity = 0.7;
        }
      });
      selectedMeshRef.current = null;
    }
    setSelectedCountry(null);
    setCountryData(null);
    autoRotate.current = true;
  }, []);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <Globe className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-white font-bold text-sm">Mappa Stati</h3>
          <p className="text-slate-500 text-[10px]">Ruota il globo e clicca su uno Stato</p>
        </div>
      </div>

      <Card className="bg-slate-800/60 border-white/5 overflow-hidden">
        <CardContent className="p-0 relative">
          {loadingGeo && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10">
              <div className="text-center">
                <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mx-auto mb-2" />
                <p className="text-slate-400 text-xs">Caricamento globo...</p>
              </div>
            </div>
          )}

          {/* Tooltip hover */}
          {hoveredName && !selectedCountry && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-slate-900/90 backdrop-blur-sm border border-slate-600/40 rounded-lg px-3 py-1.5 pointer-events-none">
              <span className="text-slate-200 text-xs font-semibold">{hoveredName}</span>
            </div>
          )}

          <div
            ref={containerRef}
            className="w-full cursor-grab active:cursor-grabbing"
            style={{ height: 420, touchAction: 'none' }}
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={() => { isDragging.current = false; }}
          />

          {/* Pannello dati paese */}
          {selectedCountry && (
            <div className="absolute bottom-0 left-0 right-0 z-10 p-3 md:absolute md:top-0 md:right-0 md:bottom-auto md:left-auto md:w-72 md:h-full md:p-0 md:overflow-y-auto">
              <div className="md:h-full md:bg-slate-900/95 md:backdrop-blur-sm md:border-l md:border-slate-700/50">
                <div className="md:p-0">
                  <GlobeCountryPanel
                    country={selectedCountry}
                    data={countryData}
                    loading={loadingData}
                    onClose={closePanel}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}