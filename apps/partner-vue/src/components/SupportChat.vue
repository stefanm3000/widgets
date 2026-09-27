<script setup lang="ts">
import "@pulse/embed";
import type { ChatWidgetTheme, PulseChatElement } from "@pulse/embed";
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from "vue";

import { getApiUrl } from "../helpers/config";
import { createPartnerClient } from "../helpers/demo-client";

const chat = useTemplateRef<PulseChatElement>("chat");
const client = createPartnerClient(getApiUrl());
const nightMode = ref(false);

const themes = {
  dark: {
    colors: {
      background: "#121820",
      border: "#34404e",
      muted: "#9da9b6",
      primary: "#ff7952",
      surface: "#1c2530",
      text: "#f8f5ef",
    },
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    preset: "dark",
    radius: "10px",
  },
  light: {
    colors: {
      background: "#f4efe7",
      border: "#d7d0c6",
      muted: "#6e6b67",
      primary: "#d9451d",
      surface: "#fffdf9",
      text: "#171b22",
    },
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
    preset: "light",
    radius: "10px",
  },
} as const satisfies Record<"dark" | "light", ChatWidgetTheme>;

function applyTheme(): void {
  if (chat.value) chat.value.theme = themes[nightMode.value ? "dark" : "light"];
}

function toggleTheme(): void {
  nightMode.value = !nightMode.value;
  applyTheme();
}

onMounted(() => {
  if (!chat.value) return;
  chat.value.client = client;
  applyTheme();
});

onBeforeUnmount(() => client.dispose());
</script>

<template>
  <section class="support-card" aria-labelledby="support-heading">
    <div class="support-heading">
      <div>
        <p>Research support</p>
        <h2 id="support-heading">Ask us anything.</h2>
      </div>
      <button type="button" @click="toggleTheme">
        {{ nightMode ? "Day chat" : "Night chat" }}
      </button>
    </div>

    <pulse-chat ref="chat" room-id="demo-room" />
  </section>
</template>
