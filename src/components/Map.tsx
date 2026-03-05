import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createMovementKeys, updateMovementKey } from './map/input';
import { createMarkerPrompt, createSceneMarkers, setMarkerPromptState } from './map/markers';
import { enableMeshShadows, fixMapMaterials, loadGLB, applyEmissionTweaks, type LoadedGLTF } from './map/loading';
import { applyAtmosphereFog, createFloatingDust } from './map/atmosphere';
import { createNeonGridMaterial } from './map/neon';
import {
  createCharacterAura,
  createEnhancementState,
  registerModelEnhancements,
  setupCinematicLights,
  updateModelEnhancements,
} from './map/sceneEnhancements';
import {
  qualityProfileFor,
  type QualityProfile,
} from './map/quality';
import {
  BOUNDARY_RADIUS,
  CAM_DIST_DEFAULT,
  CAM_DIST_MAX,
  CAM_DIST_MIN,
  CAM_MAX_RADIUS,
  CAM_PITCH_MAX,
  CAM_PITCH_MIN,
  CAM_SMOOTH,
  GROUND_Y,
  MARKER_ACTIVATE_RADIUS,
  MARKER_DEFS,
  MARKER_INTERACT_RADIUS,
  RUN_SPEED,
  SPRINT_THRESHOLD,
  STATE_COLORS,
  STATE_IDLE,
  STATE_NAMES,
  STATE_RUN,
  STATE_WALK,
  TURN_SPEED,
  WALK_SPEED,
} from './map/config';

interface MapProps {
  onNavigate?: (page: string) => void;
  onClose?: () => void;
  activePage?: string | null;
}

export default function Map({ onNavigate, onClose, activePage }: MapProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onNavigateRef = useRef<MapProps['onNavigate']>(onNavigate);
  const onCloseRef = useRef<MapProps['onClose']>(onClose);
  const activePageRef = useRef<MapProps['activePage']>(activePage);

  useEffect(() => { onNavigateRef.current = onNavigate; }, [onNavigate]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { activePageRef.current = activePage; }, [activePage]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;
    const isDev = import.meta.env.DEV;
    const logDev = (...args: unknown[]) => { if (isDev) console.log(...args); };

    // ── UI DOM REFS ───────────────────────────────────────────────────────────
    const stateEl      = document.getElementById('state')         as HTMLElement | null;
    const joystickZone = document.getElementById('joystick-zone') as HTMLElement | null;
    const joystickBase = document.getElementById('joystick-base') as HTMLElement | null;
    const joystickKnob = document.getElementById('joystick-knob') as HTMLElement | null;
    const hudEl        = document.getElementById('hud')           as HTMLElement | null;

    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const showUI = () => {
      if (stateEl) stateEl.style.display = 'block';
      if (hudEl) hudEl.style.display = 'flex';
      if (isTouch && joystickZone) joystickZone.style.display = 'flex';
    };

    let isIntroActive    = false;
    let introStartTime   = 0;
    let introInitialized = false;
    const INTRO_DURATION = 4.5;

    const startIntro = () => {
      isIntroActive    = true;
      introInitialized = false;
      if (stateEl)      stateEl.style.display      = 'none';
      if (hudEl)        hudEl.style.display         = 'none';
      if (joystickZone) joystickZone.style.display  = 'none';
    };
    window.addEventListener('start-experience', startIntro);

    // ── RENDERER ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    let qualityProfile = qualityProfileFor('HIGH');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualityProfile.pixelRatioCap));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(new THREE.Color(0x020205), 1);
    renderer.shadowMap.enabled   = qualityProfile.enableDynamicLights;
    renderer.shadowMap.type      = THREE.PCFShadowMap;
    renderer.outputColorSpace    = THREE.SRGBColorSpace;
    renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;

    const canvas = renderer.domElement;
    canvas.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 2; touch-action: none; display: block;
    `;
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    container.appendChild(canvas);

    // ── SCENE + CAMERA ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1328);
    applyAtmosphereFog(scene, 0.0062);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.05, 300);

    type PostFxRuntime = {
      composer: { render: () => void; setSize: (w: number, h: number) => void };
      setSize: (w: number, h: number) => void;
      setBloomEnabled: (enabled: boolean) => void;
      setBloomStrength: (value: number) => void;
    };
    let postFxRuntime: PostFxRuntime | null = null;

    let camYaw   = Math.PI;
    let camPitch = 0.1;
    let camDist  = CAM_DIST_DEFAULT;
    const camCurrent = new THREE.Vector3(0, 4, camDist);

    const clampCamDist = (v: number) => Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, v));

    // ── LIGHTS ────────────────────────────────────────────────────────────────
    setupCinematicLights(scene, qualityProfile);

    // ── FLOATING DUST ─────────────────────────────────────────────────────────
    const dustCount    = Math.max(48, Math.floor(180 * qualityProfile.particleCountScale));
    const floatingDust = createFloatingDust(scene, dustCount);
    floatingDust.points.visible = qualityProfile.enableParticles;

    const enhancementState = createEnhancementState();
    const characterAura    = createCharacterAura(scene);

    // ── MYSTICAL EMBERS ───────────────────────────────────────────────────────
    // Reduced from 400 → 220 to cut per-frame typed-array work nearly in half
    const EMBER_COUNT = Math.max(1, Math.floor(220 * qualityProfile.particleCountScale));

    const ePos  = new Float32Array(EMBER_COUNT * 3);
    const eVel  = new Float32Array(EMBER_COUNT * 3);
    const eCol  = new Float32Array(EMBER_COUNT * 3);
    const eBase = new Float32Array(EMBER_COUNT * 3);
    const eSz   = new Float32Array(EMBER_COUNT);
    const eLife = new Float32Array(EMBER_COUNT);
    const eMax  = new Float32Array(EMBER_COUNT);

    const PALETTE = [
      new THREE.Color(0x0077ff),
      new THREE.Color(0x00e5ff),
      new THREE.Color(0x00ccaa),
      new THREE.Color(0x8844ff),
      new THREE.Color(0xff0099),
      new THREE.Color(0xff44cc),
      new THREE.Color(0xff6644),
      new THREE.Color(0xffffff),
      new THREE.Color(0xaaddff),
    ];

    const resetEmber = (i: number, scatterStart = false) => {
      const angle  = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * 44;
      ePos[i * 3]     = Math.cos(angle) * radius;
      ePos[i * 3 + 1] = scatterStart ? Math.random() * 8 : 0.05 + Math.random() * 0.3;
      ePos[i * 3 + 2] = Math.sin(angle) * radius;

      eVel[i * 3]     = (Math.random() - 0.5) * 0.18;
      eVel[i * 3 + 1] = 0.18 + Math.random() * 0.52;
      eVel[i * 3 + 2] = (Math.random() - 0.5) * 0.18;

      eMax[i]  = 7.0 + Math.random() * 9.0;
      eLife[i] = scatterStart ? Math.random() * eMax[i] : 0;
      eSz[i]   = 0.06 + Math.random() * 0.22;

      const c = PALETTE[Math.floor(Math.random() * PALETTE.length)].clone();
      c.multiplyScalar(0.75 + Math.random() * 0.5);
      eBase[i * 3]     = c.r;
      eBase[i * 3 + 1] = c.g;
      eBase[i * 3 + 2] = c.b;
      eCol[i * 3]      = c.r;
      eCol[i * 3 + 1]  = c.g;
      eCol[i * 3 + 2]  = c.b;
    };

    for (let i = 0; i < EMBER_COUNT; i++) resetEmber(i, true);

    const emberGeo     = new THREE.BufferGeometry();
    const emberPosAttr = new THREE.BufferAttribute(ePos, 3);
    const emberColAttr = new THREE.BufferAttribute(eCol, 3);
    const emberSzAttr  = new THREE.BufferAttribute(eSz, 1);
    emberGeo.setAttribute('position', emberPosAttr);
    emberGeo.setAttribute('color',    emberColAttr);
    emberGeo.setAttribute('size',     emberSzAttr);

    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = spriteCanvas.height = 64;
    const sCtx = spriteCanvas.getContext('2d')!;
    const grd  = sCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0,    'rgba(220,240,255,1.0)');
    grd.addColorStop(0.15, 'rgba(80,200,255,0.95)');
    grd.addColorStop(0.38, 'rgba(40,100,255,0.55)');
    grd.addColorStop(0.60, 'rgba(120,60,255,0.20)');
    grd.addColorStop(0.82, 'rgba(0,20,80,0.06)');
    grd.addColorStop(1,    'rgba(0,0,0,0)');
    sCtx.fillStyle = grd;
    sCtx.fillRect(0, 0, 64, 64);
    const spriteTex = new THREE.CanvasTexture(spriteCanvas);

    const emberMat = new THREE.PointsMaterial({
      size: 0.5,
      map: spriteTex,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const emberPoints = new THREE.Points(emberGeo, emberMat);
    emberPoints.renderOrder = 1;
    scene.add(emberPoints);

    // ── INTERACTIVE 3D MARKERS ────────────────────────────────────────────────
    const markerPrompt = createMarkerPrompt();
    const { markers, beamGeo, chevronGeo, groundDiscGeo } = createSceneMarkers(scene, MARKER_DEFS);
    let activeMarkerIdx = -1;

    const onMarkerActivate = () => {
      if (activeMarkerIdx < 0) return;
      const m  = markers[activeMarkerIdx];
      const dx = charPos.x - m.pos.x;
      const dz = charPos.z - m.pos.z;
      if (Math.sqrt(dx * dx + dz * dz) <= MARKER_ACTIVATE_RADIUS) {
        onNavigateRef.current?.(m.page);
      }
    };

    const onMarkerKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E') {
        if (activePageRef.current) onCloseRef.current?.();
        else onMarkerActivate();
      }
    };
    window.addEventListener('keydown', onMarkerKeyDown);

    const onMarkerTap = () => { if (activeMarkerIdx >= 0) onMarkerActivate(); };
    markerPrompt.style.pointerEvents = 'auto';
    markerPrompt.addEventListener('click', onMarkerTap);

    // ── NEON GRID FLOOR ───────────────────────────────────────────────────────
    const surfaceGeo    = new THREE.PlaneGeometry(300, 300, 1, 1);
    const shaderGridMat = createNeonGridMaterial();
    const basicGridMat  = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x37215f) });
    let gridUsesShader  = qualityProfile.enableShaderGrid;
    let surfaceMat: THREE.Material = gridUsesShader ? shaderGridMat : basicGridMat;

    const neonSurface = new THREE.Mesh(surfaceGeo, surfaceMat);
    neonSurface.rotation.x   = -Math.PI / 2;
    neonSurface.position.y   = GROUND_Y + 0.01;
    neonSurface.receiveShadow = false;
    scene.add(neonSurface);

    const applyQualityProfile = (nextProfile: QualityProfile) => {
      qualityProfile = nextProfile;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, qualityProfile.pixelRatioCap));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled     = qualityProfile.enableDynamicLights;
      renderer.shadowMap.needsUpdate = true;
      renderer.toneMappingExposure   = 1.24;
      applyAtmosphereFog(scene, 0.0062);

      const shouldUseShader = qualityProfile.enableShaderGrid;
      if (shouldUseShader !== gridUsesShader) {
        gridUsesShader       = shouldUseShader;
        surfaceMat           = gridUsesShader ? shaderGridMat : basicGridMat;
        neonSurface.material = surfaceMat;
      }

      emberPoints.visible         = qualityProfile.enableParticles;
      ssObj.visible               = qualityProfile.enableParticles;
      floatingDust.points.visible = qualityProfile.enableParticles;

      if (postFxRuntime) {
        postFxRuntime.setBloomEnabled(qualityProfile.enableBloom);
        postFxRuntime.setBloomStrength(qualityProfile.bloomStrength);
      }
    };

    // ── STARS (SKY) ───────────────────────────────────────────────────────────
    const STARS_COUNT = 3000;
    const sPos     = new Float32Array(STARS_COUNT * 3);
    const sBaseCol = new Float32Array(STARS_COUNT * 3);
    const sPhase   = new Float32Array(STARS_COUNT);
    const sSz      = new Float32Array(STARS_COUNT);

    for (let i = 0; i < STARS_COUNT; i++) {
      const radius = 120 + Math.random() * 80;
      const theta  = 2 * Math.PI * Math.random();
      const phi    = Math.acos(Math.random());

      sPos[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
      sPos[i * 3 + 1] = radius * Math.cos(phi) - 10;
      sPos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      const intensity = 0.5 + Math.random() * 0.5;
      const colorType = Math.random();
      const c = new THREE.Color(0xffffff);
      if      (colorType > 0.8) c.setHex(0xaaaaFF);
      else if (colorType > 0.6) c.setHex(0xffddaa);

      sBaseCol[i * 3]     = c.r * intensity;
      sBaseCol[i * 3 + 1] = c.g * intensity;
      sBaseCol[i * 3 + 2] = c.b * intensity;

      sPhase[i] = Math.random() * Math.PI * 2;
      sSz[i]    = 2.0 + Math.random() * 4.0;
    }

    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    starsGeo.setAttribute('color',    new THREE.BufferAttribute(sBaseCol, 3));
    starsGeo.setAttribute('phase',    new THREE.BufferAttribute(sPhase, 1));
    starsGeo.setAttribute('size',     new THREE.BufferAttribute(sSz, 1));

    const starCanvas = document.createElement('canvas');
    starCanvas.width = starCanvas.height = 32;
    const starCtx = starCanvas.getContext('2d')!;
    const starGrd = starCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
    starGrd.addColorStop(0,   'rgba(255,255,255,1)');
    starGrd.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    starGrd.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    starGrd.addColorStop(1,   'rgba(255,255,255,0)');
    starCtx.fillStyle = starGrd;
    starCtx.fillRect(0, 0, 32, 32);
    const starTex = new THREE.CanvasTexture(starCanvas);

    const starsMat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, starTexture: { value: starTex } },
      vertexShader: `
        attribute float phase; attribute float size; attribute vec3 color;
        varying vec3 vColor; varying float vAlpha; uniform float time;
        void main() {
          vColor = color;
          vAlpha = 0.5 + 0.5 * sin(time * 2.0 + phase);
          if (fract(phase * 12.3) > 0.9)
            vAlpha *= 0.5 + 0.5 * sin(time * 15.0 + phase * 100.0);
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z) * (0.5 + vAlpha * 0.5);
          gl_Position  = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D starTexture; varying vec3 vColor; varying float vAlpha;
        void main() {
          vec4 texColor = texture2D(starTexture, gl_PointCoord);
          gl_FragColor  = vec4(vColor * vAlpha * texColor.rgb, texColor.a * vAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
    });

    const starsObj = new THREE.Points(starsGeo, starsMat);
    starsObj.renderOrder = -1;
    scene.add(starsObj);

    // ── SHOOTING STARS ────────────────────────────────────────────────────────
    const ssGeo = new THREE.BufferGeometry();
    const MAX_SHOOTING_STARS = 15;
    const ssPos = new Float32Array(MAX_SHOOTING_STARS * 6);
    const ssCol = new Float32Array(MAX_SHOOTING_STARS * 6);

    for (let i = 0; i < MAX_SHOOTING_STARS * 6; i++) {
      ssPos[i] = 0;
      if (i % 3 === 1) ssPos[i] = -1000;
    }

    type SSData = {
      active: boolean; pos: THREE.Vector3; dir: THREE.Vector3;
      speed: number; length: number; age: number; maxAge: number;
    };
    const ssData: SSData[] = Array.from({ length: MAX_SHOOTING_STARS }, () => ({
      active: false, pos: new THREE.Vector3(), dir: new THREE.Vector3(),
      speed: 0, length: 0, age: 0, maxAge: 0,
    }));

    ssGeo.setAttribute('position', new THREE.BufferAttribute(ssPos, 3));
    ssGeo.setAttribute('color',    new THREE.BufferAttribute(ssCol, 3));

    const ssMat = new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, linewidth: 2,
    });
    const ssObj = new THREE.LineSegments(ssGeo, ssMat);
    ssObj.renderOrder = -1;
    scene.add(ssObj);

    const resetShootingStar = (index: number) => {
      const d     = ssData[index];
      d.active    = true;
      const r     = 120 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI * 0.25 + 0.05;
      d.pos.set(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
      d.dir.set((Math.random() - 0.5) * 2, -Math.random() * 0.2 - 0.05, (Math.random() - 0.5) * 2).normalize();
      d.speed  = 150 + Math.random() * 100;
      d.length = 15  + Math.random() * 25;
      d.age    = 0;
      d.maxAge = 0.5 + Math.random() * 0.8;
      const i3 = index * 6;
      ssCol[i3] = 1; ssCol[i3+1] = 1; ssCol[i3+2] = 1;
      ssCol[i3+3] = 0; ssCol[i3+4] = 0; ssCol[i3+5] = 0;
    };

    applyQualityProfile(qualityProfile);

    // ── RESIZE ────────────────────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      postFxRuntime?.setSize(window.innerWidth, window.innerHeight);
    };
    const onOrientationChange = () => setTimeout(onResize, 100);
    const onWheel = (e: WheelEvent) => {
      if (isIntroActive) return;
      camDist = clampCamDist(camDist + e.deltaY * 0.02);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onOrientationChange);
    window.addEventListener('wheel', onWheel, { passive: true });

    // ── KEYBOARD INPUT ────────────────────────────────────────────────────────
    const keys = createMovementKeys();
    const onKeyDown = (e: KeyboardEvent) => updateMovementKey(keys, e.key, true);
    const onKeyUp   = (e: KeyboardEvent) => updateMovementKey(keys, e.key, false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);

    // ── MOUSE DRAG ────────────────────────────────────────────────────────────
    let isDragging = false;
    let lastMX = 0, lastMY = 0;
    const onMouseDown = (e: MouseEvent) => { isDragging = true; lastMX = e.clientX; lastMY = e.clientY; };
    const onMouseUp   = () => { isDragging = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || isIntroActive) return;
      camYaw  -= (e.clientX - lastMX) * 0.004;
      camPitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, camPitch + (e.clientY - lastMY) * 0.004));
      lastMX = e.clientX; lastMY = e.clientY;
    };
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup',   onMouseUp);
    window.addEventListener('mousemove', onMouseMove);

    // ── MOBILE JOYSTICK ───────────────────────────────────────────────────────
    const JOY_MAX = 48;
    let joyId: number | null = null;
    const joyVec = { x: 0, y: 0 };
    let joyMag = 0;

    const joyCenter = (): { x: number; y: number } => {
      if (!joystickBase) return { x: 0, y: 0 };
      const r = joystickBase.getBoundingClientRect();
      return { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
    };

    const moveKnob = (dx: number, dy: number) => {
      const len     = Math.sqrt(dx * dx + dy * dy);
      const clamped = Math.min(len, JOY_MAX);
      const angle   = Math.atan2(dy, dx);
      const kx = Math.cos(angle) * clamped;
      const ky = Math.sin(angle) * clamped;
      if (joystickKnob) {
        joystickKnob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
        joystickKnob.classList.add('active');
      }
      joyMag   = Math.min(len / JOY_MAX, 1.0);
      joyVec.x = kx / JOY_MAX;
      joyVec.y = ky / JOY_MAX;
    };

    const releaseJoy = () => {
      if (joystickKnob) {
        joystickKnob.style.transform = 'translate(-50%, -50%)';
        joystickKnob.classList.remove('active', 'sprinting');
      }
      joystickBase?.classList.remove('sprinting');
      joystickZone?.classList.remove('sprinting');
      joyVec.x = joyVec.y = 0; joyMag = 0; joyId = null;
    };

    const setJoySprintVisual = (on: boolean) => {
      joystickKnob?.classList.toggle('sprinting', on);
      joystickBase?.classList.toggle('sprinting', on);
      joystickZone?.classList.toggle('sprinting', on);
    };

    // ── MOBILE TOUCH: CAMERA + PINCH ─────────────────────────────────────────
    let camTouchId: number | null = null;
    let lastCamTX = 0, lastCamTY = 0;
    let pinchId2: number | null = null;
    let pinchDist = 0;

    const getTouchById = (list: TouchList, id: number): Touch | null => {
      for (const t of Array.from(list)) if (t.identifier === id) return t;
      return null;
    };
    const isOverJoystick = (t: Touch): boolean => {
      if (!joystickZone) return false;
      const r = joystickZone.getBoundingClientRect();
      return t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom;
    };

    const onJoyTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        if (joyId === null) { joyId = t.identifier; const c = joyCenter(); moveKnob(t.clientX - c.x, t.clientY - c.y); }
      }
    };
    joystickZone?.addEventListener('touchstart', onJoyTouchStart, { passive: false });

    const onTouchStart = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (isOverJoystick(t)) continue;
        if (camTouchId !== null && pinchId2 === null) {
          pinchId2 = t.identifier;
          const prev = getTouchById(e.touches, camTouchId);
          if (prev) { const dx = t.clientX - prev.clientX; const dy = t.clientY - prev.clientY; pinchDist = Math.sqrt(dx*dx+dy*dy); }
        } else if (camTouchId === null) { camTouchId = t.identifier; lastCamTX = t.clientX; lastCamTY = t.clientY; }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joyId) { const c = joyCenter(); moveKnob(t.clientX - c.x, t.clientY - c.y); }
        else if (t.identifier === camTouchId && pinchId2 === null && !isIntroActive) {
          camYaw  -= (t.clientX - lastCamTX) * 0.004;
          camPitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX, camPitch + (t.clientY - lastCamTY) * 0.004));
          lastCamTX = t.clientX; lastCamTY = t.clientY;
        }
      }
      if (pinchId2 !== null && e.touches.length >= 2 && !isIntroActive) {
        const tA = getTouchById(e.touches, camTouchId!);
        const tB = getTouchById(e.touches, pinchId2);
        if (tA && tB) {
          const dx = tA.clientX - tB.clientX; const dy = tA.clientY - tB.clientY;
          const d  = Math.sqrt(dx*dx+dy*dy);
          camDist   = clampCamDist(camDist - (d - pinchDist) * 0.04);
          pinchDist = d;
        }
      }
    };

    const onTouchEndCancel = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joyId)      releaseJoy();
        if (t.identifier === camTouchId) { camTouchId = null; pinchId2 = null; }
        if (t.identifier === pinchId2)   pinchId2 = null;
      }
    };

    window.addEventListener('touchstart',  onTouchStart,     { passive: true });
    window.addEventListener('touchmove',   onTouchMove,      { passive: true });
    window.addEventListener('touchend',    onTouchEndCancel, { passive: true });
    window.addEventListener('touchcancel', onTouchEndCancel, { passive: true });

    // ── CHARACTER STATE ───────────────────────────────────────────────────────
    const armatures: THREE.Object3D[] = [];
    const mixers:    THREE.AnimationMixer[] = [];
    let stateIdx = STATE_IDLE;
    const charPos = new THREE.Vector3(0, GROUND_Y, 0);
    let charRotY  = 0;
    let charH     = 1.8;

    const setCharState = (idx: number) => {
      if (idx === stateIdx || armatures.length === 0) return;
      armatures[stateIdx].visible = false;
      armatures[idx].visible      = true;
      stateIdx = idx;
      if (stateEl) { stateEl.textContent = STATE_NAMES[idx]; stateEl.style.color = STATE_COLORS[idx]; }
    };

    const applyCharTransform = () => {
      for (const arm of armatures) { arm.position.copy(charPos); arm.rotation.y = charRotY; }
    };

    // ── RENDER LOOP ───────────────────────────────────────────────────────────
    const timer    = new THREE.Timer();
    const moveDir  = new THREE.Vector3();
    const camFwd   = new THREE.Vector3();
    const camRight = new THREE.Vector3();
    const UP       = new THREE.Vector3(0, 1, 0);

    // ── Pre-allocated scratch vectors — never allocate inside tick() ──────────
    const _lookAt     = new THREE.Vector3();
    const _camDesired = new THREE.Vector3();
    const _ssTail     = new THREE.Vector3();

    let animFrameId = 0;

    const tick = () => {
      animFrameId = requestAnimationFrame(tick);
      timer.update();
      const dt      = Math.min(timer.getDelta(), 0.05);
      const elapsed = timer.getElapsed();

      for (const mx of mixers) mx.update(dt);

      // ── INTRO ───────────────────────────────────────────────────────────────
      if (isIntroActive) {
        if (!introInitialized) { introStartTime = elapsed; introInitialized = true; }
        const introElapsed = elapsed - introStartTime;
        if (introElapsed >= INTRO_DURATION) {
          isIntroActive = false;
          showUI();
          camYaw = Math.PI; camPitch = 0.1; camDist = CAM_DIST_DEFAULT;
        } else {
          const progress = introElapsed / INTRO_DURATION;
          const eased    = progress < 0.5 ? 4*progress*progress*progress : 1 - Math.pow(-2*progress+2, 3) / 2;
          camYaw   = Math.PI - eased * Math.PI * 2;
          camPitch = 0.1 + Math.sin(progress * Math.PI) * 0.3;
          camDist  = CAM_DIST_DEFAULT + Math.sin(progress * Math.PI) * 12;
        }
      }

      // ── INPUT ───────────────────────────────────────────────────────────────
      let inputX = 0, inputY = 0, moving = false, sprint = false;
      if (!isIntroActive) {
        const kbX = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
        const kbY = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
        inputX = kbX !== 0 ? kbX : joyVec.x;
        inputY = kbY !== 0 ? kbY : -joyVec.y;
        moving = (inputX * inputX + inputY * inputY) > 0.0025;
        const joySprint = joyMag >= SPRINT_THRESHOLD;
        sprint = moving && (keys.shift || joySprint);
        if (joyId !== null) setJoySprintVisual(joySprint);
      }

      if (armatures.length > 0) setCharState(moving ? (sprint ? STATE_RUN : STATE_WALK) : STATE_IDLE);

      // ── CHARACTER MOVEMENT ───────────────────────────────────────────────────
      if (moving) {
        const speed = sprint ? RUN_SPEED : WALK_SPEED;
        camFwd.set(-Math.sin(camYaw), 0, -Math.cos(camYaw)).normalize();
        camRight.crossVectors(camFwd, UP).normalize();
        moveDir.set(0, 0, 0).addScaledVector(camFwd, inputY).addScaledVector(camRight, inputX);
        if (moveDir.lengthSq() > 0.0001) moveDir.normalize();

        const nx = charPos.x + moveDir.x * speed * dt;
        const nz = charPos.z + moveDir.z * speed * dt;
        const distSq = nx * nx + nz * nz;
        if (distSq <= BOUNDARY_RADIUS * BOUNDARY_RADIUS) {
          charPos.x = nx; charPos.z = nz;
        } else {
          const d = Math.sqrt(distSq);
          charPos.x = (nx / d) * BOUNDARY_RADIUS;
          charPos.z = (nz / d) * BOUNDARY_RADIUS;
        }
        charPos.y = GROUND_Y;

        const targetA = Math.atan2(moveDir.x, moveDir.z);
        let diff = targetA - charRotY;
        while (diff >  Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        charRotY += diff * Math.min(TURN_SPEED * dt, 1.0);
      }

      // ── AUTO-ROTATE CAMERA BEHIND CHARACTER ──────────────────────────────────
      if (moving && !isDragging && camTouchId === null && !isIntroActive) {
        const targetCamYaw = charRotY + Math.PI;
        let yawDiff = targetCamYaw - camYaw;
        while (yawDiff >  Math.PI) yawDiff -= Math.PI * 2;
        while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
        camYaw += yawDiff * Math.min(3.0 * dt, 1.0);
      }

      if (armatures.length > 0) {
        const idleY = moving ? 0 : Math.sin(elapsed * 1.6) * 0.065;
        charPos.y = GROUND_Y + idleY;
        applyCharTransform();
        characterAura.update(charPos, elapsed);
      }

      if (qualityProfile.enableParticles) floatingDust.update(dt, charPos);
      updateModelEnhancements(enhancementState, elapsed);

      // ── STARS ─────────────────────────────────────────────────────────────────
      starsMat.uniforms.time.value += dt;
      starsObj.position.x  = camCurrent.x * 0.03;
      starsObj.position.z  = camCurrent.z * 0.03;
      starsObj.rotation.y += dt * 0.015;

      // ── NEON GRID ─────────────────────────────────────────────────────────────
      if (gridUsesShader && surfaceMat instanceof THREE.ShaderMaterial && surfaceMat.uniforms.uTime) {
        surfaceMat.uniforms.uTime.value += dt;
      }

      // ── SHOOTING STARS ────────────────────────────────────────────────────────
      if (qualityProfile.enableParticles) {
        for (let i = 0; i < MAX_SHOOTING_STARS; i++) {
          const d = ssData[i];
          if (!d.active) { if (Math.random() < 0.015) resetShootingStar(i); continue; }
          d.age += dt;
          if (d.age >= d.maxAge) {
            d.active = false;
            ssPos[i*6]=0; ssPos[i*6+1]=-1000; ssPos[i*6+2]=0;
            ssPos[i*6+3]=0; ssPos[i*6+4]=-1000; ssPos[i*6+5]=0;
            continue;
          }
          d.pos.addScaledVector(d.dir, d.speed * dt);
          // Re-use _ssTail instead of d.pos.clone() — eliminates per-frame allocation
          _ssTail.copy(d.pos).addScaledVector(d.dir, -d.length);
          const idx = i * 6;
          ssPos[idx]   = d.pos.x; ssPos[idx+1] = d.pos.y; ssPos[idx+2] = d.pos.z;
          ssPos[idx+3] = _ssTail.x; ssPos[idx+4] = _ssTail.y; ssPos[idx+5] = _ssTail.z;
          let alpha = 1.0;
          if      (d.age > d.maxAge - 0.2) alpha = (d.maxAge - d.age) / 0.2;
          else if (d.age < 0.2)            alpha = d.age / 0.2;
          ssCol[idx]=alpha; ssCol[idx+1]=alpha; ssCol[idx+2]=alpha;
        }
        ssGeo.attributes.position.needsUpdate = true;
        ssGeo.attributes.color.needsUpdate    = true;
      }

      // ── EMBERS ────────────────────────────────────────────────────────────────
      if (qualityProfile.enableParticles) {
        for (let i = 0; i < EMBER_COUNT; i++) {
          eLife[i] += dt;
          if (eLife[i] >= eMax[i]) { resetEmber(i, false); continue; }
          const t      = eLife[i] / eMax[i];
          const wobble = Math.sin(eLife[i] * 1.1 + i * 0.37) * 0.006;
          ePos[i*3]   += (eVel[i*3]   + wobble) * dt;
          ePos[i*3+1] +=  eVel[i*3+1] * dt * (1 - t * 0.15);
          ePos[i*3+2] += (eVel[i*3+2] + wobble) * dt;
          const alpha = t < 0.10 ? t / 0.10 : t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1.0;
          eCol[i*3]   = eBase[i*3]   * alpha;
          eCol[i*3+1] = eBase[i*3+1] * alpha;
          eCol[i*3+2] = eBase[i*3+2] * alpha;
          eSz[i] = eSz[i] * 0.998 + (0.04 + 0.14 * (1 - t)) * 0.002;
        }
        emberPosAttr.needsUpdate = true;
        emberColAttr.needsUpdate = true;
        emberSzAttr.needsUpdate  = true;
      }

      // ── MARKERS ───────────────────────────────────────────────────────────────
      let closestIdx = -1, closestDist = Infinity;
      for (let mi = 0; mi < markers.length; mi++) {
        const m     = markers[mi];
        const dx    = charPos.x - m.pos.x;
        const dz    = charPos.z - m.pos.z;
        const dist  = Math.sqrt(dx*dx + dz*dz);
        const phase = mi * 1.3;
        // Pre-compute sin values — avoids redundant trig calls per marker
        const _s1 = Math.sin(elapsed * 1.5 + phase);
        const _s2 = Math.sin(elapsed * 1.2 + phase);
        const _s3 = Math.sin(elapsed * 1.4 + phase);
        const _s4 = Math.sin(elapsed * 1.6 + phase * 0.9);
        m.chevron.rotation.y = elapsed * 1.8 + phase;
        m.chevron.position.y = 8.5 + _s1 * 0.25;
        (m.beam.material       as THREE.MeshBasicMaterial).opacity = 0.11 + _s2 * 0.04;
        (m.groundDisc.material as THREE.MeshBasicMaterial).opacity = 0.28 + _s3 * 0.10;
        m.glow.intensity = 1.5 + _s4 * 0.5;
        if (dist < MARKER_INTERACT_RADIUS && dist < closestDist) { closestDist = dist; closestIdx = mi; }
      }

      if (closestIdx !== activeMarkerIdx) {
        activeMarkerIdx = closestIdx;
        if (closestIdx >= 0) setMarkerPromptState(markerPrompt, markers[closestIdx], closestDist <= MARKER_ACTIVATE_RADIUS);
        else setMarkerPromptState(markerPrompt, null, false);
      } else if (closestIdx >= 0) {
        setMarkerPromptState(markerPrompt, markers[closestIdx], closestDist <= MARKER_ACTIVATE_RADIUS);
      }

      // ── CAMERA ────────────────────────────────────────────────────────────────
      const eyeY = charPos.y + charH * 0.55;
      // Re-use pre-allocated vectors — no new THREE.Vector3() inside tick
      _lookAt.set(charPos.x, eyeY, charPos.z);

      _camDesired.set(
        charPos.x + Math.sin(camYaw) * camDist * Math.cos(camPitch),
        charPos.y + camDist * Math.sin(camPitch) + charH * 0.3,
        charPos.z + Math.cos(camYaw) * camDist * Math.cos(camPitch),
      );
      _camDesired.x += Math.sin(elapsed * 0.55) * 0.07;
      _camDesired.y += Math.sin(elapsed * 0.90) * 0.05;
      _camDesired.z += Math.cos(elapsed * 0.60) * 0.05;
      camCurrent.lerp(_camDesired, CAM_SMOOTH);

      const camR2 = camCurrent.lengthSq();
      if (camR2 > CAM_MAX_RADIUS * CAM_MAX_RADIUS)
        camCurrent.multiplyScalar(CAM_MAX_RADIUS / Math.sqrt(camR2));

      camera.position.copy(camCurrent);
      camera.lookAt(_lookAt);
      if (postFxRuntime) postFxRuntime.composer.render();
      else renderer.render(scene, camera);
    };

    // ── LOADING BADGE ─────────────────────────────────────────────────────────
    const loadingBadge = document.createElement('div');
    loadingBadge.textContent = 'Preparing 3D experience...';
    loadingBadge.style.cssText = `
      position: fixed; right: 18px; bottom: 18px; z-index: 41;
      padding: 6px 10px; border-radius: 8px;
      background: rgba(0,0,0,0.45); color: rgba(255,255,255,0.82);
      border: 1px solid rgba(255,255,255,0.14);
      font: 11px/1.2 'Inter', system-ui, sans-serif; pointer-events: none;
    `;
    document.body.appendChild(loadingBadge);

    const initBasicScene = async () => {
      await new Promise<void>(resolve => setTimeout(resolve, 120));
      timer.reset();
      tick();
    };

    const enablePostProcessing = async () => {
      const module  = await import('./map/postprocessing');
      postFxRuntime = module.createPostProcessing(renderer, scene, camera, qualityProfile);
      postFxRuntime.setSize(window.innerWidth, window.innerHeight);
    };

    const loadAssets = async () => {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
      const loader = new GLTFLoader();

      const [mapResult, charResult] = await Promise.allSettled([
        loadGLB(loader, '/map.glb'),
        loadGLB(loader, '/character.glb'),
      ]);

      if (mapResult.status === 'fulfilled') {
        const mapGltf = mapResult.value;
        fixMapMaterials(mapGltf.scene);
        applyEmissionTweaks(mapGltf.scene);
        registerModelEnhancements(mapGltf.scene, enhancementState);
        scene.add(mapGltf.scene);
        logDev('✅ map.glb loaded');
      } else {
        console.error('❌ map.glb failed:', (mapResult.reason as Error).message);
      }

      if (charResult.status !== 'fulfilled') {
        console.warn('⚠️ character.glb not found, running map only');
        return;
      }

      const charGltf: LoadedGLTF = charResult.value;
      logDev('✅ character.glb:', { children: charGltf.scene.children.length, animations: charGltf.animations.length });

      const rootChildren = charGltf.scene.children as THREE.Object3D[];
      const anims        = charGltf.animations   as THREE.AnimationClip[];

      if (rootChildren.length >= 3) {
        const children = rootChildren.slice();
        for (let i = 0; i < 3; i++) {
          const arm = children[i];
          enableMeshShadows(arm);
          registerModelEnhancements(arm, enhancementState, { isCharacter: true });
          scene.add(arm);
          arm.visible = (i === STATE_IDLE);
          const mixer  = new THREE.AnimationMixer(arm);
          const clip   = anims[i];
          if (clip) { const action = mixer.clipAction(clip); action.setLoop(THREE.LoopRepeat, Infinity); action.play(); }
          armatures.push(arm); mixers.push(mixer);
        }
      } else if (anims.length >= 1) {
        for (let i = 0; i < Math.min(3, anims.length); i++) {
          const arm = charGltf.scene.clone(true);
          enableMeshShadows(arm);
          registerModelEnhancements(arm, enhancementState, { isCharacter: true });
          scene.add(arm);
          arm.visible = (i === STATE_IDLE);
          const mixer  = new THREE.AnimationMixer(arm);
          const action = mixer.clipAction(anims[i]);
          action.setLoop(THREE.LoopRepeat, Infinity); action.play();
          armatures.push(arm); mixers.push(mixer);
        }
      }

      if (armatures.length > 0) {
        const bbox = new THREE.Box3().setFromObject(armatures[STATE_IDLE]);
        charH = Math.max(bbox.getSize(new THREE.Vector3()).y, 1.0);
        charPos.set(0, GROUND_Y, 0);
        applyCharTransform();
      }
    };

    const startAnimationLoop = async () => {
      await initBasicScene();
      requestAnimationFrame(() => {
        setTimeout(() => {
          loadAssets()
            .finally(() => { if (document.body.contains(loadingBadge)) document.body.removeChild(loadingBadge); })
            .catch(err => console.error('Map asset init error:', err));
        }, 80);
      });
      setTimeout(() => {
        enablePostProcessing().catch(err => console.error('PostFX init error:', err));
      }, 420);
    };

    startAnimationLoop().catch(err => console.error('Map start error:', err));

    // ── CLEANUP ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animFrameId);
      if (stateEl)      stateEl.style.display      = 'none';
      if (hudEl)        hudEl.style.display         = 'none';
      if (joystickZone) joystickZone.style.display  = 'none';

      window.removeEventListener('start-experience',  startIntro);
      window.removeEventListener('keydown',           onKeyDown);
      window.removeEventListener('keyup',             onKeyUp);
      window.removeEventListener('mousedown',         onMouseDown);
      window.removeEventListener('mouseup',           onMouseUp);
      window.removeEventListener('mousemove',         onMouseMove);
      window.removeEventListener('touchstart',        onTouchStart);
      window.removeEventListener('touchmove',         onTouchMove);
      window.removeEventListener('touchend',          onTouchEndCancel);
      window.removeEventListener('touchcancel',       onTouchEndCancel);
      window.removeEventListener('resize',            onResize);
      window.removeEventListener('orientationchange', onOrientationChange);
      window.removeEventListener('wheel',             onWheel);
      joystickZone?.removeEventListener('touchstart', onJoyTouchStart);
      window.removeEventListener('keydown',           onMarkerKeyDown);
      markerPrompt.removeEventListener('click',       onMarkerTap);
      if (document.body.contains(markerPrompt))  document.body.removeChild(markerPrompt);
      if (document.body.contains(loadingBadge))  document.body.removeChild(loadingBadge);

      beamGeo.dispose(); chevronGeo.dispose(); groundDiscGeo.dispose();
      for (const m of markers) {
        (m.beam.material       as THREE.Material).dispose();
        (m.chevron.material    as THREE.Material).dispose();
        (m.groundDisc.material as THREE.Material).dispose();
        m.glow.dispose();
      }

      renderer.dispose();
      emberGeo.dispose(); emberMat.dispose(); spriteTex.dispose();
      starsGeo.dispose(); starsMat.dispose(); starTex.dispose();
      ssGeo.dispose(); ssMat.dispose();
      shaderGridMat.dispose(); basicGridMat.dispose();
      floatingDust.dispose(); characterAura.dispose();
      (postFxRuntime?.composer as { dispose?: () => void } | undefined)?.dispose?.();
      if (container.contains(canvas)) container.removeChild(canvas);
    };
  }, []);

  return <div ref={mountRef} style={{ position: 'fixed', inset: 0, zIndex: 2 }} />;
}
