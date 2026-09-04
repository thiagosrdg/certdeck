import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const base = mode === "production" ? "/certdeck/network-plus/" : "/";

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "prompt",
        includeAssets: ["icons/*.png"],
        manifest: {
          id: base,
          name: "PacketPrep — CompTIA Network+",
          short_name: "PacketPrep",
          description: "Offline exam simulator for CompTIA Network+ (N10-009).",
          start_url: base,
          scope: base,
          display: "standalone",
          orientation: "portrait-primary",
          background_color: "#12111a",
          theme_color: "#1f6f78",
          icons: [
            { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          // Precache the app shell, self-hosted fonts, and every question
          // JSON file so the app is fully usable offline after first load.
          globPatterns: ["**/*.{js,css,html,woff2,png,svg,json}"],
          navigateFallback: "index.html",
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
  };
});
