export type IntegrationFramework = "react" | "vue" | "svelte" | "javascript";
export type IntegrationLanguage = "tsx" | "vue" | "svelte" | "javascript";

interface IntegrationSnippet {
  code: string;
  label: string;
  language: IntegrationLanguage;
}

export const integrationFrameworks = [
  "react",
  "vue",
  "svelte",
  "javascript",
] as const satisfies readonly IntegrationFramework[];

export const integrationSnippets = {
  react: {
    label: "React",
    language: "tsx",
    code: `import { ChatWidget } from "@pulse/chat-widget"
import { createPulseClient } from "@pulse/sdk"

const client = createPulseClient({
  baseUrl: "https://chat.example.com/",
  getToken: () => fetchChatCredentials(),
})

<ChatWidget client={client} roomId="support-room" />`,
  },
  vue: {
    label: "Vue",
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
  svelte: {
    label: "Svelte",
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
  javascript: {
    label: "JS",
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
} as const satisfies Record<IntegrationFramework, IntegrationSnippet>;

export function isIntegrationFramework(
  value: string,
): value is IntegrationFramework {
  return value in integrationSnippets;
}
