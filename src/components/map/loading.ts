import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export type LoadedGLTF = {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
};

export const loadGLB = (loader: GLTFLoader, url: string) =>
  new Promise<LoadedGLTF>((res, rej) => loader.load(url, res, undefined, rej));

export const enableMeshShadows = (root: THREE.Object3D) => {
  root.traverse((node: THREE.Object3D) => {
    if (node instanceof THREE.Mesh) {
      node.castShadow    = true;
      node.receiveShadow = true;
    }
  });
};

export const fixMapMaterials = (gltfScene: THREE.Object3D) => {
  gltfScene.traverse((node: THREE.Object3D) => {
    if (!(node instanceof THREE.Mesh)) return;

    const name = node.name.toLowerCase();

    if (name === 'sphere' || name.includes('sky')) {
      node.visible = false;
      return;
    }

    if (name === 'building' || name === 'plane.002') {
      const mats: THREE.Material[] = Array.isArray(node.material)
        ? node.material : [node.material];
      mats.forEach(mat => { mat.side = THREE.DoubleSide; });
      node.castShadow    = true;
      node.receiveShadow = true;
      return;
    }

    if (name === 'floor' || name === 'plane.003') {
      node.visible = false;
      return;
    }

    node.castShadow    = true;
    node.receiveShadow = true;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// GPU-side colour transforms via onBeforeCompile
// ─────────────────────────────────────────────────────────────────────────────

const GLSL_HSV_UTILS = /* glsl */`
  vec3 _rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0*d + e)), d / (q.x + e), q.x);
  }
  vec3 _hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }
`;

function buildHSVSnippet(
  hue:      number,
  sMult:    number,
  vMult:    number,
  overlay:  [number, number, number] = [0, 0, 0],
  overlayA: number = 0.0,
): string {
  return /* glsl */`
    {
      vec3 _hsv = _rgb2hsv(diffuseColor.rgb);
      _hsv.x = ${hue.toFixed(5)};
      _hsv.y = clamp(_hsv.y * ${sMult.toFixed(5)}, 0.0, 1.0);
      _hsv.z = clamp(_hsv.z * ${vMult.toFixed(5)}, 0.0, 1.0);
      vec3 _shifted = _hsv2rgb(_hsv);
      vec3 _ovl = vec3(${overlay[0].toFixed(4)},${overlay[1].toFixed(4)},${overlay[2].toFixed(4)});
      diffuseColor.rgb = mix(_shifted, _ovl, ${overlayA.toFixed(5)});
    }
  `;
}

function injectDiffuseShader(mat: THREE.MeshStandardMaterial, snippet: string): void {
  mat.customProgramCacheKey = () => snippet;
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        `${GLSL_HSV_UTILS}\nvoid main() {`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>\n${snippet}`,
      );
  };
  mat.needsUpdate = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built snippets
// ─────────────────────────────────────────────────────────────────────────────

// Ice blue — hue 201°, boosted saturation, slightly brighter
const ICE_BLUE_SNIPPET = buildHSVSnippet(0.558, 1.30, 1.05);

// Reusable Color instance — avoids GC pressure during traverse
const _col = new THREE.Color();

// ─────────────────────────────────────────────────────────────────────────────

export const applyEmissionTweaks = (root: THREE.Object3D) => {
  root.traverse((node: THREE.Object3D) => {
    if (!(node instanceof THREE.Mesh)) return;

    const meshName = node.name.toLowerCase();
    const mats     = Array.isArray(node.material) ? node.material : [node.material];

    for (const mat of mats) {
      const matName = (mat as THREE.Material).name.toLowerCase();
      const name    = meshName || matName;



      if (!(mat instanceof THREE.MeshStandardMaterial)) continue;

      // ── Logo: kill the Blender-baked emission completely ──────────────────
      if (name.includes('logo')) {
        mat.emissiveIntensity = 0;
        mat.emissive.set(0x000000);
        mat.needsUpdate = true;
        continue;
      }
      // ── Building ──────────────────────────────────────────────────────────
      if (name.includes('building')) {
        mat.emissiveIntensity *= 1.8;
        if (mat.emissive.getHex() === 0x000000) mat.emissive.copy(mat.color);
        continue;
      }

      // ── Stage: ice blue colour shift ──────────────────────────────────────
      if (name.includes('stage')) {
        if (mat.emissive.getHex() === 0x000000) { _col.copy(mat.color); mat.emissive.copy(_col); }
        mat.emissiveIntensity *= 1.3;
        injectDiffuseShader(mat, ICE_BLUE_SNIPPET);
        continue;
      }

      // ── Major / Artist / Minor: OG emission only, no colour change ────────
      if (
        name.includes('major')  ||
        name.includes('artist') ||
        name.includes('minor')
      ) {
        mat.emissiveIntensity *= 1.8;
        if (mat.emissive.getHex() === 0x000000) mat.emissive.copy(mat.color);
        continue;
      }
    }
  });
};
