import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === "staging" ? [{
    name: "staging-robots",
    transformIndexHtml() {
      return [{ tag: "meta", attrs: { name: "robots", content: "noindex, nofollow" }, injectTo: "head" as const }];
    },
  }] : [])],
  server: {
    proxy: {
      "/cms": "http://127.0.0.1:8787",
    },
  },
  build: {
    outDir: mode === "staging" ? "dist-staging" : "dist",
    manifest: true,
  },
}));
