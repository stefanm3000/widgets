export type IntegrationLanguage =
  "javascript" | "svelte" | "typescript" | "vue";

interface IntegrationSnippet {
  code: string;
  language: IntegrationLanguage;
}

export const integrationFilePaths = [
  "react/App.tsx",
  "vue/App.vue",
  "svelte/App.svelte",
  "vanilla/main.js",
] as const;

export type IntegrationFilePath = (typeof integrationFilePaths)[number];

export const integrationFiles = {
  "react/App.tsx": {
    language: "typescript",
    code: `import { ChatWidget } from "@pulse/chat-widget"
import { createPulseClient } from "@pulse/sdk"

const client = createPulseClient({
  baseUrl: "https://chat.example.com/",
  getToken: () => fetchChatCredentials(),
})

<ChatWidget client={client} roomId="support-room" />`,
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
  import { onDestroy } from "svelte"
  import "@pulse/embed"
  import { createPulseClient } from "@pulse/sdk"

  const client = createPulseClient({
    baseUrl: "https://chat.example.com/",
    getToken: () => fetchChatCredentials(),
  })
  let chat

  $: if (chat) chat.client = client
  onDestroy(() => client.dispose())
</script>

<pulse-chat bind:this={chat} room-id="support-room" />`,
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
chat.theme = { preset: "system", radius: "20px" }

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
