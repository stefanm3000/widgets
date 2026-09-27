<script setup lang="ts">
import SupportChat from "./components/SupportChat.vue";
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div>
        <p class="app-kicker">Pulse partner example</p>
        <h1>Vue</h1>
      </div>

      <dl class="app-details">
        <div>
          <dt>Framework</dt>
          <dd>Vue 3</dd>
        </div>
        <div>
          <dt>Integration</dt>
          <dd>Custom element</dd>
        </div>
      </dl>
    </header>

    <main class="chat-stage" aria-label="Vue chat widget example">
      <SupportChat />
    </main>
  </div>
</template>
