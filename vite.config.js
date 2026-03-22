import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Base path for GitHub Pages (the name of your repository)
  base: '/I2QC/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        week1: resolve(__dirname, 'week1.html'),
        week2: resolve(__dirname, 'week2.html'),
        week3: resolve(__dirname, 'week3.html'),
        week4: resolve(__dirname, 'week4.html'),
      },
    },
  },
});
