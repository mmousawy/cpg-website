import type { ComponentType, SVGProps } from 'react';

import type { ShootingFormat } from '@/lib/gear/types';
import FormatAnalogSVG from 'public/icons/gear/format-analog.svg';
import FormatDigitalSVG from 'public/icons/gear/format-digital.svg';
import FormatDroneSVG from 'public/icons/gear/format-drone.svg';
import FormatInstantSVG from 'public/icons/gear/format-instant.svg';
import FormatLofiSVG from 'public/icons/gear/format-lofi.svg';
import FormatOtherSVG from 'public/icons/gear/format-other.svg';
import FormatPhoneSVG from 'public/icons/gear/format-phone.svg';
import FormatVideoSVG from 'public/icons/gear/format-video.svg';
import FormatAnalogMicroSVG from 'public/icons/gear/micro/format-analog.svg';
import FormatDigitalMicroSVG from 'public/icons/gear/micro/format-digital.svg';
import FormatDroneMicroSVG from 'public/icons/gear/micro/format-drone.svg';
import FormatInstantMicroSVG from 'public/icons/gear/micro/format-instant.svg';
import FormatLofiMicroSVG from 'public/icons/gear/micro/format-lofi.svg';
import FormatOtherMicroSVG from 'public/icons/gear/micro/format-other.svg';
import FormatPhoneMicroSVG from 'public/icons/gear/micro/format-phone.svg';
import FormatVideoMicroSVG from 'public/icons/gear/micro/format-video.svg';

/** Large illustrations for account shooting-style tiles. */
export const SHOOTING_FORMAT_ICONS: Record<ShootingFormat, ComponentType<SVGProps<SVGSVGElement>>> = {
  digital: FormatDigitalSVG,
  analog: FormatAnalogSVG,
  phone: FormatPhoneSVG,
  instant: FormatInstantSVG,
  drone: FormatDroneSVG,
  video: FormatVideoSVG,
  lofi: FormatLofiSVG,
  other: FormatOtherSVG,
};

/** Heroicons 16/solid, drawn for 16px. Use at size-4 and below. */
export const SHOOTING_FORMAT_MICRO_ICONS: Record<ShootingFormat, ComponentType<SVGProps<SVGSVGElement>>> = {
  digital: FormatDigitalMicroSVG,
  analog: FormatAnalogMicroSVG,
  phone: FormatPhoneMicroSVG,
  instant: FormatInstantMicroSVG,
  drone: FormatDroneMicroSVG,
  video: FormatVideoMicroSVG,
  lofi: FormatLofiMicroSVG,
  other: FormatOtherMicroSVG,
};
