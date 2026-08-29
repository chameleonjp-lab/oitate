import { defineConfig, type Plugin } from "vite";

function allowPortraitGameplay(): Plugin {
  return {
    name: "oitate-allow-portrait-gameplay",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("/src/game/input.ts")) return null;
      const from = `export function isPortraitViewport(): boolean {\n  return window.innerHeight > window.innerWidth;\n}`;
      const to = `export function isPortraitViewport(): boolean {\n  // Portrait is a supported play orientation from 1.0 onward.\n  // Keep the historical API stable while disabling the old portrait blocker.\n  return false;\n}`;
      if (!code.includes(from)) return null;
      return { code: code.replace(from, to), map: null };
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [allowPortraitGameplay()],
  build: {
    manifest: true,
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
});
