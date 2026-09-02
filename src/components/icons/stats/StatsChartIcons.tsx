import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export function BarChartIcon(props: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="20"
      width="20"
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M624-192v-288h144v288H624Zm-216 0v-576h144v576H408Zm-216 0v-384h144v384H192Z" />
    </svg>
  );
}

export function LineChartIcon(props: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="20"
      width="20"
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="m147-237-51-51 288-288 157 156 269-302 54 48-320 360-160-160-237 237Z" />
    </svg>
  );
}

export function ResetZoomIcon(props: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="20"
      width="20"
      viewBox="0 -960 960 960"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M444-144q-107-14-179.5-94.5T192-430q0-61 23-113.5t63-91.5l51 51q-30 29-47.5 69T264-430q0 81 51.5 140T444-217v73Zm72 0v-73q77-13 128.5-72.5T696-430q0-90-63-153t-153-63h-7l46 46-51 50-132-132 132-132 51 51-45 45h6q120 0 204 84t84 204q0 111-72.5 192T516-144Z" />
    </svg>
  );
}
