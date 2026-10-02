# Svelte partner

A small SvelteKit 3 / Svelte 5 partner using the public `@pulse/sdk` and
`@pulse/embed` APIs. The `<pulse-chat>` custom element provides the shared React
widget inside Shadow DOM; Svelte owns the partner page and client lifecycle.

From the workspace root, with the API running:

```sh
pnpm --filter @pulse/partner-svelte... build
pnpm --filter @pulse/partner-svelte dev
```

Open `http://localhost:5176`. Development uses `/api/` with HTTP and WebSocket
proxying to port 4000. `.env.example` documents an explicit public API URL and
an optional development proxy target.

The page prerenders without contacting the API. A typed Svelte attachment in
`src/lib/helpers/chat-attachment.ts` owns the embed's browser-only import,
client creation, theme assignment, and cleanup. The component declares
`<pulse-chat {@attach attachChat}>` without a bound DOM reference. Removing the
element disposes its SDK client; an import that finishes after removal creates
no client.
Tokens refresh through the demo endpoint using a session UUID saved under
`pulse-svelte-session-id`; this is the repository's anonymous demo flow.

`pnpm --filter @pulse/partner-svelte build` produces static files in `build/`.
Set `VITE_PULSE_API_URL` at build time for static hosting, including its trailing
slash, and configure the API's allowed origin. `pnpm --filter @pulse/partner-svelte
preview` previews the build; it does not provide the development API proxy.

The shared Playwright suite starts its own isolated API and all partner servers:

```sh
pnpm --filter @pulse/partner-vanilla... build
pnpm --filter @pulse/partner-vanilla exec playwright test svelte-partner.spec.ts
```

It checks Svelte-to-Vue/Vanilla delivery, replies, source labels, persistent
identity, channel URLs after reload, and the mobile composer. The recovery suite
also includes Svelte for WebSocket replay and anchored history pagination.
