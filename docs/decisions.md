# Decisions

## Add SvelteKit 3 as a static partner

Use the stable SvelteKit 3.0.0 release and Svelte 5.57.1 for the Svelte partner.
Keep the framework configuration in `vite.config.ts` and extend `$app/tsconfig`,
following the SvelteKit 3 conventions. Use TypeScript 6 for this app because the
framework, Svelte checker, and ESLint parser currently declare compatible ranges
for it, while the rest of the workspace retains its existing TypeScript versions.
Add the Svelte Prettier plugin at the root so the normal format checks include
components; ignore generated `.svelte-kit` output in Git, formatting, and lint.

The static adapter prerenders the page without API credentials or network reads.
Import the DOM-dependent embed inside `onMount`, then create and assign the SDK
client. A synchronous cleanup guards late imports and disposes the owned client.
This preserves one shared chat UI and keeps browser state out of prerendering.
The tradeoff is the embed's bundled React runtime in the Svelte browser output.

Use port 5176 with the same HTTP/WebSocket development proxy as the other demos.
Static deployments must supply a public API URL at build time and allow their
origin on the API; the development proxy does not become a production backend.
Add `svelte` to the protocol's demo sources and render an orange border with a
Svelte label. Existing API source validation and identity derivation remain the
authority; no database migration is needed for the varchar source columns.
Deploy the updated API and browser packages together so all clients recognize
the new source. Cross-partner Playwright checks cover both message directions,
channel reloads, identity continuity, and recovery/history behavior.

Keep the embed's existing framework-independent channel URL handling on this
single-page partner. SvelteKit's development router warns about the bundled
embed calling native history APIs. Verify back/forward navigation and reloads
in Playwright; a future multi-route SvelteKit integration should bridge those
URL writes through SvelteKit's navigation API.

## Expose Pulse actions through a local MCP adapter

Add a separate `apps/mcp` Node.js application with the official MCP TypeScript
SDK. Reuse the public browser-safe Pulse SDK for HTTP operations and the protocol
schemas for tool inputs and outputs. This keeps authorization, persistence,
rate limiting, and broadcasts in the API without duplicating them in tool handlers.
The MCP runtime does not enter browser packages, and the adapter does not import
API internals, database models, or token-signing secrets.

Start with stdio for local clients and an explicitly supplied bearer token.
The adapter never falls back to an anonymous demo token, so an expired or invalid
token produces a tool error. Current demo credentials require manual refresh and
connection restart. Use a separate `dev:stdio` script so the root development
servers can run without MCP credentials. Remote Streamable HTTP and production user authentication
are separate future work; no hosted MCP service is claimed.

Require a client-generated UUID for message sends and preserve it through retries
to reuse the API's sender-scoped idempotency. Channel creation remains non-idempotent
because duplicate names are allowed. Expose read/write annotations and return
validated DTOs with safe errors, while relying on the API for actual authorization.
Use a 10-second HTTP timeout and reject redirects to avoid credential forwarding.
Only loopback HTTP or HTTPS API URLs are accepted.

Verify both directions through the real stdio transport in Playwright: read a
widget message through MCP, then deliver an MCP message live to the Vanilla and
Vue widgets, retry it without duplication, and read it after reload.
The isolated API browser fixture signs separate test identities for this check;
the browser test reuses their tokens across reloads to avoid consuming the shared
demo token endpoint's rate budget. The test credential route exists only in the
browser fixture, not in the API application.

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

## Use Query hooks and URL state in the widget

TanStack Query owns channel lists, room details, identity, history, and mutations.
Each widget has its own cache, and replacing its SDK client advances a cache
scope so credentials and conversation data stay separate. Realtime messages and
confirmed sends use a separate query from paginated history; the transcript
merges both by room, sender, and client message ID. This prevents history requests
from replacing live messages received while those requests were pending.
React 19 callback refs attach SDK
subscriptions and return their cleanup when the room changes or the widget
unmounts. React Compiler memoizes components and hooks in both the widget library
and playground builds, including the subscription refs.

Use nuqs for URL state: TanStack Query manages server data rather than search
parameters. The `pulse-channel:<roomId>` parameter identifies a channel within
its configured room; unknown channel IDs fall back to the parent room. Channel
selection adds browser history entries and preserves unrelated URL parameters.
Instances configured for the same room follow the same selected channel.

Native uncontrolled forms handle the message draft and channel name. Switching
conversations clears the draft through the form's ref lifecycle, while failed
sends restore it only if the same composer session remains active and empty.
The channel form uses a shadcn-style Radix popover portalled into the widget root
to inherit partner tokens and remain inside the embed's Shadow DOM. React
`useId` supplies accessible DOM IDs; message and session IDs remain UUIDs because
the API validates them and uses message IDs for idempotency.

## Make realtime recovery and lifecycle explicit

Buffer live events during subscription replay, send retained events before the
buffer, and acknowledge the subscription after that handoff. The SDK advances
cursors monotonically, including the subscription checkpoint for idle and empty
rooms. PostgreSQL message writes lock their room row before allocating an event
ID, so concurrent writes in a room commit in replay order. This serializes writes
within a room in exchange for a reliable checkpoint; different rooms remain
independent.

Close sockets when their token expires with code 4001, allowing the SDK to call
its token provider and reconnect with refreshed credentials. Explicit fatal
authorization errors stop recovery until the integration creates a new client.
Terminate sockets in Fastify's preClose hook before HTTP shutdown waits for open
connections. Framework HTTP errors use the protocol envelope, including 429
responses and their Retry-After headers.

Bound each connection to 20 room subscriptions, 120 incoming frames per minute,
32 queued frames, 500 buffered live events, and a 1 MiB outgoing backlog. Replay
queries return at most 500 events; larger gaps request a history refetch rather
than loading the full log. These limits protect individual connections and do
not replace deployment-level connection limits or the shared fanout needed for
multiple API instances. The private API and SDK must be deployed together for
the added token-expiry errors and replay-limit refetch reason.

## Wait for committed channel URLs and paginate the transcript

Continue using nuqs for URL writes, but select the visible conversation from the
committed URL rather than its optimistic state. Notify all widget instances once
the queued write completes; native popstate handles browser navigation. A visible
channel selection therefore has a corresponding history entry before reload or
back navigation can discard it.

TanStack infinite queries load earlier history pages on demand. Keep the first
visible message anchored while prepending pages, and merge history with live
messages using sender-scoped client IDs so one participant cannot replace
another participant's message by reusing its client ID.
Use the scroller primitive's prepend restoration together with browser scroll
anchoring. Render loaded rows at their actual height instead of using
content-visibility with estimated heights, which can shift the reading position
after restoration. This trades layout work for stable history navigation;
large loaded transcripts will need virtualization that preserves measured row
heights. Verify the final page where the history button disappears as well.

## Load earlier history when its control enters the viewport

Use a shared `useInfiniteScroll` hook with the chat viewport as the Intersection
Observer root. The earlier-history button doubles as the observed sentinel,
preserving keyboard access and manual loading when the browser lacks the API.
Observe again after each successful page so short transcripts can fill the
viewport. Pause observation during history requests and after pagination errors;
the existing error display and button provide an explicit retry without a request
loop. Disconnect observers on ref changes and unmount, and ignore queued callbacks
after cleanup. Keep the scroller's existing prepend restoration and live-message
merge behavior.

## Run browser checks fresh and test real PostgreSQL transactions

Browser tests depend explicitly on the API build and do not use Turbo's test
cache. Their API fixture seeds an isolated history channel directly in the memory
store, so pagination setup does not consume the normal HTTP rate limits.
CI uses Node.js 24, the frozen lockfile, Playwright Chromium, and PostgreSQL
17, then runs pnpm check. TEST_DATABASE_URL enables real PostgreSQL migration,
concurrent idempotency, ordered replay, and rollback tests. Each run creates and
drops its own temporary database; the supplied test role needs CREATEDB. Keep
pg-mem tests for fast local feedback when PostgreSQL is unavailable.

The browser fixture also exposes a test-only token setup route that runs the
normal authentication handler with a distinct simulated client IP per request.
History-scroll checks use it so additional partner sessions do not exhaust the
shared proxy IP's demo-token quota. The fixture also accepts a validated test
client IP header for history-test browsers, giving each its own normal request
budget when the suite grows. These hooks exist only in the browser fixture;
production routes keep their rate limits.
