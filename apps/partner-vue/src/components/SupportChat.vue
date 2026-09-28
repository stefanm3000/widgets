<script setup lang="ts">
import "@pulse/embed";
import type { ChatWidgetTheme, PulseChatElement } from "@pulse/embed";
import { onBeforeUnmount, onMounted, useTemplateRef } from "vue";

import { getApiUrl } from "../helpers/config";
import { createPartnerClient } from "../helpers/demo-client";

const chat = useTemplateRef<PulseChatElement>("chat");
const client = createPartnerClient(getApiUrl());
const theme = {
  colors: {
    background: "#fff9ff",
    border: "#d9c8ff",
    muted: "#715e83",
    primary: "#7447f5",
    surface: "#f4ecff",
    text: "#27183b",
  },
  fontFamily:
    '"Avenir Next", Avenir, "Trebuchet MS", ui-sans-serif, system-ui, sans-serif',
  preset: "light",
  radius: "28px",
} as const satisfies ChatWidgetTheme;

onMounted(() => {
  if (!chat.value) return;
  chat.value.client = client;
  chat.value.theme = theme;
});

onBeforeUnmount(() => client.dispose());
</script>

<template>
  <pulse-chat ref="chat" room-id="demo-room" />
</template>
