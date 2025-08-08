import crypto from "crypto";

import { SessionTable, userRoles, UserTable } from "@/drizzle/schema";
import { z } from "zod";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/drizzle/db";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const SESSION_EXPIRATION_SECONDS = 60 * 60 * 24 * 7;
const COOKIE_SESSION_KEY = "cookie-id";

const sessionSchema = z.object({
  id: z.string(),
  role: z.enum(userRoles),
});

type UserSession = z.infer<typeof sessionSchema>;

export async function createUserSession(
  user: UserSession,
  cookieStore: ReadonlyRequestCookies
) {
  const sessionId = crypto.randomBytes(512).toString("hex").normalize();

  const expiresAtInMilliseconds =
    Date.now() + SESSION_EXPIRATION_SECONDS * 1000;

  const expiresAt = new Date(expiresAtInMilliseconds);

  const [session] = await db
    .insert(SessionTable)
    .values({ expiresAt, sessionId, userId: user.id })
    .returning();

  if (session == null) return "Unable to create user session";

  setSessionCookie(sessionId, expiresAtInMilliseconds, cookieStore);
}

async function setSessionCookie(
  sessionId: string,
  expiresAtInMilliseconds: number,
  cookieStore: ReadonlyRequestCookies
) {
  cookieStore.set(COOKIE_SESSION_KEY, sessionId, {
    expires: expiresAtInMilliseconds,
    secure: true,
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function getUserFromSession(cookieStore: ReadonlyRequestCookies) {
  const sessionId = cookieStore.get(COOKIE_SESSION_KEY)?.value;

  if (sessionId == null) return null;

  const [user] = await db
    .select({
      id: UserTable.id,
      name: UserTable.name,
      email: UserTable.email,
      role: UserTable.role,
      // sessionExpires: SessionTable.expiresAt,
    })
    .from(SessionTable)
    .innerJoin(UserTable, eq(SessionTable.userId, UserTable.id))
    .where(
      and(
        eq(SessionTable.sessionId, sessionId),
        gt(SessionTable.expiresAt, new Date())
      )
    )
    .limit(1);

  return user;
}
