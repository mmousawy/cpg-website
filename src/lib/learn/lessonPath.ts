import { routes } from '@/config/routes';

export function learnLessonSlugFromPath(pathname: string): string | null {
  const prefix = `${routes.learn.url}/`;
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length).split('/')[0];
  return rest || null;
}
