import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, ".", "");

  return {
    server: {
      port: 5174,
      strictPort: true,
      proxy: {
        "/api": {
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
          target:
            environment.VITE_PULSE_PROXY_TARGET ?? "http://127.0.0.1:4000",
          ws: true,
        },
      },
    },
  };
});
