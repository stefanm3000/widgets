import { z } from "zod";

const localTokenSecret = "pulse-local-token-secret-change-me";

const configSchema = z.object({
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PULSE_TOKEN_SECRET: z.string().min(32).optional(),
  DATABASE_URL: z.url().optional(),
  PULSE_ALLOWED_ORIGINS: z
    .string()
    .default(
      "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176",
    ),
});

export interface ApiConfig {
  allowedOrigins: string[];
  databaseUrl?: string;
  host: string;
  port: number;
  tokenSecret: string;
}

export function readConfig(environment: NodeJS.ProcessEnv): ApiConfig {
  const parsed = configSchema.parse(environment);

  if (parsed.NODE_ENV === "production" && !parsed.PULSE_TOKEN_SECRET) {
    throw new Error("PULSE_TOKEN_SECRET is required in production");
  }
  if (parsed.NODE_ENV === "production" && !parsed.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in production");
  }

  return {
    host: parsed.HOST,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    tokenSecret: parsed.PULSE_TOKEN_SECRET ?? localTokenSecret,
    allowedOrigins: parsed.PULSE_ALLOWED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}
