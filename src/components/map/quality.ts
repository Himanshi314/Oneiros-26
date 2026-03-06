import * as THREE from 'three';

export type QualityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type QualityProfile = {
  level: QualityLevel;
  pixelRatioCap: number;
  enableBloom: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  enableParticles: boolean;
  particleCountScale: number;
  enableShaderGrid: boolean;
  shadowMapSize: number;
  enableDynamicLights: boolean;
};

export type MobileResolutionProfile = {
  pixelRatioCap: number;
  postProcessScale: number;
};

export const qualityProfileFor = (level: QualityLevel): QualityProfile => {
  if (level === 'LOW') {
    return {
      level,
      pixelRatioCap: 1,
      enableBloom: false,
      bloomStrength: 0,
      bloomRadius: 0,
      bloomThreshold: 1,
      enableParticles: false,
      particleCountScale: 0.2,
      enableShaderGrid: false,
      shadowMapSize: 512,
      enableDynamicLights: false,
    };
  }

  if (level === 'MEDIUM') {
    return {
      level,
      pixelRatioCap: 1.2,
      enableBloom: true,
      bloomStrength: 0.34,
      bloomRadius: 0.42,
      bloomThreshold: 0.88,
      enableParticles: true,
      particleCountScale: 0.5,
      enableShaderGrid: true,
      shadowMapSize: 768,
      enableDynamicLights: true,
    };
  }

  return {
    level,
    pixelRatioCap: 1.7,
    enableBloom: true,
    bloomStrength: 0.55,
    bloomRadius: 0.6,
    bloomThreshold: 0.82,
    enableParticles: true,
    particleCountScale: 1,
    enableShaderGrid: true,
    shadowMapSize: 1024,
    enableDynamicLights: true,
  };
};

const isLikelyMobile = () => {
  const ua = navigator.userAgent || '';
  const byUa = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(ua);
  const byScreen = Math.min(window.innerWidth, window.innerHeight) <= 820;
  return byUa || byScreen;
};

const getGpuRendererString = (renderer: THREE.WebGLRenderer) => {
  const gl = renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  if (!ext) return '';
  const raw = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
  return typeof raw === 'string' ? raw.toLowerCase() : '';
};

const isWeakGpu = (gpu: string) => /mali|adreno 3|adreno 4|intel\(r\) hd|uhd 6|apple gpu/i.test(gpu);

const isStrongGpu = (gpu: string) => /rtx|radeon rx|apple m[1-9]|adreno 7/i.test(gpu);

const getCapabilityScore = (options: {
  mobile: boolean;
  gpu: string;
  memory: number;
  cores: number;
}) => {
  const { mobile, gpu, memory, cores } = options;

  let score = 0;
  if (mobile) score -= 2;
  if (memory <= 4) score -= 2;
  else if (memory >= 8) score += 1;
  if (cores <= 4) score -= 2;
  else if (cores >= 8) score += 2;
  if (isWeakGpu(gpu)) score -= 2;
  if (isStrongGpu(gpu)) score += 2;

  return score;
};

export const detectInitialQuality = (renderer: THREE.WebGLRenderer): QualityProfile => {
  const mobile = isLikelyMobile();
  const gpu = getGpuRendererString(renderer);
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const score = getCapabilityScore({ mobile, gpu, memory, cores });

  if (score <= -2) return qualityProfileFor('LOW');
  if (score <= 2) return qualityProfileFor('MEDIUM');
  return qualityProfileFor('HIGH');
};

export const getMobileResolutionProfile = (
  renderer: THREE.WebGLRenderer,
): MobileResolutionProfile => {
  const gpu = getGpuRendererString(renderer);
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const shortSide = Math.min(window.innerWidth, window.innerHeight);
  const dpr = window.devicePixelRatio || 1;

  let score = getCapabilityScore({ mobile: true, gpu, memory, cores });
  if (dpr >= 3) score += 1;
  if (shortSide >= 390) score += 1;
  if (shortSide <= 360) score -= 1;

  if (score <= -2) {
    return {
      pixelRatioCap: 1.1,
      postProcessScale: 0.78,
    };
  }

  if (score >= 3) {
    return {
      pixelRatioCap: 1.45,
      postProcessScale: 0.92,
    };
  }

  return {
    pixelRatioCap: 1.32,
    postProcessScale: 0.86,
  };
};

export const downgradeQuality = (level: QualityLevel): QualityLevel => {
  if (level === 'HIGH') return 'MEDIUM';
  if (level === 'MEDIUM') return 'LOW';
  return 'LOW';
};
