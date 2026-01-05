import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const publicPaths = ["/signin", "/error", "/"];
  const isPublicRoute =
    publicPaths.includes(req.nextUrl.pathname) ||
    req.nextUrl.pathname.startsWith("/share");

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
