import { createBrowserClient } from '@supabase/ssr'

let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (clientInstance) return clientInstance

  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  
  try {
    new URL(url)
  } catch {
    url = 'https://placeholder.supabase.co'
  }

  try {
    clientInstance = createBrowserClient(url, key)
    return clientInstance
  } catch (error) {
    console.error('Fatal error creating Supabase browser client:', error)
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder')
  }
}
