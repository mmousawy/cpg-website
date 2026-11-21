import type { LearnLesson } from '../types';

export const exposureLesson: LearnLesson = {
  slug: 'exposure',
  title: 'The exposure triangle',
  summary:
    'How aperture, shutter speed, and ISO work together to control brightness — and what each one costs you.',
  slides: [
    {
      kind: 'title',
      title: 'The exposure triangle',
      subtitle: 'Three settings that trade off to control brightness',
    },
    {
      kind: 'prose',
      heading: 'What is exposure?',
      paragraphs: [
        'Exposure is how much light reaches the sensor (or film) while the shutter is open. Too little and the photo looks dark; too much and the highlights blow out to white and lose detail you can never get back.',
        'You balance exposure with three controls that trade off against each other: aperture, shutter speed, and ISO.',
      ],
    },
    {
      kind: 'bullets',
      heading: 'The three controls',
      items: [
        'Aperture — how wide the lens opens (the f-number).',
        'Shutter speed — how long the sensor is collecting light.',
        'ISO — how much the camera amplifies that light.',
      ],
    },
    {
      kind: 'prose',
      heading: 'Aperture',
      paragraphs: [
        'A wider aperture — a smaller f-number like f/2.8 — lets in more light and gives a shallower depth of field. That is how portraits get the creamy, out-of-focus background.',
        'A narrower aperture like f/11 or f/16 keeps more of the scene in focus, which is what you want for landscapes, but it also needs more light or a slower shutter.',
      ],
    },
    {
      kind: 'prose',
      heading: 'Shutter speed',
      paragraphs: [
        'Fast shutter speeds freeze motion — sports, kids, wildlife, anything handheld in good light.',
        'Slow shutters let motion blur across the frame, which is beautiful for waterfalls and traffic, but hold the camera still or the whole photo blurs. A common starting point is 1 over your focal length (1/100 s with a 100 mm lens); image stabilization buys you several stops below that.',
      ],
    },
    {
      kind: 'prose',
      heading: 'ISO',
      paragraphs: [
        'ISO raises the signal when light is scarce. Higher ISO brightens the image, but it also brings out noise — the digital grain, strongest in the shadows.',
        'The habit: pick the lowest ISO that still gives you a shutter speed you can hand-hold, then let aperture handle the rest.',
      ],
    },
    {
      kind: 'prose',
      heading: 'Modes that balance for you',
      paragraphs: [
        'Most of the time you pick one setting and let the camera balance the others. The mode dial names tell you who is in charge: P (program) is almost automatic, Av or A locks your aperture, Tv or S locks your shutter speed, and M puts all three in your hands.',
        'Even in the semi-auto modes you can nudge the result with exposure compensation — the +/– button — when the camera reads the scene darker or brighter than you want.',
      ],
    },
    {
      kind: 'prose',
      heading: 'Balancing in stops',
      paragraphs: [
        'Each setting moves in "stops" — one stop means doubling or halving the light. Opening the aperture one stop, slowing the shutter one stop, and raising ISO one stop all add the same amount of light.',
        'That is the trade: take a stop away from one corner and you can give it back at either of the other two without changing brightness — just the look.',
      ],
    },
    {
      kind: 'interactive',
      heading: 'Try the triangle',
      interactiveId: 'exposure-triangle',
    },
    {
      kind: 'bullets',
      heading: 'Takeaways',
      items: [
        'Brightness is a balance of three settings, not a single dial.',
        'Each control has a creative side effect: depth of field, motion, or noise.',
        'Think in stops — the three controls speak the same language once they do.',
      ],
    },
  ],
};
