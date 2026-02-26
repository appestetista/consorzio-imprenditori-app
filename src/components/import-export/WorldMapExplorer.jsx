import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import * as THREE from 'three';
import GlobeCountryPanel from './GlobeCountryPanel';
import { translateCountryName } from './countryNamesIT';

// GeoJSON a bassa risoluzione (110m) — solo stati principali, niente isole minuscole
const GEOJSON_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

// Stati troppo piccoli da escludere (isole, microstati)
const EXCLUDED_COUNTRIES = new Set([
  'Antigua and Barbuda', 'Barbados', 'Dominica', 'Grenada', 'Saint Kitts and Nevis',
  'Saint Lucia', 'Saint Vincent and the Grenadines', 'Trinidad and Tobago',
  'Comoros', 'Maldives', 'Seychelles', 'Sao Tome and Principe', 'Cape Verde',
  'Mauritius', 'Kiribati', 'Marshall Islands', 'Micronesia', 'Nauru', 'Palau',
  'Samoa', 'Tonga', 'Tuvalu', 'Vanuatu', 'Malta', 'Monaco', 'San Marino',
  'Liechtenstein', 'Andorra', 'Vatican', 'Singapore', 'Bahrain',
]);

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
    // Semplifica: prendi solo 1 punto ogni N per ring molto grandi
    const step = ring.length > 200 ? 3 : ring.length > 80 ? 2 : 1;
    const points = [];
    for (let i = 0; i < ring.length; i += step) {
      points.push(latLngToVector3(ring[i][1], ring[i][0], radius));
    }
    // Chiudi il ring
    if (points.length > 1) {
      points.push(points[0].clone());
    }
    return points;
  };

  if (geom.type === 'Polygon') {
    geom.coordinates.forEach(ring => {
      if (ring.length >= 4) coords.push(processRing(ring));
    });
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach(polygon => {
      polygon.forEach(ring => {
        if (ring.length >= 4) coords.push(processRing(ring));
      });
    });
  }

  return coords;
}

// Disegna i paesi su una texture canvas 2D (equirettangolare)
function drawCountriesOnCanvas(ctx, features, width, height, excludedSet) {
  const lngToX = (lng) => ((lng + 180) / 360) * width;
  const latToY = (lat) => ((90 - lat) / 180) * height;

  const drawPolygon = (coords, fillColor) => {
    coords.forEach((ring, ringIdx) => {
      if (ring.length < 3) return;
      ctx.beginPath();
      ctx.moveTo(lngToX(ring[0][0]), latToY(ring[0][1]));
      for (let i = 1; i < ring.length; i++) {
        ctx.lineTo(lngToX(ring[i][0]), latToY(ring[i][1]));
      }
      ctx.closePath();
      if (ringIdx === 0) {
        ctx.fillStyle = fillColor;
        ctx.fill();
      } else {
        // Hole
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    });
  };

  features.forEach(feature => {
    const props = feature.properties || {};
    const name = props.ADMIN || props.NAME || props.name || '';
    if (excludedSet.has(name)) return;

    const geom = feature.geometry;
    const fillColor = '#2a6090';

    if (geom.type === 'Polygon') {
      drawPolygon(geom.coordinates, fillColor);
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach(polygon => drawPolygon(polygon, fillColor));
    }
  });

  // Bordi sopra - netti e visibili
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 1.5;
  features.forEach(feature => {
    const props = feature.properties || {};
    const name = props.ADMIN || props.NAME || props.name || '';
    if (excludedSet.has(name)) return;

    const geom = feature.geometry;
    const drawBorders = (coords) => {
      coords.forEach(ring => {
        if (ring.length < 3) return;
        ctx.beginPath();
        ctx.moveTo(lngToX(ring[0][0]), latToY(ring[0][1]));
        for (let i = 1; i < ring.length; i++) {
          ctx.lineTo(lngToX(ring[i][0]), latToY(ring[i][1]));
        }
        ctx.closePath();
        ctx.stroke();
      });
    };

    if (geom.type === 'Polygon') {
      drawBorders(geom.coordinates);
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach(polygon => drawBorders(polygon));
    }
  });
}

// Crea mesh invisibile per hit-testing (fan triangulation ok per raycast)
function createCountryHitMesh(feature, radius) {
  const geom = feature.geometry;
  const meshes = [];

  const processRing = (ring) => {
    if (ring.length < 4) return null;
    const step = ring.length > 200 ? 3 : ring.length > 80 ? 2 : 1;
    const vertices = [];
    const indices = [];
    
    for (let i = 0; i < ring.length; i += step) {
      const v = latLngToVector3(ring[i][1], ring[i][0], radius * 1.003);
      vertices.push(v.x, v.y, v.z);
    }
    
    const numVerts = vertices.length / 3;
    for (let i = 1; i < numVerts - 1; i++) {
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

export default function WorldMapExplorer({ onCountrySelect, selectedCountries = [] }) {
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
  const selectedLinesRef = useRef([]);
  const raisedMeshesRef = useRef([]);
  const geoDataRef = useRef(null);
  const animFrameRef = useRef(null);

  const [loadingGeo, setLoadingGeo] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countryData, setCountryData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [hoveredName, setHoveredName] = useState('');
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Drag state
  const isDragging = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const previousMouse = useRef({ x: 0, y: 0 });
  const rotationVelocity = useRef({ x: 0, y: 0 });
  const autoRotate = useRef(true);
  const pinchDistRef = useRef(null);

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

    // Lighting - luminoso e morbido
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambient);
    const directional = new THREE.DirectionalLight(0xffffff, 0.6);
    directional.position.set(5, 3, 5);
    scene.add(directional);
    const fillLight = new THREE.DirectionalLight(0xe0f2fe, 0.3);
    fillLight.position.set(-3, -2, -3);
    scene.add(fillLight);

    // Globe group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // Sfera oceano - blu scuro
    const sphereGeom = new THREE.SphereGeometry(1, 64, 64);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: 0x0f2847,
      shininess: 5,
    });
    const sphere = new THREE.Mesh(sphereGeom, sphereMat);
    globeGroup.add(sphere);

    // Carica GeoJSON
    const loadGeoJSON = async () => {
      const res = await fetch(GEOJSON_URL);
      const data = await res.json();

      // Disegna i paesi su una texture canvas (riempimento uniforme + bordi)
      const texCanvas = document.createElement('canvas');
      texCanvas.width = 2048;
      texCanvas.height = 1024;
      const texCtx = texCanvas.getContext('2d');
      // Sfondo trasparente (l'oceano è la sfera sotto)
      texCtx.clearRect(0, 0, 2048, 1024);
      drawCountriesOnCanvas(texCtx, data.features, 2048, 1024, EXCLUDED_COUNTRIES);

      const texture = new THREE.CanvasTexture(texCanvas);
      texture.needsUpdate = true;
      const landSphereGeom = new THREE.SphereGeometry(1.001, 64, 64);
      const landSphereMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
      const landSphere = new THREE.Mesh(landSphereGeom, landSphereMat);
      globeGroup.add(landSphere);

      // Hit-test mesh trasparenti per click/hover (diventano visibili su hover/selezione)
      const hitMat = new THREE.MeshBasicMaterial({
        color: 0x3d80b0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const meshEntries = [];

      data.features.forEach(feature => {
        const props = feature.properties || {};
        const name = props.ADMIN || props.NAME || props.name || '';
        if (EXCLUDED_COUNTRIES.has(name)) return;

        const geometries = createCountryHitMesh(feature, 1);
        geometries.forEach(g => {
          const mat = hitMat.clone();
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
      geoDataRef.current = data;
      setLoadingGeo(false);
    };
    loadGeoJSON();

    // Animate
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);

      if (autoRotate.current && !isDragging.current) {
        globeGroup.rotation.y += 0.002;
      }

      // Inerzia fluida
      if (!isDragging.current) {
        globeGroup.rotation.y += rotationVelocity.current.x;
        globeGroup.rotation.x += rotationVelocity.current.y;
        rotationVelocity.current.x *= 0.97;
        rotationVelocity.current.y *= 0.97;
        if (Math.abs(rotationVelocity.current.x) < 0.0001) rotationVelocity.current.x = 0;
        if (Math.abs(rotationVelocity.current.y) < 0.0001) rotationVelocity.current.y = 0;
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
      globeGroupRef.current.rotation.y += dx * 0.006;
      globeGroupRef.current.rotation.x += dy * 0.006;
      rotationVelocity.current = { x: dx * 0.003, y: dy * 0.003 };
      previousMouse.current = { x: pos.px, y: pos.py };
    }

    // Hover detection
    mouseRef.current.set(pos.x, pos.y);
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(countryMeshesRef.current);
    
    if (intersects.length > 0) {
      const mesh = intersects[0].object;
      const name = mesh.userData.countryName;
      
      hoveredRef.current = mesh;
      setHoveredName(translateCountryName(name));
      // Posizione tooltip relativa al container
      const containerRect = container.getBoundingClientRect();
      setTooltipPos({ x: pos.px - containerRect.left, y: pos.py - containerRect.top });
      container.style.cursor = 'pointer';
    } else {
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
      const countryName = mesh.userData.countryName;
      
      // Rimuovi bordi selezione precedente
      selectedLinesRef.current.forEach(line => {
        if (globeGroupRef.current) globeGroupRef.current.remove(line);
        line.geometry.dispose();
        line.material.dispose();
      });
      selectedLinesRef.current = [];

      // Deseleziona mesh precedente
      if (selectedMeshRef.current) {
        countryMeshesRef.current.forEach(m => {
          if (m.userData.countryName === selectedMeshRef.current.userData.countryName) {
            m.material.opacity = 0;
          }
        });
      }

      // Rimuovi mesh rialzate precedenti
      raisedMeshesRef.current.forEach(rm => {
        if (globeGroupRef.current) globeGroupRef.current.remove(rm);
        rm.geometry.dispose();
        rm.material.dispose();
      });
      raisedMeshesRef.current = [];

      selectedMeshRef.current = mesh;

      // Crea mesh rialzata + bordi luminosi per lo stato selezionato
      if (geoDataRef.current && globeGroupRef.current) {
        const feature = geoDataRef.current.features.find(f => {
          const p = f.properties || {};
          return (p.ADMIN || p.NAME || p.name || '') === countryName;
        });
        if (feature) {
          // Mesh rialzata colorata (raggio maggiore = effetto rilievo)
          const raisedRadius = 1.018;
          const raisedGeometries = createCountryHitMesh(feature, raisedRadius - 0.003);
          raisedGeometries.forEach(g => {
            const raisedMat = new THREE.MeshPhongMaterial({
              color: 0xf59e0b, // Arancione/ambra
              emissive: 0xf59e0b,
              emissiveIntensity: 0.3,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.85,
              depthWrite: true,
            });
            const raisedMesh = new THREE.Mesh(g, raisedMat);
            globeGroupRef.current.add(raisedMesh);
            raisedMeshesRef.current.push(raisedMesh);
          });

          // Bordi luminosi sopra la mesh rialzata
          const lineGroups = createCountryLines(feature, raisedRadius);
          lineGroups.forEach(points => {
            const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
            const lineMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, linewidth: 2 });
            const line = new THREE.Line(lineGeom, lineMat);
            globeGroupRef.current.add(line);
            selectedLinesRef.current.push(line);
          });
        }
      }

      const countryInfo = {
        name: translateCountryName(countryName),
        nameEN: countryName,
        iso_a2: mesh.userData.iso_a2,
        iso_a3: mesh.userData.iso_a3,
      };
      setSelectedCountry(countryInfo);
      if (onCountrySelect) {
        onCountrySelect(countryInfo);
      }
    }
  }, []);

  // Registra i listener touch correttamente con passive: false
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Track whether the gesture is horizontal (globe rotate) or vertical (page scroll)
    const touchDirectionRef = { resolved: false, isHorizontal: false };

    const onTouchStart = (e) => {
      touchDirectionRef.resolved = false;
      touchDirectionRef.isHorizontal = false;
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchDistRef.current = Math.sqrt(dx * dx + dy * dy);
        isDragging.current = false;
      } else if (e.touches.length === 1) {
        pinchDistRef.current = null;
        handlePointerDown(e);
      }
    };
    const onTouchMove = (e) => {
      if (e.touches.length === 2 && cameraRef.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (pinchDistRef.current !== null) {
          const delta = (pinchDistRef.current - dist) * 0.008;
          const newZ = cameraRef.current.position.z + delta;
          cameraRef.current.position.z = Math.max(1.8, Math.min(5, newZ));
        }
        pinchDistRef.current = dist;
        autoRotate.current = false;
      } else if (e.touches.length === 1 && pinchDistRef.current === null) {
        // Determine direction on first significant move
        if (!touchDirectionRef.resolved) {
          const dx = Math.abs(e.touches[0].clientX - startMouse.current.x);
          const dy = Math.abs(e.touches[0].clientY - startMouse.current.y);
          if (dx > 6 || dy > 6) {
            touchDirectionRef.resolved = true;
            touchDirectionRef.isHorizontal = dx > dy;
          }
        }
        if (touchDirectionRef.resolved && touchDirectionRef.isHorizontal) {
          e.preventDefault(); // Block scroll, rotate globe
          handlePointerMove(e);
        } else {
          // Vertical or not yet resolved — let the page scroll naturally
          isDragging.current = false;
        }
      }
    };
    const onTouchEnd = (e) => {
      if (e.touches.length < 2) {
        pinchDistRef.current = null;
      }
      handlePointerUp(e);
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  const closePanel = useCallback(() => {
    // Rimuovi bordi selezione
    selectedLinesRef.current.forEach(line => {
      if (globeGroupRef.current) globeGroupRef.current.remove(line);
      line.geometry.dispose();
      line.material.dispose();
    });
    selectedLinesRef.current = [];

    if (selectedMeshRef.current) {
      countryMeshesRef.current.forEach(m => {
        if (m.userData.countryName === selectedMeshRef.current.userData.countryName) {
          m.material.opacity = 0;
        }
      });
      selectedMeshRef.current = null;
    }
    setSelectedCountry(null);
    setCountryData(null);
    autoRotate.current = true;
  }, []);

  return (
    <div className="mb-6 relative">
      <div className="relative">
        {loadingGeo && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="text-center">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-2" />
              <p className="text-slate-500 text-xs">Caricamento globo...</p>
            </div>
          </div>
        )}

        {/* Tooltip hover - segue il puntatore */}
        {(hoveredName || selectedCountry) && (
          <div
            className="absolute z-10 pointer-events-none"
            style={{ left: tooltipPos.x, top: tooltipPos.y - 36, transform: 'translateX(-50%)' }}
          >
            <span className="text-black text-xs font-semibold drop-shadow-md">{hoveredName || selectedCountry?.name}</span>
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full cursor-grab active:cursor-grabbing"
          style={{ height: 420, touchAction: 'pan-y' }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={() => { isDragging.current = false; }}
          onWheel={(e) => {
            e.preventDefault();
            if (cameraRef.current) {
              const delta = e.deltaY * 0.002;
              const newZ = cameraRef.current.position.z + delta;
              cameraRef.current.position.z = Math.max(1.8, Math.min(5, newZ));
              autoRotate.current = false;
            }
          }}
        />


      </div>
    </div>
  );
}