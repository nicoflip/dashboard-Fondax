import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname.startsWith('/login')

  // Check if any Supabase auth cookie is present
  const allCookies = request.cookies.getAll()
  const hasAuthCookie = allCookies.some(c => c.name.startsWith('sb-') && c.name.includes('-auth-token'))

  // FAST PATH: If no auth cookie exists, avoid making any remote network call!
  if (!hasAuthCookie) {
    if (isLoginPage) {
      return NextResponse.next()
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // User has an auth cookie: verify with Supabase with a strict 2s timeout
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const authPromise = supabase.auth.getUser()
    const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) => 
      setTimeout(() => reject(new Error('Auth check timeout')), 2000)
    )
    const { data } = await Promise.race([authPromise, timeoutPromise])
    if (data?.user) {
      user = data.user
    }
  } catch (err) {
    console.warn('Middleware auth verification skipped or timed out:', err)
  }

  // Rediriger vers /login si non authentifié
  if (!user && !isLoginPage) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Rediriger vers / si déjà authentifié et sur /login
  if (user && isLoginPage) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/'
    return NextResponse.redirect(homeUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|_next/data|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
