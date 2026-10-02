<script lang="ts">
  import type { ChatWidgetTheme, PulseChatElement } from "@pulse/embed";
  import type { PulseClient } from "@pulse/sdk";
  import { onMount } from "svelte";

  import { getApiUrl } from "../helpers/config";
  import { createPartnerClient } from "../helpers/demo-client";

  let chat: PulseChatElement | undefined = $state();
  let error: string | null = $state(null);
  const theme = {
    colors: {
      background: "#fffaf5",
      border: "#e7d5c5",
      muted: "#806957",
      primary: "#b83b12",
      surface: "#f7eee5",
      text: "#38261b",
    },
    fontFamily: '"Trebuchet MS", ui-sans-serif, system-ui, sans-serif',
    preset: "light",
    radius: "16px",
  } as const satisfies ChatWidgetTheme;

  onMount(() => {
    let disposed = false;
    let client: PulseClient | undefined;

    // The embed extends HTMLElement, so load it only after browser hydration.
    void import("@pulse/embed")
      .then(() => {
        if (disposed || !chat) return;
        client = createPartnerClient(getApiUrl());
        chat.theme = theme;
        chat.client = client;
      })
      .catch(() => {
        if (!disposed) error = "Could not load the chat. Reload to try again.";
      });

    return () => {
      disposed = true;
      if (chat) chat.client = null;
      client?.dispose();
    };
  });
</script>

{#if error}
  <p role="alert">{error}</p>
{/if}
<pulse-chat bind:this={chat} room-id="demo-room"></pulse-chat>
