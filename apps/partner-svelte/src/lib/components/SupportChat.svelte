<script lang="ts">
  import type { ChatWidgetTheme } from "@pulse/embed";

  import { createChatAttachment } from "../helpers/chat-attachment";
  import { getApiUrl } from "../helpers/config";
  import { createPartnerClient } from "../helpers/demo-client";

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

  const attachChat = createChatAttachment({
    createClient: () => createPartnerClient(getApiUrl()),
    theme,
    onError: () => {
      error = "Could not load the chat. Reload to try again.";
    },
  });
</script>

{#if error}
  <p role="alert">{error}</p>
{/if}
<pulse-chat {@attach attachChat} room-id="demo-room"></pulse-chat>
