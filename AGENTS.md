# Widgets development

Read `README.md` and `docs/architecture.md` before changing package boundaries.
The repository currently contains tooling only; implement features in small,
working increments.

## Package boundaries

- `apps/api` will own Fastify, PostgreSQL models, Drizzle migrations, and secrets.
- `packages/protocol` will expose versioned wire schemas and safe DTOs only.
- `packages/sdk` must stay browser-safe with no React, Fastify, or Drizzle runtime dependency.
- `packages/chat-widget` will consume only the SDK's public API.
- Add a separate `packages/embed` only when its browser output warrants it.
- Keep partner examples small and independently runnable.

## Checks

Use pnpm and Node.js 24. Run `pnpm install --frozen-lockfile`, then `pnpm check`.
Individual commands are `pnpm format:check`, `pnpm lint`, `pnpm typecheck`,
`pnpm test`, and `pnpm build`. Add meaningful package scripts as code lands;
do not count empty Turbo task runs as feature validation. Once apps exist,
include a browser smoke test and relevant cross-partner Playwright checks.

## Working conventions

Preserve existing work. Verify current stable dependencies when adding them.
Document material tradeoffs in `docs/decisions.md`. Never invent deployment
URLs, published packages, production integrations, or security guarantees.

Use small atomic commits with short lowercase messages, such as
`scaffold api workspace` or `add websocket subscriptions`. Use the developer's
configured Git identity. Do not add AI attribution or co-author footers.
