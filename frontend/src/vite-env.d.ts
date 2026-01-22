/// <reference types="vite/client" />

// Enable ?raw imports for markdown files
declare module '*.md?raw' {
  const content: string;
  export default content;
}

// Global app version injected by Vite
declare const __APP_VERSION__: string;
