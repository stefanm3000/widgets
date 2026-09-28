import { create } from "zustand";

import {
  createDemoSession,
  getApiUrl,
  type DemoSession,
} from "../helpers/demo-session";

interface PlaygroundState {
  session: DemoSession;
}

const apiUrl = getApiUrl();

export const usePlaygroundStore = create<PlaygroundState>(() => ({
  session: createDemoSession(apiUrl),
}));
