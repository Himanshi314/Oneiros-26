import * as THREE from "three";

/**
 * Cosmic Celestial Floor Shader
 * Brightness reductions vs v4:
 *  • uGlow: 1.0 → 0.55
 *  • Vein body mix: 0.65 → 0.48
 *  • Inner vein mix: 0.60 → 0.44
 *  • Core vein mix: 0.55 → 0.38
 *  • Core bloom multiplier: 0.40 → 0.20
 *  • Sparkle multiplier: 1.35 → 0.75
 *  • Star multiplier: 1.15 → 0.80
 *  • Gamma lift: pow(0.88) → pow(0.94) (less aggressive lift)
 *  • Nebula wash: 0.08 → 0.055
 *  • Grid opacity: 0.42 → 0.28
 */
export function createNeonGridMaterial() {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uGlow: { value: 0.55 },
    },

    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,

    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform float uGlow;

      varying vec2 vUv;

      // ── Hash / noise ─────────────────────────────────────────────────────────
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float hash1(float n) { return fract(sin(n) * 43758.5453); }

      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash(i), b = hash(i + vec2(1,0));
        float c = hash(i + vec2(0,1)), d = hash(i + vec2(1,1));
        return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.x*u.y;
      }

      // 3-octave FBM
      float fbm(vec2 p) {
        float v = 0.0, amp = 0.5;
        for (int i = 0; i < 3; i++) {
          v   += amp * vnoise(p);
          p    = p * 2.1 + vec2(1.7, 9.2);
          amp *= 0.5;
        }
        return v;
      }

      // ── Vivid cosmic palette ─────────────────────────────────────────────────
      vec3 cosmic(float t) {
        t = fract(t);
        vec3 c0 = vec3(0.05, 0.45, 1.00);  // electric blue
        vec3 c1 = vec3(0.00, 0.95, 0.95);  // neon cyan
        vec3 c2 = vec3(0.55, 0.10, 1.00);  // violet
        vec3 c3 = vec3(1.00, 0.05, 0.70);  // hot magenta
        vec3 c4 = vec3(1.00, 0.45, 0.30);  // rose-gold

        float s = t * 5.0;
        float fi = fract(s);
        int   ii = int(floor(s));
        fi = fi * fi * (3.0 - 2.0 * fi);

        if (ii == 0) return mix(c0, c1, fi);
        if (ii == 1) return mix(c1, c2, fi);
        if (ii == 2) return mix(c2, c3, fi);
        if (ii == 3) return mix(c3, c4, fi);
        return mix(c4, c0, fi);
      }

      // ── Thin, high-freq nebula veins ─────────────────────────────────────────
      vec3 veinMasks(vec2 uv, vec2 flow) {
        vec2 p = uv * 11.0;
        vec2 q = vec2(fbm(p + flow), fbm(p + vec2(3.1, 5.7) + flow * 0.9));
        float f = fbm(p + 2.2 * q + flow * 0.2);

        float soft  = smoothstep(0.53, 0.60, f);
        float inner = smoothstep(0.565, 0.600, f);
        float core  = smoothstep(0.585, 0.602, f);
        return vec3(soft, inner, core);
      }



      // ── 4-point sparkle cross ────────────────────────────────────────────────
      float sparkle(vec2 uv, float time) {
        float brightness = 0.0;
        vec2  sv   = uv * 22.0;
        vec2  cell = floor(sv);
        vec2  fr   = fract(sv);

        for (int dx = 0; dx <= 1; dx++) {
          for (int dy = 0; dy <= 1; dy++) {
            vec2  nb  = cell + vec2(float(dx), float(dy));
            float rnd = hash(nb + 99.3);
            if (rnd < 0.82) continue;

            vec2  jitter = vec2(hash(nb + 5.1), hash(nb + 2.9));
            vec2  d      = fr - vec2(float(dx), float(dy)) - jitter;

            float phase   = rnd * 6.2831;
            float twinkle = pow(max(0.0, sin(time * (0.8 + rnd * 1.8) + phase)), 6.0);

            float dist = length(d);
            float cross = max(
              smoothstep(0.12, 0.0, abs(d.x)) * smoothstep(0.12, 0.0, dist),
              smoothstep(0.12, 0.0, abs(d.y)) * smoothstep(0.12, 0.0, dist)
            );
            float streak = smoothstep(0.006, 0.0, abs(d.x)) * smoothstep(0.18, 0.0, abs(d.y))
                         + smoothstep(0.006, 0.0, abs(d.y)) * smoothstep(0.18, 0.0, abs(d.x));

            brightness += (cross * 0.7 + streak * 0.5) * twinkle;
          }
        }
        return clamp(brightness, 0.0, 1.0);
      }

      // ── Twinkling floor stars ────────────────────────────────────────────────
      float floorStars(vec2 uv, float time) {
        float brightness = 0.0;
        vec2  sv   = uv * 52.0;
        vec2  cell = floor(sv);
        vec2  fr   = fract(sv);

        for (int dx = 0; dx <= 1; dx++) {
          for (int dy = 0; dy <= 1; dy++) {
            vec2  nb  = cell + vec2(float(dx), float(dy));
            float rnd = hash(nb + 13.7);
            if (rnd < 0.76) continue;

            vec2  jitter = vec2(hash(nb + 7.3), hash(nb + 3.1));
            float dist   = length(fr - vec2(float(dx), float(dy)) - jitter);

            float twinkle = 0.35 + 0.65 * sin(time * (1.5 + rnd * 4.0) + rnd * 6.28);
            if (fract(rnd * 13.7) > 0.88)
              twinkle *= 0.5 + 0.5 * sin(time * 14.0 + rnd * 88.0);

            float sz = 0.05 * (0.5 + 0.5 * rnd);
            brightness += smoothstep(sz, 0.0, dist) * twinkle * (0.5 + 0.4 * rnd);
          }
        }
        return clamp(brightness, 0.0, 1.0);
      }

      void main() {
        vec2 flow = vec2(uTime * 0.018, uTime * 0.011);

        // ── Background ───────────────────────────────────────────────────────
        float bgN = vnoise(vUv * 2.5 + flow * 0.2);
        vec3  bg  = mix(
          vec3(0.010, 0.008, 0.035),
          vec3(0.008, 0.025, 0.045),
          bgN * 0.8
        );
        float nebT = fract(bgN * 1.2 + uTime * 0.02);
        bg += cosmic(nebT) * bgN * 0.055; // ↓ from 0.08

        // ── Veins ────────────────────────────────────────────────────────────
        vec3 vm = veinMasks(vUv, flow);
        float veinSoft  = vm.x;
        float veinInner = vm.y;
        float veinCore  = vm.z;

        float veinT   = fract(vnoise(vUv * 5.0 + flow * 0.3) * 1.8 + uTime * 0.04);
        vec3  veinCol = cosmic(veinT);

        vec3 color = bg;

        color += veinCol * veinSoft  * uGlow * 0.18;                         // soft halo
        color  = mix(color, veinCol * 0.72, veinSoft  * 0.48);               // ↓ body
        color  = mix(color, mix(veinCol * 1.05, vec3(0.7,0.95,1.0), 0.20),
                             veinInner * 0.44);                               // ↓ inner
        vec3 coreCol = mix(veinCol * 1.2, vec3(0.88, 0.95, 1.0), 0.30);
        color  = mix(color, coreCol,  veinCore  * 0.38);                      // ↓ core
        color += veinCol * veinCore  * uGlow * 0.20;                         // ↓ bloom


        // ── Sparkles ─────────────────────────────────────────────────────────
        float sp    = sparkle(vUv, uTime);
        float spT   = fract(hash(floor(vUv * 22.0)) + uTime * 0.03);
        vec3  spCol = mix(vec3(1.0), cosmic(spT), 0.30);
        color += spCol * sp * 0.75;

        // ── Floor stars ──────────────────────────────────────────────────────
        float starB    = floorStars(vUv, uTime);
        float starMask = 1.0 - veinSoft * 0.50;
        vec3  starCol  = mix(vec3(0.85, 0.93, 1.0), cosmic(hash(floor(vUv * 52.0)) + 0.2), 0.35);
        color += starCol * starB * starMask * 0.80;

        // ── Vignette ─────────────────────────────────────────────────────────
        float vig = 1.0 - smoothstep(0.25, 0.80, length(vUv - 0.5));
        color *= mix(0.45, 1.0, vig);

        // ── Gentle gamma lift — less aggressive than before ───────────────────
        color = pow(clamp(color, 0.0, 1.0), vec3(0.94));

        gl_FragColor = vec4(color, 1.0);
      }
    `,

    transparent: false,
    depthWrite: true,
  });

  return material;

}
