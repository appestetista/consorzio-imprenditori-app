import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function Avatar3DConsulente({ size = 160 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const w = size;
    const h = size;

    // Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
    camera.position.set(0, 1.2, 4.5);
    camera.lookAt(0, 0.8, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(3, 5, 4);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xd4af37, 0.4);
    rimLight.position.set(-3, 2, -3);
    scene.add(rimLight);

    // Character group
    const character = new THREE.Group();

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5c5a3, roughness: 0.6, metalness: 0.05 });
    const suitMat = new THREE.MeshStandardMaterial({ color: 0x1a2744, roughness: 0.4, metalness: 0.1 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const tieMat = new THREE.MeshStandardMaterial({ color: 0xc9302c, roughness: 0.3, metalness: 0.1 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.7 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.2, metalness: 0.8 });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0xaaddff, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.3 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.3, metalness: 0.2 });
    const bookMat1 = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });
    const bookMat2 = new THREE.MeshStandardMaterial({ color: 0x2980b9, roughness: 0.5 });
    const bookMat3 = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.5 });
    const bookMat4 = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.3 });
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xfaf8f0, roughness: 0.8 });

    // === BODY (torso) ===
    const torsoGeo = new THREE.CylinderGeometry(0.35, 0.3, 0.8, 12);
    const torso = new THREE.Mesh(torsoGeo, suitMat);
    torso.position.y = 0.7;
    character.add(torso);

    // Shirt collar visible
    const shirtGeo = new THREE.CylinderGeometry(0.2, 0.22, 0.15, 12);
    const shirt = new THREE.Mesh(shirtGeo, shirtMat);
    shirt.position.y = 1.15;
    character.add(shirt);

    // Tie
    const tieGeo = new THREE.BoxGeometry(0.06, 0.35, 0.04);
    const tie = new THREE.Mesh(tieGeo, tieMat);
    tie.position.set(0, 0.85, 0.3);
    character.add(tie);

    // Tie knot
    const tieKnotGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const tieKnot = new THREE.Mesh(tieKnotGeo, tieMat);
    tieKnot.position.set(0, 1.03, 0.3);
    character.add(tieKnot);

    // === HEAD ===
    const headGeo = new THREE.SphereGeometry(0.38, 16, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.55;
    head.scale.set(1, 1.1, 0.95);
    character.add(head);

    // Hair — top
    const hairTopGeo = new THREE.SphereGeometry(0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const hairTop = new THREE.Mesh(hairTopGeo, hairMat);
    hairTop.position.y = 1.6;
    hairTop.scale.set(1, 0.7, 0.95);
    character.add(hairTop);

    // Hair — sides
    const hairSideGeo = new THREE.BoxGeometry(0.82, 0.15, 0.7);
    const hairSide = new THREE.Mesh(hairSideGeo, hairMat);
    hairSide.position.y = 1.7;
    character.add(hairSide);

    // === EYES ===
    const eyeWhiteGeo = new THREE.SphereGeometry(0.07, 12, 12);
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const eyePupilGeo = new THREE.SphereGeometry(0.035, 12, 12);
    const eyePupilMat = new THREE.MeshStandardMaterial({ color: 0x2c1810, roughness: 0.3 });

    [-0.12, 0.12].forEach(x => {
      const eyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
      eyeWhite.position.set(x, 1.55, 0.33);
      character.add(eyeWhite);

      const pupil = new THREE.Mesh(eyePupilGeo, eyePupilMat);
      pupil.position.set(x, 1.55, 0.39);
      character.add(pupil);

      // Pupil highlight
      const highlightGeo = new THREE.SphereGeometry(0.012, 8, 8);
      const highlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 });
      const highlight = new THREE.Mesh(highlightGeo, highlightMat);
      highlight.position.set(x + 0.02, 1.565, 0.41);
      character.add(highlight);
    });

    // === GLASSES ===
    [-0.12, 0.12].forEach(x => {
      const glassRingGeo = new THREE.TorusGeometry(0.1, 0.015, 12, 24);
      const glassRing = new THREE.Mesh(glassRingGeo, glassMat);
      glassRing.position.set(x, 1.55, 0.35);
      character.add(glassRing);

      const lensGeo = new THREE.CircleGeometry(0.09, 24);
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.position.set(x, 1.55, 0.35);
      character.add(lens);
    });

    // Bridge
    const bridgeGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8);
    const bridge = new THREE.Mesh(bridgeGeo, glassMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 1.57, 0.36);
    character.add(bridge);

    // Temples (arms of glasses)
    [-0.22, 0.22].forEach(x => {
      const templeGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.35, 8);
      const temple = new THREE.Mesh(templeGeo, glassMat);
      temple.rotation.x = Math.PI / 2;
      temple.position.set(x, 1.56, 0.2);
      character.add(temple);
    });

    // === SMILE ===
    const smileCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.08, 1.42, 0.36),
      new THREE.Vector3(0, 1.39, 0.38),
      new THREE.Vector3(0.08, 1.42, 0.36)
    );
    const smileGeo = new THREE.TubeGeometry(smileCurve, 12, 0.012, 8, false);
    const smileMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });
    const smile = new THREE.Mesh(smileGeo, smileMat);
    character.add(smile);

    // Nose
    const noseGeo = new THREE.SphereGeometry(0.04, 8, 8);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 1.49, 0.37);
    nose.scale.set(1, 1.2, 1);
    character.add(nose);

    // === ARMS ===
    // Left arm (holding books)
    const leftArmGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.6, 8);
    const leftArm = new THREE.Mesh(leftArmGeo, suitMat);
    leftArm.position.set(-0.45, 0.65, 0);
    leftArm.rotation.z = 0.15;
    character.add(leftArm);

    // Left hand
    const leftHandGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const leftHand = new THREE.Mesh(leftHandGeo, skinMat);
    leftHand.position.set(-0.5, 0.35, 0.05);
    character.add(leftHand);

    // Right arm (holding papers)
    const rightArmGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.55, 8);
    const rightArm = new THREE.Mesh(rightArmGeo, suitMat);
    rightArm.position.set(0.45, 0.7, 0.1);
    rightArm.rotation.z = -0.3;
    rightArm.rotation.x = -0.2;
    character.add(rightArm);

    // Right hand
    const rightHandGeo = new THREE.SphereGeometry(0.07, 8, 8);
    const rightHand = new THREE.Mesh(rightHandGeo, skinMat);
    rightHand.position.set(0.55, 0.45, 0.18);
    character.add(rightHand);

    // Papers in right hand
    for (let i = 0; i < 3; i++) {
      const paperGeo = new THREE.BoxGeometry(0.22, 0.3, 0.008);
      const paper = new THREE.Mesh(paperGeo, paperMat);
      paper.position.set(0.55, 0.5 + i * 0.01, 0.2 + i * 0.015);
      paper.rotation.z = -0.1 + i * 0.03;
      paper.rotation.y = 0.1;
      character.add(paper);
    }

    // === LEGS ===
    [-0.12, 0.12].forEach(x => {
      const legGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.5, 8);
      const leg = new THREE.Mesh(legGeo, suitMat);
      leg.position.set(x, 0.15, 0);
      character.add(leg);

      // Shoes
      const shoeGeo = new THREE.BoxGeometry(0.12, 0.06, 0.2);
      const shoe = new THREE.Mesh(shoeGeo, shoeMat);
      shoe.position.set(x, -0.08, 0.04);
      character.add(shoe);
    });

    // === BOOK STACK (left side) ===
    const bookStack = new THREE.Group();
    const bookMats = [bookMat1, bookMat2, bookMat3, bookMat4, bookMat2, bookMat1];
    const bookHeights = [0.08, 0.06, 0.09, 0.07, 0.065, 0.08];
    let stackY = -0.08;
    bookHeights.forEach((bh, i) => {
      const bGeo = new THREE.BoxGeometry(0.25 + Math.random() * 0.06, bh, 0.32 + Math.random() * 0.04);
      const book = new THREE.Mesh(bGeo, bookMats[i % bookMats.length]);
      book.position.y = stackY + bh / 2;
      book.rotation.y = (Math.random() - 0.5) * 0.08;
      bookStack.add(book);
      stackY += bh;
    });
    bookStack.position.set(-0.6, 0, 0);
    character.add(bookStack);

    // === PLATFORM (subtle) ===
    const platformGeo = new THREE.CylinderGeometry(0.8, 0.85, 0.05, 24);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x0d1b2a, roughness: 0.7, metalness: 0.3 });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.12;
    character.add(platform);

    scene.add(character);

    // Animation
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      character.rotation.y += 0.008;
      // Gentle bobbing
      character.position.y = Math.sin(Date.now() * 0.002) * 0.02;
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