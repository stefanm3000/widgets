import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { readConfig } from "./config.js";
import { createPulseMcpServer } from "./server.js";

async function main(): Promise<void> {
  const config = readConfig(process.env);
  const server = createPulseMcpServer(config);
  const close = async () => {
    await server.close();
    process.exit(0);
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
  await server.connect(new StdioServerTransport());
}

main().catch(() => {
  // stdout is exclusively MCP JSON-RPC. Do not print environment or raw errors.
  console.error(
    "Pulse MCP failed to start. Check PULSE_API_URL and PULSE_ACCESS_TOKEN; see docs/mcp.md.",
  );
  process.exitCode = 1;
});
