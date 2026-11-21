import { forwardRef, type ComponentType, type Ref, type SVGProps } from 'react';

import SideBack from './canon-manual/side-back.svg';
import SideBottom from './canon-manual/side-bottom.svg';
import TopFrontThreeQuarter from './canon-manual/top-front-three-quarter.svg';

/** Learn-tab filenames (see `CAMERA_VIEWS` labels). */
export type CanonDiagramId =
  | 'top-front-three-quarter'
  | 'side-back'
  | 'side-bottom';

type DiagramComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const CANON_DIAGRAMS: Record<CanonDiagramId, DiagramComponent> = {
  'top-front-three-quarter': TopFrontThreeQuarter,
  'side-back': SideBack,
  'side-bottom': SideBottom,
};

export const CanonDiagram = forwardRef(function CanonDiagram(
  {
    id,
    className,
    svgProps,
    interactiveCallouts = false,
  }: {
    id: CanonDiagramId;
    className?: string;
    svgProps?: SVGProps<SVGSVGElement>;
    /** When true, callout dots in the SVG stay keyboard/hover targets */
    interactiveCallouts?: boolean;
  },
  ref: Ref<SVGSVGElement>,
) {
  const Diagram = CANON_DIAGRAMS[id];
  return (
    <Diagram
      ref={ref}
      className={className}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden={interactiveCallouts ? undefined : true}
      focusable={interactiveCallouts ? undefined : false}
      {...svgProps}
    />
  );
});
