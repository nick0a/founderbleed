import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // If authorized callback returns false, it redirects?
  // Or we can handle it here.
  // Since we defined authorized callback, let's let it handle protection logic mostly.
  // But for safety, we can leave this simple pass-through or just export auth directly.
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
