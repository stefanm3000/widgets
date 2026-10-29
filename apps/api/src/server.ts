import { attachDatabasePool } from "@vercel/functions";
import type { FastifyInstance } from "fastify";
import { Pool } from "pg";

import { buildApp } from "./build-app.js";
import { readConfig } from "./config.js";
import { PostgresChatStore } from "./store.js";

const config = readConfig(process.env);
const pool = config.databaseUrl
  ? new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
    })
  : undefined;
if (pool) attachDatabasePool(pool);
const store = pool ? new PostgresChatStore(pool) : undefined;
const app: FastifyInstance = await buildApp({
  allowedOrigins: config.allowedOrigins,
  logger: true,
  store,
  tokenSecret: config.tokenSecret,
});

const close = async () => {
  await app.close();
  process.exit(0);
};

process.once("SIGINT", close);
process.once("SIGTERM", close);

// Vercel captures listen() while importing this module and opens the port later.
// Awaiting it here would block that import from completing.
void app.listen({ host: config.host, port: config.port }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
