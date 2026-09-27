import { create } from "zustand";

import {
  createDemoSession,
  getApiUrl,
  getDefaultDisplayName,
  saveDisplayName,
  type DemoSession,
} from "../helpers/demo-session";
import type { ThemePreset } from "../helpers/theme";

interface PlaygroundState {
  applyIdentity: (displayName: string) => void;
  session: DemoSession;
  setTheme: (theme: ThemePreset) => void;
  theme: ThemePreset;
}

const apiUrl = getApiUrl();

export const usePlaygroundStore = create<PlaygroundState>((set, get) => ({
  applyIdentity: (displayName) => {
    const nextName = displayName.trim();
    if (!nextName) return;

    get().session.client.dispose();
    saveDisplayName(nextName);
    set({ session: createDemoSession(apiUrl, nextName) });
  },
  session: createDemoSession(apiUrl, getDefaultDisplayName()),
  setTheme: (theme) => set({ theme }),
  theme: "system",
}));
