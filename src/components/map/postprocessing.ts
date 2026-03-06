import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { QualityProfile } from './quality';

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 0.95 },
    darkness: { value: 0.28 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * offset;
      float vig = dot(uv, uv);
      color.rgb *= 1.0 - vig * darkness;
      gl_FragColor = color;
    }
  `,
};

export const createPostProcessing = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  quality: QualityProfile,
  options?: {
    renderScale?: number;
    bloomStrengthMultiplier?: number;
    vignetteOffset?: number;
    vignetteDarkness?: number;
  },
) => {
  const renderScale = options?.renderScale ?? 1;
  const bloomStrengthMultiplier = options?.bloomStrengthMultiplier ?? 1;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    quality.bloomStrength * bloomStrengthMultiplier,
    quality.bloomRadius,
    quality.bloomThreshold,
  );
  bloom.enabled = quality.enableBloom;
  composer.addPass(bloom);

  const vignette = new ShaderPass(VignetteShader);
  if (typeof options?.vignetteOffset === 'number') {
    vignette.uniforms.offset.value = options.vignetteOffset;
  }
  if (typeof options?.vignetteDarkness === 'number') {
    vignette.uniforms.darkness.value = options.vignetteDarkness;
  }
  composer.addPass(vignette);

  const setSize = (w: number, h: number) => {
    const scaledWidth = Math.max(1, Math.round(w * renderScale));
    const scaledHeight = Math.max(1, Math.round(h * renderScale));
    composer.setSize(scaledWidth, scaledHeight);
    bloom.setSize(scaledWidth, scaledHeight);
  };

  const setPixelRatio = (value: number) => {
    composer.setPixelRatio(value);
  };

  const setBloomEnabled = (enabled: boolean) => {
    bloom.enabled = enabled;
  };

  const setBloomStrength = (value: number) => {
    bloom.strength = value;
  };

  return { composer, bloom, setSize, setPixelRatio, setBloomEnabled, setBloomStrength };
};
