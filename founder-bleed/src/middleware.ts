import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Use Node.js runtime for crypto module support
export const runtime = 'nodejs';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isPublicRoute = ['/signin', '/error', '/'].some(path =>
    req.nextUrl.pathname === path
  ) || req.nextUrl.pathname.startsWith('/share/');

  if (!isLoggedIn && !isPublicRoute) {
    // Preserve the original URL as callbackUrl so user returns after signin
    const signinUrl = new URL('/signin', req.url);
    signinUrl.searchParams.set('callbackUrl', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(signinUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};