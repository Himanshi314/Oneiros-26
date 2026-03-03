import * as THREE from 'three';
import type { QualityProfile } from './quality';

type FlickerTarget = {
  material: THREE.MeshStandardMaterial;
  base: number;
  amp: number;
  speed: number;
  phase: number;
};

type GlitchTarget = {
  shaderRef: { uniforms: { uGlitchTime: { value: number } } | null };
};

export type SceneEnhancementState = {
  windowTargets: FlickerTarget[];
  screenTargets: FlickerTarget[];
  glitchTargets: GlitchTarget[];
  characterTargets: THREE.MeshStandardMaterial[];
};

export const createEnhancementState = (): SceneEnhancementState => ({
  windowTargets: [],
  screenTargets: [],
  glitchTargets: [],
  characterTargets: [],
});

export const setupCinematicLights = (scene: THREE.Scene, quality: QualityProfile) => {
  const key = new THREE.DirectionalLight(0xbfd5ff, 1.9);
  key.position.set(26, 34, 18);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 160;
  (key.shadow.camera as THREE.OrthographicCamera).left = -70;
  (key.shadow.camera as THREE.OrthographicCamera).right = 70;
  (key.shadow.camera as THREE.OrthographicCamera).top = 70;
  (key.shadow.camera as THREE.OrthographicCamera).bottom = -70;
  key.shadow.bias = -0.0015;

  const rim = new THREE.DirectionalLight(0xb866ff, 0.95);
  rim.position.set(-30, 10, -28);

  const fill = new THREE.HemisphereLight(0x66d8ff, 0x1c1036, quality.enableDynamicLights ? 0.7 : 1.1);
  const ambient = new THREE.AmbientLight(0x7a8dff, quality.enableDynamicLights ? 0.22 : 0.45);

  scene.add(fill);
  scene.add(ambient);
  if (quality.enableDynamicLights) {
    key.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    scene.add(key);
    scene.add(rim);
  }

  return { key, rim, fill, ambient };
};

export const createCharacterAura = (scene: THREE.Scene) => {
  const geometry = new THREE.CircleGeometry(1.4, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0x6ad9ff,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const aura = new THREE.Mesh(geometry, material);
  aura.rotation.x = -Math.PI / 2;
  aura.visible = false;
  aura.renderOrder = 3;
  scene.add(aura);

  const update = (position: THREE.Vector3, elapsed: number) => {
    aura.visible = true;
    aura.position.set(position.x, position.y + 0.02, position.z);
    const pulse = 0.9 + Math.sin(elapsed * 2.6) * 0.08;
    aura.scale.setScalar(pulse);
    material.opacity = 0.17 + Math.sin(elapsed * 2.0) * 0.04;
  };

  const dispose = () => {
    geometry.dispose();
    material.dispose();
  };

  return { aura, update, dispose };
};

const toStandardMaterial = (mesh: THREE.Mesh): THREE.MeshStandardMaterial | null => {
  if (!mesh.material || Array.isArray(mesh.material)) return null;
  if (mesh.material instanceof THREE.MeshStandardMaterial) {
    return mesh.material;
  }
  return null;
};

const addScreenGlitch = (
  material: THREE.MeshStandardMaterial,
  state: SceneEnhancementState,
) => {
  const shaderRef: GlitchTarget['shaderRef'] = { uniforms: null };

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uGlitchTime = { value: 0 };
    shaderRef.uniforms = { uGlitchTime: shader.uniforms.uGlitchTime as { value: number } };
    shader.fragmentShader = `uniform float uGlitchTime;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      float glitch = step(0.9965, fract(sin(uGlitchTime * 31.0 + gl_FragCoord.y * 0.24) * 43758.5453));
      gl_FragColor.rgb += glitch * vec3(0.08, 0.16, 0.25);
      #include <dithering_fragment>
      `,
    );
  };
  material.needsUpdate = true;

  state.glitchTargets.push({ shaderRef });
};

export const registerModelEnhancements = (
  root: THREE.Object3D,
  state: SceneEnhancementState,
  options?: { isCharacter?: boolean },
) => {
  root.traverse((node: THREE.Object3D) => {
    if (!(node instanceof THREE.Mesh)) return;
    const material = toStandardMaterial(node);
    if (!material) return;

    const name = node.name.toLowerCase();
    material.roughness = Math.min(0.92, material.roughness + 0.08);

    if (options?.isCharacter) {
      material.emissive = material.emissive.clone().lerp(new THREE.Color(0x66c6ff), 0.2);
      material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.08);
      state.characterTargets.push(material);
      return;
    }

    const isBuilding = name.includes('building') || name.includes('wall') || name.includes('structure');
    const isWindow = name.includes('window') || name.includes('glass');
    const isScreen = name.includes('screen') || name.includes('monitor') || name.includes('tv');

    if (isBuilding) {
      material.metalness = Math.max(material.metalness, 0.12);
      material.roughness = Math.min(material.roughness, 0.66);
    }

    if (isWindow) {
      material.emissive = new THREE.Color(0x5ecbff);
      material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.24);
      state.windowTargets.push({
        material,
        base: 0.24,
        amp: 0.16,
        speed: 3.2 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
      });
    }

    if (isScreen) {
      material.emissive = new THREE.Color(0x8b66ff);
      material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.22);
      state.screenTargets.push({
        material,
        base: 0.22,
        amp: 0.24,
        speed: 8 + Math.random() * 5,
        phase: Math.random() * Math.PI * 2,
      });
      addScreenGlitch(material, state);
    }
  });
};

export const updateModelEnhancements = (
  state: SceneEnhancementState,
  elapsed: number,
) => {
  for (const target of state.windowTargets) {
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * target.speed + target.phase);
    target.material.emissiveIntensity = target.base + pulse * target.amp;
  }

  for (const target of state.screenTargets) {
    const t = elapsed * target.speed + target.phase;
    const randomFlicker = Math.sin(t * 1.3) * Math.sin(t * 2.1);
    target.material.emissiveIntensity = target.base + Math.max(0, randomFlicker) * target.amp;
  }

  for (const target of state.glitchTargets) {
    if (target.shaderRef.uniforms) {
      target.shaderRef.uniforms.uGlitchTime.value = elapsed;
    }
  }
};
