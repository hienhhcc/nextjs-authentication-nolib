import crypto from "crypto";

import { SessionTable, userRoles, UserTable } from "@/drizzle/schema";
import { z } from "zod";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/drizzle/db";
import {
  SESSION_EXPIRATION_SECONDS,
  COOKIE_SESSION_KEY,
} from "@/auth/core/constants";

const sessionSchema = z.object({
  id: z.string(),
  role: z.enum(userRoles),
});

type UserSession = z.infer<typeof sessionSchema>;

export type Cookies = {
  set: (
    key: string,
    value: string,
    options: {
      secure?: boolean;
      httpOnly?: boolean;
      sameSite?: "strict" | "lax";
      expires?: number;
    }
  ) => void;
  get: (key: string) => { name: string; value: string } | undefined;
  delete: (key: string) => void;
};

export async function createUserSession(
  user: UserSession,
  cookieStore: Cookies
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

export async function setSessionCookie(
  sessionId: string,
  expiresAtInMilliseconds: number,
  cookieStore: Cookies
) {
  cookieStore.set(COOKIE_SESSION_KEY, sessionId, {
    expires: expiresAtInMilliseconds,
    secure: true,
    httpOnly: true,
    sameSite: "lax",
  });
}

export async function getUserFromSession(cookieStore: Pick<Cookies, "get">) {
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

export async function updateUserSessionData(
  user: UserSession,
  cookies: Pick<Cookies, "get">
) {
  const sessionId = cookies.get(COOKIE_SESSION_KEY)?.value;
  if (sessionId == null) return null;

  await db
    .update(SessionTable)
    .set({
      expiresAt: new Date(Date.now() + SESSION_EXPIRATION_SECONDS * 1000),
    })
    .where(eq(SessionTable.id, sessionId));
}
