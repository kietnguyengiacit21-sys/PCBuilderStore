import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const { API_PROXY_TARGET } = loadEnv(mode, ".", "");

  return {
    plugins: [react()],
    server: {
      fs: { allow: [".."] },
      proxy: {
        "/api": {
          target: API_PROXY_TARGET || "http://localhost:8080",
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
