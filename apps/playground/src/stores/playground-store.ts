import { create } from "zustand";

import {
  createDemoSession,
  getApiUrl,
  type DemoSession,
} from "../helpers/demo-session";
import type { ThemePreset } from "../helpers/theme";

interface PlaygroundState {
  session: DemoSession;
  setTheme: (theme: ThemePreset) => void;
  theme: ThemePreset;
}

const apiUrl = getApiUrl();

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
  session: createDemoSession(apiUrl),
  setTheme: (theme) => set({ theme }),
  theme: "system",
}));
