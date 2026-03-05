import * as THREE from 'three';

export const applyAtmosphereFog = (scene: THREE.Scene, density = 0.012) => {
  scene.fog = new THREE.FogExp2(0x162a4a, density);
};

export type DustField = {
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  update: (dt: number, anchor: THREE.Vector3) => void;
  dispose: () => void;
};

const DUST_PALETTE = [
  new THREE.Color(0x0077ff),
  new THREE.Color(0x00e5ff),
  new THREE.Color(0xff0099),
  new THREE.Color(0x8844ff),
  new THREE.Color(0xff6644),
  new THREE.Color(0x00ccaa),
  new THREE.Color(0xaaddff),
  new THREE.Color(0xff44cc),
];

export const createFloatingDust = (
  scene: THREE.Scene,
  count = 120,
): DustField => {
  const positions  = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const colors     = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 110;
    positions[i * 3 + 1] = 0.5 + Math.random() * 13;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 110;

    velocities[i * 3]     = (Math.random() - 0.5) * 0.055;
    velocities[i * 3 + 1] = 0.025 + Math.random() * 0.038;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.055;

    const c = DUST_PALETTE[Math.floor(Math.random() * DUST_PALETTE.length)];
    const dim = 0.35 + Math.random() * 0.30; // 0.35–0.65 brightness range
    colors[i * 3]     = c.r * dim;
    colors[i * 3 + 1] = c.g * dim;
    colors[i * 3 + 2] = c.b * dim;
  }

  const geometry    = new THREE.BufferGeometry();
  const positionAttr = new THREE.BufferAttribute(positions, 3);
  const colorAttr    = new THREE.BufferAttribute(colors, 3);
  geometry.setAttribute('position', positionAttr);
  geometry.setAttribute('color',    colorAttr);

  const material = new THREE.PointsMaterial({
    size: 0.10,
    vertexColors: true,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // ── Throttled update
  let frameSkip = 0;

  const update = (dt: number, anchor: THREE.Vector3) => {
    // Anchor follow
    points.position.x = anchor.x * 0.08;
    points.position.z = anchor.z * 0.08;

    // Particle simulation
    frameSkip ^= 1;
    if (frameSkip) return;

    // dt × 2 compensates for the skipped frame so speed stays consistent
    const step = dt * 2;

    for (let i = 0; i < count; i++) {
      const x = i * 3, y = x + 1, z = x + 2;

      positions[x] += velocities[x] * step;
      positions[y] += velocities[y] * step;
      positions[z] += velocities[z] * step;

      // Wrap boundaries
      if (positions[y] > 16)  positions[y] = 0.5;
      if (positions[x] >  60) positions[x] = -60;
      if (positions[x] < -60) positions[x] =  60;
      if (positions[z] >  60) positions[z] = -60;
      if (positions[z] < -60) positions[z] =  60;
    }

    positionAttr.needsUpdate = true;
  };

  const dispose = () => {
    geometry.dispose();
    material.dispose();
  };

  return { points, update, dispose };
};
