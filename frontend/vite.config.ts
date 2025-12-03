import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Read version from package.json
import packageJson from '../package.json';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '');
  const host = process.env.TAURI_DEV_HOST;
  
  return {
    base: './',
    // Inject version as a global define
    define: {
      __APP_VERSION__: JSON.stringify(packageJson.version),
    },
    // prevent vite from obscuring rust errors
    clearScreen: false,
    server: {
      // make sure this port matches the devUrl port in tauri.conf.json file
      port: 3000,
      // Tauri expects a fixed port, fail if that port is not available
      strictPort: true,
      // if the host Tauri is expecting is set, use it
      host: host || false,
      hmr: host
        ? {
            protocol: 'ws',
            host,
            port: 3001,
          }
        : undefined,
      watch: {
        // tell vite to ignore watching `backend`
        ignored: ['**/backend/**'],
      },
    },
    // Env variables starting with the item of `envPrefix` will be exposed in tauri's source code through `import.meta.env`.
    envPrefix: ['VITE_', 'TAURI_ENV_*'],
    plugins: [react()],
    optimizeDeps: {
      exclude: ['@tauri-apps/api', '@tauri-apps/api/*'],
    },
    define: {},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      // Tauri uses Chromium on Windows and WebKit on macOS and Linux
      target: process.env.TAURI_ENV_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
      // don't minify for debug builds
      minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
      // produce sourcemaps for debug builds
      sourcemap: !!process.env.TAURI_ENV_DEBUG,
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          style: path.resolve(__dirname, 'src/index.css')
        },
        output: {
          entryFileNames: '[name].js',
          assetFileNames: 'assets/[name].[ext]'
        }
      }
    }
  };
});
