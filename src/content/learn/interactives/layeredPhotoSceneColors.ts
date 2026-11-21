/** Colors for the exposure scene. Ground runs from the front grass back to the mountains. */
export const layeredPhotoSceneColors = {
  sky: {
    top: '#609BC0',
    middle: '#DDAE9B',
    horizon: '#F4C18F',
  },
  cloud: '#F4DCC5',
  sun: '#FFE4A8',
  sunCore: '#FFFDF8',

  ground: {
    foreground: '#354E3F',
    near: '#496451',
    mid: '#547C76',
    distant: '#4D8197',
    far: '#9BAEAD',
  },

  nearBushes: '#294C3F',
  nearBushesShade: '#203B35',

  distantTrunks: '#34596A',
  distantTrees: '#356B78',

  midTree: '#496A63',
  midTreeShade: '#44615b',
  midTrunk: '#72583D',

  cottageWall: '#263B43',
  cottageRoof: '#87634A',

  birds: '#263D49',

  person: '#1D3038',
  personShadow: '#172B2860',

  focusMark: '#ffffff',
  focusMarkLocked: '#00ff00',
  focusMarkFailed: '#ff3b30',
  focusMarkShadow: 'rgb(20 35 35 / 0.75)',
} as const;
