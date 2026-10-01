# Pulse MCP server

`apps/mcp` is a local Node.js 24 stdio server named `pulse`. Assistants can
read and act in Pulse through five tools. The server uses the public
`@pulse/sdk` API and the shared protocol schemas. Every operation goes through
the existing authenticated HTTP API; the MCP process has no database access or
token-signing secret. Messages sent through MCP follow the same persistence and
WebSocket broadcast path as messages sent by partner widgets.

## Local setup

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @pulse/mcp... build
cp apps/mcp/.env.example apps/mcp/.env
```

Start the Pulse API as described in the root README. For a quick memory-mode
demo, run `pnpm --filter @pulse/api dev` with `DATABASE_URL` unset. For persistent
messages, follow the PostgreSQL setup instead.

Obtain a demo token from that API. Use the same session UUID and source when
refreshing credentials so the sender identity stays the same:

```sh
curl --fail-with-body http://127.0.0.1:4000/auth/demo-token \
  -H 'content-type: application/json' \
  -d '{"sessionId":"77f42efb-69ca-49f3-b4f0-f75aa973c023","source":"playground"}'
```

Replace the example UUID with your own (`node -p 'crypto.randomUUID()'`). Put
the returned `accessToken` in `apps/mcp/.env` as `PULSE_ACCESS_TOKEN`. The existing
demo endpoint grants access to `demo-room` and its channels. Demo tokens expire
after 15 minutes by default. Refresh the token in the file and restart the MCP
connection when it expires. This process never obtains a token automatically.
MCP messages use the identity and source of the supplied token; the example
therefore appears as a playground participant in the widgets.

Run `pnpm --filter @pulse/mcp start` for manual stdio use, or let an MCP client
start the compiled entry point directly. stdout carries only MCP JSON-RPC;
startup diagnostics go to stderr. Development uses
`pnpm --filter @pulse/mcp dev:stdio` after building its workspace dependencies.
The root `pnpm dev` starts the API and partner apps; start MCP separately so a
missing MCP token does not stop their development servers.

## Connect to Codex

Add this to your user or project MCP configuration, replacing `/absolute/path/widgets`
with this checkout's absolute path:

```toml
[mcp_servers.pulse]
command = "node"
args = [
  "--env-file=/absolute/path/widgets/apps/mcp/.env",
  "/absolute/path/widgets/apps/mcp/dist/stdio.js"
]
```

The client must resolve `node` to Node.js 24. Use the compiled Node entry point
instead of a package-manager command to keep package-manager logs off the MCP
stdout stream. Credentials stay in the ignored `.env` file. You can alternatively
pass `PULSE_API_URL` and `PULSE_ACCESS_TOKEN` through your client's environment.
Do not commit access tokens or put the API's `PULSE_TOKEN_SECRET` in MCP settings.
See the [official Codex MCP configuration documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).

Useful requests after connecting:

- “Show the latest 10 messages in Pulse's demo-room.”
- “List the channels in demo-room.”
- “Create a channel called Release planning in demo-room.”
- “Send ‘The release checklist is ready’ to that channel.”

## Tools and behavior

| Tool             | Inputs                                                            | Result                  |
| ---------------- | ----------------------------------------------------------------- | ----------------------- |
| `get_room`       | `roomId`                                                          | `{ room }`              |
| `list_channels`  | Parent `roomId`                                                   | `{ items }`             |
| `get_messages`   | `roomId`, optional `limit` (1–100, default 50), optional `cursor` | `{ items, nextCursor }` |
| `send_message`   | `roomId`, `body`, UUID `clientMessageId`                          | `{ message }`           |
| `create_channel` | Parent `roomId`, `name`                                           | `{ room }`              |

Messages are chronological within each page. The first page contains the newest
messages; pass `nextCursor` back as `cursor` to load earlier pages. A null cursor
means there are no earlier pages. Room and channel IDs are returned by Pulse;
there is no global room-discovery endpoint.

The protocol validates all inputs and results. Messages are limited to 500
characters and channel names to 120 characters. Reuse the same client message
UUID for retries of one send, including after a timeout. The API deduplicates
by sender, room, and client message ID. Channel creation is not idempotent:
duplicate names are allowed, and the server does not retry creation automatically.

Read tools are annotated as read-only. Write tools are annotated as writes and
describe their shared visibility. These annotations help clients make approval
decisions; they do not enforce permissions. The Pulse API enforces room access
on every call. Bearer tokens stay out of tool results and raw upstream/network
errors are replaced with safe error messages. Requests time out after 10 seconds
and redirects are rejected. API URLs require HTTPS except for loopback HTTP.

## Validation and limits

```sh
pnpm check
```

MCP tests exercise initialization, tool discovery, schema validation, authenticated
SDK calls, pagination, safe errors, and startup failure. The cross-partner
Playwright suite launches the real stdio server, reads a Vanilla widget message,
creates a channel, sends and retries an MCP message, and verifies live delivery
and reload history in both Vanilla and Vue. It also checks a forbidden write.

This server supports local stdio clients. A ChatGPT remote connection would need
a Streamable HTTP transport and an appropriate user authentication flow. The
repository's anonymous demo identity exchange is not production user authentication.
This implementation does not deploy an MCP endpoint or add an AI agent inside
the website widget.
