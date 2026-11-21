import type { LearnLesson } from '../types';

export const exposureLesson: LearnLesson = {
  slug: 'exposure',
  title: 'Exposure',
  summary: 'How aperture, shutter speed, and ISO work together to control brightness.',
  slides: [
    {
      kind: 'title',
      title: 'Exposure',
      subtitle: 'The exposure triangle in plain language',
    },
    {
      kind: 'prose',
      heading: 'What is exposure?',
      paragraphs: [
        'Exposure is how much light reaches your camera sensor (or film). Too little and the photo looks dark; too much and highlights blow out.',
        'You control exposure with three settings that trade off against each other: aperture, shutter speed, and ISO.',
      ],
    },
    {
      kind: 'bullets',
      heading: 'The three controls',
      items: [
        'Aperture — how wide the lens opens (f-number)',
        'Shutter speed — how long light is collected',
        'ISO — how sensitive the sensor is',
      ],
    },
    {
      kind: 'prose',
      heading: 'Aperture',
      paragraphs: [
        'A wider aperture (a smaller f-number, like f/2.8) lets in more light and gives a shallower depth of field — great for portraits with blurry backgrounds.',
        'A narrower aperture (f/11 or f/16) gives more depth of field but needs more light or a slower shutter.',
      ],
    },
    {
      kind: 'prose',
      heading: 'Shutter speed',
      paragraphs: [
        'Fast shutter speeds freeze motion — sports, wildlife, handheld sharpness.',
        'Slow shutters blur motion (waterfalls) but need a tripod or image stabilization.',
      ],
    },
    {
      kind: 'prose',
      heading: 'ISO',
      paragraphs: [
        'ISO raises sensitivity when light is scarce. Higher ISO brightens the image but adds noise.',
        'Start with the lowest ISO that still gives a workable shutter speed, then adjust aperture or shutter.',
      ],
    },
    {
      kind: 'interactive',
      heading: 'Exposure triangle demo',
      interactiveId: 'exposure-triangle',
    },
    {
      kind: 'bullets',
      heading: 'Takeaways',
      items: [
        'Brightness is a balance — not a single dial',
        'Each control has a creative side effect, not just exposure',
        'Metering and practice beat memorizing charts',
      ],
    },
  ],
};
