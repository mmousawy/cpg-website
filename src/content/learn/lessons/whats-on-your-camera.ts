import type { LearnLesson } from '../types';

export const whatsOnYourCameraLesson: LearnLesson = {
  slug: 'whats-on-your-camera',
  title: "What's on your camera",
  summary:
    'A quick map of the body, lens, and controls your hands return to in the field.',
  slides: [
    {
      kind: 'title',
      title: "What's on your camera",
      subtitle: 'Know the parts before you hunt for a dial in the dark',
    },
    {
      kind: 'prose',
      heading: 'Same jobs, different layouts',
      paragraphs: [
        'Every camera has the same short list of jobs: hold steady, aim, focus, expose, review. Manufacturers rearrange the buttons, but the parts keep the same names.',
        'Once you can name a control — mode dial, command dial, lens release — every manual, menu, and tutorial gets faster to read.',
      ],
    },
    {
      kind: 'interactive',
      heading: 'Part names on the body',
      interactiveId: 'camera-anatomy',
    },
    {
      kind: 'prose',
      heading: 'Three zones your hands return to',
      paragraphs: [
        'Right hand on the grip: shutter, main dial, and a custom button or two. This is where you change exposure without lowering the camera from your eye.',
        'Left hand under the lens: zoom ring, focus ring, and stabilization or AF switches. Supporting the lens here steadies the whole rig at the same time.',
        'Thumb on the back: AF-ON, joystick, and rear dial — moving the focus point and nudging exposure both live under this thumb.',
      ],
    },
    {
      kind: 'prose',
      heading: 'The mode dial sets the tone',
      paragraphs: [
        'One knob on the top plate decides how much the camera does for you. Auto and scene modes pick everything. P, Av, Tv, and M hand increasing amounts of control to you — the exposure lesson is really a tour of that dial.',
        'Learn where your mode dial is and how it locks or clicks between positions. It is the first thing to check when a photo comes out wildly wrong.',
      ],
    },
    {
      kind: 'bullets',
      heading: 'DSLR vs mirrorless (quick)',
      items: [
        'DSLR: a mirror sends light to an optical finder — you see the real scene and hear a mirror slap at capture.',
        'Mirrorless: the sensor feeds a small screen inside the finder, previewing exposure and focus before you press the shutter.',
        'Controls and parts names are nearly the same; the big differences are what you see in the finder and how quietly the camera fires.',
      ],
    },
    {
      kind: 'bullets',
      heading: 'Habits that pay off fast',
      items: [
        'With the camera off, trace the grip, top plate, and back until you can reach shutter, mode dial, and lens release without looking.',
        'Before you shoot: mode dial where you expect, card seated, battery charged — most false alarms start with one of those.',
        'Wait for the activity light to stop before opening the memory or battery door; the camera may still be writing files.',
        'When a menu or manual mentions a part you do not recognize, find the numbered callout on the body and learn that name once.',
      ],
    },
  ],
};
