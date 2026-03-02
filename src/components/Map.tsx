import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ─── CONSTANTS (matching original main.js exactly) ────────────────────────────
const GROUND_Y = 0;
const BOUNDARY_RADIUS = 54;
const WALK_SPEED = 8;
const RUN_SPEED = 18;
const TURN_SPEED = 12;
const CAM_DIST_DEFAULT = 8;
const CAM_DIST_MIN = 3;
const CAM_DIST_MAX = 22;
const CAM_PITCH_MIN = 0.08;
const CAM_PITCH_MAX = 0.78;
const CAM_SMOOTH = 0.14;
const CAM_MAX_RADIUS = 57;
const SPRINT_THRESHOLD = 0.72;

const STATE_IDLE = 0;
const STATE_RUN = 1;
const STATE_WALK = 2;
const STATE_NAMES = ['Idle', 'Run', 'Walk'];
const STATE_COLORS = ['#4fffaa', '#ff7c4f', '#ffe566'];

export default function Map() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // ── UI DOM REFS ────────────────────────────────────────────────────────────
    const stateEl = document.getElementById('state') as HTMLElement | null;
    const joystickZone = document.getElementById('joystick-zone') as HTMLElement | null;
    const joystickBase = document.getElementById('joystick-base') as HTMLElement | null;
    const joystickKnob = document.getElementById('joystick-knob') as HTMLElement | null;
    const hudEl = document.getElementById('hud') as HTMLElement | null;

    // Show HUD / joystick now that the 3D scene is mounting
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (stateEl) stateEl.style.display = 'block';
    if (hudEl) hudEl.style.display = 'flex';
    if (isTouch && joystickZone) joystickZone.style.display = 'flex';

    // ── RENDERER ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const canvas = renderer.domElement;
    canvas.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 2;
      touch-action: none;
      display: block;
    `;
    // Prevent long-press context menu on mobile
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    container.appendChild(canvas);

    // ── SCENE + CAMERA ─────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.05, 300
    );

    let camYaw = Math.PI;
    let camPitch = 0.28;
    let camDist = CAM_DIST_DEFAULT;
    const camCurrent = new THREE.Vector3(0, 4, camDist);

    const clampCamDist = (v: number) =>
      Math.max(CAM_DIST_MIN, Math.min(CAM_DIST_MAX, v));

    // ── LIGHTS ────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    const sun = new THREE.DirectionalLight(0xfff4e0, 1.8);
    sun.position.set(30, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 180;
    (sun.shadow.camera as THREE.OrthographicCamera).left = -80;
    (sun.shadow.camera as THREE.OrthographicCamera).right = 80;
    (sun.shadow.camera as THREE.OrthographicCamera).top = 80;
    (sun.shadow.camera as THREE.OrthographicCamera).bottom = -80;
    sun.shadow.bias = -0.002;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x8ab0dd, 0.4);
    fill.position.set(-20, 20, -30);
    scene.add(fill);

    // ── MYSTICAL EMBERS ───────────────────────────────────────────────────────
    const EMBER_COUNT = 900;

    // Per-particle typed arrays (much faster than object arrays)
    const ePos = new Float32Array(EMBER_COUNT * 3); // world positions
    const eVel = new Float32Array(EMBER_COUNT * 3); // velocities
    const eCol = new Float32Array(EMBER_COUNT * 3); // rendered colours (alpha baked in)
    const eBase = new Float32Array(EMBER_COUNT * 3); // base colour before alpha
    const eSz = new Float32Array(EMBER_COUNT);     // base sizes
    const eLife = new Float32Array(EMBER_COUNT);     // elapsed lifetime (s)
    const eMax = new Float32Array(EMBER_COUNT);     // total lifetime (s)

    // Colour palette: deep space blues · electric cyan · nebula violet · ice white
    const PALETTE = [
      new THREE.Color(0x00aaff), // electric blue
      new THREE.Color(0x00ffee), // neon cyan
      new THREE.Color(0x4466ff), // deep cobalt
      new THREE.Color(0x88aaff), // soft periwinkle
      new THREE.Color(0xcc88ff), // nebula violet
      new THREE.Color(0xaaeeff), // ice shimmer
    ];

    const resetEmber = (i: number, scatterStart = false) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.sqrt(Math.random()) * 46; // sqrt gives even disk spread
      ePos[i * 3] = Math.cos(angle) * radius;
      ePos[i * 3 + 1] = scatterStart ? Math.random() * 8 : 0.05 + Math.random() * 0.3;
      ePos[i * 3 + 2] = Math.sin(angle) * radius;

      // Slow mystical rise with very gentle horizontal drift
      eVel[i * 3] = (Math.random() - 0.5) * 0.18;
      eVel[i * 3 + 1] = 0.18 + Math.random() * 0.52;
      eVel[i * 3 + 2] = (Math.random() - 0.5) * 0.18;

      eMax[i] = 7.0 + Math.random() * 9.0;
      eLife[i] = scatterStart ? Math.random() * eMax[i] : 0;
      eSz[i] = 0.06 + Math.random() * 0.22;

      const c = PALETTE[Math.floor(Math.random() * PALETTE.length)].clone();
      c.multiplyScalar(0.75 + Math.random() * 0.5); // slight brightness variation
      eBase[i * 3] = c.r;
      eBase[i * 3 + 1] = c.g;
      eBase[i * 3 + 2] = c.b;
      eCol[i * 3] = c.r;
      eCol[i * 3 + 1] = c.g;
      eCol[i * 3 + 2] = c.b;
    };

    // Initialise — stagger lifetimes so particles don't all burst at once
    for (let i = 0; i < EMBER_COUNT; i++) resetEmber(i, true);

    const emberGeo = new THREE.BufferGeometry();
    const emberPosAttr = new THREE.BufferAttribute(ePos, 3);
    const emberColAttr = new THREE.BufferAttribute(eCol, 3);
    const emberSzAttr = new THREE.BufferAttribute(eSz, 1);
    emberGeo.setAttribute('position', emberPosAttr);
    emberGeo.setAttribute('color', emberColAttr);
    emberGeo.setAttribute('size', emberSzAttr);

    // Soft glowing disc sprite — drawn on a canvas so no texture file needed
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = spriteCanvas.height = 64;
    const sCtx = spriteCanvas.getContext('2d')!;
    const grd = sCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    // Bright white-blue core → electric cyan → deep violet halo → transparent
    grd.addColorStop(0, 'rgba(220,240,255,1.0)');  // near-white ice core
    grd.addColorStop(0.15, 'rgba(80,200,255,0.95)');  // electric sky blue
    grd.addColorStop(0.38, 'rgba(40,100,255,0.55)');  // deep cobalt ring
    grd.addColorStop(0.60, 'rgba(120,60,255,0.20)');  // violet nebula haze
    grd.addColorStop(0.82, 'rgba(0,20,80,0.06)');     // deep space edge
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = grd;
    sCtx.fillRect(0, 0, 64, 64);
    const spriteTex = new THREE.CanvasTexture(spriteCanvas);

    const emberMat = new THREE.PointsMaterial({
      size: 0.5,   // slightly larger for a softer glow presence
      map: spriteTex,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const emberPoints = new THREE.Points(emberGeo, emberMat);
    emberPoints.renderOrder = 1; // draw after opaque geometry
    scene.add(emberPoints);

    // ── NEON GRID FLOOR ───────────────────────────────────────────────────────
    const surfaceGeo = new THREE.PlaneGeometry(300, 300, 1, 1);
    const surfaceMat = new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color(0x00ffec) }, // cyan
        color2: { value: new THREE.Color(0xff00ff) },  // magenta
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec3 vWorldPos;
        void main() {
          vec2 coord = vWorldPos.xz * 0.5; // Grid scale
          
          // Using fwidth for anti-aliased lines
          vec2 grid = abs(fract(coord - 0.5) - 0.5) / fwidth(coord);
          // Increase line thickness slightly and add a soft bloom/falloff
          float line = min(grid.x, grid.y);
          
          // Core sharp line
          float core = 1.0 - smoothstep(0.0, 1.2, line);
          // Outer soft emissive glow (bloom)
          float glow = 1.0 - smoothstep(0.0, 6.0, line);
          float gridAlpha = core + (glow * 0.4);
          
          // Glowing gradient
          float mixVal = sin(vWorldPos.x * 0.1) * cos(vWorldPos.z * 0.1) * 0.5 + 0.5;
          vec3 gridCol = mix(color1, color2, mixVal) * 3.0; // intense emissive
          
          // Very dark, slightly reflective base surface color (simulated base)
          vec3 baseCol = vec3(0.02, 0.02, 0.03); 
          vec3 finalCol = mix(baseCol, gridCol, gridAlpha);
          
          // Exponential fog fade to black
          float dist = length(vWorldPos.xz - cameraPosition.xz);
          float fogDensity = 0.035;
          float fogFactor = exp(-pow(dist * fogDensity, 2.0));
          fogFactor = clamp(fogFactor, 0.0, 1.0);
          
          // Mix with black for the fog effect instead of just alpha fading, 
          // to keep the base dark surface solid until it reaches horizon.
          finalCol = mix(vec3(0.0, 0.0, 0.0), finalCol, fogFactor);
          
          gl_FragColor = vec4(finalCol, 1.0);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    const neonSurface = new THREE.Mesh(surfaceGeo, surfaceMat);
    neonSurface.rotation.x = -Math.PI / 2;
    neonSurface.position.y = GROUND_Y + 0.01; // Slightly above ground to prevent z-fight with map
    neonSurface.receiveShadow = false; // Disable shadow reception so it doesn't darken the neon lines
    scene.add(neonSurface);

    // ── RESIZE ────────────────────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    // Orientation change fires before innerWidth/Height updates on iOS
    window.addEventListener('orientationchange', () => setTimeout(onResize, 100));

    // ── KEYBOARD INPUT ────────────────────────────────────────────────────────
    const keys = { w: false, a: false, s: false, d: false, shift: false };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.w = true;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.a = true;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.s = true;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.d = true;
      if (e.key === 'Shift') keys.shift = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.w = false;
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.a = false;
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.s = false;
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.d = false;
      if (e.key === 'Shift') keys.shift = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ── SCROLL ZOOM ───────────────────────────────────────────────────────────
    window.addEventListener('wheel', (e: WheelEvent) => {
      camDist = clampCamDist(camDist + e.deltaY * 0.02);
    }, { passive: true });

    // ── MOUSE DRAG (all on window — avoids React event blocking) ─────────────
    let isDragging = false;
    let lastMX = 0, lastMY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true; lastMX = e.clientX; lastMY = e.clientY;
    };
    const onMouseUp = () => { isDragging = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      camYaw -= (e.clientX - lastMX) * 0.004;
      camPitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX,
        camPitch + (e.clientY - lastMY) * 0.004));
      lastMX = e.clientX; lastMY = e.clientY;
    };
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
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
      const len = Math.sqrt(dx * dx + dy * dy);
      const clamped = Math.min(len, JOY_MAX);
      const angle = Math.atan2(dy, dx);
      const kx = Math.cos(angle) * clamped;
      const ky = Math.sin(angle) * clamped;
      if (joystickKnob) {
        joystickKnob.style.transform =
          `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;
        joystickKnob.classList.add('active');
      }
      joyMag = Math.min(len / JOY_MAX, 1.0);
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
      return t.clientX >= r.left && t.clientX <= r.right &&
        t.clientY >= r.top && t.clientY <= r.bottom;
    };

    // Joystick zone: non-passive so we can preventDefault (stops bleeding to camera)
    const onJoyTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) {
        if (joyId === null) {
          joyId = t.identifier;
          const c = joyCenter();
          moveKnob(t.clientX - c.x, t.clientY - c.y);
        }
      }
    };
    joystickZone?.addEventListener('touchstart', onJoyTouchStart, { passive: false });

    // Global touchstart — camera and pinch (passive: true required on modern browsers)
    const onTouchStart = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (isOverJoystick(t)) continue;

        if (camTouchId !== null && pinchId2 === null) {
          pinchId2 = t.identifier;
          const prev = getTouchById(e.touches, camTouchId);
          if (prev) {
            const dx = t.clientX - prev.clientX;
            const dy = t.clientY - prev.clientY;
            pinchDist = Math.sqrt(dx * dx + dy * dy);
          }
        } else if (camTouchId === null) {
          camTouchId = t.identifier;
          lastCamTX = t.clientX;
          lastCamTY = t.clientY;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joyId) {
          const c = joyCenter();
          moveKnob(t.clientX - c.x, t.clientY - c.y);
        } else if (t.identifier === camTouchId && pinchId2 === null) {
          camYaw -= (t.clientX - lastCamTX) * 0.004;
          camPitch = Math.max(CAM_PITCH_MIN, Math.min(CAM_PITCH_MAX,
            camPitch + (t.clientY - lastCamTY) * 0.004));
          lastCamTX = t.clientX; lastCamTY = t.clientY;
        }
      }
      // Pinch to zoom
      if (pinchId2 !== null && e.touches.length >= 2) {
        const tA = getTouchById(e.touches, camTouchId!);
        const tB = getTouchById(e.touches, pinchId2);
        if (tA && tB) {
          const dx = tA.clientX - tB.clientX;
          const dy = tA.clientY - tB.clientY;
          const d = Math.sqrt(dx * dx + dy * dy);
          camDist = clampCamDist(camDist - (d - pinchDist) * 0.04);
          pinchDist = d;
        }
      }
    };

    const onTouchEndCancel = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        if (t.identifier === joyId) releaseJoy();
        if (t.identifier === camTouchId) { camTouchId = null; pinchId2 = null; }
        if (t.identifier === pinchId2) pinchId2 = null;
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEndCancel, { passive: true });
    window.addEventListener('touchcancel', onTouchEndCancel, { passive: true });

    // ── CHARACTER STATE (3-armature system from main.js) ──────────────────────
    let armatures: THREE.Object3D[] = [];
    let mixers: THREE.AnimationMixer[] = [];
    let stateIdx = STATE_IDLE;
    let charPos = new THREE.Vector3(0, GROUND_Y, 0);
    let charRotY = 0;
    let charH = 1.8;

    const setCharState = (idx: number) => {
      if (idx === stateIdx || armatures.length === 0) return;
      armatures[stateIdx].visible = false;
      armatures[idx].visible = true;
      stateIdx = idx;
      if (stateEl) {
        stateEl.textContent = STATE_NAMES[idx];
        stateEl.style.color = STATE_COLORS[idx];
      }
    };

    const applyCharTransform = () => {
      for (const arm of armatures) {
        arm.position.copy(charPos);
        arm.rotation.y = charRotY;
      }
    };

    // ── MAP MATERIAL FIX (from main.js) ──────────────────────────────────────
    const fixMapMaterials = (gltfScene: THREE.Object3D) => {
      gltfScene.traverse((node: any) => {
        if (!node.isMesh) return;
        const n: string = node.name.toLowerCase();

        if (n === 'sphere') {
          const mats: THREE.Material[] = Array.isArray(node.material)
            ? node.material : [node.material];
          mats.forEach(mat => { mat.side = THREE.DoubleSide; });
          node.castShadow = node.receiveShadow = false;
        } else if (n === 'building' || n === 'plane.002') {
          const mats: THREE.Material[] = Array.isArray(node.material)
            ? node.material : [node.material];
          mats.forEach(mat => { mat.side = THREE.DoubleSide; });
          node.castShadow = node.receiveShadow = true;
        } else if (n === 'floor' || n === 'plane.003') {
          node.visible = false; // Hide the old floor
        } else {
          node.castShadow = node.receiveShadow = true;
        }
      });
    };

    // ── RENDER LOOP ───────────────────────────────────────────────────────────
    const clock = new THREE.Clock();
    const moveDir = new THREE.Vector3();
    const camFwd = new THREE.Vector3();
    const camRight = new THREE.Vector3();
    const UP = new THREE.Vector3(0, 1, 0);
    let animFrameId = 0;

    const tick = () => {
      animFrameId = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);

      // Update animation mixers
      for (const mx of mixers) mx.update(dt);

      // Input — keyboard overrides joystick
      const kbX = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
      const kbY = (keys.w ? 1 : 0) - (keys.s ? 1 : 0);
      const inputX = kbX !== 0 ? kbX : joyVec.x;
      const inputY = kbY !== 0 ? kbY : -joyVec.y;
      const moving = (inputX * inputX + inputY * inputY) > 0.0025;

      const joySprint = joyMag >= SPRINT_THRESHOLD;
      const sprint = moving && (keys.shift || joySprint);

      if (joyId !== null) setJoySprintVisual(joySprint);

      if (armatures.length > 0) {
        setCharState(moving ? (sprint ? STATE_RUN : STATE_WALK) : STATE_IDLE);
      }

      if (moving) {
        const speed = sprint ? RUN_SPEED : WALK_SPEED;

        camFwd.set(-Math.sin(camYaw), 0, -Math.cos(camYaw)).normalize();
        camRight.crossVectors(camFwd, UP).normalize();

        moveDir.set(0, 0, 0)
          .addScaledVector(camFwd, inputY)
          .addScaledVector(camRight, inputX);
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

        // Smooth character rotation
        const targetA = Math.atan2(moveDir.x, moveDir.z);
        let diff = targetA - charRotY;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        charRotY += diff * Math.min(TURN_SPEED * dt, 1.0);

        // Camera auto-follows unless user is manually controlling it
        if (!isDragging && camTouchId === null) {
          let yd = (charRotY + Math.PI) - camYaw;
          while (yd > Math.PI) yd -= Math.PI * 2;
          while (yd < -Math.PI) yd += Math.PI * 2;
          camYaw += yd * 0.04;
        }
      }

      if (armatures.length > 0) applyCharTransform();

      // ── UPDATE EMBERS ───────────────────────────────────────────────────────
      for (let i = 0; i < EMBER_COUNT; i++) {
        eLife[i] += dt;
        if (eLife[i] >= eMax[i]) { resetEmber(i, false); continue; }

        const t = eLife[i] / eMax[i]; // 0 = just born, 1 = dying

        // Slow sinusoidal horizontal wobble — lazy, dreamlike drift
        const wobble = Math.sin(eLife[i] * 1.1 + i * 0.37) * 0.006;

        ePos[i * 3] += (eVel[i * 3] + wobble) * dt;
        ePos[i * 3 + 1] += eVel[i * 3 + 1] * dt * (1 - t * 0.15); // barely decelerates
        ePos[i * 3 + 2] += (eVel[i * 3 + 2] + wobble) * dt;

        // Fade: gentle fade-in → long luminous hold → slow fade-out
        const alpha = t < 0.10
          ? t / 0.10
          : t > 0.75
            ? 1 - (t - 0.75) / 0.25
            : 1.0;

        eCol[i * 3] = eBase[i * 3] * alpha;
        eCol[i * 3 + 1] = eBase[i * 3 + 1] * alpha;
        eCol[i * 3 + 2] = eBase[i * 3 + 2] * alpha;

        // Smooth size taper — no flicker, just slow shrink
        eSz[i] = eSz[i] * 0.998 + (0.04 + 0.14 * (1 - t)) * 0.002;
      }
      emberPosAttr.needsUpdate = true;
      emberColAttr.needsUpdate = true;
      emberSzAttr.needsUpdate = true;

      // Third-person camera
      const eyeY = charPos.y + charH * 0.55;
      const lookAt = new THREE.Vector3(charPos.x, eyeY, charPos.z);

      const camDesired = new THREE.Vector3(
        charPos.x + Math.sin(camYaw) * camDist * Math.cos(camPitch),
        charPos.y + camDist * Math.sin(camPitch) + charH * 0.3,
        charPos.z + Math.cos(camYaw) * camDist * Math.cos(camPitch)
      );
      camCurrent.lerp(camDesired, CAM_SMOOTH);

      const camR2 = camCurrent.lengthSq();
      if (camR2 > CAM_MAX_RADIUS * CAM_MAX_RADIUS) {
        camCurrent.multiplyScalar(CAM_MAX_RADIUS / Math.sqrt(camR2));
      }

      camera.position.copy(camCurrent);
      camera.lookAt(lookAt);
      renderer.render(scene, camera);
    };

    // Start the loop IMMEDIATELY — camera works before assets finish loading
    clock.start();
    tick();

    // ── ASSET LOADING ─────────────────────────────────────────────────────────
    const loader = new GLTFLoader();
    const loadGLB = (url: string) =>
      new Promise<any>((res, rej) => loader.load(url, res, undefined, rej));

    async function init() {
      // 1. Map
      try {
        const mapGltf = await loadGLB('/map.glb');
        fixMapMaterials(mapGltf.scene);
        scene.add(mapGltf.scene);
        console.log('✅ map.glb loaded');
      } catch (err) {
        console.error('❌ map.glb failed:', (err as Error).message);
        return;
      }

      // 2. Character
      let charGltf: any;
      try {
        charGltf = await loadGLB('/character.glb');
      } catch (err) {
        console.warn('⚠️ character.glb not found, running map only');
        return;
      }

      // Debug log — open DevTools to see your GLB structure
      console.log('✅ character.glb:', {
        children: charGltf.scene.children.length,
        animations: charGltf.animations.length,
      });
      charGltf.scene.children.forEach((c: THREE.Object3D, i: number) =>
        console.log(`  child[${i}] "${c.name}" (${c.type})`));
      charGltf.animations.forEach((a: THREE.AnimationClip, i: number) =>
        console.log(`  anim[${i}] "${a.name}" ${a.duration.toFixed(2)}s`));

      const rootChildren = charGltf.scene.children as THREE.Object3D[];
      const anims = charGltf.animations as THREE.AnimationClip[];

      if (rootChildren.length >= 3) {
        // ── 3-ARMATURE MODE (original main.js structure) ──────────────────
        // child[0]=Idle  child[1]=Run  child[2]=Walk — each pre-animated
        console.log('📦 3-armature mode');
        const children = rootChildren.slice();
        for (let i = 0; i < 3; i++) {
          const arm = children[i];
          arm.traverse((n: any) => {
            if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }
          });
          scene.add(arm);
          arm.visible = (i === STATE_IDLE);
          const mixer = new THREE.AnimationMixer(arm);
          const clip = anims[i];
          if (clip) {
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.play();
            console.log(`  arm[${i}] → "${clip.name}"`);
          }
          armatures.push(arm);
          mixers.push(mixer);
        }
      } else if (anims.length >= 1) {
        // ── SINGLE-ARMATURE FALLBACK — clone per animation ─────────────────
        console.log('📦 Single-armature fallback (cloning)');
        for (let i = 0; i < Math.min(3, anims.length); i++) {
          const arm = charGltf.scene.clone(true);
          arm.traverse((n: any) => {
            if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }
          });
          scene.add(arm);
          arm.visible = (i === STATE_IDLE);
          const mixer = new THREE.AnimationMixer(arm);
          const action = mixer.clipAction(anims[i]);
          action.setLoop(THREE.LoopRepeat, Infinity);
          action.play();
          armatures.push(arm);
          mixers.push(mixer);
          console.log(`  clone[${i}] → "${anims[i].name}"`);
        }
      } else {
        console.warn('⚠️ Unexpected character.glb structure');
        return;
      }

      // Measure real character height for camera offset
      const bbox = new THREE.Box3().setFromObject(armatures[STATE_IDLE]);
      charH = Math.max(bbox.getSize(new THREE.Vector3()).y, 1.0);
      charPos.set(0, GROUND_Y, 0);
      applyCharTransform();
      console.log(`  charH = ${charH.toFixed(2)}`);
    }

    init().catch(err => console.error('Map init error:', err));

    // ── CLEANUP ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animFrameId);

      // Hide HUD/joystick when unmounting
      if (stateEl) stateEl.style.display = 'none';
      if (hudEl) hudEl.style.display = 'none';
      if (joystickZone) joystickZone.style.display = 'none';

      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEndCancel);
      window.removeEventListener('touchcancel', onTouchEndCancel);
      window.removeEventListener('resize', onResize);
      joystickZone?.removeEventListener('touchstart', onJoyTouchStart);

      renderer.dispose();
      emberGeo.dispose();
      emberMat.dispose();
      spriteTex.dispose();
      if (container.contains(canvas)) container.removeChild(canvas);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{ position: 'fixed', inset: 0, zIndex: 2 }}
    />
  );
}
