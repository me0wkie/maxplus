import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite";
import path from 'path';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [sveltekit()],
  resolve: {
    alias: {
      $components: path.resolve('./src/components'),
      'libsodium-wrappers-sumo': path.resolve(__dirname, 'node_modules/libsodium-wrappers-sumo/dist/modules-sumo/libsodium-wrappers.js'),
      'libsodium-sumo': path.resolve(__dirname, 'node_modules/libsodium-sumo/dist/modules-sumo/libsodium-sumo.js'),

      './libsodium-sumo.mjs': path.resolve(__dirname, 'node_modules/libsodium-sumo/dist/modules-sumo/libsodium-sumo.js')
    }
  },
  
  build: {
    cssCodeSplit: false, 
    
    chunkSizeWarningLimit: 2000, 

    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },

    commonjsOptions: {
      include: [/libsodium-sumo/, /libsodium-wrappers-sumo/, /node_modules/]
    },

    modulePreload: { polyfill: false }
  },
  
  css: {
    devSourcemap: true,
  },

  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
