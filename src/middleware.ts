import { NextResponse, NextRequest } from "next/server";

const privateRoutes = ["/private"];
const adminRoutes = ["/admin"];

export async function middleware(request: NextRequest) {
  const response = (await middlewareAuth(request)) ?? NextResponse.next();

  return response;
}

export async function getUserFromSessionMiddleware(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/get-user-from-session`,
      {
        headers: {
          cookie: cookieHeader,
        },
      }
    );
    const responseJson = await response.json();

    return responseJson.user;
  } catch (error) {
    console.log(error);
    return null;
  }
}

async function middlewareAuth(request: NextRequest) {
  if (privateRoutes.includes(request.nextUrl.pathname)) {
    const user = await getUserFromSessionMiddleware(request);
    if (user == null) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  if (adminRoutes.includes(request.nextUrl.pathname)) {
    const user = await getUserFromSessionMiddleware(request);
    if (user == null) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    if (user.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
