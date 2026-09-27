import { Pool } from "pg";

import { createDatabase } from "./client.js";
import { migrateDatabase } from "./migrations.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const pool = new Pool({ connectionString: databaseUrl });

try {
  await migrateDatabase(createDatabase(pool));
} finally {
  await pool.end();
}
