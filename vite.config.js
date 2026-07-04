import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import artworksDev from './plugins/vite-plugin-artworks-dev.js';

const siteConfig = JSON.parse(readFileSync('./personalar.config.json', 'utf8'));
// Project pages live under a sub-path (e.g. /artivive/); dev stays at root.
const basePath = new URL(siteConfig.baseUrl).pathname.replace(/\/?$/, '/');

function viewerPageInputs() {
  const inputs = { index: resolve('index.html') };
  if (!existsSync('ar')) return inputs;
  for (const d of readdirSync('ar', { withFileTypes: true })) {
    if (d.isDirectory() && existsSync(`ar/${d.name}/index.html`)) {
      inputs[`ar-${d.name}`] = resolve(`ar/${d.name}/index.html`);
    }
  }
  return inputs;
}

export default defineConfig(({ command }) => ({
  appType: 'mpa',
  base: command === 'build' ? basePath : '/',
  plugins: command === 'serve' ? [basicSsl(), artworksDev()] : [],
  build: {
    // WebAR requires a modern browser anyway; es2022 allows top-level await.
    target: 'es2022',
    rollupOptions: { input: viewerPageInputs() },
    chunkSizeWarningLimit: 3000
  }
}));
