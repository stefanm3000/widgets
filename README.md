# Widgets

Pulse is a framework-agnostic TypeScript SDK and embeddable live chat widget.
This repository demonstrates one backend and protocol across unrelated partner websites.

## Status

The versioned protocol and API are implemented. The API serves a seeded
in-memory room, issues short-lived demo JWTs, returns paginated history, accepts
idempotent messages, and broadcasts them through authenticated WebSocket
subscriptions. Persistence, the browser SDK, widget, partner demos, and
deployment are still in progress.

## Development

Use Node.js 24 and pnpm 10.30.3 (pinned in package.json).

```sh
pnpm install
pnpm check
```

Initialized with `pnpm dlx create-turbo@latest`. The default Next.js apps and generic UI package were removed to make room for the planned stack.

| Command          | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| `pnpm dev`       | Run development servers once app packages are added |
| `pnpm build`     | Build workspace packages                            |
| `pnpm lint`      | Run package linters                                 |
| `pnpm typecheck` | Run package check-types scripts                     |
| `pnpm test`      | Run package tests                                   |
| `pnpm format`    | Format source and documentation                     |
| `pnpm check`     | Check formatting, lint, types, tests, and builds    |

### Run the API

```sh
cp apps/api/.env.example apps/api/.env
pnpm --filter @pulse/api dev
```

The local API listens on `http://127.0.0.1:4000`. Start with
`POST /auth/demo-token`, passing `{ "displayName": "Your name" }`, then use the
returned bearer token with the room and message endpoints. Local storage resets
whenever the process restarts.

## Workspace

- `apps/`: reserved for the API, playground, and partner demos.
- `packages/eslint-config`: shared base and React lint configurations.
- `packages/typescript-config`: shared strict TypeScript configurations.
- `docs/architecture.md`: planned boundaries and delivery phases.
- `docs/decisions.md`: implementation decisions and tradeoffs.

Next: the browser SDK, React widget, playground, and plain HTML embed. PostgreSQL
and Drizzle will replace the in-memory store as a separate persistence feature.
