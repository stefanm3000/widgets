# Neon PostgreSQL setup

Pulse uses only Neon PostgreSQL. The API retains Fastify, `pg`, Drizzle,
application-issued JWTs, and its WebSocket protocol. Neon Auth, Realtime,
Functions, Object Storage, and the Data API are not required.

## Project configuration

The Neon CLI links the working directory through a gitignored `.neon` file.
The committed root `neon.ts` contains the branch policy; Postgres is implicit
on every Neon branch. `@neon/config` and `@neon/env` are development tools at
the workspace root, not browser or API runtime dependencies.

With the CLI authenticated:

```sh
neon config plan
neon deploy
```

Deploy reconciles the declared services and writes the linked branch's
`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and `NEON_BRANCH` to root `.env.local`
(or `.env` if that file exists). Both env files and `.neon` are gitignored.
The CLI's global Neon plugin provides skills and the OAuth MCP server for
supported agents; no duplicate project MCP configuration is needed.

## Database initialization

For an empty database:

```sh
pnpm --filter @pulse/protocol build
pnpm --filter @pulse/api db:setup
```

Migration uses the direct `DATABASE_URL_UNPOOLED` when set; normal application
queries and seeding use pooled `DATABASE_URL`. Local PostgreSQL can continue
using only `DATABASE_URL`. Existing Railway history requires a database export
and restore instead of starting with just the demo seed.

API development, start, migration, and seed commands load these optional files
in order: root `.env`, root `.env.local`, API `.env`, API `.env.local`.
Later files override earlier files. The process environment overrides every
file, including variables supplied by Vercel or an isolated test runner.

## Vercel API project

Use the Fastify preset, root directory `apps/api`, Node.js 24.x, and enable
files outside the root directory. Set the build command to
`pnpm --filter @pulse/api... build`, the install command to
`pnpm install --frozen-lockfile`, and leave the output-directory override off.

The server entrypoint is `src/server.ts`. The app factory lives in
`src/build-app.ts`, so Vercel does not detect the factory as a runnable server.
The API explicitly sets `typeRoots` to its own `node_modules/@types` so Node
types still resolve when Vercel transpiles through a temporary TypeScript 7
configuration outside the workspace.
The API attaches its module-level PostgreSQL pool to Vercel's lifecycle helper
and releases idle connections after five seconds.

Set Vercel's `DATABASE_URL` to Neon's pooled connection string,
`PULSE_TOKEN_SECRET` to a random secret of at least 32 characters, and
`PULSE_ALLOWED_ORIGINS` to the comma-separated partner origins. A CLI env pull
does not update Vercel's environment settings. Run database migrations
separately from preview builds, using the direct connection string.

This database setup does not add cross-instance message broadcasts. The current
store broadcasts within one API process. Vercel can run multiple instances, so
live delivery across them still requires shared event distribution. PostgreSQL
history and replay remain durable; verify hosted WebSocket behavior separately
before treating the Vercel migration as complete.

## Verification

Run `pnpm install --frozen-lockfile` and `pnpm check` with Node.js 24.
The standard browser suite covers Vanilla, Vue, React, and Svelte integrations.
Its normal API fixture uses an in-memory store.

For real PostgreSQL regression tests, set `TEST_DATABASE_URL` to a direct
connection on a disposable Neon branch, then run:

```sh
pnpm --filter @pulse/api test:postgres
```

These tests create and drop their own database; the role needs `CREATEDB`.
The dedicated command allows 30 seconds per test and setup hook for remote
connection latency, and the lock-observation assertion allows 15 seconds.
Before initializing production, validate migrations and actual browser message
delivery on an isolated branch, then restart the API and confirm history
survives. Remove the temporary branch after verification.
