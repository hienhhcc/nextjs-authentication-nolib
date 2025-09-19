import { env } from "@/data/env/server";
import * as schema from "@/drizzle/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
const sql = neon(env.DB_URL);

export const db = drizzle(sql, { schema });
