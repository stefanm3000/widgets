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

## Wrap the React widget for framework-neutral embeds

Keep the React `ChatWidget` as the single implementation of the conversation UI.
The separate `@pulse/embed` browser bundle includes its React runtime, registers
the `<pulse-chat>` custom element, and mounts the widget inside Shadow DOM with
bundled CSS. Vue, Svelte, and plain JavaScript integrations therefore render the
same behavior and styling without translating the component into each framework.

Pass the SDK client and theme as element properties because they are structured
runtime values; reflect the room ID through the `room-id` attribute for ordinary
HTML composition. Disconnecting the element unmounts React and releases widget
subscriptions, while the caller retains ownership of the SDK client so multiple
elements may share it. The tradeoff is a larger standalone bundle for non-React
consumers in exchange for one tested UI implementation.

## Persist messages and replay events together

Use PostgreSQL through Drizzle for rooms, participants, messages, and realtime
events. A message and its monotonic replay event are inserted in one transaction;
the in-process listener runs only after that transaction commits. The sender,
room, and client message ID form the idempotency key, while each message stores a
display-name snapshot so old chat history does not change when a participant's
current name changes.

Keep the memory store behind the same asynchronous interface for focused unit
tests and local experiments without `DATABASE_URL`. Production requires the
database configuration. SQL-store tests run the generated migrations through
the `pg` driver against `pg-mem`, then close and reopen the store to verify
persistence and cursor replay without requiring Docker in the test runner.

Subscriptions remain process-local. The committed event log supports reconnect
and replay on one API instance; horizontal deployments still require a shared
fanout system such as PostgreSQL notifications or a message broker.
