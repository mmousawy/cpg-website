/** One tab per manual figure (same order as Canon “Part names”). */
export type CameraView = 'threeQuarter' | 'sideBack' | 'sideBottom';

export type CameraPart = {
  id: string;
  label: string;
  view: CameraView;
  /** Number printed on the Canon part-name diagram for this view */
  manualRef: number;
  description: string;
};

import type { CanonDiagramId } from './canonDiagrams';

export const CAMERA_VIEW_DIAGRAM_ID: Record<CameraView, CanonDiagramId> = {
  threeQuarter: 'top-front-three-quarter',
  sideBack: 'side-back',
  sideBottom: 'side-bottom',
};

export type CameraViewArtFrame = {
  diagram: CanonDiagramId;
  aspect: number;
  /** Vertical slice of the source image (0–1), when one file contains multiple diagrams */
  visibleYFrac?: number;
  visibleHeightFrac?: number;
};

export type CameraViewArt = {
  frames: CameraViewArtFrame[];
};

/** EOS R7 “Part names” figures hosted locally; see `public/learn/canon-manual/CAMERA_ART_LICENSE.md`. */
export const CAMERA_VIEW_ART: Record<CameraView, CameraViewArt> = {
  threeQuarter: {
    frames: [{ diagram: 'top-front-three-quarter', aspect: 500 / 394.7 }],
  },
  sideBack: {
    frames: [{ diagram: 'side-back', aspect: 548.29 / 356.8 }],
  },
  sideBottom: {
    frames: [{ diagram: 'side-bottom', aspect: 500 / 363.9 }],
  },
};

export const MANUAL_PART_NAMES_URL =
  'https://cam.start.canon/en/C005/manual/html/UG-00_Before_0090.html';

export const CAMERA_VIEWS: { id: CameraView; label: string }[] = [
  { id: 'threeQuarter', label: 'Front' },
  { id: 'sideBack', label: 'Back' },
  { id: 'sideBottom', label: 'Bottom' },
];

export const CAMERA_PARTS: CameraPart[] = [
  // UG-00_i0170 — Canon Part names fig. 1 (labels match manual; SVG data-manual-ref wired separately)
  {
    id: 'mode-dial',
    label: 'Mode dial',
    view: 'threeQuarter',
    manualRef: 1,
    description:
      'Chooses how much the camera automates — scene modes, program, aperture- or shutter-priority, manual, and custom banks on many bodies.',
  },
  {
    id: 'multi-lock',
    label: 'Multi-function lock',
    view: 'threeQuarter',
    manualRef: 2,
    description: 'Locks dials and buttons you select so a bump in the bag does not change settings.',
  },
  {
    id: 'iso',
    label: 'ISO speed button',
    view: 'threeQuarter',
    manualRef: 3,
    description: 'Quick access to sensitivity; often paired with a dial to change ISO while shooting.',
  },
  {
    id: 'main-dial',
    label: 'Main dial',
    view: 'threeQuarter',
    manualRef: 4,
    description: 'Primary command dial on the grip — exposure, aperture, shutter, or menu values depending on mode.',
  },
  {
    id: 'multi-fn',
    label: 'Multi-function button',
    view: 'threeQuarter',
    manualRef: 5,
    description: 'Assignable control; many photographers map it to white balance, drive mode, or focus area.',
  },
  {
    id: 'shutter',
    label: 'Shutter button',
    view: 'threeQuarter',
    manualRef: 6,
    description: 'Half-press wakes metering and AF; full press captures. A soft first stop can reduce shake.',
  },
  {
    id: 'movie',
    label: 'Movie shooting button',
    view: 'threeQuarter',
    manualRef: 7,
    description: 'Starts and stops video recording on hybrid bodies without diving into the mode dial.',
  },
  {
    id: 'af-lamp',
    label: 'Self-timer lamp/AF-assist beam',
    view: 'threeQuarter',
    manualRef: 8,
    description: 'Blinks during the self-timer countdown and casts a pattern that helps autofocus in low light.',
  },
  {
    id: 'remote-sensor',
    label: 'Remote control sensor',
    view: 'threeQuarter',
    manualRef: 9,
    description: 'Receives signals from an infrared remote for hands-off shutter release.',
  },
  {
    id: 'grip',
    label: 'Grip (battery compartment)',
    view: 'threeQuarter',
    manualRef: 10,
    description: 'Holds the battery and gives your fingers a deep curve; thumb ridge on the back completes the hold.',
  },
  {
    id: 'dc-cord',
    label: 'DC cord hole',
    view: 'threeQuarter',
    manualRef: 11,
    description: 'Cover for optional AC adapter cable when running the camera tethered to mains power.',
  },
  {
    id: 'dof-preview',
    label: 'Depth-of-field preview button',
    view: 'threeQuarter',
    manualRef: 12,
    description: 'Stops the lens down to your shooting aperture so you can judge depth of field before capture.',
  },
  // UG-00_i0170 — items 13–26 on lens / mount
  {
    id: 'focus-switch',
    label: 'Focus mode switch',
    view: 'threeQuarter',
    manualRef: 13,
    description: 'Toggles autofocus and manual focus on the lens or body; MF is required for some adapted lenses.',
  },
  {
    id: 'contacts',
    label: 'Contacts',
    view: 'threeQuarter',
    manualRef: 14,
    description: 'Gold pins that pass aperture, focus, and stabilization data between lens and body.',
  },
  {
    id: 'mount',
    label: 'Lens mount',
    view: 'threeQuarter',
    manualRef: 15,
    description: 'Bayonet ring — align index marks, twist until it clicks, never force a misaligned lens.',
  },
  {
    id: 'shoe-cover',
    label: 'Shoe cover',
    view: 'threeQuarter',
    manualRef: 16,
    description: 'Plastic cap protecting the hot shoe contacts when no flash is mounted.',
  },
  {
    id: 'sync-contacts',
    label: 'Flash sync contacts',
    view: 'threeQuarter',
    manualRef: 17,
    description: 'Extra sync pins used by studio strobes and some third-party flash triggers.',
  },
  {
    id: 'hot-shoe',
    label: 'Multi-function shoe',
    view: 'threeQuarter',
    manualRef: 18,
    description: 'Mount for speedlights, mics, or adapters; power off before swapping accessories.',
  },
  {
    id: 'mic',
    label: 'Microphone',
    view: 'threeQuarter',
    manualRef: 19,
    description: 'Built-in mic for scratch audio with video — external mics sound better for serious work.',
  },
  {
    id: 'mount-index',
    label: 'RF lens mount index',
    view: 'threeQuarter',
    manualRef: 20,
    description: 'Dot or line on the body; align it with the matching mark on the lens before twisting until it clicks.',
  },
  {
    id: 'strap-front',
    label: 'Strap mount',
    view: 'threeQuarter',
    manualRef: 21,
    description: 'Lug for the shoulder strap; thread it so the buckle cannot slip loose.',
  },
  {
    id: 'focal-plane',
    label: 'Focal plane mark',
    view: 'threeQuarter',
    manualRef: 22,
    description: 'Marks the sensor plane for measuring focus distance with charts or calibration tools.',
  },
  {
    id: 'sensor',
    label: 'Image sensor',
    view: 'threeQuarter',
    manualRef: 23,
    description: 'Exposed only when the lens is off — keep dust and fingers away.',
  },
  {
    id: 'lens-release',
    label: 'Lens release button',
    view: 'threeQuarter',
    manualRef: 24,
    description: 'Press and turn to remove the lens; support the lens weight with your other hand.',
  },
  {
    id: 'lens-lock',
    label: 'Lens lock pin',
    view: 'threeQuarter',
    manualRef: 25,
    description: 'Mechanical detent that confirms the lens is fully locked on the mount.',
  },
  {
    id: 'body-cap',
    label: 'Body cap',
    view: 'threeQuarter',
    manualRef: 26,
    description: 'Protects the mount and sensor when no lens is attached.',
  },
  // UG-00_i0180 — side & back (items 1–20)
  {
    id: 'viewfinder',
    label: 'Viewfinder eyepiece',
    view: 'sideBack',
    manualRef: 1,
    description: 'Optical tunnel on DSLRs; electronic finder on mirrorless with exposure preview.',
  },
  {
    id: 'diopter',
    label: 'Dioptric adjustment',
    view: 'sideBack',
    manualRef: 2,
    description: 'Focuses the finder for your eyesight — set once, then leave it.',
  },
  {
    id: 'menu',
    label: 'Menu button',
    view: 'sideBack',
    manualRef: 3,
    description: 'Opens the full menu: autofocus, card format, customization, connectivity, and so on.',
  },
  {
    id: 'terminal-cover',
    label: 'Terminal cover',
    view: 'sideBack',
    manualRef: 4,
    description: 'Rubber door over the USB, HDMI, mic, headphone, and remote ports — latch it closed in the field.',
  },
  {
    id: 'rear-dial',
    label: 'Quick control dial',
    view: 'sideBack',
    manualRef: 5,
    description: 'Rear command dial for exposure compensation, settings, or playback navigation.',
  },
  {
    id: 'power',
    label: 'Power switch',
    view: 'sideBack',
    manualRef: 6,
    description: 'OFF / ON, plus a dedicated movie position on many hybrid bodies.',
  },
  {
    id: 'af-on',
    label: 'AF start (AF-ON)',
    view: 'sideBack',
    manualRef: 7,
    description: 'Focuses the lens without using the shutter button — the basis of back-button focus.',
  },
  {
    id: 'joystick',
    label: 'Multi-controller',
    view: 'sideBack',
    manualRef: 8,
    description: 'Moves the AF point or menus; pressing the center often confirms a selection.',
  },
  {
    id: 'info',
    label: 'Info button',
    view: 'sideBack',
    manualRef: 9,
    description: 'Cycles shooting overlays on the LCD or data inside the viewfinder.',
  },
  {
    id: 'access-lamp',
    label: 'Card access lamp',
    view: 'sideBack',
    manualRef: 10,
    description: 'Blinks while the camera is writing to the memory card — wait for it to stop before removing power or the card.',
  },
  {
    id: 'quick-set',
    label: 'Quick control / Set',
    view: 'sideBack',
    manualRef: 11,
    description: 'Opens the quick menu for everyday shooting tweaks without going into the full menu.',
  },
  {
    id: 'cross-keys',
    label: 'Cross keys',
    view: 'sideBack',
    manualRef: 12,
    description: 'Directional pad for menus, white balance shift, or moving the AF frame.',
  },
  {
    id: 'delete',
    label: 'Erase button',
    view: 'sideBack',
    manualRef: 13,
    description: 'Deletes the displayed image; usually asks for confirmation.',
  },
  {
    id: 'playback',
    label: 'Playback button',
    view: 'sideBack',
    manualRef: 14,
    description: 'Reviews images and videos; dials or swipes move between files.',
  },
  {
    id: 'eye-sensor',
    label: 'Viewfinder sensor',
    view: 'sideBack',
    manualRef: 15,
    description: 'Detects your eye at the finder and may dim or shut off the rear screen.',
  },
  {
    id: 'mic-terminal',
    label: 'External mic terminal',
    view: 'sideBack',
    manualRef: 16,
    description: '3.5 mm input for shotgun or lav microphones.',
  },
  {
    id: 'hdmi',
    label: 'HDMI output',
    view: 'sideBack',
    manualRef: 17,
    description: 'Feeds clean video to a monitor or recorder.',
  },
  {
    id: 'remote-terminal',
    label: 'Remote terminal',
    view: 'sideBack',
    manualRef: 18,
    description: 'Wired remote release socket for tripods and interval work.',
  },
  {
    id: 'usb',
    label: 'Digital (USB) terminal',
    view: 'sideBack',
    manualRef: 19,
    description: 'Tethering, firmware updates, and charging on many current bodies.',
  },
  {
    id: 'headphone',
    label: 'Headphone terminal',
    view: 'sideBack',
    manualRef: 20,
    description: 'Monitor video audio while recording.',
  },
  // UG-00_i0190 — other side, bottom & back (items 1–12)
  {
    id: 'serial',
    label: 'Serial number',
    view: 'sideBottom',
    manualRef: 1,
    description: 'Body serial for registration, insurance, and service.',
  },
  {
    id: 'tripod',
    label: 'Tripod socket',
    view: 'sideBottom',
    manualRef: 2,
    description: 'Threaded insert on the base — set it under the lens axis for good balance on a tripod head.',
  },
  {
    id: 'lcd',
    label: 'Rear screen',
    view: 'sideBottom',
    manualRef: 3,
    description: 'Live view, menus, touch AF, and playback — may tilt or flip out on many bodies.',
  },
  {
    id: 'speaker',
    label: 'Speaker',
    view: 'sideBottom',
    manualRef: 4,
    description: 'Plays playback beeps and video audio without headphones.',
  },
  {
    id: 'ae-lock',
    label: 'AE lock',
    view: 'sideBottom',
    manualRef: 5,
    description: 'Locks exposure while you recompose — essential when spot metering off a small subject.',
  },
  {
    id: 'strap-back',
    label: 'Strap mount',
    view: 'sideBottom',
    manualRef: 6,
    description: 'Second lug for the camera strap on the opposite corner.',
  },
  {
    id: 'af-magnify',
    label: 'AF point / magnify',
    view: 'sideBottom',
    manualRef: 7,
    description: 'Opens the AF-point picker when shooting and magnifies playback to check sharpness.',
  },
  {
    id: 'card-cover',
    label: 'Card slot cover',
    view: 'sideBottom',
    manualRef: 8,
    description: 'Door over the memory card slots — latch it firmly after swapping cards.',
  },
  {
    id: 'card-1',
    label: 'Card slot 1',
    view: 'sideBottom',
    manualRef: 9,
    description: 'Primary SD or CFexpress slot — label your cards so you can rotate them without guessing.',
  },
  {
    id: 'card-2',
    label: 'Card slot 2',
    view: 'sideBottom',
    manualRef: 10,
    description: 'Second card slot on many enthusiast and pro bodies — use it for overflow, live backup, or splitting raw and JPEG.',
  },
  {
    id: 'battery-lock',
    label: 'Battery cover lock',
    view: 'sideBottom',
    manualRef: 11,
    description: 'Latch that holds the battery door closed under vibration or when hanging upside-down on a strap.',
  },
  {
    id: 'battery-door',
    label: 'Battery compartment',
    view: 'sideBottom',
    manualRef: 12,
    description: 'Holds the rechargeable battery pack — carry a charged spare on long days.',
  },
];

/** Canon UG-00_i0170 lists these refs but has no callout dot on the figure. */
export const THREE_QUARTER_MANUAL_REFS_WITHOUT_DOT = [26] as const;
