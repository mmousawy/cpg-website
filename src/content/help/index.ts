import type { FAQSection } from './types';

import { accountFAQ } from './account';
import { challengesFAQ } from './challenges';
import { eventsFAQ } from './events';
import { gettingStartedFAQ } from './getting-started';
import { membersFAQ } from './members';
import { photosFAQ } from './photos';
import { sceneFAQ } from './scene';

export const helpSections: FAQSection[] = [
  gettingStartedFAQ,
  eventsFAQ,
  sceneFAQ,
  photosFAQ,
  challengesFAQ,
  membersFAQ,
  accountFAQ,
];
