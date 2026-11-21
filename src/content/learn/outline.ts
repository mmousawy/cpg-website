export type LearnOutlineItem = {
  title: string;
  slug?: string;
};

export type LearnOutlineSection = {
  title: string;
  items: LearnOutlineItem[];
};

export const learnOutline: LearnOutlineSection[] = [
  {
    title: 'Camera basics',
    items: [
      { title: "What's on your camera", slug: 'whats-on-your-camera' },
      { title: 'The physics involved' },
      { title: 'Holding the camera' },
    ],
  },
  {
    title: 'Photography concepts',
    items: [
      { title: 'The exposure triangle', slug: 'exposure' },
      { title: 'Focus and depth of field' },
      { title: 'Composition' },
      { title: 'Light and color' },
    ],
  },
  {
    title: 'In the field',
    items: [
      { title: 'Lenses and focal length' },
      { title: 'Metering' },
      { title: 'White balance' },
    ],
  },
  {
    title: 'After the shutter',
    items: [
      { title: 'Reading a histogram' },
      { title: 'Raw and JPEG' },
      { title: 'A first edit' },
    ],
  },
];
