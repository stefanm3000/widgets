import { buildApp } from "./app.js";
import { readConfig } from "./config.js";

const config = readConfig(process.env);
const app = await buildApp({
  allowedOrigins: config.allowedOrigins,
  logger: true,
  tokenSecret: config.tokenSecret,
});

const close = async () => {
  await app.close();
  process.exit(0);
};

process.once("SIGINT", close);
process.once("SIGTERM", close);

await app.listen({ host: config.host, port: config.port });
