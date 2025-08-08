import { COOKIE_SESSION_KEY } from "@/auth/core/constants";
import { db } from "@/drizzle/db";
import { UserTable, SessionTable } from "@/drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();

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

  return NextResponse.json({ user });
}
