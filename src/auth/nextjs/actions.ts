"use server";

import { generateSalt, hashPassword } from "@/auth/core/passwordHasher";
import { signInSchema, signUpSchema } from "@/auth/nextjs/schemas";
import { db } from "@/drizzle/db";
import { z } from "zod";
import { UserTable } from "@/drizzle/schema";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createUserSession } from "@/auth/core/session";

export async function logOut() {}

export async function signIn(unsafeData: z.infer<typeof signInSchema>) {
  return "hello";
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
