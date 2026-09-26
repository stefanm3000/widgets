# SDK integration

`@pulse/sdk` is the framework-independent browser client. It owns REST calls,
one shared WebSocket connection, room subscriptions, event cursors, message
deduplication, and reconnect timers. It has no React, Fastify, or database
runtime dependency.

The package is private during development and is not published yet.

## Create a client

```ts
import { createPulseClient } from "@pulse/sdk";

const client = createPulseClient({
  baseUrl: "http://127.0.0.1:4000",
  async getToken() {
    const response = await fetch("/api/pulse-token", { method: "POST" });
    if (!response.ok) throw new Error("Could not create a chat session");
    const session = await response.json();
    return session.accessToken;
  },
});
```

`getToken` is asynchronous so an integration can refresh a short-lived token
without recreating the client. A real partner should call its own backend, which
keeps partner credentials server-side. The browser must never contain a partner
secret or long-lived API key.

## Read, send, and subscribe

```ts
const room = await client.getRoom("demo-room");
const history = await client.getMessages(room.id, { limit: 50 });

const stop = client.subscribe(room.id, (event) => {
  console.log(event.payload);
});

await client.sendMessage(room.id, "Hello from the SDK");

stop();
client.dispose();
```

`sendMessage` generates a client message ID and the API uses it for idempotency.
Callers may provide a stable ID as the third argument when retrying an operation
across their own lifecycle.

Use `onConnectionState` to render `connecting`, `connected`, `reconnecting`, and
`offline`. `onError` exposes transport and protocol failures.
`onRefetchRequired` fires when the server cannot replay an old cursor; reload
history for that room when it occurs.

Unsubscribe when a view unmounts. Call `dispose` when the integration owns the
client and is finished with it. Disposal closes the socket and removes reconnect,
online, and visibility listeners. Multiple room subscriptions share one socket.
