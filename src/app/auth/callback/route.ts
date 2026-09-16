import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/creer-compte'

  if (code) {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      console.error('Erreur échange de code Supabase:', error.message)
    } catch (err) {
      console.error('Exception échange de code Supabase:', err)
    }
  }

  return NextResponse.redirect(`${origin}/creer-compte`)
}
