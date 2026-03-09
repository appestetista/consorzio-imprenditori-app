import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function Avatar3DConsulente({ size = 160 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const w = size;
    const h = size;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
    camera.position.set(0, 1.0, 5.5);
    camera.lookAt(0, 0.7, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(3, 5, 4);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(0xd4af37, 0.3);
    fill.position.set(-3, 2, -2);
    scene.add(fill);
    const rim = new THREE.PointLight(0x6699ff, 0.4, 10);
    rim.position.set(0, 3, -3);
    scene.add(rim);

    const character = new THREE.Group();

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5c5a3, roughness: 0.55, metalness: 0.02 });
    const suitMat = new THREE.MeshStandardMaterial({ color: 0x1b2a4a, roughness: 0.35, metalness: 0.08 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const tieMat = new THREE.MeshStandardMaterial({ color: 0xb22222, roughness: 0.3 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.65 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.2, metalness: 0.9 });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0xc8e8ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.25 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.25, metalness: 0.3 });
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xfcf8ee, roughness: 0.8 });

    // ─── HEAD (large, chibi proportions) ───
    const headGeo = new THREE.SphereGeometry(0.52, 20, 20);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.65;
    head.scale.set(1, 1.08, 0.92);
    character.add(head);

    // Ears
    [-0.48, 0.48].forEach(x => {
      const earGeo = new THREE.SphereGeometry(0.08, 10, 10);
      const ear = new THREE.Mesh(earGeo, skinMat);
      ear.position.set(x, 1.6, 0);
      character.add(ear);
    });

    // ─── HAIR (styled, brown, voluminous top) ───
    // Top hair cap
    const hairTopGeo = new THREE.SphereGeometry(0.54, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const hairTop = new THREE.Mesh(hairTopGeo, hairMat);
    hairTop.position.y = 1.72;
    hairTop.scale.set(1.02, 0.75, 0.98);
    character.add(hairTop);

    // Side hair volume
    const hairSideGeo = new THREE.SphereGeometry(0.55, 16, 16, 0, Math.PI * 2, 0.3, 0.35);
    const hairSide = new THREE.Mesh(hairSideGeo, hairMat);
    hairSide.position.y = 1.72;
    hairSide.scale.set(1.04, 0.8, 0.95);
    character.add(hairSide);

    // Fringe/bangs — swept to side
    const fringeGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const fringe = new THREE.Mesh(fringeGeo, hairMat);
    fringe.position.set(-0.18, 2.0, 0.35);
    fringe.scale.set(1.8, 0.4, 0.7);
    character.add(fringe);

    // ─── EYES (big, expressive) ───
    [-0.16, 0.16].forEach(x => {
      // White
      const eyeWGeo = new THREE.SphereGeometry(0.1, 14, 14);
      const eyeWMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
      const eyeW = new THREE.Mesh(eyeWGeo, eyeWMat);
      eyeW.position.set(x, 1.62, 0.42);
      eyeW.scale.set(1, 1.15, 0.7);
      character.add(eyeW);

      // Iris
      const irisGeo = new THREE.SphereGeometry(0.055, 14, 14);
      const irisMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.3 });
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.set(x, 1.62, 0.48);
      character.add(iris);

      // Pupil
      const pupilGeo = new THREE.SphereGeometry(0.03, 12, 12);
      const pupilMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2 });
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(x, 1.62, 0.5);
      character.add(pupil);

      // Highlight
      const hlGeo = new THREE.SphereGeometry(0.015, 8, 8);
      const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 });
      const hl = new THREE.Mesh(hlGeo, hlMat);
      hl.position.set(x + 0.025, 1.645, 0.52);
      character.add(hl);

      // Eyebrow
      const browGeo = new THREE.BoxGeometry(0.14, 0.025, 0.04);
      const browMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
      const brow = new THREE.Mesh(browGeo, browMat);
      brow.position.set(x, 1.76, 0.42);
      brow.rotation.z = x < 0 ? 0.08 : -0.08;
      character.add(brow);
    });

    // ─── GLASSES (round, like the reference) ───
    [-0.16, 0.16].forEach(x => {
      const ringGeo = new THREE.TorusGeometry(0.13, 0.018, 12, 28);
      const ring = new THREE.Mesh(ringGeo, glassMat);
      ring.position.set(x, 1.62, 0.44);
      character.add(ring);

      const lGeo = new THREE.CircleGeometry(0.12, 28);
      const lens = new THREE.Mesh(lGeo, lensMat);
      lens.position.set(x, 1.62, 0.44);
      character.add(lens);
    });
    // Bridge
    const bridgeGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.12, 8);
    const bridge = new THREE.Mesh(bridgeGeo, glassMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 1.65, 0.46);
    character.add(bridge);
    // Temple arms
    [-0.29, 0.29].forEach(x => {
      const tGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.4, 8);
      const t = new THREE.Mesh(tGeo, glassMat);
      t.rotation.x = Math.PI / 2;
      t.position.set(x, 1.63, 0.25);
      character.add(t);
    });

    // ─── NOSE ───
    const noseGeo = new THREE.SphereGeometry(0.05, 10, 10);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 1.54, 0.47);
    nose.scale.set(0.8, 1, 0.8);
    character.add(nose);

    // ─── SMILE ───
    const smileCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.1, 1.45, 0.44),
      new THREE.Vector3(0, 1.41, 0.47),
      new THREE.Vector3(0.1, 1.45, 0.44)
    );
    const smileGeo = new THREE.TubeGeometry(smileCurve, 14, 0.015, 8, false);
    const smileMat = new THREE.MeshStandardMaterial({ color: 0xc0392b });
    character.add(new THREE.Mesh(smileGeo, smileMat));

    // ─── BODY (shorter, rounder — chibi style) ───
    const torsoGeo = new THREE.CylinderGeometry(0.38, 0.32, 0.65, 14);
    const torso = new THREE.Mesh(torsoGeo, suitMat);
    torso.position.y = 0.78;
    character.add(torso);

    // Shirt collar
    const collarGeo = new THREE.CylinderGeometry(0.22, 0.25, 0.12, 14);
    const collar = new THREE.Mesh(collarGeo, shirtMat);
    collar.position.y = 1.15;
    character.add(collar);

    // Suit lapels (V shape)
    [-0.1, 0.1].forEach(x => {
      const lapelGeo = new THREE.BoxGeometry(0.12, 0.25, 0.04);
      const lapel = new THREE.Mesh(lapelGeo, suitMat);
      lapel.position.set(x, 0.98, 0.3);
      lapel.rotation.z = x < 0 ? 0.2 : -0.2;
      character.add(lapel);
    });

    // Tie
    const tieGeo = new THREE.BoxGeometry(0.07, 0.3, 0.04);
    const tie = new THREE.Mesh(tieGeo, tieMat);
    tie.position.set(0, 0.9, 0.33);
    character.add(tie);
    const tieKnotGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const tieKnot = new THREE.Mesh(tieKnotGeo, tieMat);
    tieKnot.position.set(0, 1.07, 0.33);
    character.add(tieKnot);
    // Tie tip (triangle)
    const tieTipGeo = new THREE.ConeGeometry(0.045, 0.08, 4);
    const tieTip = new THREE.Mesh(tieTipGeo, tieMat);
    tieTip.position.set(0, 0.72, 0.33);
    tieTip.rotation.z = Math.PI;
    character.add(tieTip);

    // ─── ARMS ───
    // Left arm (slightly out, near books)
    const lArmGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.5, 8);
    const lArm = new THREE.Mesh(lArmGeo, suitMat);
    lArm.position.set(-0.48, 0.7, 0);
    lArm.rotation.z = 0.2;
    character.add(lArm);
    const lHandGeo = new THREE.SphereGeometry(0.08, 10, 10);
    const lHand = new THREE.Mesh(lHandGeo, skinMat);
    lHand.position.set(-0.55, 0.42, 0.05);
    character.add(lHand);

    // Right arm (holding papers up)
    const rArmUpperGeo = new THREE.CylinderGeometry(0.09, 0.085, 0.35, 8);
    const rArmUpper = new THREE.Mesh(rArmUpperGeo, suitMat);
    rArmUpper.position.set(0.48, 0.8, 0.08);
    rArmUpper.rotation.z = -0.35;
    character.add(rArmUpper);
    const rArmLowerGeo = new THREE.CylinderGeometry(0.08, 0.075, 0.3, 8);
    const rArmLower = new THREE.Mesh(rArmLowerGeo, suitMat);
    rArmLower.position.set(0.58, 0.55, 0.2);
    rArmLower.rotation.z = -0.5;
    rArmLower.rotation.x = -0.3;
    character.add(rArmLower);
    const rHandGeo = new THREE.SphereGeometry(0.08, 10, 10);
    const rHand = new THREE.Mesh(rHandGeo, skinMat);
    rHand.position.set(0.64, 0.42, 0.25);
    character.add(rHand);

    // Papers / documents in right hand
    for (let i = 0; i < 3; i++) {
      const pGeo = new THREE.BoxGeometry(0.24, 0.32, 0.006);
      const p = new THREE.Mesh(pGeo, paperMat);
      p.position.set(0.64, 0.55 + i * 0.008, 0.26 + i * 0.012);
      p.rotation.z = -0.08 + i * 0.025;
      p.rotation.y = 0.15;
      character.add(p);
    }
    // Lines on paper
    const linesMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    for (let j = 0; j < 4; j++) {
      const lineGeo = new THREE.BoxGeometry(0.15, 0.005, 0.003);
      const line = new THREE.Mesh(lineGeo, linesMat);
      line.position.set(0.64, 0.63 - j * 0.05, 0.3);
      line.rotation.z = -0.08;
      line.rotation.y = 0.15;
      character.add(line);
    }

    // ─── LEGS (short, chibi) ───
    [-0.13, 0.13].forEach(x => {
      const legGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.35, 10);
      const leg = new THREE.Mesh(legGeo, suitMat);
      leg.position.set(x, 0.27, 0);
      character.add(leg);

      const shoeGeo = new THREE.SphereGeometry(0.1, 10, 10);
      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.position.set(x, 0.08, 0.04);
      shoe.scale.set(0.9, 0.55, 1.3);
      character.add(shoe);
    });

    // ─── BOOK STACK (tall, colorful, left side) ───
    const bookStack = new THREE.Group();
    const bookColors = [0xc0392b, 0x2980b9, 0x27ae60, 0xd4af37, 0x8e44ad, 0xe67e22, 0x1abc9c];
    const bookHeights = [0.09, 0.07, 0.1, 0.065, 0.08, 0.075, 0.09, 0.06];
    let stackY = 0;
    bookHeights.forEach((bh, i) => {
      const bw = 0.28 + (Math.sin(i * 1.3) * 0.04);
      const bd = 0.36 + (Math.cos(i * 0.9) * 0.03);
      const bGeo = new THREE.BoxGeometry(bw, bh, bd);
      const bMat = new THREE.MeshStandardMaterial({ 
        color: bookColors[i % bookColors.length], 
        roughness: 0.45, 
        metalness: 0.05 
      });
      const book = new THREE.Mesh(bGeo, bMat);
      book.position.y = stackY + bh / 2;
      book.rotation.y = (Math.sin(i * 2.1) * 0.06);
      bookStack.add(book);

      // Book spine detail (thin lighter line)
      const spineGeo = new THREE.BoxGeometry(bw * 0.85, 0.005, 0.01);
      const spineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 });
      const spine = new THREE.Mesh(spineGeo, spineMat);
      spine.position.set(0, stackY + bh / 2, bd / 2 + 0.005);
      spine.rotation.y = (Math.sin(i * 2.1) * 0.06);
      bookStack.add(spine);

      stackY += bh;
    });
    bookStack.position.set(-0.7, 0, 0);
    character.add(bookStack);

    // ─── SUBTLE GROUND SHADOW ───
    const shadowGeo = new THREE.PlaneGeometry(2, 1.2);
    const shadowMat = new THREE.MeshStandardMaterial({ 
      color: 0x000000, transparent: true, opacity: 0.15, 
      side: THREE.DoubleSide 
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.01;
    character.add(shadow);

    // Position character slightly left to balance with books
    character.position.x = 0.15;

    scene.add(character);

    // Gentle idle animation (breathing/bobbing) — no rotation
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = Date.now() * 0.001;
      // Subtle breathing bob
      character.position.y = Math.sin(t * 1.5) * 0.015;
      // Very subtle head tilt
      if (head) {
        head.rotation.z = Math.sin(t * 0.8) * 0.02;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [size]);

  return (
    <div 
      ref={mountRef} 
      style={{ width: size, height: size }} 
      className="flex-shrink-0"
    />
  );
}