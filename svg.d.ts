declare module '*.svg' {
  import React from 'react';
  const SVG: React.FC<React.SVGProps<SVGSVGElement>>;
  export default SVG;
}

declare module 'public/icons/*.svg' {
  import React from 'react';
  const SVG: React.FC<React.SVGProps<SVGSVGElement>>;
  export default SVG;
}

declare module 'public/*.svg' {
  import React from 'react';
  const SVG: React.FC<React.SVGProps<SVGSVGElement>>;
  export default SVG;
}

declare module 'public/*.png' {
  const value: string;
  export default value;
}

declare module 'public/*.jpg' {
  const value: string;
  export default value;
}

declare module 'public/*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module './globals.css';

declare module 'swiper/css' {
  const css: string;
  export default css;
}

declare module 'swiper/css/*' {
  const css: string;
  export default css;
}

declare module '*.css';

declare module 'piexifjs';
