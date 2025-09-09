declare module '*.svg' {
  const src: string;
  export default src;
}

// Optional patterns when using vite-plugin-svgr
declare module '*.svg?react' {
  import * as React from 'react';
  const Component: React.FC<React.SVGProps<SVGSVGElement>>;
  export default Component;
}

declare module '*.svg?component' {
  import * as React from 'react';
  const Component: React.FC<React.SVGProps<SVGSVGElement>>;
  export default Component;
}

declare module '*.svg?url' {
  const src: string;
  export default src;
}

