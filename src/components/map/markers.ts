import * as THREE from 'three';
import type { MarkerDef } from './config';

export type MarkerRuntime = {
  page: string;
  label: string;
  pos: THREE.Vector3;
  color: number;
  group: THREE.Group;
  beam: THREE.Mesh;
  chevron: THREE.Mesh;
  groundDisc: THREE.Mesh;
  outerRing: THREE.Mesh;
  glow: THREE.PointLight;
  baseY: number;
};

export const createMarkerPrompt = () => {
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || ('ontouchstart' in window && window.innerWidth < 1024);

  const markerPrompt = document.createElement('div');
  markerPrompt.id = 'marker-prompt';

  const mobileStyles = `
      position: fixed;
      top: 60%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 45;
      padding: 14px 30px;
      border-radius: 16px;
      background: rgba(0,0,0,0.82);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(255,255,255,0.22);
      color: #fff;
      font-family: 'Inter', system-ui, sans-serif;
      font-size: 15px;
      letter-spacing: 0.4px;
      text-align: center;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.25s ease;
      white-space: nowrap;
      max-width: 85vw;
  `;

  const desktopStyles = `
      position: fixed;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%) translateZ(0);
      z-index: 45;
      padding: 14px 32px;
      border-radius: 16px;
      background: rgba(6, 6, 20, 0.78);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border: 1px solid rgba(255,255,255,0.12);
      color: #fff;
      font-family: 'Orbitron', 'Inter', system-ui, sans-serif;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 1.5px;
      text-align: center;
      text-transform: uppercase;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease, transform 0.3s ease;
      white-space: nowrap;
      box-shadow: 0 4px 30px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.06);
  `;

  markerPrompt.style.cssText = isMobile ? mobileStyles : desktopStyles;
  document.body.appendChild(markerPrompt);
  return markerPrompt;
};

export const setMarkerPromptState = (
  markerPrompt: HTMLDivElement,
  marker: MarkerRuntime | null,
  canActivate: boolean,
) => {
  if (!marker || !canActivate) {
    markerPrompt.style.opacity = '0';
    markerPrompt.style.pointerEvents = 'none';
    return;
  }

  const hex = '#' + new THREE.Color(marker.color).getHexString();
  markerPrompt.innerHTML = `<span style="color:${hex}; text-shadow: 0 0 12px ${hex}55;">${marker.label}</span> <span style="opacity:0.5; margin: 0 6px;">—</span> <span style="opacity:0.7; font-size:12px; letter-spacing:2px;">Press <kbd style="padding:2px 8px; border-radius:5px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); font-weight:700; color:#fff; font-size:13px;">E</kbd> or tap</span>`;
  markerPrompt.style.borderColor = `${hex}33`;
  markerPrompt.style.boxShadow = `0 4px 30px rgba(0,0,0,0.5), 0 0 20px ${hex}15, inset 0 0 0 1px ${hex}18`;
  markerPrompt.style.opacity = '1';
  markerPrompt.style.pointerEvents = 'auto';
};

export const createSceneMarkers = (
  scene: THREE.Scene,
  defs: MarkerDef[],
) => {
  const markers: MarkerRuntime[] = [];

  // ── Enhanced marker geometries ──
  const beamGeo = new THREE.CylinderGeometry(1.0, 1.4, 16, 32, 1, true); // thick tapered beam
  const chevronGeo = new THREE.ConeGeometry(1.2, 1.5, 4);                 // large diamond arrow
  const groundDiscGeo = new THREE.RingGeometry(1.2, 2.8, 64);             // wide inner ring
  const outerRingGeo = new THREE.RingGeometry(3.2, 3.8, 64);              // large outer pulsing ring

  for (const def of defs) {
    const col = new THREE.Color(def.color);
    const group = new THREE.Group();
    group.position.set(def.pos[0], def.pos[1], def.pos[2]);

    // ── Tall translucent beam (tapered cylinder, open-ended) ──
    const beamMat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 8.0; // centered higher (spans 0–16)
    group.add(beam);

    // ── Rotating chevron/arrow pointing down at the top ──
    const chevronMat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });
    const chevron = new THREE.Mesh(chevronGeo, chevronMat);
    chevron.rotation.x = Math.PI; // point downwards
    chevron.position.y = 17.0;
    group.add(chevron);

    // ── Inner ground ring ──
    const groundDiscMat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const groundDisc = new THREE.Mesh(groundDiscGeo, groundDiscMat);
    groundDisc.rotation.x = -Math.PI / 2;
    groundDisc.position.y = 0.06;
    group.add(groundDisc);

    // ── Outer pulsing ring ──
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.30,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.04;
    group.add(outerRing);

    // ── Powerful point light for far visibility ──
    const glow = new THREE.PointLight(def.color, 6.0, 30);
    glow.position.y = 6.0;
    group.add(glow);

    scene.add(group);

    markers.push({
      page: def.page,
      label: def.label,
      pos: new THREE.Vector3(def.pos[0], def.pos[1], def.pos[2]),
      color: def.color,
      group,
      beam,
      chevron,
      groundDisc,
      outerRing,
      glow,
      baseY: def.pos[1],
    });
  }

  return { markers, beamGeo, chevronGeo, groundDiscGeo, outerRingGeo };
};
