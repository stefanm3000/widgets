import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      fileName: "pulse-chat",
      formats: ["es"],
    },
    sourcemap: true,
    target: "es2022",
  },
});
