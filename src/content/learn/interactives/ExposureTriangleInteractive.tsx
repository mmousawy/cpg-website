'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  apertureDiffractionBlurStd,
  apertureEvenFocusDepth,
  apertureVignetteOpacity,
  LEARN_OPTIMAL_APERTURE_INDEX,
} from '@/lib/learn/apertureFocus';
import { exposureHistogramBins } from '@/lib/learn/exposureHistogram';
import {
  exposureBaselineHint,
  exposureBrightnessMultiplier,
  exposureClipOverlays,
  focusExposureCorrection,
  LEARN_EXPOSURE_REFERENCE_STOPS,
  sunDiskForExposure,
  sunHighlightStrength,
} from '@/lib/learn/exposureScene';
import {
  exposureHintFromPixels,
  measureExposurePixels,
  type ExposurePixelSample,
} from '@/lib/learn/exposurePixels';
import { exposureStops } from '@/lib/learn/exposureStops';
import type { LearnFocusPlane } from '@/lib/learn/focusPlane';
import { isoNoiseGrainLayer } from '@/lib/learn/isoNoise';
import { shutterMotionBlurStdX } from '@/lib/learn/shutterMotionBlur';

import { layeredPhotoSceneColors as sceneColors } from './layeredPhotoSceneColors';
import { rasterizeSvg } from './rasterizeSvg';
import { LEARN_SCENE_TRANSITION_MS, learnSceneTransition } from './useAnimatedNumbers';
import ExposureHistogram from './ExposureHistogram';
import IsoNoiseGrainOverlay from './IsoNoiseGrainOverlay';
import LayeredPhotoScene, { FOCUS_MARK_HIDE_MS, FocusSquare, type LearnFocusMark } from './LayeredPhotoScene';

const F_STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16] as const;
const SHUTTER_LABELS = [
  '1/4000',
  '1/2000',
  '1/1000',
  '1/500',
  '1/250',
  '1/125',
  '1/60',
  '1/30',
  '1/15',
  '1/8',
  '1/4',
  '1/2',
  '1s',
] as const;
const SHUTTER_SECONDS = [
  1 / 4000,
  1 / 2000,
  1 / 1000,
  1 / 500,
  1 / 250,
  1 / 125,
  1 / 60,
  1 / 30,
  1 / 15,
  1 / 8,
  1 / 4,
  1 / 2,
  1,
] as const;
const ISO_STOPS = [100, 200, 400, 800, 1600, 3200, 6400] as const;

function sliderClass() {
  return 'w-full accent-primary';
}

function labelClass() {
  return 'text-sm font-medium text-foreground/80';
}

export default function ExposureTriangleInteractive() {
  const [fIndex, setFIndex] = useState(2);
  const [shutterIndex, setShutterIndex] = useState(2);
  const [isoIndex, setIsoIndex] = useState(1);
  const [focusPlane, setFocusPlane] = useState<LearnFocusPlane>('foreground');
  const [focusMark, setFocusMark] = useState<LearnFocusMark>({ x: 380, y: 350, phase: 'white' });
  const [assist, setAssist] = useState<{ aperture: number; iso: number } | null>(null);
  const [focusReveal, setFocusReveal] = useState(0);
  const focusAssistTimer = useRef(0);
  const clipAmounts = useRef({ white: 0, black: 0 });

  const f = F_STOPS[fIndex];
  const shutterSec = SHUTTER_SECONDS[shutterIndex];
  const iso = ISO_STOPS[isoIndex];

  const {
    brightnessMultiplier,
    clipWhite,
    clipBlack,
    stopsFromMiddle,
    focusDepth,
    diffractionBlur,
    vignetteOpacity,
    birdMotionBlurX,
    isoNoiseGrain,
    histogramBins,
  } = useMemo(() => {
    const stops = exposureStops(f, shutterSec, iso);
    const clips = exposureClipOverlays(stops);
    const maxFIndex = F_STOPS.length - 1;
    const brightnessMultiplier = exposureBrightnessMultiplier(stops);
    const isoNoiseGrain = isoNoiseGrainLayer(iso);
    return {
      brightnessMultiplier,
      clipWhite: clips.white,
      clipBlack: clips.black,
      stopsFromMiddle: stops - LEARN_EXPOSURE_REFERENCE_STOPS,
      focusDepth: apertureEvenFocusDepth(fIndex),
      diffractionBlur: apertureDiffractionBlurStd(fIndex, LEARN_OPTIMAL_APERTURE_INDEX, maxFIndex),
      vignetteOpacity: apertureVignetteOpacity(fIndex),
      birdMotionBlurX: shutterMotionBlurStdX(shutterSec),
      isoNoiseGrain,
      histogramBins: exposureHistogramBins(
        brightnessMultiplier,
        clips.white,
        clips.black,
        isoNoiseGrain.strength,
      ),
    };
  }, [f, shutterSec, iso, fIndex]);

  clipAmounts.current = { white: clipWhite, black: clipBlack };

  useEffect(() => () => window.clearTimeout(focusAssistTimer.current), []);

  const handleFocusPlane = useCallback((plane: LearnFocusPlane) => {
    const clipped = clipAmounts.current.white > 0.12 || clipAmounts.current.black > 0.12;
    if (!clipped) {
      window.clearTimeout(focusAssistTimer.current);
      setAssist(null);
      setFocusPlane(plane);
      return 'immediate' as const;
    }
    const correction = focusExposureCorrection(shutterSec, F_STOPS, ISO_STOPS);
    if (!correction.reachable) {
      window.clearTimeout(focusAssistTimer.current);
      setAssist(null);
      return 'rejected' as const;
    }
    setAssist({ aperture: correction.aperture, iso: correction.iso });
    window.clearTimeout(focusAssistTimer.current);
    focusAssistTimer.current = window.setTimeout(() => {
      setFocusPlane(plane);
      setFocusReveal((current) => current + 1);
      focusAssistTimer.current = window.setTimeout(() => setAssist(null), FOCUS_MARK_HIDE_MS);
    }, LEARN_SCENE_TRANSITION_MS);
    return 'wait' as const;
  }, [shutterSec]);

  const assisted = assist == null
    ? null
    : (() => {
      const stops = exposureStops(assist.aperture, shutterSec, assist.iso);
      const clips = exposureClipOverlays(stops);
      return {
        brightness: exposureBrightnessMultiplier(stops),
        clipWhite: clips.white,
        clipBlack: clips.black,
      };
    })();
  const viewBrightness = assisted?.brightness ?? brightnessMultiplier;
  const viewClipWhite = assisted?.clipWhite ?? clipWhite;
  const viewClipBlack = assisted?.clipBlack ?? clipBlack;
  const sunDisk = sunDiskForExposure(viewBrightness, viewClipBlack);
  const previewRef = useRef<HTMLDivElement>(null);
  const baselineSample = useRef<ExposurePixelSample | null>(null);
  const sampleGeneration = useRef(0);
  const [pixelRead, setPixelRead] = useState<{ bins: number[]; hint: string } | null>(null);

  useEffect(() => {
    const svg = previewRef.current?.querySelector('svg');
    if (!(svg instanceof SVGSVGElement)) return;
    const generation = ++sampleGeneration.current;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const sampleWidth = 320;
      const sampleHeight = 200;
      void rasterizeSvg(svg, sampleWidth, sampleHeight).then((pixels) => {
        if (cancelled || generation !== sampleGeneration.current || !pixels) return;
        const sample = measureExposurePixels(pixels, sampleWidth, sampleHeight, {
          brightness: viewBrightness,
          clipWhite: viewClipWhite,
          clipBlack: viewClipBlack,
          vignetteOpacity,
          sunGlowOpacity: sunHighlightStrength(viewBrightness) * 0.15,
          sunColor: sceneColors.sun,
          sunDiskColor: sunDisk.color,
          sunDiskOpacity: sunDisk.opacity,
        });
        if (Math.abs(stopsFromMiddle) < 0.05) baselineSample.current = sample;
        const baseline = baselineSample.current ?? sample;
        setPixelRead({
          bins: sample.bins,
          hint: exposureHintFromPixels(sample, baseline),
        });
      });
    }, 48);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [birdMotionBlurX, diffractionBlur, focusDepth, focusPlane, stopsFromMiddle, sunDisk.color, sunDisk.opacity, viewBrightness, viewClipBlack, viewClipWhite, vignetteOpacity]);

  const exposureHint = pixelRead?.hint ?? exposureBaselineHint(stopsFromMiddle, clipWhite, clipBlack);
  const displayedHistogram = pixelRead?.bins ?? histogramBins;

  return (
    <div
      className="flex w-full max-w-3xl flex-col gap-8"
    >
      <div
        ref={previewRef}
        className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-border-color bg-[#1a1f28] shadow-inner"
      >
        <div
          className="absolute inset-0"
          style={{ filter: `brightness(${viewBrightness})`, transition: learnSceneTransition }}
        >
          <LayeredPhotoScene
            focusDepth={focusDepth}
            focusPlane={focusPlane}
            onFocusPlaneChange={handleFocusPlane}
            focusReveal={focusReveal}
            birdMotionBlurX={birdMotionBlurX}
            diffractionBlur={diffractionBlur}
            onFocusMarkChange={setFocusMark}
          />
        </div>
        <IsoNoiseGrainOverlay
          grain={isoNoiseGrain}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            mixBlendMode: 'plus-lighter',
            opacity: sunHighlightStrength(viewBrightness) * 0.15,
            transition: learnSceneTransition,
            background: `radial-gradient(ellipse 68% 22% at 65% 22%, #ffffff 0%, #ffffff 5%, ${sceneColors.sun} 28%, transparent 72%)`,
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-white"
          style={{ opacity: viewClipWhite, mixBlendMode: 'plus-lighter', transition: learnSceneTransition }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-black"
          style={{ opacity: viewClipBlack, transition: learnSceneTransition }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: vignetteOpacity,
            transition: learnSceneTransition,
            background:
              'radial-gradient(circle at center, transparent 42%, rgba(0, 0, 0, 0.38) 100%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute aspect-square w-[2.6%] rounded-full mix-blend-plus-lighter"
          style={{
            left: '65%',
            top: '22%',
            transform: 'translate(-50%, -50%)',
            background: sunDisk.color,
            opacity: sunDisk.opacity,
            transition: learnSceneTransition,
            filter: 'blur(2px)',
          }}
          aria-hidden
        />
        <FocusSquare
          mark={focusMark}
        />
        <ExposureHistogram
          bins={displayedHistogram}
        />
        <div
          className="pointer-events-none absolute inset-0 z-10 rounded-2xl"
          style={{ boxShadow: 'inset 0 0 0 10px #000' }}
          aria-hidden
        />
        <div
          className="absolute inset-x-0 bottom-0 z-20 bg-linear-to-t from-black/55 to-transparent p-4 pt-10 pointer-events-none"
        >
          <p
            className="text-center text-sm font-medium text-white/95 sm:text-base"
          >
            {exposureHint}
          </p>
        </div>
      </div>

      <div
        className="grid gap-6 sm:grid-cols-3"
      >
        <div
          className="flex flex-col gap-2"
        >
          <label
            htmlFor="learn-exposure-aperture"
            className={labelClass()}
          >
            Aperture
            {' '}
            f/
            {f}
          </label>
          <input
            id="learn-exposure-aperture"
            type="range"
            min={0}
            max={F_STOPS.length - 1}
            value={fIndex}
            onChange={(e) => setFIndex(Number(e.target.value))}
            className={sliderClass()}
          />
          <p
            className="text-xs text-foreground/60"
          >
            Wider aperture (lower f-number) lets in more light.
          </p>
        </div>

        <div
          className="flex flex-col gap-2"
        >
          <label
            htmlFor="learn-exposure-shutter"
            className={labelClass()}
          >
            Shutter
            {' '}
            {SHUTTER_LABELS[shutterIndex]}
          </label>
          <input
            id="learn-exposure-shutter"
            type="range"
            min={0}
            max={SHUTTER_SECONDS.length - 1}
            value={shutterIndex}
            onChange={(e) => setShutterIndex(Number(e.target.value))}
            className={sliderClass()}
          />
          <p
            className="text-xs text-foreground/60"
          >
            Slower shutter keeps the sensor exposed longer and can blur moving birds.
          </p>
        </div>

        <div
          className="flex flex-col gap-2"
        >
          <label
            htmlFor="learn-exposure-iso"
            className={labelClass()}
          >
            ISO
            {' '}
            {iso}
          </label>
          <input
            id="learn-exposure-iso"
            type="range"
            min={0}
            max={ISO_STOPS.length - 1}
            value={isoIndex}
            onChange={(e) => setIsoIndex(Number(e.target.value))}
            className={sliderClass()}
          />
          <p
            className="text-xs text-foreground/60"
          >
            Higher ISO amplifies the signal (and noise).
          </p>
        </div>
      </div>
    </div>
  );
}
