import { env } from "@/data/env/server";
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import ws from "ws";
neonConfig.webSocketConstructor = ws;

const sql = neon(env.DB_URL);

export const db = drizzle({ client: sql });
