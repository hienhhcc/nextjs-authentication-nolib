import { OAuthClient } from "@/auth/core/oauth/base";
import { createUserSession } from "@/auth/core/session";
import { db } from "@/drizzle/db";
import {
  OAuthProvider,
  oAuthProviders,
  UserOAuthAccountTable,
  UserTable,
} from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: rawProvider } = await params;

  const code = request.nextUrl.searchParams.get("code");
  const provider = z.enum(oAuthProviders).parse(rawProvider);

  if (typeof code !== "string") {
    redirect(
      `/sign-in?oauthError=${encodeURIComponent(
        "Failed to connect. Please try again"
      )}`
    );
  }

  try {
    const oAuthUser = await new OAuthClient().fetchUser(code);
    const user = await connectUserToAccount(oAuthUser, provider);
    await createUserSession(user, await cookies());
  } catch (error) {
    console.error(error);
    redirect(
      `/sign-in?oauthError=${encodeURIComponent(
        "Failed to connect. Please try again"
      )}`
    );
  }

  redirect("/");
}

function connectUserToAccount(
  { id, email, name }: { id: string; email: string; name: string },
  provider: OAuthProvider
) {
  return db.transaction(async (tx) => {
    let user = await tx.query.UserTable.findFirst({
      where: eq(UserTable.email, email),
      columns: { id: true, role: true },
    });

    if (user == null) {
      const [newUser] = await tx
        .insert(UserTable)
        .values({ email, name })
        .returning({ id: UserTable.id, role: UserTable.role });
      user = newUser;
    }

    await tx
      .insert(UserOAuthAccountTable)
      .values({
        provider,
        providerAccountId: id,
        userId: user.id,
      })
      .onConflictDoNothing();

    return user;
  });
}
