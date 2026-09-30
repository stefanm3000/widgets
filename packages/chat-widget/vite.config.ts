import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vite";

import packageJson from "./package.json" with { type: "json" };

const dependencies = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.peerDependencies,
});

export default defineConfig({
  plugins: [babel({ plugins: ["babel-plugin-react-compiler"] })],
  build: {
    lib: {
      entry: { index: "src/index.ts", unstyled: "src/unstyled.ts" },
      formats: ["es"],
    },
    rolldownOptions: {
      external: (id) =>
        id.endsWith(".css") ||
        dependencies.some((name) => id === name || id.startsWith(`${name}/`)),
    },
  },
});
