import { describe, expect, it } from 'vitest';

import { focusPlaneFromClickTarget, layerBlursForFocus } from './focusPlane';

describe('focusPlane', () => {
  it('reads focus plane from clicked element ancestors', () => {
    const host = { getAttribute: (name: string) => (name === 'data-learn-focus-plane' ? 'mid' : null) };
    const path = {
      closest: (selector: string) => (selector === '[data-learn-focus-plane]' ? host : null),
    } as unknown as Element;
    expect(focusPlaneFromClickTarget(path)).toBe('mid');
    expect(focusPlaneFromClickTarget({ closest: () => null } as unknown as Element)).toBeNull();
  });

  it('sharpens the chosen plane when aperture is wide', () => {
    const shallow = layerBlursForFocus('foreground', 0);
    expect(shallow[5]).toBe(0);
    expect(shallow[0]).toBeGreaterThan(shallow[3]);

    const deep = layerBlursForFocus('foreground', 1);
    expect(deep.every((b) => b === 0)).toBe(true);
  });

  it('keeps the near plane only gently soft when focus is close', () => {
    const close = layerBlursForFocus('foreground', 0);
    expect(close[5]).toBe(0);
    expect(close[4]).toBeGreaterThan(0);
    expect(close[4]).toBeLessThan(3.5);
    expect(close[4]).toBeLessThan(close[3] * 0.5);
    expect(close[0]).toBeGreaterThan(close[3]);
    expect(close[0]).toBeLessThan(9);
  });

  it('keeps the foreground softer than the background when focus is mid', () => {
    const mid = layerBlursForFocus('mid', 0);
    const close = layerBlursForFocus('foreground', 0);
    expect(mid[3]).toBe(0);
    expect(mid[5]).toBeGreaterThan(mid[0] * 3);
    expect(mid[0]).toBeGreaterThan(0);
    expect(mid[0]).toBeLessThan(close[0] * 0.25);
    expect(close[0] - close[3]).toBeLessThan(3);
  });

  it('keeps far and mid separated at f/4, scaled by the same aperture strength', () => {
    const wideMid = layerBlursForFocus('mid', 0);
    const atF4Mid = layerBlursForFocus('mid', 0.6);
    expect(atF4Mid[3]).toBe(0);
    expect(atF4Mid[0]).toBeGreaterThan(0);
    expect(atF4Mid[0]).toBeCloseTo(wideMid[0] * 0.4);
    expect(atF4Mid[5]).toBeGreaterThan(atF4Mid[0]);

    const atF4Far = layerBlursForFocus('far', 0.6);
    expect(atF4Far[0]).toBe(0);
    expect(atF4Far[3]).toBeGreaterThan(0);
    expect(atF4Far[3]).toBeCloseTo(layerBlursForFocus('far', 0)[3] * 0.4);
    expect(atF4Far[5]).toBeGreaterThan(atF4Far[3]);
  });

  it('places near and distant blur between the planes around them', () => {
    const close = layerBlursForFocus('foreground', 0);
    expect(close[4]).toBeGreaterThan(0);
    expect(close[4]).toBeLessThan(close[3]);
    expect(close[3]).toBeLessThan(close[2]);
    expect(close[2]).toBeLessThan(close[0]);

    const mid = layerBlursForFocus('mid', 0);
    expect(mid[4]).toBeGreaterThan(0);
    expect(mid[4]).toBeLessThan(mid[5]);
    expect(mid[2]).toBeGreaterThan(0);
    expect(mid[2]).toBeLessThan(mid[0]);
  });

  it('adds uniform diffraction blur on every layer', () => {
    const even = layerBlursForFocus('foreground', 1, 4);
    expect(even.every((b) => b === 4)).toBe(true);

    const far = layerBlursForFocus('far', 1, 4);
    expect(far.every((b) => b === 4)).toBe(true);
  });
});
