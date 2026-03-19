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

// Calcola centroide di un feature GeoJSON (media pesata delle coordinate)
function getFeatureCentroid(feature) {
  const geom = feature.geometry;
  let sumLat = 0, sumLng = 0, count = 0;
  const addRing = (ring) => {
    for (let i = 0; i < ring.length; i++) {
      sumLng += ring[i][0];
      sumLat += ring[i][1];
      count++;
    }
  };
  if (geom.type === 'Polygon') {
    addRing(geom.coordinates[0]);
  } else if (geom.type === 'MultiPolygon') {
    // Usa il poligono più grande (più punti)
    let biggest = geom.coordinates[0][0];
    for (const poly of geom.coordinates) {
      if (poly[0].length > biggest.length) biggest = poly[0];
    }
    addRing(biggest);
  }
  if (count === 0) return { lat: 0, lng: 0 };
  return { lat: sumLat / count, lng: sumLng / count };
}

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

// ===== Ear-clipping triangulation (2D) =====
function earcut2D(flatCoords, holeIndices, dim) {
  dim = dim || 2;
  const hasHoles = holeIndices && holeIndices.length;
  const outerLen = hasHoles ? holeIndices[0] * dim : flatCoords.length;
  let outerNode = linkedList(flatCoords, 0, outerLen, dim, true);
  const triangles = [];
  if (!outerNode || outerNode.next === outerNode.prev) return triangles;
  if (hasHoles) outerNode = eliminateHoles(flatCoords, holeIndices, outerNode, dim);
  let minX, minY, maxX, maxY, invSize;
  if (flatCoords.length > 80 * dim) {
    minX = maxX = flatCoords[0]; minY = maxY = flatCoords[1];
    for (let i = dim; i < outerLen; i += dim) {
      const x = flatCoords[i], y = flatCoords[i + 1];
      if (x < minX) minX = x; if (y < minY) minY = y;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    }
    invSize = Math.max(maxX - minX, maxY - minY);
    invSize = invSize !== 0 ? 32767 / invSize : 0;
  }
  earcutLinked(outerNode, triangles, dim, minX, minY, invSize, 0);
  return triangles;
}
function linkedList(data, start, end, dim, clockwise) {
  let last;
  if (clockwise === (signedArea(data, start, end, dim) > 0)) {
    for (let i = start; i < end; i += dim) last = insertNode(i, data[i], data[i + 1], last);
  } else {
    for (let i = end - dim; i >= start; i -= dim) last = insertNode(i, data[i], data[i + 1], last);
  }
  if (last && equals(last, last.next)) { removeNode(last); last = last.next; }
  if (!last) return null;
  last.next.prev = last; last.prev.next = last;
  return last.next;
}
function filterPoints(start, end) {
  if (!start) return start;
  if (!end) end = start;
  let p = start, again;
  do {
    again = false;
    if (!p.steiner && (equals(p, p.next) || area(p.prev, p, p.next) === 0)) {
      removeNode(p); p = end = p.prev; if (p === p.next) break;
      again = true;
    } else { p = p.next; }
  } while (again || p !== end);
  return end;
}
function earcutLinked(ear, triangles, dim, minX, minY, invSize, pass) {
  if (!ear) return;
  if (!pass && invSize) indexCurve(ear, minX, minY, invSize);
  let stop = ear, prev, next;
  while (ear.prev !== ear.next) {
    prev = ear.prev; next = ear.next;
    if (invSize ? isEarHashed(ear, minX, minY, invSize) : isEar(ear)) {
      triangles.push(prev.i / dim | 0, ear.i / dim | 0, next.i / dim | 0);
      removeNode(ear); ear = next.next; stop = next.next; continue;
    }
    ear = next;
    if (ear === stop) {
      if (!pass) earcutLinked(filterPoints(ear), triangles, dim, minX, minY, invSize, 1);
      else if (pass === 1) { ear = cureLocalIntersections(filterPoints(ear), triangles, dim); earcutLinked(ear, triangles, dim, minX, minY, invSize, 2); }
      else if (pass === 2) splitEarcut(ear, triangles, dim, minX, minY, invSize);
      break;
    }
  }
}
function isEar(ear) {
  const a = ear.prev, b = ear, c = ear.next;
  if (area(a, b, c) >= 0) return false;
  const ax = a.x, ay = a.y, bx = b.x, by = b.y, cx = c.x, cy = c.y;
  const x0 = ax < bx ? (ax < cx ? ax : cx) : (bx < cx ? bx : cx);
  const y0 = ay < by ? (ay < cy ? ay : cy) : (by < cy ? by : cy);
  const x1 = ax > bx ? (ax > cx ? ax : cx) : (bx > cx ? bx : cx);
  const y1 = ay > by ? (ay > cy ? ay : cy) : (by > cy ? by : cy);
  let p = c.next;
  while (p !== a) {
    if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
    p = p.next;
  }
  return true;
}
function isEarHashed(ear, minX, minY, invSize) {
  const a = ear.prev, b = ear, c = ear.next;
  if (area(a, b, c) >= 0) return false;
  const ax = a.x, ay = a.y, bx = b.x, by = b.y, cx = c.x, cy = c.y;
  const x0 = ax < bx ? (ax < cx ? ax : cx) : (bx < cx ? bx : cx);
  const y0 = ay < by ? (ay < cy ? ay : cy) : (by < cy ? by : cy);
  const x1 = ax > bx ? (ax > cx ? ax : cx) : (bx > cx ? bx : cx);
  const y1 = ay > by ? (ay > cy ? ay : cy) : (by > cy ? by : cy);
  const minZ = zOrder(x0, y0, minX, minY, invSize), maxZ = zOrder(x1, y1, minX, minY, invSize);
  let p = ear.prevZ, n = ear.nextZ;
  while (p && p.z >= minZ && n && n.z <= maxZ) {
    if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
    p = p.prevZ;
    if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c && pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0) return false;
    n = n.nextZ;
  }
  while (p && p.z >= minZ) {
    if (p.x >= x0 && p.x <= x1 && p.y >= y0 && p.y <= y1 && p !== a && p !== c && pointInTriangle(ax, ay, bx, by, cx, cy, p.x, p.y) && area(p.prev, p, p.next) >= 0) return false;
    p = p.prevZ;
  }
  while (n && n.z <= maxZ) {
    if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && n !== a && n !== c && pointInTriangle(ax, ay, bx, by, cx, cy, n.x, n.y) && area(n.prev, n, n.next) >= 0) return false;
    n = n.nextZ;
  }
  return true;
}
function cureLocalIntersections(start, triangles, dim) {
  let p = start;
  do {
    const a = p.prev, b = p.next.next;
    if (!equals(a, b) && intersects(a, p, p.next, b) && locallyInside(a, b) && locallyInside(b, a)) {
      triangles.push(a.i / dim | 0, p.i / dim | 0, b.i / dim | 0);
      removeNode(p); removeNode(p.next); p = start = b;
    }
    p = p.next;
  } while (p !== start);
  return filterPoints(p);
}
function splitEarcut(start, triangles, dim, minX, minY, invSize) {
  let a = start;
  do {
    let b = a.next.next;
    while (b !== a.prev) {
      if (a.i !== b.i && isValidDiagonal(a, b)) {
        let c = splitPolygon(a, b);
        a = filterPoints(a, a.next); c = filterPoints(c, c.next);
        earcutLinked(a, triangles, dim, minX, minY, invSize, 0);
        earcutLinked(c, triangles, dim, minX, minY, invSize, 0);
        return;
      }
      b = b.next;
    }
    a = a.next;
  } while (a !== start);
}
function eliminateHoles(data, holeIndices, outerNode, dim) {
  const queue = [];
  for (let i = 0, len = holeIndices.length; i < len; i++) {
    const start = holeIndices[i] * dim;
    const end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
    const list = linkedList(data, start, end, dim, false);
    if (list === list.next) list.steiner = true;
    queue.push(getLeftmost(list));
  }
  queue.sort((a, b) => a.x - b.x);
  for (let i = 0; i < queue.length; i++) {
    outerNode = eliminateHole(queue[i], outerNode);
  }
  return outerNode;
}
function eliminateHole(hole, outerNode) {
  const bridge = findHoleBridge(hole, outerNode);
  if (!bridge) return outerNode;
  const bridgeReverse = splitPolygon(bridge, hole);
  filterPoints(bridgeReverse, bridgeReverse.next);
  return filterPoints(bridge, bridge.next);
}
function findHoleBridge(hole, outerNode) {
  let p = outerNode, hx = hole.x, hy = hole.y, qx = -Infinity, m;
  do {
    if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
      const x = p.x + (hy - p.y) / (p.next.y - p.y) * (p.next.x - p.x);
      if (x <= hx && x > qx) { qx = x; m = p.x < p.next.x ? p : p.next; if (x === hx) return m; }
    }
    p = p.next;
  } while (p !== outerNode);
  if (!m) return null;
  const stop = m; let tanMin = Infinity, tan;
  p = m;
  do {
    if (hx >= p.x && p.x >= m.x && hx !== p.x && pointInTriangle(hy < m.y ? hx : qx, hy, m.x, m.y, hy >= m.y ? hx : qx, hy, p.x, p.y)) {
      tan = Math.abs(hy - p.y) / (hx - p.x);
      if (locallyInside(p, hole) && (tan < tanMin || (tan === tanMin && (p.x > m.x || sectorContainsSector(m, p))))) { m = p; tanMin = tan; }
    }
    p = p.next;
  } while (p !== stop);
  return m;
}
function sectorContainsSector(m, p) { return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0; }
function indexCurve(start, minX, minY, invSize) {
  let p = start;
  do { if (p.z === 0) p.z = zOrder(p.x, p.y, minX, minY, invSize); p.prevZ = p.prev; p.nextZ = p.next; p = p.next; } while (p !== start);
  p.prevZ.nextZ = null; p.prevZ = null; sortLinked(p);
}
function sortLinked(list) {
  let i, p, q, e, tail, numMerges, pSize, qSize, inSize = 1;
  do {
    p = list; list = null; tail = null; numMerges = 0;
    while (p) {
      numMerges++; q = p; pSize = 0;
      for (i = 0; i < inSize; i++) { pSize++; q = q.nextZ; if (!q) break; }
      qSize = inSize;
      while (pSize > 0 || (qSize > 0 && q)) {
        if (pSize !== 0 && (qSize === 0 || !q || p.z <= q.z)) { e = p; p = p.nextZ; pSize--; } else { e = q; q = q.nextZ; qSize--; }
        if (tail) tail.nextZ = e; else list = e;
        e.prevZ = tail; tail = e;
      }
      p = q;
    }
    tail.nextZ = null; inSize *= 2;
  } while (numMerges > 1);
  return list;
}
function zOrder(x, y, minX, minY, invSize) {
  x = ((x - minX) * invSize) | 0; y = ((y - minY) * invSize) | 0;
  x = (x | (x << 8)) & 0x00FF00FF; x = (x | (x << 4)) & 0x0F0F0F0F; x = (x | (x << 2)) & 0x33333333; x = (x | (x << 1)) & 0x55555555;
  y = (y | (y << 8)) & 0x00FF00FF; y = (y | (y << 4)) & 0x0F0F0F0F; y = (y | (y << 2)) & 0x33333333; y = (y | (y << 1)) & 0x55555555;
  return x | (y << 1);
}
function getLeftmost(start) { let p = start, leftmost = start; do { if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y)) leftmost = p; p = p.next; } while (p !== start); return leftmost; }
function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
  return (cx - px) * (ay - py) >= (ax - px) * (cy - py) && (ax - px) * (by - py) >= (bx - px) * (ay - py) && (bx - px) * (cy - py) >= (cx - px) * (by - py);
}
function isValidDiagonal(a, b) { return a.next.i !== b.i && a.prev.i !== b.i && !intersectsPolygon(a, b) && (locallyInside(a, b) && locallyInside(b, a) && middleInside(a, b) && (area(a.prev, a, b.prev) || area(a, b.prev, b))); }
function area(p, q, r) { return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y); }
function equals(p1, p2) { return p1.x === p2.x && p1.y === p2.y; }
function intersects(p1, q1, p2, q2) {
  const o1 = sign(area(p1, q1, p2)), o2 = sign(area(p1, q1, q2)), o3 = sign(area(p2, q2, p1)), o4 = sign(area(p2, q2, q1));
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(p1, p2, q1)) return true; if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true; if (o4 === 0 && onSegment(p2, q1, q2)) return true;
  return false;
}
function onSegment(p, q, r) { return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) && q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y); }
function sign(num) { return num > 0 ? 1 : num < 0 ? -1 : 0; }
function intersectsPolygon(a, b) { let p = a; do { if (p.i !== a.i && p.next.i !== a.i && p.i !== b.i && p.next.i !== b.i && intersects(p, p.next, a, b)) return true; p = p.next; } while (p !== a); return false; }
function locallyInside(a, b) { return area(a.prev, a, a.next) < 0 ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0 : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0; }
function middleInside(a, b) { let p = a, inside = false; const px = (a.x + b.x) / 2, py = (a.y + b.y) / 2; do { if ((p.y > py) !== (p.next.y > py) && p.next.y !== p.y && (px < (p.next.x - p.x) * (py - p.y) / (p.next.y - p.y) + p.x)) inside = !inside; p = p.next; } while (p !== a); return inside; }
function splitPolygon(a, b) {
  const a2 = newNode(a.i, a.x, a.y), b2 = newNode(b.i, b.x, b.y), an = a.next, bp = b.prev;
  a.next = b; b.prev = a; a2.next = an; an.prev = a2; b2.next = a2; a2.prev = b2; bp.next = b2; b2.prev = bp;
  return b2;
}
function insertNode(i, x, y, last) {
  const p = newNode(i, x, y);
  if (!last) { p.prev = p; p.next = p; } else { p.next = last.next; p.prev = last; last.next.prev = p; last.next = p; }
  return p;
}
function removeNode(p) { p.next.prev = p.prev; p.prev.next = p.next; if (p.prevZ) p.prevZ.nextZ = p.nextZ; if (p.nextZ) p.nextZ.prevZ = p.prevZ; }
function newNode(i, x, y) { return { i, x, y, prev: null, next: null, z: 0, prevZ: null, nextZ: null, steiner: false }; }
function signedArea(data, start, end, dim) { let sum = 0; for (let i = start, j = end - dim; i < end; i += dim) { sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]); j = i; } return sum; }

// Suddividi triangoli 2D (lng/lat) troppo grandi per evitare buchi sulla sfera
function subdivideTri2D(ax, ay, bx, by, cx, cy, maxEdge) {
  const d1 = Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
  const d2 = Math.sqrt((cx - bx) ** 2 + (cy - by) ** 2);
  const d3 = Math.sqrt((ax - cx) ** 2 + (ay - cy) ** 2);
  const maxD = Math.max(d1, d2, d3);
  if (maxD <= maxEdge) {
    return [[ax, ay, bx, by, cx, cy]];
  }
  // Suddividi a metà su ogni lato
  const mx1 = (ax + bx) / 2, my1 = (ay + by) / 2;
  const mx2 = (bx + cx) / 2, my2 = (by + cy) / 2;
  const mx3 = (cx + ax) / 2, my3 = (cy + ay) / 2;
  return [
    ...subdivideTri2D(ax, ay, mx1, my1, mx3, my3, maxEdge),
    ...subdivideTri2D(mx1, my1, bx, by, mx2, my2, maxEdge),
    ...subdivideTri2D(mx3, my3, mx2, my2, cx, cy, maxEdge),
    ...subdivideTri2D(mx1, my1, mx2, my2, mx3, my3, maxEdge),
  ];
}

// Crea mesh per hit-testing con triangolazione ear-clipping + suddivisione sferica
function createCountryHitMesh(feature, radius) {
  const geom = feature.geometry;
  const meshes = [];

  const processPolygon = (polygonCoords) => {
    if (!polygonCoords || polygonCoords.length === 0) return;
    const outerRing = polygonCoords[0];
    if (outerRing.length < 4) return;

    // Flatten per earcut: [lng, lat, lng, lat, ...]
    const flatCoords = [];
    const holeIndices = [];
    
    for (let i = 0; i < outerRing.length - 1; i++) {
      flatCoords.push(outerRing[i][0], outerRing[i][1]);
    }
    
    for (let h = 1; h < polygonCoords.length; h++) {
      const hole = polygonCoords[h];
      holeIndices.push(flatCoords.length / 2);
      for (let i = 0; i < hole.length - 1; i++) {
        flatCoords.push(hole[i][0], hole[i][1]);
      }
    }

    const triIndices = earcut2D(flatCoords, holeIndices.length > 0 ? holeIndices : null, 2);
    if (triIndices.length === 0) return;

    // Suddividi triangoli grandi (max ~5° per lato)
    const MAX_EDGE = 5;
    const allSubTris = [];
    for (let t = 0; t < triIndices.length; t += 3) {
      const i0 = triIndices[t], i1 = triIndices[t + 1], i2 = triIndices[t + 2];
      const ax = flatCoords[i0 * 2], ay = flatCoords[i0 * 2 + 1];
      const bx = flatCoords[i1 * 2], by = flatCoords[i1 * 2 + 1];
      const cx = flatCoords[i2 * 2], cy = flatCoords[i2 * 2 + 1];
      const subs = subdivideTri2D(ax, ay, bx, by, cx, cy, MAX_EDGE);
      allSubTris.push(...subs);
    }

    // Converti in 3D
    const r = radius * 1.003;
    const verts = new Float32Array(allSubTris.length * 3 * 3);
    const indices = [];
    for (let i = 0; i < allSubTris.length; i++) {
      const tri = allSubTris[i];
      for (let j = 0; j < 3; j++) {
        const lng = tri[j * 2];
        const lat = tri[j * 2 + 1];
        const v = latLngToVector3(lat, lng, r);
        const idx = i * 3 + j;
        verts[idx * 3] = v.x;
        verts[idx * 3 + 1] = v.y;
        verts[idx * 3 + 2] = v.z;
      }
      indices.push(i * 3, i * 3 + 1, i * 3 + 2);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    meshes.push(geometry);
  };

  if (geom.type === 'Polygon') {
    processPolygon(geom.coordinates);
  } else if (geom.type === 'MultiPolygon') {
    geom.coordinates.forEach(poly => processPolygon(poly));
  }

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
  const labelSpriteRef = useRef(null);
  const geoDataRef = useRef(null);
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
  const pinchDistRef = useRef(null);
  const sphereRef = useRef(null); // Riferimento alla sfera oceano per hit-test touch

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
    sphereRef.current = sphere;

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

      // Hit-test mesh trasparenti per click/hover
      const hitMat = new THREE.MeshBasicMaterial({
        color: 0x3d80b0,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
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
        rotationVelocity.current.x *= 0.95;
        rotationVelocity.current.y *= 0.95;
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
      globeGroupRef.current.rotation.y += dx * 0.005;
      globeGroupRef.current.rotation.x += dy * 0.005;
      rotationVelocity.current = { x: dx * 0.002, y: dy * 0.002 };
      previousMouse.current = { x: pos.px, y: pos.py };
    }

    // Hover detection (solo quando non si sta trascinando)
    if (!isDragging.current) {
      mouseRef.current.set(pos.x, pos.y);
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(countryMeshesRef.current);
      
      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        hoveredRef.current = mesh;
        setHoveredName(translateCountryName(mesh.userData.countryName));
        container.style.cursor = 'pointer';
      } else {
        hoveredRef.current = null;
        setHoveredName('');
        container.style.cursor = 'grab';
      }
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

      // Rimuovi label 3D precedente
      if (labelSpriteRef.current) {
        globeGroupRef.current.remove(labelSpriteRef.current);
        labelSpriteRef.current.material.map.dispose();
        labelSpriteRef.current.material.dispose();
        labelSpriteRef.current = null;
      }

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
              color: 0xf59e0b,
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

          // Label 3D ancorata al centroide del paese
          const centroid = getFeatureCentroid(feature);
          const labelPos = latLngToVector3(centroid.lat, centroid.lng, 1.06);
          const labelText = translateCountryName(countryName);
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = 1024;
          canvas.height = 256;
          ctx.clearRect(0, 0, 1024, 256);
          // Sfondo pill
          ctx.fillStyle = 'rgba(0,0,0,0.75)';
          ctx.font = 'bold 80px sans-serif';
          const textW = ctx.measureText(labelText).width;
          const pillW = Math.min(textW + 60, 1000);
          const pillH = 110;
          const pillX = (1024 - pillW) / 2;
          const pillY = (256 - pillH) / 2;
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 55);
          ctx.fill();
          // Testo
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, 512, 128);

          const tex = new THREE.CanvasTexture(canvas);
          tex.needsUpdate = true;
          const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
          const sprite = new THREE.Sprite(spriteMat);
          sprite.position.copy(labelPos);
          sprite.scale.set(0.7, 0.18, 1);
          globeGroupRef.current.add(sprite);
          labelSpriteRef.current = sprite;
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

  // Registra i listener touch: il globo cattura ENTRAMBE le direzioni solo se tocchi sulla sfera
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // touchOnGlobe: true se il touchStart ha colpito la sfera, false altrimenti
    const touchState = { onGlobe: false };

    // Raycast per verificare se il punto tocca la sfera del globo
    const isTouchOnGlobe = (touch) => {
      if (!cameraRef.current || !sphereRef.current) return false;
      const rect = container.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((touch.clientX - rect.left) / rect.width) * 2 - 1,
        -((touch.clientY - rect.top) / rect.height) * 2 + 1
      );
      const rc = new THREE.Raycaster();
      rc.setFromCamera(mouse, cameraRef.current);
      const hits = rc.intersectObject(sphereRef.current);
      return hits.length > 0;
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 2) {
        // Pinch zoom — sempre sul globo
        touchState.onGlobe = true;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchDistRef.current = Math.sqrt(dx * dx + dy * dy);
        isDragging.current = false;
      } else if (e.touches.length === 1) {
        pinchDistRef.current = null;
        // Controlla se il dito è sulla sfera
        touchState.onGlobe = isTouchOnGlobe(e.touches[0]);
        if (touchState.onGlobe) {
          handlePointerDown(e);
        }
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
        if (touchState.onGlobe) {
          // Il tocco è partito sul globo → ruota il globo in ENTRAMBE le direzioni, blocca scroll
          e.preventDefault();
          handlePointerMove(e);
        }
        // Se NON sul globo, non fare nulla → lo scroll della pagina procede naturalmente
      }
    };
    const onTouchEnd = (e) => {
      if (e.touches.length < 2) {
        pinchDistRef.current = null;
      }
      if (touchState.onGlobe) {
        handlePointerUp(e);
      }
      if (e.touches.length === 0) {
        touchState.onGlobe = false;
      }
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

    // Rimuovi mesh rialzate
    raisedMeshesRef.current.forEach(rm => {
      if (globeGroupRef.current) globeGroupRef.current.remove(rm);
      rm.geometry.dispose();
      rm.material.dispose();
    });
    raisedMeshesRef.current = [];

    // Rimuovi label 3D
    if (labelSpriteRef.current && globeGroupRef.current) {
      globeGroupRef.current.remove(labelSpriteRef.current);
      labelSpriteRef.current.material.map.dispose();
      labelSpriteRef.current.material.dispose();
      labelSpriteRef.current = null;
    }

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

        {/* Tooltip hover - centrato in alto */}
        {hoveredName && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <span className="bg-black/70 text-white text-xs font-semibold px-3 py-1 rounded-full">{hoveredName}</span>
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