export const routes = {
  home: {
    label: 'Home',
    url: '/',
  },
  login: {
    label: 'Log in',
    url: '/login',
  },
  signup: {
    label: 'Sign up',
    url: '/signup',
  },
  forgotPassword: {
    label: 'Forgot password',
    url: '/forgot-password',
  },
  resetPassword: {
    label: 'Reset password',
    url: '/reset-password',
  },
  events: {
    label: 'Events',
    url: '/events',
  },
  gallery: {
    label: 'Gallery',
    url: '/gallery',
  },
  galleryPhotos: {
    label: 'Photos',
    url: '/gallery/photos',
  },
  galleryAlbums: {
    label: 'Albums',
    url: '/gallery/albums',
  },
  members: {
    label: 'Members',
    url: '/members',
  },
  account: {
    label: 'Account',
    url: '/account',
  },
  accountEvents: {
    label: 'My Events',
    url: '/account/events',
  },
  accountPhotos: {
    label: 'Manage photos',
    url: '/account/photos',
  },
  accountUpload: {
    label: 'Upload',
    url: '/account/upload',
  },
  admin: {
    label: 'Admin',
    url: '/admin',
  },
  terms: {
    label: 'Terms of Service',
    url: '/terms',
  },
  privacy: {
    label: 'Privacy Policy',
    url: '/privacy',
  },
  contact: {
    label: 'Contact',
    url: '/contact',
  },
  changelog: {
    label: 'Changelog',
    url: '/changelog',
  },
} as const;

export type RouteKey = keyof typeof routes
