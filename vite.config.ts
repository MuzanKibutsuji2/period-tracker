import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Project site deploys to https://<user>.github.io/period-tracker/,
// so production assets use the /period-tracker/ base. Local dev stays at /.
const isPagesBuild = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  plugins: [react()],
  base: isPagesBuild ? '/period-tracker/' : '/',
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true },
  preview: { host: '0.0.0.0', port: 4173 },
});
