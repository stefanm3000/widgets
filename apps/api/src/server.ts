import { Pool } from "pg";

import { buildApp } from "./app.js";
import { readConfig } from "./config.js";
import { PostgresChatStore } from "./store.js";

const config = readConfig(process.env);
const store = config.databaseUrl
  ? new PostgresChatStore(
      new Pool({
        connectionString: config.databaseUrl,
        max: 10,
      }),
    )
  : undefined;
const app = await buildApp({
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

await app.listen({ host: config.host, port: config.port });
