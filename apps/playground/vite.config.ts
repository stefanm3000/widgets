import tailwindcss from "@tailwindcss/vite";
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
    ],
    server: {
      port: 5173,
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
