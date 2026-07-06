import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  guestRegex,
  isDevelopmentEnvironment,
  isPublicRegistrationEnabled,
  isTestEnvironment,
} from "./lib/constants";

const publicPaths = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const isGuest = guestRegex.test(token?.email ?? "");

  if (!token) {
    if (publicPaths.includes(pathname)) {
      return NextResponse.next();
    }

    if (isTestEnvironment) {
      const redirectUrl = encodeURIComponent(
        `${pathname}${request.nextUrl.search}`
      );

      return NextResponse.redirect(
        new URL(`${base}/api/auth/guest?redirectUrl=${redirectUrl}`, request.url)
      );
    }

    const callbackUrl = encodeURIComponent(
      `${pathname}${request.nextUrl.search}`
    );

    return NextResponse.redirect(
      new URL(`${base}/login?callbackUrl=${callbackUrl}`, request.url)
    );
  }

  if (isGuest && !isTestEnvironment) {
    if (publicPaths.includes(pathname)) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          code: "unauthorized:auth",
          message: "Please sign in to continue.",
        },
        { status: 401 }
      );
    }

    const callbackUrl = encodeURIComponent(
      `${pathname}${request.nextUrl.search}`
    );

    return NextResponse.redirect(
      new URL(`${base}/login?callbackUrl=${callbackUrl}`, request.url)
    );
  }

  if (token && !isGuest && ["/login", "/register"].includes(pathname)) {
    return NextResponse.redirect(new URL(`${base}/`, request.url));
  }

  if (pathname === "/register" && !isPublicRegistrationEnabled) {
    return NextResponse.redirect(new URL(`${base}/login`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",
    "/login",
    "/register",

    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
