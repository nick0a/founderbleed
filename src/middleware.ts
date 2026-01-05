import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple middleware that doesn't import auth to avoid edge runtime issues
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = ['/', '/signin', '/error', '/api/health'];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith('/api/auth')
  );

  // Check for session token cookie
  const sessionToken = request.cookies.get('authjs.session-token') || 
                       request.cookies.get('__Secure-authjs.session-token');
  const isLoggedIn = !!sessionToken;

  // Redirect unauthenticated users to signin
  if (!isLoggedIn && !isPublicRoute) {
    const signInUrl = new URL('/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from signin
  if (isLoggedIn && pathname === '/signin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
