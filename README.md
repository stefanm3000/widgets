# Widgets

Pulse is a framework-agnostic TypeScript SDK and embeddable live chat widget.
This repository demonstrates one backend and protocol across unrelated partner websites.

![Architecture: React imports the chat widget directly, while Vue and vanilla JavaScript use its web component bundle. Browser SDKs connect to the shared API through REST and WebSockets, with PostgreSQL persistence. Assistants connect over local stdio to apps/mcp, which uses the public SDK to call the same API through authenticated REST.](docs/images/pulse-architecture-mcp.png)

`@pulse/embed` wraps the React chat widget in a Shadow DOM web component and
bundles its runtime and styles. Vue and vanilla JavaScript partners import this
bundle; React apps can import `@pulse/chat-widget` directly.

The SDK and API share versioned schemas from `@pulse/protocol`. A message sent
from one partner site is persisted before being broadcast to other browsers
subscribed to the same room or channel. See [the architecture](docs/architecture.md)
for package boundaries and integration details.

## Status

The versioned protocol and API are implemented. The API serves a seeded room
backed by PostgreSQL, issues short-lived demo JWTs, returns paginated history,
accepts idempotent messages, and broadcasts them through authenticated WebSocket
subscriptions. The framework-independent browser SDK adds typed REST calls,
deduplication, cursor resume, and reconnect handling. The accessible React widget
adds connection states, history, live messages, sending, and scoped theme tokens.
The browser embed exposes the same UI as a Shadow DOM custom element for Vue,
Svelte, and plain JavaScript. More partner demos are still in progress.

## Partner app deployments

- [Playground](https://widgets-playground-two.vercel.app)
- [Vue partner app](https://widgets-partner-vue.vercel.app)
- [Vanilla JavaScript partner app](https://widgets-partner-vanilla.vercel.app)

## Development

Use Node.js 24 and pnpm 10.30.3 (pinned in package.json).

```sh
pnpm install --frozen-lockfile
pnpm check
```

Initialized with `pnpm dlx create-turbo@latest`. The default Next.js apps and generic UI package were removed to make room for the planned stack.

| Command          | Purpose                                          |
| ---------------- | ------------------------------------------------ |
| `pnpm dev`       | Run the API and partner development servers      |
| `pnpm build`     | Build workspace packages                         |
| `pnpm lint`      | Run package linters                              |
| `pnpm typecheck` | Run package check-types scripts                  |
| `pnpm test`      | Run package tests                                |
| `pnpm format`    | Format source and documentation                  |
| `pnpm check`     | Check formatting, lint, types, tests, and builds |

### Run the API

```sh
docker compose up -d postgres
cp apps/api/.env.example apps/api/.env
pnpm --filter @pulse/api db:setup
pnpm --filter @pulse/api dev
```

The local API listens on `http://127.0.0.1:4000`. Start with
`POST /auth/demo-token`, passing a stable anonymous session such as
`{ "sessionId": "<uuid>", "source": "playground" }`, then use the returned
bearer token with the room and message endpoints. The API assigns a stable
adjective–animal display name to that source/session pair. Messages and replay
cursors persist across API restarts in the local PostgreSQL volume.

The API uses the in-memory store when `DATABASE_URL` is absent, which keeps unit
tests and quick local experiments self-contained. Production startup requires
both `DATABASE_URL` and `PULSE_TOKEN_SECRET`.

## Workspace

- `apps/`: reserved for the API, playground, and partner demos.
- `apps/mcp`: local stdio MCP tools for authenticated Pulse reads and writes;
  see [MCP setup](docs/mcp.md).
- `apps/partner-vanilla`: independently runnable plain TypeScript integration using the embed.
- `apps/partner-vue`: independently runnable Vue integration using the same custom element.
- `packages/eslint-config`: shared base and React lint configurations.
- `packages/chat-widget`: accessible, themeable React chat UI.
- `packages/embed`: framework-neutral `<pulse-chat>` custom element and mount API.
- `packages/protocol`: versioned runtime schemas and public DTOs.
- `packages/sdk`: browser-safe REST and realtime client.
- `packages/typescript-config`: shared strict TypeScript configurations.
- `docs/architecture.md`: planned boundaries and delivery phases.
- `docs/decisions.md`: implementation decisions and tradeoffs.

### Channels

Scroll to the top of the conversation to load history beyond the initial 50
messages automatically. Earlier pages preserve the first visible message and
merge with live updates. **Load earlier messages** remains available for manual
loading and retries after a failed request.

The widget includes an expanded left sidebar with a manual collapse toggle and
a popover for creating channels. Channels are shared by everyone who has access to the configured
`roomId`; the original room remains selectable. Names can contain up to 120
characters. Use **Refresh channels** to discover channels created in another
client (the list also refreshes when the browser regains focus).

The SDK exposes `getChannels(roomId)` and `createChannel(roomId, name)` through
`GET /rooms/:id/channels` and `POST /rooms/:id/channels`. Apply the database
migrations with `pnpm --filter @pulse/api db:migrate` before running this version
against an existing PostgreSQL database. Memory-mode channels last only until
the API restarts. Switching channels clears the unsent draft. The selected channel is stored in
the `pulse-channel:<roomId>` URL parameter, preserving other partner parameters
and supporting reloads and browser navigation.

### CI and database regression tests

GitHub Actions runs `pnpm check` with Node.js 24, Playwright Chromium, and
PostgreSQL 17. Browser tests always run fresh and include cross-partner delivery,
channel navigation, reconnect replay, and history pagination.

To include real PostgreSQL transaction tests locally, set `TEST_DATABASE_URL` to
a test server connection string and run `pnpm --filter @pulse/api test`.
The test role must have `CREATEDB`; tests create and drop a uniquely named
temporary database without modifying the database named in the URL. Without
this variable, real PostgreSQL tests are skipped and pg-mem tests still run.
