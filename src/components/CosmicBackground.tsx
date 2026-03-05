import React, { useEffect, useRef } from 'react';

const PALETTE = [
  [255, 255, 255],
  [255, 255, 255],
  [255, 255, 255],
  [0,   220, 255],
  [0,   220, 255],
  [160,  80, 255],
  [255, 100, 200],
  [0,   180, 255],
];

// Three layers with different star counts, sizes, and rotation speeds
const LAYER_CONFIGS = [
  { count: 200, sizeMin: 0.4, sizeMax: 1.5, rotationSpeed: (2 * Math.PI) / 120, opacity: 0.9 }, // 120s/rev
  { count: 150, sizeMin: 1.0, sizeMax: 2.5, rotationSpeed: (2 * Math.PI) / 180, opacity: 0.7 }, // 180s/rev
  { count:  80, sizeMin: 1.5, sizeMax: 3.0, rotationSpeed: (2 * Math.PI) / 240, opacity: 0.5 }, // 240s/rev
];

type Star = {
  x: number; y: number;   // 0–1 normalised
  r: number;
  rgb: number[];
  phase: number;
  speed: number;
  vx: number;
  vy: number;
  layer: number;
};

const CosmicBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    // ── Resize handler ───────────────────────────────────────────────────────
    let W = 0, H = 0;
    const resize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Generate stars per layer ─────────────────────────────────────────────
    const stars: Star[] = [];
    LAYER_CONFIGS.forEach((cfg, layerIdx) => {
      for (let i = 0; i < cfg.count; i++) {
        stars.push({
          x:     Math.random(),
          y:     Math.random(),
          r:     cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin),
          rgb:   PALETTE[Math.floor(Math.random() * PALETTE.length)],
          phase: Math.random() * Math.PI * 2,
          speed: 0.4 + Math.random() * 1.2,
          vx:   (Math.random() - 0.5) * 0.006,
          vy:   (Math.random() - 0.5) * 0.003,
          layer: layerIdx,
        });
      }
    });

    // ── Per-layer rotation angles ─────────────────────────────────────────────
    const layerAngles = LAYER_CONFIGS.map(() => 0);

    // ── Render loop ──────────────────────────────────────────────────────────
    let rafId = 0;
    let lastT = 0;

    const draw = (t: number) => {
      rafId = requestAnimationFrame(draw);

      const dt = Math.min((t - lastT) / 1000, 0.05);
      lastT = t;

      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;

      // Advance each layer's rotation angle
      LAYER_CONFIGS.forEach((cfg, i) => {
        layerAngles[i] += cfg.rotationSpeed * dt;
      });

      for (const s of stars) {
        const angle        = layerAngles[s.layer];
        const layerOpacity = LAYER_CONFIGS[s.layer].opacity;

        // Twinkle
        const alpha = layerOpacity * (0.15 + 0.85 * (0.5 + 0.5 * Math.sin(t * 0.001 * s.speed + s.phase)));

        // Rotate star position around canvas centre
        const rawX = s.x * W - cx;
        const rawY = s.y * H - cy;
        const cos  = Math.cos(angle);
        const sin  = Math.sin(angle);
        const px   = cx + rawX * cos - rawY * sin;
        const py   = cy + rawX * sin + rawY * cos;

        const [r, g, b] = s.rgb;

        // Soft glow
        const grd = ctx.createRadialGradient(px, py, 0, px, py, s.r * 3.5);
        grd.addColorStop(0, `rgba(${r},${g},${b},${(alpha * 0.35).toFixed(3)})`);
        grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.beginPath();
        ctx.arc(px, py, s.r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        // Star core
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        ctx.fill();

        // Drift + wrap (on normalised coords, pre-rotation)
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.x > 1.01)  s.x -= 1.02;
        if (s.x < -0.01) s.x += 1.02;
        if (s.y > 1.01)  s.y -= 1.02;
        if (s.y < -0.01) s.y += 1.02;
      }
    };

    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(rafId); rafId = 0; }
      else { lastT = performance.now(); rafId = requestAnimationFrame(draw); }
    };
    document.addEventListener('visibilitychange', onVisibility);

    lastT = performance.now();
    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'absolute',
        top:           0,
        left:          0,
        width:         '100%',
        height:        '100%',
        zIndex:        0,
        pointerEvents: 'none',
      }}
    />
  );
};

export default CosmicBackground;
