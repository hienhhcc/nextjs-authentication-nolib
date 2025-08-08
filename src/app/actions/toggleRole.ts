"use server";

import { COOKIE_SESSION_KEY } from "@/auth/core/constants";
import { getCurrentUser } from "@/auth/nextjs/getCurrentUser";
import { db } from "@/drizzle/db";
import { UserTable } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export async function toggleRole() {
  const user = await getCurrentUser({ redirectIfNotFound: true });
  const cookieStore = await cookies();

  const sessionId = cookieStore.get(COOKIE_SESSION_KEY)?.value;
  if (sessionId == null) return null;

  const [updatedUser] = await db
    .update(UserTable)
    .set({ role: user.role === "admin" ? "user" : "admin" })
    .where(eq(UserTable.id, user.id))
    .returning({ id: UserTable.id, role: UserTable.role });

  if (updatedUser == null) {
    return null;
  }

  revalidatePath("/private");
}
