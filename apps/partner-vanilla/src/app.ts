import { mountPulseChat, type ChatWidgetTheme } from "@pulse/embed";

import { getApiUrl } from "./helpers/config";
import { createPartnerClient } from "./helpers/demo-client";
import { requireElement } from "./helpers/dom";

const theme = {
  colors: {
    background: "#f7f7f7",
    border: "#dedede",
    muted: "#737373",
    primary: "#111111",
    surface: "#ffffff",
    text: "#111111",
  },
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  preset: "light",
  radius: "16px",
} as const satisfies ChatWidgetTheme;

export function startPartnerApp(root: HTMLElement): void {
  root.innerHTML = `
    <main class="chat-stage" aria-label="Vanilla chat widget example">
      <div class="widget-host" data-widget-host></div>
    </main>
  `;

  const client = createPartnerClient(getApiUrl());
  const widget = mountPulseChat(requireElement(root, "[data-widget-host]"), {
    client,
    roomId: "demo-room",
    theme,
  });

  globalThis.addEventListener(
    "pagehide",
    () => {
      widget.destroy();
      client.dispose();
    },
    { once: true },
  );
}
