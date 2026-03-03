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
) => {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    quality.bloomStrength,
    quality.bloomRadius,
    quality.bloomThreshold,
  );
  bloom.enabled = quality.enableBloom;
  composer.addPass(bloom);

  const vignette = new ShaderPass(VignetteShader);
  composer.addPass(vignette);

  const setSize = (w: number, h: number) => {
    composer.setSize(w, h);
    bloom.setSize(w, h);
  };

  const setBloomEnabled = (enabled: boolean) => {
    bloom.enabled = enabled;
  };

  const setBloomStrength = (value: number) => {
    bloom.strength = value;
  };

  return { composer, bloom, setSize, setBloomEnabled, setBloomStrength };
};
