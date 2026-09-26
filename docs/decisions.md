# Decisions

## Start with the workspace foundation

Initialize with `pnpm dlx create-turbo@latest` and pnpm workspaces. Keep the shared
ESLint and strict TypeScript configurations. Remove the starter Next.js apps and
generic UI package because the planned frontend is React Router and the widget
needs explicit integration boundaries.

Pin pnpm to the installed 10.30.3 version and use Node.js 24. Commit the lockfile
for reproducible dependency installation. Keep application implementations for
subsequent focused commits; do not introduce placeholder runtime packages.

## Fail lint checks on errors

Remove the starter's warning-only plugin and make undeclared environment
variables lint errors. Shared tooling should surface failures during local
checks and future CI runs.

## Prove the HTTP contract before persistence

Build the first API feature against a process-local store so the protocol,
authentication boundary, pagination, idempotency, and error behavior can be
tested without coupling them to database setup. The store is explicitly local
development infrastructure and resets on restart. PostgreSQL and Drizzle will
replace it before the demo is presented as persistent.

Issue standard HS256 JWTs from the rate-limited demo token endpoint. Tokens are
short lived and scoped to user identity and allowed rooms. The local server may
use a documented development secret; production startup requires an explicit
secret of at least 32 characters. A partner credential exchange and durable
identity model remain future work.

## Authenticate WebSockets with subprotocols

Send the short-lived JWT as a `pulse-auth.<token>` WebSocket subprotocol alongside
`pulse.v1`. Browser WebSockets cannot attach an Authorization header. A
subprotocol keeps credentials out of URLs and common access logs; the server
negotiates only the version protocol after validating the token and Origin.
