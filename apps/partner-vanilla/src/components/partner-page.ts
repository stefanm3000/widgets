import { requireElement } from "../helpers/dom";
import type { PartnerPageElements } from "../types";

export function renderPartnerPage(root: HTMLElement): PartnerPageElements {
  root.innerHTML = `
    <div class="site-shell">
      <header class="site-header">
        <a class="brand" href="#top" aria-label="Northstar home">
          <span class="brand-mark" aria-hidden="true">N</span>
          <span>Northstar</span>
        </a>
        <nav class="site-nav" aria-label="Primary navigation">
          <a href="#product">Product</a>
          <a href="#resources">Resources</a>
          <a href="#support">Support</a>
        </nav>
        <a class="account-link" href="#account">My account</a>
      </header>

      <main id="top">
        <section class="hero" aria-labelledby="page-title">
          <div class="hero-copy">
            <p class="eyebrow"><span></span> Customer care, without the queue</p>
            <h1 id="page-title">Answers that keep you moving.</h1>
            <p class="hero-summary">
              Talk to a Northstar specialist about your workspace, billing, or
              next launch. Your conversation stays available while you browse.
            </p>

            <dl class="service-details" aria-label="Support availability">
              <div>
                <dt>Typical reply</dt>
                <dd>Under 2 minutes</dd>
              </div>
              <div>
                <dt>Availability</dt>
                <dd>Monday–Friday</dd>
              </div>
            </dl>

            <div class="trust-note">
              <span class="agent-stack" aria-hidden="true">
                <span>AM</span><span>JL</span><span>SK</span>
              </span>
              <p><strong>Real people, ready to help.</strong><br />Based across three time zones.</p>
            </div>
          </div>

          <div class="support-panel" id="support">
            <div class="support-panel-heading">
              <div>
                <p class="panel-kicker">Northstar Concierge</p>
                <h2>Start a conversation</h2>
              </div>
              <span class="availability"><span></span> Online</span>
            </div>

            <div class="widget-frame" data-widget-host></div>
            <p class="widget-status" data-widget-status aria-live="polite">Chat mounted</p>

            <div class="demo-controls" aria-label="Embed lifecycle controls">
              <button type="button" data-action="unmount">Unmount</button>
              <button type="button" data-action="mount">Remount</button>
              <button type="button" data-action="theme">Use dark theme</button>
            </div>
          </div>
        </section>

        <section class="assurance-grid" aria-label="Northstar support benefits">
          <article><span>01</span><h2>Product experts</h2><p>Get guidance from people who know the platform inside out.</p></article>
          <article><span>02</span><h2>Conversation history</h2><p>Return to the thread without repeating what already happened.</p></article>
          <article><span>03</span><h2>Secure by design</h2><p>Short-lived access keeps each support session scoped.</p></article>
        </section>
      </main>
    </div>
  `;

  return {
    mountButton: requireElement(root, '[data-action="mount"]'),
    status: requireElement(root, "[data-widget-status]"),
    themeButton: requireElement(root, '[data-action="theme"]'),
    unmountButton: requireElement(root, '[data-action="unmount"]'),
    widgetHost: requireElement(root, "[data-widget-host]"),
  };
}
