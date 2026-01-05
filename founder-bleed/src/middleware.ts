import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const publicPaths = ["/signin", "/error", "/"];
  const isPublicRoute =
    publicPaths.includes(req.nextUrl.pathname) ||
    req.nextUrl.pathname.startsWith("/share");

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
