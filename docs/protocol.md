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
- Message bodies are trimmed, non-empty, and limited to 500 characters.
- History pages contain ordered `items` and an opaque `nextCursor`.
- API failures use a stable error code, readable message, and optional request ID.

History cursors are opaque to consumers. The API owns their encoding and may
change it without changing the public DTO. Clients pass the value back unchanged.

## Realtime frames

Clients may send `subscribe`, `unsubscribe`, and `pong` frames. The server sends
`ready`, `subscribed`, `event`, `refetch_required`, `error`, and `ping` frames.
Every event has a server-issued monotonic decimal `eventId`, a room ID, an event
type, and a validated payload.

The first event type is `message.created`. On reconnect, a client supplies its
last event cursor while subscribing. The server replays retained events after
that cursor. If the cursor has expired, the server sends `refetch_required` and
the client reloads room history before continuing.

Malformed JSON and schema-invalid frames produce `malformed_frame`. Permission
and authentication failures are explicit and may be fatal. The transport will
bound frame size and use ping/pong timeouts when the realtime server is added.
