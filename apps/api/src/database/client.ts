import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";

import * as schema from "./schema.js";

export type PulseDatabase = NodePgDatabase<typeof schema>;

export function createDatabase(pool: Pool): PulseDatabase {
  return drizzle(pool, { schema });
}
