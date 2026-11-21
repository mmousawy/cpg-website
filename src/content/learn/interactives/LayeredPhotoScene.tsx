'use client';

import { useCallback, useEffect, useId, useMemo, useState } from 'react';

import {
  focusPlaneFromClickTarget,
  layerBlursForFocus,
  type LearnFocusPlane,
} from '@/lib/learn/focusPlane';

import { layeredPhotoSceneColors as sceneColors } from './layeredPhotoSceneColors';
import { useAnimatedNumbers } from './useAnimatedNumbers';
import {
  LEARN_GULL_PAIR_HEIGHT,
  LEARN_GULL_PAIR_PATHS,
  LEARN_GULL_PAIR_WIDTH,
  LEARN_GULL_PAIR_VIEW_BOX,
} from './learnGullPath';

export type LearnFocusMark = {
  x: number;
  y: number;
  phase: 'white' | 'green' | 'red' | 'hidden';
};

/** Focus box in viewBox units. Stroke stays 4 CSS pixels via non-scaling-stroke. */
const FOCUS_MARK_SIZE = 32;
const FOCUS_MARK_STROKE = 4;
const FOCUS_MARK_GREEN_MS = 200;
export const FOCUS_MARK_HIDE_MS = 1400;

export type LayeredPhotoSceneProps = {
  /** 0 = shallow depth of field (strong layer blur), 1 = everything sharp */
  focusDepth: number;
  focusPlane: LearnFocusPlane;
  onFocusPlaneChange: (plane: LearnFocusPlane) => 'rejected' | 'immediate' | 'wait';
  /** Bumps after exposure has finished moving, so the focus square can start. */
  focusReveal?: number;
  onFocusMarkChange?: (mark: LearnFocusMark) => void;
  /** Horizontal motion blur on birds (slow shutter → higher). */
  birdMotionBlurX?: number;
  /** Uniform softness (e.g. diffraction at f/11+). */
  diffractionBlur?: number;
};

export function FocusSquare({ mark }: { mark: LearnFocusMark }) {
  if (mark.phase === 'hidden') return null;
  return (
    <svg
      viewBox="0 0 800 500"
      className="pointer-events-none absolute inset-0 z-[15] h-full w-full"
      aria-hidden
    >
      <rect
        data-focus-mark={mark.phase}
        x={mark.x - FOCUS_MARK_SIZE / 2}
        y={mark.y - FOCUS_MARK_SIZE / 2}
        width={FOCUS_MARK_SIZE}
        height={FOCUS_MARK_SIZE}
        fill="none"
        stroke={
          mark.phase === 'red'
            ? sceneColors.focusMarkFailed
            : mark.phase === 'green'
              ? sceneColors.focusMarkLocked
              : sceneColors.focusMark
        }
        strokeWidth={FOCUS_MARK_STROKE}
        vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(1px 1px 0 ${sceneColors.focusMarkShadow})` }}
      />
    </svg>
  );
}

const LAYER_COUNT = 6;

/** Default sits on the foreground figure (initial focus plane). */
const DEFAULT_FOCUS_POINT = { x: 380, y: 350 };

function clientToSvg(svg: SVGSVGElement, clientX: number, clientY: number) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) return null;
  return point.matrixTransform(matrix.inverse());
}

/** Two placements of the paired gulls (both paths from \`seagulls.svg\`). */
const GULL_PAIRS: { x: number; y: number; scale: number }[] = [
  { x: 128, y: 124, scale: 0.065 },
  { x: 172, y: 134, scale: 0.085 },
];

export default function LayeredPhotoScene({
  focusDepth,
  focusPlane,
  onFocusPlaneChange,
  onFocusMarkChange,
  focusReveal = 0,
  birdMotionBlurX = 0,
  diffractionBlur = 0,
}: LayeredPhotoSceneProps) {
  const uid = useId().replace(/:/g, '');
  const blurIds = useMemo(
    () => Array.from({ length: LAYER_COUNT }, (_, i) => `learn-scene-blur-${uid}-${i}`),
    [uid],
  );

  const blurs = useMemo(
    () => layerBlursForFocus(focusPlane, focusDepth, diffractionBlur),
    [diffractionBlur, focusDepth, focusPlane],
  );
  const animatedBlurs = useAnimatedNumbers(blurs);
  const [animatedBirdBlur] = useAnimatedNumbers([birdMotionBlurX]);
  const [focusMark, setFocusMark] = useState({ ...DEFAULT_FOCUS_POINT, id: 0, rejected: false, holdWhite: false });
  const [focusMarkPhase, setFocusMarkPhase] = useState<'white' | 'green' | 'red' | 'hidden'>('hidden');

  useEffect(() => {
    if (focusMark.id === 0) return;
    setFocusMarkPhase('white');
    if (focusMark.holdWhite) return;
    const showResult = window.setTimeout(() => {
      setFocusMarkPhase(focusMark.rejected ? 'red' : 'green');
    }, FOCUS_MARK_GREEN_MS);
    const hide = window.setTimeout(() => setFocusMarkPhase('hidden'), FOCUS_MARK_HIDE_MS);
    return () => {
      window.clearTimeout(showResult);
      window.clearTimeout(hide);
    };
  }, [focusMark.id, focusMark.rejected, focusMark.holdWhite]);

  useEffect(() => {
    onFocusMarkChange?.({ x: focusMark.x, y: focusMark.y, phase: focusMarkPhase });
  }, [focusMark.x, focusMark.y, focusMarkPhase, onFocusMarkChange]);

  useEffect(() => {
    if (focusReveal === 0) return;
    setFocusMarkPhase('green');
    const hide = window.setTimeout(() => setFocusMarkPhase('hidden'), FOCUS_MARK_HIDE_MS);
    return () => window.clearTimeout(hide);
  }, [focusReveal]);

  const handleSceneClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const plane = focusPlaneFromClickTarget(event.target as Element);
      if (!plane) return;
      const result = onFocusPlaneChange(plane);
      const local = clientToSvg(event.currentTarget, event.clientX, event.clientY);
      const point = { x: local?.x ?? 0, y: local?.y ?? 0 };
      setFocusMark((current) => ({
        x: point.x,
        y: point.y,
        id: current.id + 1,
        rejected: result === 'rejected',
        holdWhite: result === 'wait',
      }));
    },
    [onFocusPlaneChange],
  );

  return (
    <svg
      viewBox="0 0 800 500"
      role="img"
      aria-label="Layered landscape with a person in the foreground, illustrating exposure and depth of field"
      className="h-full w-full cursor-pointer"
      onClick={handleSceneClick}
    >
      <defs>
        {animatedBlurs.map((stdDev, i) => (
          <filter
            key={blurIds[i]}
            id={blurIds[i]}
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur
              stdDeviation={stdDev}
            />
          </filter>
        ))}
        <filter
          id={`learn-bird-motion-${uid}`}
          x="-120%"
          y="-50%"
          width="340%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur
            stdDeviation={`${animatedBirdBlur} ${Math.min(2.2, animatedBirdBlur * 0.12)}`}
          />
        </filter>
        <linearGradient
          id={`learn-sky-${uid}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop
            offset="0%"
            stopColor={sceneColors.sky.top}
          />
          <stop
            offset="55%"
            stopColor={sceneColors.sky.middle}
          />
          <stop
            offset="100%"
            stopColor={sceneColors.sky.horizon}
          />
        </linearGradient>
        <radialGradient
          id={`learn-sun-glow-${uid}`}
          cx="50%"
          cy="50%"
          r="50%"
        >
          <stop
            offset="0%"
            stopColor={sceneColors.sunCore}
          />
          <stop
            offset="12%"
            stopColor={sceneColors.sun}
          />
          <stop
            offset="100%"
            stopColor={sceneColors.sun}
            stopOpacity={0}
          />
        </radialGradient>
        <symbol
          id={`learn-gull-pair-${uid}`}
          viewBox={LEARN_GULL_PAIR_VIEW_BOX}
          overflow="visible"
        >
          {LEARN_GULL_PAIR_PATHS.map((d, i) => (
            <path
              key={i}
              d={d}
            />
          ))}
        </symbol>
      </defs>

      <g>
        {/* Far — sky */}
        <g
          data-learn-focus-plane="far"
          filter={animatedBlurs[0] > 0.01 ? `url(#${blurIds[0]})` : undefined}
        >
          <rect
            x="0"
            y="0"
            width="800"
            height="280"
            fill={`url(#learn-sky-${uid})`}
          />
          <g
            fill={sceneColors.cloud}
            data-learn-focus-plane="far"
            transform="translate(170 30)"
          >
            <ellipse
              cx="72"
              cy="86"
              rx="46"
              ry="20"
            />
            <ellipse
              cx="118"
              cy="74"
              rx="58"
              ry="26"
            />
            <ellipse
              cx="168"
              cy="82"
              rx="44"
              ry="22"
            />
            <ellipse
              cx="198"
              cy="94"
              rx="36"
              ry="17"
            />
            <ellipse
              cx="95"
              cy="98"
              rx="62"
              ry="16"
            />
          </g>
          <ellipse
            cx="520"
            cy="110"
            rx="300"
            ry="78"
            fill={`url(#learn-sun-glow-${uid})`}
          />
          <circle
            cx="520"
            cy="110"
            r="14"
            fill={sceneColors.sunCore}
          />
        </g>

        {/* Distant hills */}
        <g
          data-learn-focus-plane="far"
          filter={animatedBlurs[1] > 0.01 ? `url(#${blurIds[1]})` : undefined}
        >
          <path
            d="M0 260 L120 200 L260 240 L400 170 L560 220 L720 180 L800 210 L800 320 L0 320 Z"
            fill={sceneColors.ground.far}
          />
        </g>

        {/* Between far and mid — rounded mountains with pines */}
        <g
          data-learn-focus-plane="distant"
          filter={animatedBlurs[2] > 0.01 ? `url(#${blurIds[2]})` : undefined}
          transform="translate(0 -20)"
        >
          <path
            d="M0 330 C60 330 100 268 180 246 C240 230 280 268 340 286 C390 300 420 240 500 232 C560 226 600 270 660 262 C720 254 760 290 800 300 L800 420 L0 420 Z"
            fill={sceneColors.ground.distant}
          />
          <polygon
            points="214,214 198,250 230,250"
            fill={sceneColors.distantTrees}
          />
          <polygon
            points="214,236 202,264 226,264"
            fill={sceneColors.distantTrees}
          />
          <rect
            x="210"
            y="258"
            width="8"
            height="14"
            fill={sceneColors.distantTrunks}
          />
          <polygon
            points="508,198 490,240 526,240"
            fill={sceneColors.distantTrees}
          />
          <polygon
            points="508,224 494,256 522,256"
            fill={sceneColors.distantTrees}
          />
          <rect
            x="504"
            y="248"
            width="8"
            height="16"
            fill={sceneColors.distantTrunks}
          />
          <polygon
            points="668,236 654,268 682,268"
            fill={sceneColors.distantTrees}
          />
          <polygon
            points="668,254 656,282 680,282"
            fill={sceneColors.distantTrees}
          />
          <rect
            x="664"
            y="274"
            width="8"
            height="12"
            fill={sceneColors.distantTrunks}
          />
        </g>

        {/* Midground */}
        <g
          data-learn-focus-plane="mid"
          filter={animatedBlurs[3] > 0.01 ? `url(#${blurIds[3]})` : undefined}
        >
          <path
            d="M0 310 L180 270 L340 300 L500 250 L680 290 L800 265 L800 420 L0 420 Z"
            fill={sceneColors.ground.mid}
          />
          <rect
            x="110"
            y="264"
            width="75"
            height="54"
            rx="2"
            fill={sceneColors.cottageWall}
          />
          <polygon
            points="147,226 83,264 211,264"
            fill={sceneColors.cottageRoof}
          />
          <g
            transform="translate(35 0)"
          >
            <rect
              x="524"
              y="276"
              width="12"
              height="50"
              fill={sceneColors.midTrunk}
            />
            <circle
              cx="514"
              cy="264"
              r="15"
              fill={sceneColors.midTreeShade}
            />
            <circle
              cx="546"
              cy="260"
              r="17"
              fill={sceneColors.midTreeShade}
            />
            <circle
              cx="530"
              cy="248"
              r="16"
              fill={sceneColors.midTree}
            />
            <circle
              cx="522"
              cy="274"
              r="13"
              fill={sceneColors.midTree}
            />
            <circle
              cx="544"
              cy="272"
              r="14"
              fill={sceneColors.midTree}
            />
          </g>
          <g
            data-learn-focus-plane="mid"
            fill={sceneColors.birds}
          >
            {GULL_PAIRS.map((pair) => (
              <use
                key={`${pair.x}-${pair.y}-${pair.scale}`}
                href={`#learn-gull-pair-${uid}`}
                x={pair.x}
                y={pair.y}
                width={LEARN_GULL_PAIR_WIDTH * pair.scale}
                height={LEARN_GULL_PAIR_HEIGHT * pair.scale}
                filter={animatedBirdBlur > 0.08 ? `url(#learn-bird-motion-${uid})` : undefined}
              />
            ))}
          </g>
        </g>

        {/* Between mid and close — bushes in front of the cottage */}
        <g
          data-learn-focus-plane="near"
          filter={animatedBlurs[4] > 0.01 ? `url(#${blurIds[4]})` : undefined}
        >
          <path
            d="M0 356 Q190 328 360 346 T640 334 T800 350 L800 440 L0 440 Z"
            fill={sceneColors.ground.near}
          />
          <ellipse
            cx="210"
            cy="336"
            rx="46"
            ry="22"
            fill={sceneColors.nearBushes}
          />
          <ellipse
            cx="248"
            cy="348"
            rx="34"
            ry="16"
            fill={sceneColors.nearBushesShade}
          />
          <ellipse
            cx="640"
            cy="340"
            rx="40"
            ry="20"
            fill={sceneColors.nearBushes}
          />
          <ellipse
            cx="678"
            cy="350"
            rx="28"
            ry="14"
            fill={sceneColors.nearBushesShade}
          />
        </g>

        {/* Foreground — grass + in-focus subject */}
        <g
          data-learn-focus-plane="foreground"
          filter={animatedBlurs[5] > 0.01 ? `url(#${blurIds[5]})` : undefined}
        >
          <path
            d="M0 400 Q200 370 400 395 T800 385 L800 500 L0 500 Z"
            fill={sceneColors.ground.foreground}
          />
          <g
            transform="translate(330 260) scale(1.25)"
            fill={sceneColors.person}
            data-learn-focus-plane="foreground"
          >
            <ellipse
              cx="40"
              cy="138"
              rx="36"
              ry="9"
              fill={sceneColors.personShadow}
              filter="blur(1px)"
            />
            <path
              d="M40 6
                C30 6 22 14 22 25
                C22 32 26 38 32 40
                C25 42 20 48 20 58
                L24 94
                L18 138
                H32
                L36 104
                H44
                L48 138
                H62
                L56 94
                L60 58
                C60 48 55 42 48 40
                C54 38 58 32 58 25
                C58 14 50 6 40 6
                Z"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
