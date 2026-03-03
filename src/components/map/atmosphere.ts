import * as THREE from 'three';

export const applyAtmosphereFog = (scene: THREE.Scene, density = 0.012) => {
  scene.fog = new THREE.FogExp2(0x162a4a, density);
};

export type DustField = {
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  update: (dt: number, anchor: THREE.Vector3) => void;
  dispose: () => void;
};

export const createFloatingDust = (
  scene: THREE.Scene,
  count = 180,
): DustField => {
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 120;
    positions[i * 3 + 1] = 1 + Math.random() * 12;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 120;

    velocities[i * 3] = (Math.random() - 0.5) * 0.06;
    velocities[i * 3 + 1] = 0.03 + Math.random() * 0.04;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.06;
  }

  const geometry = new THREE.BufferGeometry();
  const positionAttr = new THREE.BufferAttribute(positions, 3);
  geometry.setAttribute('position', positionAttr);

  const material = new THREE.PointsMaterial({
    color: new THREE.Color(0xaad8ff),
    size: 0.09,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const update = (dt: number, anchor: THREE.Vector3) => {
    points.position.x = anchor.x * 0.08;
    points.position.z = anchor.z * 0.08;

    for (let i = 0; i < count; i++) {
      positions[i * 3] += velocities[i * 3] * dt;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;

      if (positions[i * 3 + 1] > 16) positions[i * 3 + 1] = 0.5;
      if (positions[i * 3] > 65) positions[i * 3] = -65;
      if (positions[i * 3] < -65) positions[i * 3] = 65;
      if (positions[i * 3 + 2] > 65) positions[i * 3 + 2] = -65;
      if (positions[i * 3 + 2] < -65) positions[i * 3 + 2] = 65;
    }

    positionAttr.needsUpdate = true;
  };

  const dispose = () => {
    geometry.dispose();
    material.dispose();
  };

  return { points, update, dispose };
};
