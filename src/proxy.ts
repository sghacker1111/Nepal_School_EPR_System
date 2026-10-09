import { type NextRequest, NextResponse } from "next/server";

const sessionCookie =
  process.env.NODE_ENV === "production"
    ? "__Host-nepal-school-erp-session"
    : "nepal-school-erp-session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(sessionCookie);
  const protectedRoute =
    pathname.startsWith("/dashboard") || pathname.startsWith("/student") || pathname.startsWith("/teacher") || pathname.startsWith("/super-admin/") && pathname !== "/super-admin/login";

  if (protectedRoute && !hasSession) {
    const loginUrl = new URL(
      pathname.startsWith("/super-admin") ? "/super-admin/login" : "/login",
      request.url,
    );
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/student/:path*", "/teacher/:path*", "/super-admin/:path*"],
};
