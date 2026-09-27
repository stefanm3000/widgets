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
    background: "#eaf8ef",
    border: "#b8d9c2",
    muted: "#56705e",
    primary: "#168447",
    surface: "#ffffff",
    text: "#143820",
  },
  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  preset: "light",
  radius: "36px",
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
