export type IntegrationLanguage =
  "javascript" | "markdown" | "svelte" | "typescript" | "vue";

interface IntegrationSnippet {
  code: string;
  language: IntegrationLanguage;
}

export const integrationFilePaths = [
  "react/App.tsx",
  "vue/App.vue",
  "svelte/App.svelte",
  "vanilla/main.js",
  "README.md",
] as const;

export type IntegrationFilePath = (typeof integrationFilePaths)[number];

export const integrationFiles = {
  "README.md": {
    language: "markdown",
    code: `# Pulse

Pulse is a framework-agnostic live chat
toolkit for modern web apps.

One backend and versioned protocol power
the same conversation across React, Vue,
Svelte and vanilla JavaScript.

## Included

- Browser-safe TypeScript SDK
- Accessible React chat widget
- Shadow DOM embed
- Realtime history and messaging

Each partner keeps its own framework and
visual identity while Pulse handles the
shared chat experience.`,
  },
  "react/App.tsx": {
    language: "typescript",
    code: `import { ChatWidget } from "@pulse/chat-widget"
import { createPulseClient } from "@pulse/sdk"

const client = createPulseClient({
  baseUrl: "https://chat.example.com/",
  getToken: () => fetchChatCredentials(),
})

const App = () => (
  <ChatWidget client={client} roomId="support-room" />
);

export default App;`,
  },
  "vue/App.vue": {
    language: "vue",
    code: `<script setup>
import { onMounted, onUnmounted, ref } from "vue"
import "@pulse/embed"
import { createPulseClient } from "@pulse/sdk"

const chat = ref(null)
const client = createPulseClient({
  baseUrl: "https://chat.example.com/",
  getToken: () => fetchChatCredentials(),
})

onMounted(() => (chat.value.client = client))
onUnmounted(() => client.dispose())
</script>

<template>
  <pulse-chat ref="chat" room-id="support-room" />
</template>`,
  },
  "svelte/App.svelte": {
    language: "svelte",
    code: `<script>
  import { createPulseClient } from "@pulse/sdk"

  function attachChat(chat) {
    let disposed = false
    let client
    import("@pulse/embed").then(() => {
      if (disposed) return
      client = createPulseClient({
        baseUrl: "https://chat.example.com/",
        getToken: () => fetchChatCredentials(),
      })
      chat.client = client
    })
    return () => {
      disposed = true
      if (client) chat.client = null
      client?.dispose()
    }
  }
</script>

<pulse-chat {@attach attachChat} room-id="support-room" />`,
  },
  "vanilla/main.js": {
    language: "javascript",
    code: `import "@pulse/embed"
import { createPulseClient } from "@pulse/sdk"

const client = createPulseClient({
  baseUrl: "https://chat.example.com/",
  getToken: () => fetchChatCredentials(),
})
const chat = document.querySelector("pulse-chat")
chat.client = client
chat.theme = { preset: "light", radius: "20px" }

window.addEventListener("pagehide", () => {
  client.dispose()
}, { once: true })`,
  },
} as const satisfies Record<IntegrationFilePath, IntegrationSnippet>;

export function isIntegrationFilePath(
  value: string,
): value is IntegrationFilePath {
  return value in integrationFiles;
}
