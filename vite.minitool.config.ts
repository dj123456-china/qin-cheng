import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [react(), {
    name: 'minitool-classic-entry',
    closeBundle() {
      const directory = path.resolve('dist-minitool');
      const html = fs.readFileSync('index.html', 'utf8')
        .replace('href="/favicon.svg"', 'href="./favicon.svg"')
        .replace('<script type="module" src="/src/main.tsx"></script>', '<script defer src="./assets/main.js"></script>')
        .replace('</head>', '<link rel="stylesheet" href="./assets/style.css" /></head>');
      fs.writeFileSync(path.join(directory, 'index.html'), html);
    },
  }],
  base: './',
  build: {
    outDir: 'dist-minitool', target: ['es2017', 'chrome61'], cssTarget: 'chrome61',
    sourcemap: false, modulePreload: false,
    lib: { entry: 'src/main.tsx', name: 'Qincheng', formats: ['iife'], fileName: () => 'assets/main.js', cssFileName: 'style' },
    rollupOptions: { output: { assetFileNames: 'assets/[name][extname]', inlineDynamicImports: true } },
  },
});
