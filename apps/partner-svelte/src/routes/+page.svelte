<script lang="ts">
  import SupportChat from "../lib/components/SupportChat.svelte";
  import "../styles/index.css";
</script>

<svelte:head>
  <title>Pulse · Svelte partner</title>
  <meta
    name="description"
    content="A SvelteKit partner using the Pulse live chat embed."
  />
</svelte:head>

<main class="chat-stage" aria-label="Svelte chat widget example">
  <SupportChat />
</main>
