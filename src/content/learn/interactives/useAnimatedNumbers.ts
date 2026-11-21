'use client';

import { useEffect, useRef, useState } from 'react';

export const LEARN_SCENE_TRANSITION_MS = 420;

export const learnSceneTransition = [
  `opacity ${LEARN_SCENE_TRANSITION_MS}ms ease`,
  `filter ${LEARN_SCENE_TRANSITION_MS}ms ease`,
  `background-size ${LEARN_SCENE_TRANSITION_MS}ms ease`,
].join(', ');

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

/** Ease a list of numbers toward new targets. The key is the joined values, so a fresh array with the same numbers does not restart. */
export function useAnimatedNumbers(targets: readonly number[], durationMs = LEARN_SCENE_TRANSITION_MS): number[] {
  const [values, setValues] = useState(() => [...targets]);
  const valuesRef = useRef(values);
  const frameRef = useRef(0);
  const targetsKey = targets.join(',');

  useEffect(() => {
    const nextTargets = targetsKey.length === 0 ? [] : targetsKey.split(',').map(Number);
    const from = valuesRef.current;
    if (from.length !== nextTargets.length) {
      valuesRef.current = nextTargets;
      setValues(nextTargets);
      return;
    }

    const start = performance.now();
    cancelAnimationFrame(frameRef.current);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      const next = nextTargets.map((target, index) => from[index]! + (target - from[index]!) * eased);
      valuesRef.current = next;
      setValues(next);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [durationMs, targetsKey]);

  return values;
}
