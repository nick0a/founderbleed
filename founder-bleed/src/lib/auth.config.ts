import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/signin',
    error: '/error',
  },
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthRoute = nextUrl.pathname.startsWith('/signin');
      
      if (isLoggedIn && isAuthRoute) {
        return Response.redirect(new URL('/processing', nextUrl));
      }

      const isProtectedRoute = nextUrl.pathname.startsWith('/dashboard') || 
                               nextUrl.pathname.startsWith('/planning') || 
                               nextUrl.pathname.startsWith('/results') || 
                               nextUrl.pathname.startsWith('/processing') || 
                               nextUrl.pathname.startsWith('/triage') ||
                               nextUrl.pathname.startsWith('/settings');

      if (isProtectedRoute && !isLoggedIn) {
        return false;
      }

      return true;
    },
  },
} satisfies NextAuthConfig;
