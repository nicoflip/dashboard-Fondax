import { createBrowserClient } from '@supabase/ssr'

const DEFAULT_SUPABASE_URL = 'https://shapgbvpqbtqfycujydw.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoYXBnYnZwcWJ0cWZ5Y3VqeWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNDYxMjcsImV4cCI6MjEwNDkyMjEyN30.5BKWtbNU7zUXwnDZ0njMDvPEqHy7Ms0CgSYexOfo_4M'

let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (clientInstance) return clientInstance

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

  try {
    clientInstance = createBrowserClient(url, key)
    return clientInstance
  } catch (error) {
    console.error('Fatal error creating Supabase browser client:', error)
    return createBrowserClient(DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY)
  }
}
