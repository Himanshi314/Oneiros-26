import React, { useMemo } from 'react';
import './CosmicBackground.css';

// Pre-generate star field as a single background-image per layer
// This avoids creating hundreds of DOM nodes — just 3 divs total.

const LAYER_CONFIGS = [
  { count: 600, sizeMin: 0.6, sizeMax: 1.8, duration: 120, opacity: 0.85 },
  { count: 350, sizeMin: 1.2, sizeMax: 3.2, duration: 180, opacity: 0.6 },
  { count: 200, sizeMin: 2.0, sizeMax: 4.5, duration: 240, opacity: 0.4 },
];

const COLORS = [
  '255,255,255',
  '255,255,255',
  '255,255,255',
  '0,220,255',
  '0,220,255',
  '160,80,255',
  '255,100,200',
  '0,180,255',
];

/**
 * Generates a CSS radial-gradient background-image string containing
 * all stars for a given layer as tiny circles — zero extra DOM nodes.
 */
const generateStarLayer = (cfg: typeof LAYER_CONFIGS[0]) => {
  const gradients: string[] = [];
  const shadows: string[] = [];

  for (let i = 0; i < cfg.count; i++) {
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const size = cfg.sizeMin + Math.random() * (cfg.sizeMax - cfg.sizeMin);
    const rgb = COLORS[Math.floor(Math.random() * COLORS.length)];

    // Each star is a tiny radial-gradient dot
    gradients.push(
      `radial-gradient(${size}px circle at ${x.toFixed(2)}% ${y.toFixed(2)}%, rgba(${rgb},${cfg.opacity}) 0%, transparent 100%)`
    );

    // Add some glow via box-shadow (batched into one element)
    if (Math.random() > 0.6) {
      shadows.push(
        `${x.toFixed(1)}vw ${y.toFixed(1)}vh ${size * 2}px rgba(${rgb},${(cfg.opacity * 0.3).toFixed(2)})`
      );
    }
  }

  return { backgroundImage: gradients.join(','), boxShadow: shadows.join(',') };
};

const CosmicBackground: React.FC = () => {
  const layers = useMemo(() => {
    return LAYER_CONFIGS.map((cfg, layerIdx) => {
      const { backgroundImage, boxShadow } = generateStarLayer(cfg);

      return (
        <div
          key={`layer-${layerIdx}`}
          style={{
            position: 'absolute',
            inset: '-50%',
            width: '200%',
            height: '200%',
            backgroundImage,
            backgroundSize: '100% 100%',
            backgroundRepeat: 'no-repeat',
            boxShadow,
            animation: `cosmic-rotate ${cfg.duration}s linear infinite`,
            willChange: 'transform',
          }}
        />
      );
    });
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {layers}
    </div>
  );
};

export default CosmicBackground;
