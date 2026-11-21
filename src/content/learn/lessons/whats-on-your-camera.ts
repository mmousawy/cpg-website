import type { LearnLesson } from '../types';

export const whatsOnYourCameraLesson: LearnLesson = {
  slug: 'whats-on-your-camera',
  title: "What's on your camera",
  summary: 'A quick map of the body, lens, and controls you will actually touch in the field.',
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
        'Manufacturers rearrange buttons, but the jobs repeat: hold steady, aim, focus, expose, review.',
        'Learning the names — mode dial, command dial, lens release — makes every manual and menu faster to read.',
      ],
    },
    {
      kind: 'interactive',
      heading: 'Part names on the body',
      interactiveId: 'camera-anatomy',
    },
    {
      kind: 'bullets',
      heading: 'Front of the body',
      items: [
        'Lens mount — bayonet ring; align index marks before twisting until it clicks',
        'Lens release — press while rotating the lens off; support the lens with your other hand',
        'AF/MF switch — often on the front or left; required for manual focus and many adapted lenses',
        'Depth-of-field preview — stops the lens down to your shooting f-number; the view may go dark on optical finders',
        'Grip and thumb ridge — stability beats a heavy shutter jab',
        'AF-assist / self-timer lamp — countdown blink and low-light AF pattern on many DSLRs',
      ],
    },
    {
      kind: 'bullets',
      heading: 'The lens',
      items: [
        'Front element and cap — fingerprints scratch coatings; cap both ends in the bag',
        'Zoom and focus rings — focal length vs distance; on mirrorless, focus rings may be electronic only in MF',
        'Lens switches — stabilization (OSS/IS/VR) and sometimes an AF override on longer zooms',
        'Hood — blocks flare from side light; petal shape clears corners at wide angles',
      ],
    },
    {
      kind: 'prose',
      heading: 'Top plate',
      paragraphs: [
        'Shutter on the grip: half-press for AF and metering, full press to capture.',
        'Mode dial chooses auto scenes, program, aperture priority, shutter priority, manual, or custom banks.',
        'Main and rear command dials change whichever setting is active in that mode.',
        'Hot shoe and focal-plane mark sit along the top — flash power is live; the mark shows where the sensor plane is for distance measurements.',
      ],
    },
    {
      kind: 'bullets',
      heading: 'Back and viewfinder',
      items: [
        'Optical vs electronic viewfinder — mirror prism vs tiny screen with exposure preview',
        'Diopter wheel — sharpens the finder for your eyes; set once',
        'Eye sensor — dims the rear LCD when you look through the finder',
        'AF-ON — back-button focus separates focusing from shutter release',
        'Joystick or multi-controller — moves AF points and menu choices',
        'Quick control / rear dial — exposure comp, scroll menus, or browse images in playback',
      ],
    },
    {
      kind: 'bullets',
      heading: 'Screen and everyday buttons',
      items: [
        'Rear LCD — menus, touch AF, live view; many bodies add a tilt or flip hinge',
        'Playback and delete — review and clear mistakes before the card fills up',
        'Menu vs Info/DISP — deep settings vs cycling shooting overlays (grid, histogram, level)',
      ],
    },
    {
      kind: 'prose',
      heading: 'Sides, base, and doors',
      paragraphs: [
        'Rubber doors hide USB, HDMI, microphone, headphone, and remote ports — latch them after use.',
        'Memory card slots may be dual; battery door is usually on the bottom with a friction lock.',
        'Tripod socket on the base should align near the lens axis for panos; strap lugs take pressure off the mount.',
      ],
    },
    {
      kind: 'prose',
      heading: 'Mirrorless vs DSLR (quick)',
      paragraphs: [
        'DSLR: mirror, optical finder, often larger bodies; you hear the mirror slap.',
        'Mirrorless: always-on sensor feed, usually smaller, strong video, short flange for native lenses.',
        'Both are serious tools — know where your card, battery, and finder live on yours.',
      ],
    },
    {
      kind: 'bullets',
      heading: 'Takeaways',
      items: [
        'Use the interactive views when a name on your manual does not match what you see',
        'Practice battery and card changes without looking',
        'Next in Camera basics: the physics behind light, focus, and exposure',
      ],
    },
  ],
};
