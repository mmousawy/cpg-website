import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/account/',
        '/login',
        '/signup',
        '/forgot-password',
        '/reset-password',
        '/onboarding',
        '/auth-error',
        '/auth-callback',
        '/confirm/',
        '/cancel/',
        '/unsubscribe/',
        '/email/',
        '/auth/',
      ],
    },
    sitemap: 'https://creativephotography.group/sitemap.xml',
  };
}
