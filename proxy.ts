import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getNeonAuth, hasNeonAuthConfig } from "@/lib/auth/server";
import { hasNeonOAuthSessionCallback } from "@/lib/auth/oauth-callback";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const isPublicPage = pathname === "/login" || pathname === "/register";
  // Neon must exchange the OAuth verifier before the public home page can render the session.
  const isHomeOAuthCallback =
    pathname === "/" && hasNeonOAuthSessionCallback(request.url, request.headers.get("cookie"));
  if (isPublicPage) return NextResponse.next();

  if (pathname.includes("/preview") && request.nextUrl.searchParams.get("export") === "true") {
    return NextResponse.next();
  }

  if (!hasNeonAuthConfig()) {
    if (pathname === "/") return NextResponse.next();
    if (pathname.startsWith("/api/")) {
      if (request.cookies.get("session")?.value) return NextResponse.next();
      return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
    }

    if (request.cookies.get("session")?.value) return NextResponse.next();

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/") {
    const hasNeonAuthCookie = request.cookies
      .getAll()
      .some(({ name }) => name.startsWith("__Secure-neon-auth."));
    if (!hasNeonAuthCookie && !isHomeOAuthCallback) return NextResponse.next();
  }

  const auth = getNeonAuth();
  if (!auth) return NextResponse.next();

  return auth.middleware({ loginUrl: "/login" })(request);
}

export const config = {
  matcher: [
    "/",
    "/analysis/:path*",
    "/history/:path*",
    "/settings/:path*",
    "/api/:path*",
  ],
};
