import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const user = request.cookies.get('user')

  if (!user) {
    // No user cookie, redirect to login for protected routes
    if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/quiz')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
  // Note: Admin access control is now handled in the admin layout component
  // since we need to check the database for isSuperuser status

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).)*'],
}