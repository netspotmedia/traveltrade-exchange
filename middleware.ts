import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PROTECTED = ['/dashboard', '/orders', '/messages', '/admin', '/agent', '/onboarding', '/requests', '/settings']
const AUTH_ONLY = ['/auth/login', '/auth/sign-up', '/auth/forgot-password']

function pathStartsWith(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  // Refreshes the session and sets any refreshed cookies on the response.
  const { data: { user } } = await supabase.auth.getUser()

  if (pathStartsWith(pathname, PROTECTED) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (pathStartsWith(pathname, AUTH_ONLY) && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  // Homepage A/B: assign a sticky hero variant (a | b) on first visit so the
  // variant stays consistent for a visitor while we measure conversion.
  if (pathname === '/' && !request.cookies.get('ttx_hero')) {
    response.cookies.set('ttx_hero', Math.random() < 0.5 ? 'a' : 'b', {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/dashboard/wallet/:path*',
    '/orders/:path*',
    '/requests/:path*',
    '/settings/:path*',
    '/messages/:path*',
    '/admin/:path*',
    '/agent/:path*',
    '/onboarding/:path*',
    '/auth/login',
    '/auth/sign-up',
    '/auth/forgot-password',
  ],
}
