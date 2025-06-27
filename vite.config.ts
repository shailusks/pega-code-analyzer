import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig(() => {
  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'), // Adjust this if you’ve changed your structure
      },
    },
    build: {
      outDir: 'dist',
    },
    server: {
      port: 5173,
    },
  };
});
