import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const okcopaPort = Number(process.env.OKCOPA_DEV_PORT || 5280);
/** Inlined into client bundle so you can confirm the tab is serving this build. */
const okcopaBuildStamp = new Date().toISOString();

function noCacheEverything(
  _req: unknown,
  res: { setHeader: (name: string, value: string) => void },
  next: (err?: unknown) => void,
) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}

// https://vitejs.dev/config/
export default defineConfig({
  /** Relative asset URLs — safe when deployed to any folder on the server. */
  base: './',
  define: {
    __OKCOPA_BUILD__: JSON.stringify(okcopaBuildStamp),
  },
  plugins: [
    react(),
    {
      name: 'no-cache-all-local',
      configureServer(server) {
        server.middlewares.use(noCacheEverything);
      },
      configurePreviewServer(server) {
        server.middlewares.use(noCacheEverything);
      },
    },
  ],
  server: {
    // Fixed port — always http://127.0.0.1:5280/ (see `npm run dev` / `npm run publish`).
    port: okcopaPort,
    strictPort: true,
    host: '127.0.0.1',
    open: '/',
  },
  preview: {
    port: okcopaPort,
    strictPort: true,
    host: '127.0.0.1',
    open: '/',
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
