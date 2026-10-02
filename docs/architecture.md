# Planned architecture

This describes the intended Pulse project and the boundaries implemented so far.

## Stack and boundaries

- pnpm workspaces, Turborepo, and TypeScript.
- `apps/api`: Node.js, Fastify, raw WebSockets via `ws`, PostgreSQL, and Drizzle.
- `apps/mcp`: Node.js stdio MCP adapter using the public SDK to call authenticated
  Pulse HTTP endpoints; no database access or token signing.
- `apps/playground`: React Router, Tailwind CSS, and selected shadcn/ui components.
- `apps/partner-svelte`: SvelteKit 3 and Svelte 5, with static prerendering and
  browser-only SDK/embed initialization.
- `packages/protocol`: runtime-validated, versioned wire schemas and public DTOs.
- `packages/sdk`: framework-independent REST and realtime client.
- `packages/chat-widget`: accessible React UI using the public SDK.
- `packages/embed`: optional separate browser bundle exposing mount, update, and destroy.
- `apps/partner-react`, `apps/partner-vue`, `apps/partner-svelte`, and
  `apps/partner-vanilla`: distinct, independently deployable integration examples.

Database models and secrets stay in the API. The protocol exports no server
internals; the SDK has no React, Fastify, or Drizzle runtime dependencies.
There is no Convex dependency or generic shared UI package.

## Behavior and integration contract

Start with one seeded demo room and fictional participants. Fetch paginated
history through REST and receive persisted messages through WebSockets. Use
client message IDs for idempotent sends and broadcast only after the database
commit. Authenticate senders and authorize room access.

Resume connections from a server-issued monotonic event cursor. Replay missed
events or request a full history refetch when a cursor expires. Deduplicate by
stable message ID. Use capped exponential backoff with jitter, heartbeats, and
explicit connection states; stop retrying on explicit authentication failures.
Keep history readable offline and disable sends until connected.

The script embed uses Shadow DOM with bundled CSS. Theme presets and validated
semantic tokens control branding. The React wrapper offers typed class slots;
the isolated embed offers stable CSS parts. Support multiple instances and
mount/unmount/remount without leaked sockets, timers, subscriptions, or styles.
Keep a shared validated options contract and allow theme updates without reconnecting.

Partner browsers obtain scoped short-lived tokens through their own backend,
which authenticates to Pulse server-to-server. Keep partner credentials out of
browser bundles and use an async token provider for refresh. Public identifiers
and origin validation are not authentication. Enforce origins, room permissions,
message limits, frame limits, and rate limits on the API.

## Delivery phases

1. Runnable slice: API, migration/seed, protocol, SDK, widget, playground, and
   vanilla consumer; history, send, live receive, themes, and clean lifecycle.
   Document a local PostgreSQL option and environment examples.
2. Recovery and integration: resume/deduplication, backoff, meaningful errors,
   theme tokens, class slots, CSS parts, hostile CSS, and framework partner demos.
   Use Vitest for protocol/retry and persistence/replay checks. Use Playwright
   for cross-partner chat, two sessions, remount, and keyboard accessibility.
3. Portfolio polish: runnable integration documentation, screenshots, real
   deployments, and publishable outputs. Secure SSE fallback is optional.

Success requires the same backend and SDK/widget to connect unrelated partner
apps. At least one end-to-end test must send in one framework and receive in
another. The persistent WebSocket API needs appropriate hosting; do not assume
the static/serverless partner deployment model works for it.

A single API instance may broadcast locally. Horizontal scaling requires a
cross-instance fanout mechanism before multi-instance support can be claimed.
