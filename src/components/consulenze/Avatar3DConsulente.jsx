import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function Avatar3DConsulente({ size = 180 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const w = size;
    const h = size * 1.6; // taller for full body

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, w / h, 0.1, 100);
    camera.position.set(0, 0.9, 6);
    camera.lookAt(0, 0.8, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.1);
    mainLight.position.set(3, 5, 4);
    scene.add(mainLight);
    const fillLight = new THREE.DirectionalLight(0xd4af37, 0.25);
    fillLight.position.set(-3, 2, -2);
    scene.add(fillLight);
    const rimLight = new THREE.PointLight(0x4488cc, 0.3, 10);
    rimLight.position.set(0, 3, -3);
    scene.add(rimLight);

    const character = new THREE.Group();

    // Materials
    const skin = new THREE.MeshStandardMaterial({ color: 0xf0bc98, roughness: 0.5, metalness: 0.02 });
    const suit = new THREE.MeshStandardMaterial({ color: 0x1e3058, roughness: 0.35, metalness: 0.08 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const tieColor = new THREE.MeshStandardMaterial({ color: 0xb22222, roughness: 0.3 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x4a2f1a, roughness: 0.6 });
    const glasses = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.2, metalness: 0.9 });
    const lens = new THREE.MeshStandardMaterial({ color: 0xc8e8ff, roughness: 0.05, transparent: true, opacity: 0.2 });
    const shoe = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.3, metalness: 0.2 });
    const bookCover = new THREE.MeshStandardMaterial({ color: 0x3d1f0a, roughness: 0.5 });
    const bookPages = new THREE.MeshStandardMaterial({ color: 0xfcf5e5, roughness: 0.8 });
    const gavelWood = new THREE.MeshStandardMaterial({ color: 0x8b5e3c, roughness: 0.4, metalness: 0.05 });
    const gavelHead = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.35, metalness: 0.1 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.6 });

    // ═══ HEAD ═══
    const headGeo = new THREE.SphereGeometry(0.38, 24, 24);
    const head = new THREE.Mesh(headGeo, skin);
    head.position.y = 2.05;
    head.scale.set(1, 1.05, 0.93);
    character.add(head);

    // Jaw
    const jawGeo = new THREE.SphereGeometry(0.28, 20, 20);
    const jaw = new THREE.Mesh(jawGeo, skin);
    jaw.position.set(0, 1.82, 0.05);
    jaw.scale.set(0.95, 0.7, 0.85);
    character.add(jaw);

    // Ears
    [-0.36, 0.36].forEach(x => {
      const earGeo = new THREE.SphereGeometry(0.07, 10, 10);
      const ear = new THREE.Mesh(earGeo, skin);
      ear.position.set(x, 2.02, -0.02);
      ear.scale.set(0.6, 1, 0.8);
      character.add(ear);
    });

    // ═══ HAIR ═══
    // Top
    const hairTopGeo = new THREE.SphereGeometry(0.4, 22, 22, 0, Math.PI * 2, 0, Math.PI * 0.48);
    const hairTop = new THREE.Mesh(hairTopGeo, hair);
    hairTop.position.y = 2.12;
    hairTop.scale.set(1.02, 0.8, 0.98);
    character.add(hairTop);

    // Side volume
    const hairSideGeo = new THREE.SphereGeometry(0.41, 18, 18, 0, Math.PI * 2, 0.25, 0.35);
    const hairSideM = new THREE.Mesh(hairSideGeo, hair);
    hairSideM.position.y = 2.12;
    hairSideM.scale.set(1.03, 0.82, 0.96);
    character.add(hairSideM);

    // Swept fringe
    const fringeGeo = new THREE.SphereGeometry(0.18, 14, 14);
    const fringe = new THREE.Mesh(fringeGeo, hair);
    fringe.position.set(0.12, 2.32, 0.22);
    fringe.scale.set(1.6, 0.4, 0.65);
    character.add(fringe);

    // Back hair
    const backHairGeo = new THREE.SphereGeometry(0.36, 18, 18);
    const backHair = new THREE.Mesh(backHairGeo, hair);
    backHair.position.set(0, 2.05, -0.15);
    backHair.scale.set(1.05, 0.95, 0.7);
    character.add(backHair);

    // ═══ EYES ═══
    [-0.12, 0.12].forEach(x => {
      const eyeWGeo = new THREE.SphereGeometry(0.065, 14, 14);
      const eyeW = new THREE.Mesh(eyeWGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
      eyeW.position.set(x, 2.05, 0.32);
      eyeW.scale.set(1, 1.1, 0.6);
      character.add(eyeW);

      const irisGeo = new THREE.SphereGeometry(0.038, 14, 14);
      const iris = new THREE.Mesh(irisGeo, new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.3 }));
      iris.position.set(x, 2.05, 0.36);
      character.add(iris);

      const pupilGeo = new THREE.SphereGeometry(0.02, 12, 12);
      const pupil = new THREE.Mesh(pupilGeo, new THREE.MeshStandardMaterial({ color: 0x0a0a0a }));
      pupil.position.set(x, 2.05, 0.38);
      character.add(pupil);

      // Highlight
      const hlGeo = new THREE.SphereGeometry(0.01, 8, 8);
      const hl = new THREE.Mesh(hlGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9 }));
      hl.position.set(x + 0.018, 2.065, 0.39);
      character.add(hl);

      // Eyebrow
      const browGeo = new THREE.BoxGeometry(0.1, 0.02, 0.03);
      const brow = new THREE.Mesh(browGeo, new THREE.MeshStandardMaterial({ color: 0x3a2515 }));
      brow.position.set(x, 2.14, 0.32);
      brow.rotation.z = x < 0 ? 0.06 : -0.06;
      character.add(brow);
    });

    // ═══ GLASSES ═══
    [-0.12, 0.12].forEach(x => {
      const ringGeo = new THREE.TorusGeometry(0.09, 0.015, 12, 28);
      const ring = new THREE.Mesh(ringGeo, glasses);
      ring.position.set(x, 2.05, 0.33);
      character.add(ring);

      const lGeo = new THREE.CircleGeometry(0.085, 28);
      const l = new THREE.Mesh(lGeo, lens);
      l.position.set(x, 2.05, 0.33);
      character.add(l);
    });
    // Bridge
    const bridgeGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.08, 8);
    const bridgeM = new THREE.Mesh(bridgeGeo, glasses);
    bridgeM.rotation.z = Math.PI / 2;
    bridgeM.position.set(0, 2.07, 0.34);
    character.add(bridgeM);
    // Arms
    [-0.21, 0.21].forEach(x => {
      const armGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.35, 8);
      const arm = new THREE.Mesh(armGeo, glasses);
      arm.rotation.x = Math.PI / 2;
      arm.position.set(x, 2.05, 0.15);
      character.add(arm);
    });

    // ═══ NOSE ═══
    const noseGeo = new THREE.SphereGeometry(0.04, 10, 10);
    const nose = new THREE.Mesh(noseGeo, skin);
    nose.position.set(0, 1.97, 0.36);
    nose.scale.set(0.7, 0.9, 0.8);
    character.add(nose);

    // ═══ MOUTH (smile) ═══
    const smileCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.07, 1.86, 0.33),
      new THREE.Vector3(0, 1.83, 0.36),
      new THREE.Vector3(0.07, 1.86, 0.33)
    );
    const smileGeo = new THREE.TubeGeometry(smileCurve, 12, 0.012, 8, false);
    character.add(new THREE.Mesh(smileGeo, new THREE.MeshStandardMaterial({ color: 0xc0392b })));

    // Beard stubble (subtle dots around chin)
    const stubbleMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.8 });
    for (let i = 0; i < 20; i++) {
      const ang = (i / 20) * Math.PI * 1.2 - Math.PI * 0.6;
      const r = 0.2 + Math.random() * 0.06;
      const dotGeo = new THREE.SphereGeometry(0.008, 4, 4);
      const dot = new THREE.Mesh(dotGeo, stubbleMat);
      dot.position.set(
        Math.sin(ang) * r,
        1.78 - Math.random() * 0.08,
        0.12 + Math.cos(ang) * r * 0.5
      );
      character.add(dot);
    }

    // ═══ NECK ═══
    const neckGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.15, 12);
    const neck = new THREE.Mesh(neckGeo, skin);
    neck.position.y = 1.65;
    character.add(neck);

    // ═══ TORSO ═══
    const torsoGeo = new THREE.CylinderGeometry(0.32, 0.28, 0.7, 14);
    const torso = new THREE.Mesh(torsoGeo, suit);
    torso.position.y = 1.2;
    character.add(torso);

    // Shoulders
    [-0.32, 0.32].forEach(x => {
      const shGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const sh = new THREE.Mesh(shGeo, suit);
      sh.position.set(x, 1.5, 0);
      sh.scale.set(1.2, 0.8, 0.9);
      character.add(sh);
    });

    // Shirt collar V
    const collarGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.08, 12);
    const collarM = new THREE.Mesh(collarGeo, shirt);
    collarM.position.y = 1.58;
    character.add(collarM);

    // Lapels
    [-0.08, 0.08].forEach(x => {
      const lapelGeo = new THREE.BoxGeometry(0.1, 0.2, 0.03);
      const lapel = new THREE.Mesh(lapelGeo, suit);
      lapel.position.set(x, 1.42, 0.24);
      lapel.rotation.z = x < 0 ? 0.18 : -0.18;
      character.add(lapel);
    });

    // Shirt front
    const shirtFrontGeo = new THREE.BoxGeometry(0.1, 0.35, 0.02);
    const shirtFront = new THREE.Mesh(shirtFrontGeo, shirt);
    shirtFront.position.set(0, 1.3, 0.26);
    character.add(shirtFront);

    // Tie
    const tieBodyGeo = new THREE.BoxGeometry(0.06, 0.28, 0.025);
    const tieBody = new THREE.Mesh(tieBodyGeo, tieColor);
    tieBody.position.set(0, 1.25, 0.28);
    character.add(tieBody);
    const tieKnotGeo = new THREE.SphereGeometry(0.032, 8, 8);
    const tieKnot = new THREE.Mesh(tieKnotGeo, tieColor);
    tieKnot.position.set(0, 1.5, 0.28);
    character.add(tieKnot);
    const tieTipGeo = new THREE.ConeGeometry(0.038, 0.07, 4);
    const tieTip = new THREE.Mesh(tieTipGeo, tieColor);
    tieTip.position.set(0, 1.08, 0.28);
    tieTip.rotation.z = Math.PI;
    character.add(tieTip);

    // Pocket square
    const pocketGeo = new THREE.BoxGeometry(0.05, 0.03, 0.02);
    const pocket = new THREE.Mesh(pocketGeo, shirt);
    pocket.position.set(-0.18, 1.4, 0.27);
    character.add(pocket);

    // ═══ BELT AREA ═══
    const beltGeo = new THREE.CylinderGeometry(0.28, 0.27, 0.06, 14);
    const belt = new THREE.Mesh(beltGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.25, metalness: 0.3 }));
    belt.position.y = 0.83;
    character.add(belt);
    // Belt buckle
    const buckleGeo = new THREE.BoxGeometry(0.06, 0.05, 0.02);
    const buckle = new THREE.Mesh(buckleGeo, gold);
    buckle.position.set(0, 0.83, 0.27);
    character.add(buckle);

    // ═══ LEFT ARM (holding book under arm) ═══
    const lUpperGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.35, 10);
    const lUpper = new THREE.Mesh(lUpperGeo, suit);
    lUpper.position.set(-0.38, 1.3, 0.05);
    lUpper.rotation.z = 0.15;
    character.add(lUpper);

    const lForeGeo = new THREE.CylinderGeometry(0.065, 0.06, 0.3, 10);
    const lFore = new THREE.Mesh(lForeGeo, suit);
    lFore.position.set(-0.32, 1.0, 0.18);
    lFore.rotation.z = 0.3;
    lFore.rotation.x = -0.5;
    character.add(lFore);

    // Left hand
    const lHandGeo = new THREE.SphereGeometry(0.06, 10, 10);
    const lHand = new THREE.Mesh(lHandGeo, skin);
    lHand.position.set(-0.27, 0.85, 0.28);
    character.add(lHand);

    // ═══ BOOK (LAW) held under left arm ═══
    const bookGroup = new THREE.Group();
    const bookBodyGeo = new THREE.BoxGeometry(0.22, 0.3, 0.05);
    const bookBody = new THREE.Mesh(bookBodyGeo, bookCover);
    bookGroup.add(bookBody);

    // Book pages (visible on one edge)
    const pagesGeo = new THREE.BoxGeometry(0.2, 0.28, 0.035);
    const pages = new THREE.Mesh(pagesGeo, bookPages);
    pages.position.z = -0.005;
    bookGroup.add(pages);

    // Gold text "LAW" on cover
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 128;
    textCanvas.height = 64;
    const ctx = textCanvas.getContext('2d');
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 36px serif';
    ctx.textAlign = 'center';
    ctx.fillText('LAW', 64, 40);
    const textTexture = new THREE.CanvasTexture(textCanvas);
    const textGeo = new THREE.PlaneGeometry(0.18, 0.09);
    const textMat = new THREE.MeshStandardMaterial({ map: textTexture, transparent: true });
    const textMesh = new THREE.Mesh(textGeo, textMat);
    textMesh.position.set(0, 0.03, 0.027);
    bookGroup.add(textMesh);

    // Scales of justice icon (simplified)
    const scaleCanvas = document.createElement('canvas');
    scaleCanvas.width = 64;
    scaleCanvas.height = 64;
    const sctx = scaleCanvas.getContext('2d');
    sctx.strokeStyle = '#d4af37';
    sctx.lineWidth = 2.5;
    sctx.beginPath();
    sctx.moveTo(32, 10); sctx.lineTo(32, 45);
    sctx.moveTo(16, 20); sctx.lineTo(48, 20);
    sctx.moveTo(16, 20); sctx.lineTo(12, 35); sctx.lineTo(20, 35); sctx.lineTo(16, 20);
    sctx.moveTo(48, 20); sctx.lineTo(44, 35); sctx.lineTo(52, 35); sctx.lineTo(48, 20);
    sctx.moveTo(24, 45); sctx.lineTo(40, 45);
    sctx.stroke();
    const scaleTex = new THREE.CanvasTexture(scaleCanvas);
    const scaleGeo = new THREE.PlaneGeometry(0.1, 0.1);
    const scaleMat = new THREE.MeshStandardMaterial({ map: scaleTex, transparent: true });
    const scaleMesh = new THREE.Mesh(scaleGeo, scaleMat);
    scaleMesh.position.set(0, -0.07, 0.027);
    bookGroup.add(scaleMesh);

    bookGroup.position.set(-0.26, 0.95, 0.2);
    bookGroup.rotation.z = 0.2;
    bookGroup.rotation.y = 0.15;
    character.add(bookGroup);

    // ═══ RIGHT ARM (holding gavel up) ═══
    const rUpperGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.35, 10);
    const rUpper = new THREE.Mesh(rUpperGeo, suit);
    rUpper.position.set(0.4, 1.35, 0.05);
    rUpper.rotation.z = -0.5;
    rUpper.rotation.x = -0.15;
    character.add(rUpper);

    const rForeGeo = new THREE.CylinderGeometry(0.065, 0.06, 0.32, 10);
    const rFore = new THREE.Mesh(rForeGeo, suit);
    rFore.position.set(0.55, 1.55, 0.1);
    rFore.rotation.z = -0.8;
    rFore.rotation.x = -0.1;
    character.add(rFore);

    // Shirt cuff
    const cuffGeo = new THREE.CylinderGeometry(0.062, 0.065, 0.04, 10);
    const cuff = new THREE.Mesh(cuffGeo, shirt);
    cuff.position.set(0.62, 1.68, 0.12);
    cuff.rotation.z = -0.8;
    character.add(cuff);

    // Right hand
    const rHandGeo = new THREE.SphereGeometry(0.06, 10, 10);
    const rHand = new THREE.Mesh(rHandGeo, skin);
    rHand.position.set(0.64, 1.72, 0.13);
    character.add(rHand);

    // ═══ GAVEL ═══
    const gavelGroup = new THREE.Group();
    // Handle
    const handleGeo = new THREE.CylinderGeometry(0.02, 0.018, 0.3, 8);
    const handle = new THREE.Mesh(handleGeo, gavelWood);
    gavelGroup.add(handle);
    // Head
    const gHeadGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.12, 10);
    const gHead = new THREE.Mesh(gHeadGeo, gavelHead);
    gHead.rotation.z = Math.PI / 2;
    gHead.position.y = 0.15;
    gavelGroup.add(gHead);
    // Gold band on head
    const bandGeo = new THREE.CylinderGeometry(0.053, 0.053, 0.015, 10);
    const band = new THREE.Mesh(bandGeo, gold);
    band.rotation.z = Math.PI / 2;
    band.position.y = 0.15;
    gavelGroup.add(band);

    gavelGroup.position.set(0.64, 1.85, 0.13);
    gavelGroup.rotation.z = 0.3;
    gavelGroup.rotation.x = -0.2;
    character.add(gavelGroup);

    // ═══ LEGS ═══
    [-0.12, 0.12].forEach(x => {
      // Upper leg
      const thighGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.4, 10);
      const thigh = new THREE.Mesh(thighGeo, suit);
      thigh.position.set(x, 0.58, 0);
      character.add(thigh);

      // Lower leg
      const shinGeo = new THREE.CylinderGeometry(0.085, 0.075, 0.4, 10);
      const shin = new THREE.Mesh(shinGeo, suit);
      shin.position.set(x, 0.2, 0);
      character.add(shin);

      // Shoe
      const shoeGeo = new THREE.BoxGeometry(0.12, 0.08, 0.22);
      const shoeM = new THREE.Mesh(shoeGeo, shoe);
      shoeM.position.set(x, 0.0, 0.04);
      character.add(shoeM);
      // Shoe toe
      const toeGeo = new THREE.SphereGeometry(0.06, 10, 10);
      const toe = new THREE.Mesh(toeGeo, shoe);
      toe.position.set(x, 0.02, 0.14);
      toe.scale.set(1, 0.6, 1.2);
      character.add(toe);
    });

    // ═══ GROUND SHADOW ═══
    const shadowGeo = new THREE.PlaneGeometry(1.2, 0.8);
    const shadowMat = new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.05;
    character.add(shadow);

    scene.add(character);

    // ═══ ANIMATION — slow rotation ═══
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      character.rotation.y += 0.008; // ~4.7s per giro
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
      style={{ width: size, height: size * 1.6 }}
      className="flex-shrink-0"
    />
  );
}