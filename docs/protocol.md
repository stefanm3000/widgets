# Protocol

The canonical runtime schemas and inferred TypeScript types live in
`packages/protocol`. Both the API and browser SDK must parse untrusted data with
these schemas instead of maintaining separate request and response shapes.

## Versioning

Realtime frames include `version: "1"`. A client using an unsupported version
receives a fatal `unsupported_version` error and should stop reconnecting until
it is upgraded. REST endpoints are unversioned during local development; a
public deployment will expose them beneath a versioned base path before release.

## REST data

- Room IDs are lowercase, URL-safe slugs.
- Message and participant IDs are UUIDs.
- A message contains its server ID and the caller-generated `clientMessageId`.
- Each participant includes a validated `source` (`playground`, `vue`,
  `vanilla`, or `system`) so clients can identify where a message originated.
- Message bodies are trimmed, non-empty, and limited to 500 characters.
- History pages contain ordered `items` and an opaque `nextCursor`.
- API failures use a stable error code, readable message, and optional request ID.

History cursors are opaque to consumers. The API owns their encoding and may
change it without changing the public DTO. Clients pass the value back unchanged.

The demo-token endpoint accepts a browser-generated UUID and a demo client
source. It derives the same anonymous adjective–animal display name and user ID
for that pair on every token refresh; callers do not submit display names.

## Realtime frames

Clients may send `subscribe`, `unsubscribe`, and `pong` frames. The server sends
`ready`, `subscribed`, `event`, `refetch_required`, `error`, and `ping` frames.
Every event has a server-issued monotonic decimal `eventId`, a room ID, an event
type, and a validated payload.

The first event type is `message.created`. On reconnect, a client supplies its
last event cursor while subscribing. The server replays retained events after
that cursor. If the cursor has expired, the server sends `refetch_required` and
the client reloads room history before continuing.

Subscription acknowledgement follows replay and any live events buffered during
that replay. Its cursor checkpoints idle rooms too; clients treat a null cursor
as zero for an empty room and never move an existing cursor backwards. Cursors
contain at most 19 decimal digits. Replay is limited to 500 events; larger gaps
use `refetch_required` with reason `replay_limit`, followed by a new subscription
checkpoint. History can be paginated independently to read older messages.

Browser clients authenticate the `/realtime` upgrade with two WebSocket
subprotocol values: `pulse.v1` and `pulse-auth.<short-lived-jwt>`. This keeps the
credential out of the URL and its logs while working with the browser WebSocket
API, which cannot set an Authorization header. The server negotiates only
`pulse.v1`; it validates the JWT and allowed Origin before accepting the upgrade.

Malformed JSON and schema-invalid frames produce `malformed_frame`. Permission
and authentication failures are explicit and may be fatal. Active sockets expire
with their JWT: `token_expired` and close code 4001 allow the SDK to refresh its
credentials and reconnect. Fatal errors stop recovery until a new client is
created. The transport bounds frame size, rate, subscriptions, queued frames,
replay, and outgoing buffering, and uses ping/pong timeouts.
