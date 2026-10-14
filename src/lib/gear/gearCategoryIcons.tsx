import type { GearCategory } from '@/lib/gear/types';
import type { ComponentType, SVGProps } from 'react';

import CategoryAccessoriesSVG from 'public/icons/gear/micro/category-accessories.svg';
import CategoryLensSVG from 'public/icons/gear/micro/category-lens.svg';
import CategoryLightingSVG from 'public/icons/gear/micro/category-lighting.svg';
import CategorySupportSVG from 'public/icons/gear/micro/category-support.svg';
import FormatAnalogMicroSVG from 'public/icons/gear/micro/format-analog.svg';
import FormatDigitalMicroSVG from 'public/icons/gear/micro/format-digital.svg';
import FormatOtherMicroSVG from 'public/icons/gear/micro/format-other.svg';
import FormatPhoneMicroSVG from 'public/icons/gear/micro/format-phone.svg';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

/** Heroicons 16/solid, for category badges at 16px. */
export const GEAR_CATEGORY_ICONS: Record<GearCategory, IconComponent> = {
  camera_body: FormatDigitalMicroSVG,
  lens: CategoryLensSVG,
  film: FormatAnalogMicroSVG,
  phone: FormatPhoneMicroSVG,
  lighting: CategoryLightingSVG,
  support: CategorySupportSVG,
  accessories: CategoryAccessoriesSVG,
  other: FormatOtherMicroSVG,
};
