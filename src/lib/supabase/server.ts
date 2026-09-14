import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

  try {
    new URL(url)
  } catch {
    url = 'https://placeholder.supabase.co'
  }

  try {
    return createServerClient(
      url,
      key,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Appelé depuis un Server Component — ignoré
            }
          },
        },
      }
    )
  } catch (error) {
    console.error('Fatal error creating Supabase server client:', error)
    return createServerClient(
      'https://placeholder.supabase.co',
      'placeholder',
      { cookies: { getAll: () => [], setAll: () => {} } }
    )
  }
}
