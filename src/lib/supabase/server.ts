import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const DEFAULT_SUPABASE_URL = 'https://shapgbvpqbtqfycujydw.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoYXBnYnZwcWJ0cWZ5Y3VqeWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNDYxMjcsImV4cCI6MjEwNDkyMjEyN30.5BKWtbNU7zUXwnDZ0njMDvPEqHy7Ms0CgSYexOfo_4M'

export function createClient() {
  const cookieStore = cookies()

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

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
      DEFAULT_SUPABASE_URL,
      DEFAULT_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => [], setAll: () => {} } }
    )
  }
}
