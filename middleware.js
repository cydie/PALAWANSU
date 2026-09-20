import { NextResponse } from 'next/server';

export function middleware(request) {
  const token = request.cookies.get('palawansu_session')?.value;
  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith('/admin') || pathname.startsWith('/student');
  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if ((pathname === '/login' || pathname === '/register') && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/student/:path*', '/login', '/register'],
};
