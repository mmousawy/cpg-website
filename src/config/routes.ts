export const routes = {
  home: {
    label: 'Events',
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
  about: {
    label: 'About',
    url: '/about',
  },
  galleries: {
    label: 'Galleries',
    url: '/galleries',
  },
  account: {
    label: 'Account',
    url: '/account',
  },
  accountEvents: {
    label: 'My Events',
    url: '/account/events',
  },
  accountGalleries: {
    label: 'My Galleries',
    url: '/account/galleries',
  },
  admin: {
    label: 'Admin',
    url: '/admin',
  },
} as const

export type RouteKey = keyof typeof routes
