import {
  mountPulseChat,
  type ChatWidgetTheme,
  type PulseChatHandle,
} from "@pulse/embed";
import type { PulseClient } from "@pulse/sdk";

import type { WidgetController } from "../types";

const themes = {
  dark: {
    colors: {
      background: "#10211d",
      border: "#31534a",
      muted: "#a7bcb6",
      primary: "#d1ff62",
      surface: "#17302a",
      text: "#f4f8f6",
    },
    fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    preset: "dark",
    radius: "24px",
  },
  light: {
    colors: {
      background: "#f1f4ee",
      border: "#d5ddd2",
      muted: "#66736c",
      primary: "#19644f",
      surface: "#ffffff",
      text: "#17231f",
    },
    fontFamily: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
    preset: "light",
    radius: "24px",
  },
} as const satisfies Record<"dark" | "light", ChatWidgetTheme>;

export function createWidgetController(
  host: HTMLElement,
  client: PulseClient,
): WidgetController {
  let handle: PulseChatHandle | null = null;
  let selectedTheme: "light" | "dark" = "light";

  return {
    client,
    get mounted() {
      return handle !== null;
    },
    get theme() {
      return selectedTheme;
    },
    mount() {
      handle ??= mountPulseChat(host, {
        client,
        roomId: "demo-room",
        theme: themes[selectedTheme],
      });
    },
    setTheme(theme) {
      selectedTheme = theme;
      handle?.update({ theme: themes[theme] });
    },
    unmount() {
      handle?.destroy();
      handle = null;
    },
  };
}
