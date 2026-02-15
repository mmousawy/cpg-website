import type { FAQSection } from './types';

import { accountFAQ } from './account';
import { challengesFAQ } from './challenges';
import { eventsFAQ } from './events';
import { gettingStartedFAQ } from './getting-started';
import { membersFAQ } from './members';
import { photosFAQ } from './photos';

export const helpSections: FAQSection[] = [
  gettingStartedFAQ,
  eventsFAQ,
  photosFAQ,
  challengesFAQ,
  membersFAQ,
  accountFAQ,
];
