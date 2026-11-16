import { defineConfig, type HtmlTagDescriptor } from "vite";
import react from "@vitejs/plugin-react";

const googleAnalyticsId = "G-W78D36S6Y1";

export default defineConfig(({ command, mode }) => ({
  plugins: [react(), ...(mode === "staging" ? [{
    name: "staging-robots",
    transformIndexHtml() {
      return [{ tag: "meta", attrs: { name: "robots", content: "noindex, nofollow" }, injectTo: "head" as const }];
    },
  }] : []), ...(command === "build" && mode === "production" ? [{
    name: "google-analytics",
    transformIndexHtml(): HtmlTagDescriptor[] {
      return [
        {
          tag: "script",
          attrs: { async: true, src: `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}` },
          injectTo: "head-prepend",
        },
        {
          tag: "script",
          children: `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${googleAnalyticsId}');
    `,
          injectTo: "head-prepend",
        },
      ];
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
