// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,

    proxy: {
      "/api": {
        target: "https://inventory-apis-khaki.vercel.app", // ✅ LOCAL backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
