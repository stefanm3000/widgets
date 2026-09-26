# Widgets

Pulse is a framework-agnostic TypeScript SDK and embeddable live chat widget.
This repository demonstrates one backend and protocol across unrelated partner websites.

## Status

Workspace scaffold only. The API, SDK, widget, partner demos, and deployment are not implemented yet.

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

Only formatting and shared ESLint configuration have executable checks today. Build, typecheck, and test tasks are wired up but have no application targets yet.

## Workspace

- `apps/`: reserved for the API, playground, and partner demos.
- `packages/eslint-config`: shared base and React lint configurations.
- `packages/typescript-config`: shared strict TypeScript configurations.
- `docs/architecture.md`: planned boundaries and delivery phases.
- `docs/decisions.md`: implementation decisions and tradeoffs.

Next: a runnable slice with Fastify, PostgreSQL/Drizzle, the protocol, browser SDK, React widget, playground, and plain HTML embed.
