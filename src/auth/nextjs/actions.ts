"use server";

import { signInSchema, signUpSchema } from "@/auth/nextjs/schemas";
import { z } from "zod";

export async function signIn(unsafeData: z.infer<typeof signInSchema>) {
  return "hello";
}

export async function signUp(unsafeData: z.infer<typeof signUpSchema>) {
  return "hi";
}

export async function oAuthSignIn() {}
