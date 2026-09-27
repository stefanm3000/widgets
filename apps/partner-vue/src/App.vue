<script setup lang="ts">
import MarketingHeader from "./components/MarketingHeader.vue";
import MetricStrip from "./components/MetricStrip.vue";
import SupportChat from "./components/SupportChat.vue";
</script>

<template>
  <div class="site-shell">
    <MarketingHeader />

    <main id="top">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">Research intelligence · Built for product teams</p>
          <h1>Make the next decision obvious.</h1>
          <p class="hero-summary">
            Morrow turns interviews, support notes, and product signals into a
            living evidence base your whole team can trust.
          </p>

          <div class="hero-actions">
            <a class="primary-action" href="#platform">Explore the platform</a>
            <a class="text-action" href="#method"
              >See our method <span>→</span></a
            >
          </div>

          <div class="signal-card" aria-label="Latest research signal">
            <span class="signal-index">08</span>
            <div>
              <p>Signal detected across 14 conversations</p>
              <strong
                >Teams want one place to trace decisions back to
                customers.</strong
              >
            </div>
          </div>
        </div>

        <SupportChat />
      </section>

      <MetricStrip />
    </main>
  </div>
</template>
