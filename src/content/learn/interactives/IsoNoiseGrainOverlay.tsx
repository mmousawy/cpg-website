'use client';

import { useId, useMemo } from 'react';

import type { IsoNoiseGrainLayer } from '@/lib/learn/isoNoise';

type IsoNoiseGrainOverlayProps = {
  grain: IsoNoiseGrainLayer;
};

const NOISE_LIGHT = '/learn/noise-iso-light.svg';
const NOISE_DARK = '/learn/noise-iso-dark.svg';

const CHROMA_TILE_LAYERS = [
  {
    src: NOISE_LIGHT,
    bgPos: '0px 0px',
    hueRotate: 0,
    blend: 'soft-light' as const,
    sizeMul: 1,
    weight: 1,
  },
  {
    src: NOISE_DARK,
    bgPos: '61px 104px',
    hueRotate: 34,
    blend: 'multiply' as const,
    sizeMul: 1.04,
    weight: 0.55,
  },
  {
    src: NOISE_LIGHT,
    bgPos: '127px 38px',
    hueRotate: -46,
    blend: 'normal' as const,
    sizeMul: 0.95,
    weight: 0.4,
  },
] as const;

const TURBULENCE_LIGHT_SEED = 13;
const TURBULENCE_DARK_SEED = 52;

/**
 * Bitmap noise tiles + procedural RGB turbulence on top of the exposure preview.
 */
export default function IsoNoiseGrainOverlay({ grain }: IsoNoiseGrainOverlayProps) {
  const rawId = useId();
  const uid = rawId.replace(/:/g, '');
  const filterIdLight = `learn-iso-chroma-light-${uid}`;
  const filterIdDark = `learn-iso-chroma-dark-${uid}`;

  const { opacity, brightness, contrast, saturate, tilePx, strength, chromaStrength } = grain;

  const tileFilter = useMemo(
    () => `brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`,
    [brightness, contrast, saturate],
  );

  const darkTileFilter = useMemo(
    () => `brightness(${Math.max(0.75, brightness - 0.18)}) contrast(${contrast * 1.08}) saturate(${saturate})`,
    [brightness, contrast, saturate],
  );

  const lumaOpacity = opacity * (0.3 + strength * 0.72);
  const darkLumaOpacity = opacity * (0.18 + strength * 0.48);
  const chromaTileOpacity = opacity * chromaStrength * 0.52;
  const svgLightOpacity = opacity * (0.14 + chromaStrength * 0.48);
  const svgDarkOpacity = opacity * (0.1 + chromaStrength * 0.38);
  const turbulenceFreqLight = 0.42 + strength * 0.24;
  const turbulenceFreqDark = 0.51 + strength * 0.3;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      aria-hidden
    >
      <div
        className="absolute inset-0 bg-repeat mix-blend-soft-light"
        style={{
          backgroundImage: `url('${NOISE_LIGHT}')`,
          backgroundPosition: '0px 0px',
          backgroundSize: `${tilePx}px ${tilePx}px`,
          opacity: lumaOpacity,
          filter: tileFilter,
        }}
      />
      <div
        className="absolute inset-0 bg-repeat mix-blend-multiply"
        style={{
          backgroundImage: `url('${NOISE_DARK}')`,
          backgroundPosition: '83px 47px',
          backgroundSize: `${Math.round(tilePx * 1.06)}px ${Math.round(tilePx * 1.06)}px`,
          opacity: darkLumaOpacity,
          filter: darkTileFilter,
        }}
      />
      {CHROMA_TILE_LAYERS.map((layer) => (
        <div
          key={`${layer.src}-${layer.bgPos}-${layer.hueRotate}`}
          className="absolute inset-0 bg-repeat"
          style={{
            backgroundImage: `url('${layer.src}')`,
            backgroundPosition: layer.bgPos,
            backgroundSize: `${Math.round(tilePx * layer.sizeMul)}px ${Math.round(tilePx * layer.sizeMul)}px`,
            opacity: chromaTileOpacity * layer.weight,
            mixBlendMode: layer.blend,
            filter: `${layer.src === NOISE_DARK ? darkTileFilter : tileFilter} hue-rotate(${layer.hueRotate}deg)`,
          }}
        />
      ))}
      <svg
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        <defs>
          <filter
            id={filterIdLight}
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency={turbulenceFreqLight}
              numOctaves={4}
              seed={TURBULENCE_LIGHT_SEED}
              stitchTiles="stitch"
              result="turbulence"
            />
            <feColorMatrix
              in="turbulence"
              type="matrix"
              values="1 0.12 0.08 0 0
                0.1 0.9 0.12 0 0
                0.08 0.1 1 0 0
                0 0 0 0.5 0"
              result="chroma"
            />
            <feComponentTransfer
              in="chroma"
            >
              <feFuncR
                type="linear"
                slope={0.85 + chromaStrength * 0.35}
                intercept={0.08 * chromaStrength}
              />
              <feFuncG
                type="linear"
                slope={0.85 + chromaStrength * 0.32}
                intercept={0.06 * chromaStrength}
              />
              <feFuncB
                type="linear"
                slope={0.85 + chromaStrength * 0.38}
                intercept={0.07 * chromaStrength}
              />
            </feComponentTransfer>
          </filter>
          <filter
            id={filterIdDark}
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency={turbulenceFreqDark}
              numOctaves={3}
              seed={TURBULENCE_DARK_SEED}
              stitchTiles="stitch"
              result="turbulence"
            />
            <feColorMatrix
              in="turbulence"
              type="matrix"
              values="0.75 0.2 0.15 0 0
                0.12 0.7 0.18 0 0
                0.15 0.12 0.72 0 0
                0 0 0 0.48 0"
              result="chroma"
            />
          </filter>
        </defs>
        <rect
          width="100%"
          height="100%"
          filter={`url(#${filterIdLight})`}
          style={{ mixBlendMode: 'soft-light', opacity: svgLightOpacity }}
        />
        <rect
          width="100%"
          height="100%"
          filter={`url(#${filterIdDark})`}
          style={{ mixBlendMode: 'multiply', opacity: svgDarkOpacity }}
        />
      </svg>
    </div>
  );
}
