"use server";

import {
  comparePasswords,
  generateSalt,
  hashPassword,
} from "@/auth/core/passwordHasher";
import { signInSchema, signUpSchema } from "@/auth/nextjs/schemas";
import { db } from "@/drizzle/db";
import { z } from "zod";
import { SessionTable, UserTable } from "@/drizzle/schema";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { COOKIE_SESSION_KEY, createUserSession } from "@/auth/core/session";
import { eq } from "drizzle-orm/sql";

export async function logOut() {
  const cookieStore = await cookies();

  const sessionId = cookieStore.get(COOKIE_SESSION_KEY)?.value;

  if (sessionId == null) return null;

  await db.delete(SessionTable).where(eq(SessionTable.sessionId, sessionId));

  cookieStore.delete(COOKIE_SESSION_KEY);
}

export async function signIn(unsafeData: z.infer<typeof signInSchema>) {
  const { data, success } = signInSchema.safeParse(unsafeData);

  if (!success) return "Unable to log you in";

  const existingUser = await db.query.UserTable.findFirst({
    columns: { password: true, salt: true, id: true, email: true, role: true },
    where: ({ email }, { eq }) => eq(email, data.email),
  });

  if (
    existingUser == null ||
    existingUser.salt == null ||
    existingUser.password == null
  )
    return "Unable to log you in";

  const isPasswordCorrect = await comparePasswords({
    hashedPassword: existingUser.password,
    password: data.password,
    salt: existingUser.salt,
  });

  if (!isPasswordCorrect) return "Unable to log you in";

  await createUserSession(
    { id: existingUser.id, role: existingUser.role },
    await cookies()
  );

  redirect("/");
}

export async function signUp(unsafeData: z.infer<typeof signUpSchema>) {
  const { data, success } = signUpSchema.safeParse(unsafeData);

  if (!success) return "Unable to create account";

  const existingUser = await db.query.UserTable.findFirst({
    where: ({ email }, { eq }) => eq(email, data.email),
  });

  if (existingUser != null) return "Account already exists for this email";

  try {
    const salt = generateSalt();
    const hashedPassword = await hashPassword(data.password, salt);

    const [user] = await db
      .insert(UserTable)
      .values({
        email: data.email,
        name: data.name,
        password: hashedPassword,
        salt,
      })
      .returning({ id: UserTable.id, role: UserTable.role });

    if (user == null) return "Unable to create account";

    await createUserSession(user, await cookies());
  } catch (e) {
    return "Unable to create account";
  }

  redirect("/");
}

export async function oAuthSignIn() {}
