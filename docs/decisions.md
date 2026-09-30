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

## Derive stable anonymous demo identities

Have each demo app persist a random session UUID and submit it with its fixed
source when requesting a short-lived token. The API uses an HMAC of that pair to
derive both a stable participant UUID and an adjective–animal display name. This
keeps identity stable across token refreshes without collecting a user-entered
name or adding mutable anonymous-user state to the database. The client-provided
session UUID is demo identity continuity, not production authentication.

Persist the validated source on both participants and message snapshots. The
shared widget uses that snapshot to label messages and color their borders
consistently: green for Vue, black for vanilla JavaScript, orange for the
playground, and the neutral theme border for seeded system messages.

## Require React 19 for optimistic sends

Use React's `useOptimistic` hook to show a locally submitted message while its
idempotent API request is pending. Reconcile the temporary entry by the same
client message ID passed to the SDK, so a WebSocket event or HTTP response can
replace it without showing a duplicate. A local send explicitly scrolls to its
optimistic entry even when manual scrolling has stopped automatic following.
Keep that client message ID as the rendered row key so confirmation preserves
the DOM node and can transition its opacity from pending to confirmed without a
layout shift. Sends remain independent and concurrent; one pending request does
not disable the composer or block later optimistic messages.

Because `useOptimistic` is a React 19 API, the React widget now declares React
19 and React DOM 19 as its peer range. The framework-neutral embed already
bundles React 19, so non-React partner integrations keep the same public API.

## Preserve authenticated identity in SDK credentials

Allow token providers to return the authenticated participant with the access
token, while continuing to accept a plain token string for SDK-only consumers.
The SDK coalesces simultaneous startup credential requests and exposes the
participant to the widget, so history can identify the current user's messages
before the first send. This avoids decoding or trusting unverified JWT claims in
the browser and keeps identity acquisition inside the browser-safe SDK boundary.

## Use Sugar High for playground source previews

Render the small partner examples with Sugar High's React components instead of
loading Shiki grammars and themes at runtime. The implementation files remain
read-only, render synchronously, and share one theme with Sugar High's accessible
file tree. Sugar High's lighter language parsers trade some grammar-level fidelity
for a smaller dependency surface that is sufficient for these short examples.

## Scope channels to their configured room

Treat a channel as a room with a server-owned parent mapping. The widget's
`roomId` remains its initial conversation and channel scope. Authenticated users
with access to that parent can list, create, read, send, and subscribe to its
channels with their existing token. HTTP and WebSocket paths share the same
access check. Channels are shared with the room's participants, not private to
their creator. Channel nesting is rejected; duplicate names are allowed because
server-generated UUIDs identify channels independently of display names.

Keep the parent mapping in the API database, outside the public room DTO. Both
stores implement channel creation and listing; PostgreSQL inserts the room and
mapping in one transaction. No browser credentials or token claims are changed.

The sidebar follows the composable sidebar reference with scoped widget tokens
and a manual icon toggle. It defaults to expanded at every container width.
CSS grid subgrid shares the header row between the sidebar and conversation,
so wrapping and partner padding align their dividers without measuring the DOM.
Theme presets are explicitly light or dark; partner apps choose the preset and
may override semantic CSS tokens. The widget does not follow the system theme.
