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
  getToken: () => fetchChatToken(),
})

<ChatWidget client={client} roomId="support-room" />`,
  },
  vue: {
    label: "Vue",
    language: "vue",
    code: `<script setup>
import { onUnmounted, ref } from "vue"
import { createPulseClient } from "@pulse/sdk"

const roomId = "support-room"
const client = createPulseClient({
  baseUrl: "https://chat.example.com/",
  getToken: () => fetchChatToken(),
})
const messages = ref((await client.getMessages(roomId)).items)
const unsubscribe = client.subscribe(roomId, ({ payload }) => {
  messages.value.push(payload)
})

onUnmounted(() => {
  unsubscribe()
  client.dispose()
})
</script>

<template>
  <p v-for="message in messages" :key="message.id">
    {{ message.body }}
  </p>
</template>`,
  },
  svelte: {
    label: "Svelte",
    language: "svelte",
    code: `<script>
  import { onDestroy } from "svelte"
  import { createPulseClient } from "@pulse/sdk"

  const roomId = "support-room"
  const client = createPulseClient({
    baseUrl: "https://chat.example.com/",
    getToken: () => fetchChatToken(),
  })
  let messages = []

  client.getMessages(roomId).then((page) => (messages = page.items))
  const unsubscribe = client.subscribe(roomId, ({ payload }) => {
    messages = [...messages, payload]
  })

  onDestroy(() => {
    unsubscribe()
    client.dispose()
  })
</script>

{#each messages as message (message.id)}
  <p>{message.body}</p>
{/each}`,
  },
  javascript: {
    label: "JS",
    language: "javascript",
    code: `import { createPulseClient } from "@pulse/sdk"

const roomId = "support-room"
const client = createPulseClient({
  baseUrl: "https://chat.example.com/",
  getToken: () => fetchChatToken(),
})
const list = document.querySelector("[data-chat]")
const render = ({ body }) => list.append(new Option(body))

const page = await client.getMessages(roomId)
page.items.forEach(render)
const unsubscribe = client.subscribe(roomId, ({ payload }) => render(payload))

window.addEventListener("pagehide", () => {
  unsubscribe()
  client.dispose()
}, { once: true })`,
  },
} as const satisfies Record<IntegrationFramework, IntegrationSnippet>;

export function isIntegrationFramework(
  value: string,
): value is IntegrationFramework {
  return value in integrationSnippets;
}
