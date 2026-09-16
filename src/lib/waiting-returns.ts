import { SupabaseClient } from '@supabase/supabase-js'
import { WaitingReturn, WaitingReturnStatus } from './types'

export interface WaitingReturnMetrics {
  daysWaiting: number
  isDragging: boolean // >= 7 jours sans retour
  isWarning: boolean // 4 à 6 jours
  followUpStatus: 'overdue' | 'today' | 'upcoming' | 'none'
  daysDiffFollowUp: number | null
  formattedFollowUpDate: string | null
  formattedSinceDate: string
}

const LOCAL_STORAGE_KEY = 'fondax_waiting_returns_fallback'

function getLocalFallback(): WaitingReturn[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalFallback(items: WaitingReturn[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

/**
 * Récupère tous les retours attendus.
 * Tente d'abord la table dédiée `waiting_returns`.
 * En cas d'absence de la table, utilise `notes` avec `category = '__WAITING_RETURN__'`.
 */
export async function fetchWaitingReturns(supabase: SupabaseClient): Promise<WaitingReturn[]> {
  // 1. Essai sur la table native waiting_returns
  try {
    const { data, error } = await supabase
      .from('waiting_returns')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      saveLocalFallback(data)
      return data as WaitingReturn[]
    }
  } catch {
    // Continuer vers le fallback
  }

  // 2. Repli transparent sur la table notes (catégorie __WAITING_RETURN__)
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('category', '__WAITING_RETURN__')
      .order('updated_at', { ascending: false })

    if (!error && data) {
      const parsed: WaitingReturn[] = data.map(item => {
        let meta: Record<string, any> = {}
        try {
          meta = JSON.parse(item.content || '{}')
        } catch {
          meta = {}
        }

        return {
          id: item.id,
          title: item.title,
          waiting_on: meta.waiting_on || 'Tiers externe',
          target_type: meta.target_type || 'Prestataire',
          description: meta.description || null,
          status: (meta.status as WaitingReturnStatus) || 'en attente',
          follow_up_date: meta.follow_up_date || null,
          follow_up_count: meta.follow_up_count || 0,
          since_date: meta.since_date || item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          created_at: item.created_at,
          updated_at: item.updated_at
        }
      })
      saveLocalFallback(parsed)
      return parsed
    }
  } catch {
    // Continuer vers local storage
  }

  // 3. Repli local
  return getLocalFallback()
}

/**
 * Crée un nouveau retour attendu.
 */
export async function createWaitingReturn(
  supabase: SupabaseClient,
  input: {
    title: string
    waiting_on: string
    target_type?: string
    description?: string | null
    status?: WaitingReturnStatus
    follow_up_date?: string | null
    follow_up_count?: number
    since_date?: string
  }
): Promise<WaitingReturn> {
  const sinceDate = input.since_date || new Date().toISOString().split('T')[0]
  const status: WaitingReturnStatus = input.status || 'en attente'
  const followUpCount = input.follow_up_count || 0

  // 1. Tenter table native
  try {
    const { data, error } = await supabase
      .from('waiting_returns')
      .insert([{
        title: input.title.trim(),
        waiting_on: input.waiting_on.trim(),
        target_type: input.target_type || 'Prestataire',
        description: input.description?.trim() || null,
        status,
        follow_up_date: input.follow_up_date || null,
        follow_up_count: followUpCount,
        since_date: sinceDate
      }])
      .select()
      .single()

    if (!error && data) {
      return data as WaitingReturn
    }
  } catch {
    // fallback
  }

  // 2. Repli table notes
  const meta = {
    waiting_on: input.waiting_on.trim(),
    target_type: input.target_type || 'Prestataire',
    description: input.description?.trim() || null,
    status,
    follow_up_date: input.follow_up_date || null,
    follow_up_count: followUpCount,
    since_date: sinceDate
  }

  try {
    const { data, error } = await supabase
      .from('notes')
      .insert([{
        title: input.title.trim(),
        content: JSON.stringify(meta),
        category: '__WAITING_RETURN__'
      }])
      .select()
      .single()

    if (!error && data) {
      return {
        id: data.id,
        title: data.title,
        ...meta,
        created_at: data.created_at,
        updated_at: data.updated_at
      }
    }
  } catch {
    // fallback
  }

  // 3. Fallback mémoire / localStorage
  const fallbackItem: WaitingReturn = {
    id: 'local_' + Date.now(),
    title: input.title.trim(),
    waiting_on: input.waiting_on.trim(),
    target_type: input.target_type || 'Prestataire',
    description: input.description?.trim() || null,
    status,
    follow_up_date: input.follow_up_date || null,
    follow_up_count: followUpCount,
    since_date: sinceDate,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  const current = getLocalFallback()
  saveLocalFallback([fallbackItem, ...current])
  return fallbackItem
}

/**
 * Met à jour un retour attendu existant.
 */
export async function updateWaitingReturn(
  supabase: SupabaseClient,
  id: string,
  updates: Partial<WaitingReturn>
): Promise<void> {
  // 1. Tenter table native
  try {
    const { error } = await supabase
      .from('waiting_returns')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (!error) return
  } catch {
    // fallback
  }

  // 2. Repli table notes
  try {
    // Récupérer la note actuelle pour fusionner
    const { data: currentNote } = await supabase.from('notes').select('*').eq('id', id).single()
    if (currentNote) {
      let currentMeta: Record<string, any> = {}
      try {
        currentMeta = JSON.parse(currentNote.content || '{}')
      } catch {
        currentMeta = {}
      }

      const mergedMeta = {
        ...currentMeta,
        ...(updates.waiting_on !== undefined && { waiting_on: updates.waiting_on }),
        ...(updates.target_type !== undefined && { target_type: updates.target_type }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.follow_up_date !== undefined && { follow_up_date: updates.follow_up_date }),
        ...(updates.follow_up_count !== undefined && { follow_up_count: updates.follow_up_count }),
        ...(updates.since_date !== undefined && { since_date: updates.since_date })
      }

      await supabase
        .from('notes')
        .update({
          title: updates.title !== undefined ? updates.title : currentNote.title,
          content: JSON.stringify(mergedMeta),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
      return
    }
  } catch {
    // fallback
  }

  // 3. Fallback local
  const current = getLocalFallback()
  const updated = current.map(item => item.id === id ? { ...item, ...updates, updated_at: new Date().toISOString() } : item)
  saveLocalFallback(updated)
}

/**
 * Supprime un retour attendu.
 */
export async function deleteWaitingReturn(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  try {
    await supabase.from('waiting_returns').delete().eq('id', id)
  } catch {}
  try {
    await supabase.from('notes').delete().eq('id', id)
  } catch {}

  const current = getLocalFallback()
  saveLocalFallback(current.filter(item => item.id !== id))
}

/**
 * Calcule les métriques temporelles d'un retour attendu (jours écoulés, statut de relance).
 */
export function getWaitingReturnMetrics(
  item: WaitingReturn,
  now: Date = new Date()
): WaitingReturnMetrics {
  const todayStr = now.toISOString().split('T')[0]
  const today = new Date(todayStr + 'T00:00:00')

  const sinceDateObj = new Date((item.since_date || todayStr) + 'T00:00:00')
  const timeDiffSince = today.getTime() - sinceDateObj.getTime()
  const daysWaiting = Math.max(0, Math.floor(timeDiffSince / (1000 * 60 * 60 * 24)))

  const isDragging = daysWaiting >= 7
  const isWarning = daysWaiting >= 4 && daysWaiting < 7

  let followUpStatus: 'overdue' | 'today' | 'upcoming' | 'none' = 'none'
  let daysDiffFollowUp: number | null = null
  let formattedFollowUpDate: string | null = null

  if (item.follow_up_date) {
    const followUpDateObj = new Date(item.follow_up_date + 'T00:00:00')
    const timeDiffFollowUp = followUpDateObj.getTime() - today.getTime()
    daysDiffFollowUp = Math.round(timeDiffFollowUp / (1000 * 60 * 60 * 24))

    formattedFollowUpDate = followUpDateObj.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    })

    if (daysDiffFollowUp < 0) {
      followUpStatus = 'overdue'
    } else if (daysDiffFollowUp === 0) {
      followUpStatus = 'today'
    } else {
      followUpStatus = 'upcoming'
    }
  }

  const sinceDateFormatted = sinceDateObj.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })

  return {
    daysWaiting,
    isDragging,
    isWarning,
    followUpStatus,
    daysDiffFollowUp,
    formattedFollowUpDate,
    formattedSinceDate: sinceDateFormatted
  }
}

/**
 * Extrait l'ID du retour attendu référencé dans la description d'une tâche.
 * Formats reconnus :
 * 1. [waiting_return:<returnId>]
 * 2. [depends_on:waiting:<returnId>]
 */
export function extractWaitingReturnId(desc?: string | null): string | null {
  if (!desc) return null
  const match1 = desc.match(/\[waiting_return:([^\]]+)\]/i)
  if (match1) return match1[1].trim()

  const match2 = desc.match(/\[depends_on:waiting:([^\]]+)\]/i)
  if (match2) return match2[1].trim()

  return null
}

/**
 * Formate la description d'une tâche pour y lier un retour attendu.
 */
export function formatTaskWithWaitingReturn(desc: string | null | undefined, returnId: string | null): string {
  let cleaned = (desc || '')
    .replace(/\[waiting_return:[^\]]+\]\s*\n?/gi, '')
    .replace(/\[depends_on:waiting:[^\]]+\]\s*\n?/gi, '')
    .trim()

  if (!returnId) return cleaned
  return `[waiting_return:${returnId}]\n${cleaned}`.trim()
}
