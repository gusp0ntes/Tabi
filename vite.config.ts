import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.TABI_API_TARGET || "http://127.0.0.1:4000",
        changeOrigin: false,
      },
    },
  },
});
