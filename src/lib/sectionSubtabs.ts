import { routes } from '@/config/routes';
import type { SectionSubtabItem } from '@/components/layout/SectionSubtabs';

export const eventsSectionSubtabs: SectionSubtabItem[] = [
  { href: routes.events.url, label: routes.events.label },
  { href: routes.scene.url, label: routes.scene.label },
];

export const gallerySectionSubtabs: SectionSubtabItem[] = [
  { href: routes.gallery.url, label: routes.gallery.label },
  { href: routes.challenges.url, label: routes.challenges.label },
];
