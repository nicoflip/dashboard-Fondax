import { Task, CalendarEvent, TaskStatus, TaskBlockerInfo, BlockerConfig, TaskBlockedStatus, WaitingReturn } from './types'
import { calculateTaskTemperature } from './task-temperature'

/**
 * Extrait les métadonnées de dépendance/blocage d'une tâche à partir de sa description textuelle.
 */
export function parseTaskBlocker(desc?: string | null): TaskBlockerInfo {
  if (!desc) {
    return { type: 'none', requiredStatus: 'fait', cleanDescription: '' }
  }

  // Retirer temporairement les balises [waiting:...] pour matcher le bloqueur indépendamment de l'ordre
  const cleanedForBlocker = desc.replace(/\[waiting:[^\]]+\]\s*\n?/gi, '')

  // 1. Bloqueur par tâche (nouveau format) : [depends_on:task:<taskId>:<status>]
  const taskMatch = cleanedForBlocker.match(/^\[depends_on:task:([^:]+):([^\]]+)\]\s*\n?([\s\S]*)$/i)
  if (taskMatch) {
    return {
      type: 'task',
      prereqTaskId: taskMatch[1].trim(),
      requiredStatus: (taskMatch[2].trim() as TaskStatus) || 'fait',
      cleanDescription: taskMatch[3].trim()
    }
  }

  // 1b. Bloqueur par retour attendu : [depends_on:waiting:<returnId>] ou [waiting_return:<returnId>]
  const waitingBlockerMatch = cleanedForBlocker.match(/^\[depends_on:waiting:([^\]]+)\]\s*\n?([\s\S]*)$/i)
  if (waitingBlockerMatch) {
    return {
      type: 'waiting',
      prereqReturnId: waitingBlockerMatch[1].trim(),
      prereqTaskId: waitingBlockerMatch[1].trim(),
      requiredStatus: 'fait',
      cleanDescription: waitingBlockerMatch[2].trim()
    }
  }

  const waitingReturnMatch = cleanedForBlocker.match(/^\[waiting_return:([^\]]+)\]\s*\n?([\s\S]*)$/i)
  if (waitingReturnMatch) {
    return {
      type: 'waiting',
      prereqReturnId: waitingReturnMatch[1].trim(),
      prereqTaskId: waitingReturnMatch[1].trim(),
      requiredStatus: 'fait',
      cleanDescription: waitingReturnMatch[2].trim()
    }
  }

  // 2. Bloqueur par événement calendrier : [depends_on:event:<eventId>]
  const eventMatch = desc.match(/^\[depends_on:event:([^\]]+)\]\s*\n?([\s\S]*)$/i)
  if (eventMatch) {
    return {
      type: 'event',
      requiredStatus: 'fait',
      prereqEventId: eventMatch[1].trim(),
      cleanDescription: eventMatch[2].trim()
    }
  }

  // 3. Bloqueur par date précise : [depends_on:date:<YYYY-MM-DD>]
  const dateMatch = desc.match(/^\[depends_on:date:([0-9]{4}-[0-9]{2}-[0-9]{2})\]\s*\n?([\s\S]*)$/i)
  if (dateMatch) {
    return {
      type: 'date',
      requiredStatus: 'fait',
      unlockDate: dateMatch[1].trim(),
      cleanDescription: dateMatch[2].trim()
    }
  }

  // 4. Format historique : [depends_on:<taskId>:<status>]
  const legacyMatch = desc.match(/^\[depends_on:([^:]+):([^\]]+)\]\s*\n?([\s\S]*)$/i)
  if (legacyMatch) {
    return {
      type: 'task',
      prereqTaskId: legacyMatch[1].trim(),
      requiredStatus: (legacyMatch[2].trim() as TaskStatus) || 'fait',
      cleanDescription: legacyMatch[3].trim()
    }
  }

  return { type: 'none', requiredStatus: 'fait', cleanDescription: desc }
}

/**
 * Formate la description d'une tâche en y adjoignant le préfixe de prérequis si activé.
 */
export function formatTaskDescriptionWithBlocker(
  cleanDesc: string,
  blocker: BlockerConfig
): string {
  const base = (cleanDesc || '').trim()
  const returnId = blocker.prereqReturnId || blocker.prereqTaskId
  if (blocker.type === 'waiting' && returnId) {
    return `[depends_on:waiting:${returnId}]\n${base}`.trim()
  }
  if (blocker.type === 'task' && blocker.prereqTaskId) {
    const st = blocker.requiredStatus || 'fait'
    return `[depends_on:task:${blocker.prereqTaskId}:${st}]\n${base}`.trim()
  }
  if (blocker.type === 'event' && blocker.prereqEventId) {
    return `[depends_on:event:${blocker.prereqEventId}]\n${base}`.trim()
  }
  if (blocker.type === 'date' && blocker.unlockDate) {
    return `[depends_on:date:${blocker.unlockDate}]\n${base}`.trim()
  }
  return base
}

/**
 * Détermine si une tâche est actuellement bloquée par un prérequis non satisfait.
 */
export function checkTaskBlocked(
  t: Task,
  allTasks: Task[],
  allEvents: CalendarEvent[] = [],
  allWaitingReturns: WaitingReturn[] = []
): TaskBlockedStatus {
  const blocker = parseTaskBlocker(t.description)
  if (blocker.type === 'none') {
    return { isBlocked: false, blocker }
  }

  if (blocker.type === 'waiting') {
    const returnId = blocker.prereqReturnId || blocker.prereqTaskId
    if (!returnId) return { isBlocked: false, blocker }

    // 1. Chercher parmi les retours attendus (Section « En attente »)
    const prereqReturn = allWaitingReturns.find(r => r.id === returnId)
    if (prereqReturn) {
      const isBlocked = prereqReturn.status === 'en attente'
      return { isBlocked, blocker, prereqReturn }
    }

    // 2. Fallback rétrocompatible si une tâche avait été liée
    const prereqTask = allTasks.find(item => item.id === returnId)
    if (prereqTask) {
      const isBlocked = prereqTask.status === 'en attente de retour externe'
      return { isBlocked, blocker, prereqTask }
    }

    return { isBlocked: false, blocker }
  }

  if (blocker.type === 'task' && blocker.prereqTaskId) {
    const prereq = allTasks.find(item => item.id === blocker.prereqTaskId)
    if (!prereq) return { isBlocked: false, blocker }
    const isBlocked = prereq.status !== blocker.requiredStatus
    return { isBlocked, blocker, prereqTask: prereq }
  }

  const todayStr = new Date().toISOString().split('T')[0]

  if (blocker.type === 'event' && blocker.prereqEventId) {
    const ev = allEvents.find(item => item.id === blocker.prereqEventId)
    if (!ev) return { isBlocked: false, blocker }
    const isResolved = ev.status === 'clos' || ev.status === 'passé' || (ev.event_date && ev.event_date < todayStr)
    const isBlocked = !isResolved
    return { isBlocked, blocker, prereqEvent: ev }
  }

  if (blocker.type === 'date' && blocker.unlockDate) {
    const isBlocked = todayStr < blocker.unlockDate
    return { isBlocked, blocker, unlockDate: blocker.unlockDate }
  }

  return { isBlocked: false, blocker }
}

/**
 * Trie une liste de tâches intelligemment :
 * 1. Tâches terminées tout en bas
 * 2. Tâches bloquées après les tâches prêtes à être exécutées
 * 3. Tâches prêtes ordonnées par indice thermique décroissant (les tâches en surchauffe / qui traînent remontent en haut)
 * 4. En cas d'égalité thermique, priorité (haute > moyenne > basse)
 * 5. Plus anciennes d'abord en dernier recours pour ne rien laisser traîner
 */
export function sortTasksWithBlockers(
  tasks: Task[],
  allEvents: CalendarEvent[] = [],
  allWaitingReturns: WaitingReturn[] = []
): Task[] {
  const prioOrder: Record<string, number> = { haute: 1, moyenne: 2, basse: 3 }
  const now = new Date()

  return [...tasks].sort((a, b) => {
    // 1. Terminées tout en bas
    const isDoneA = a.status === 'fait'
    const isDoneB = b.status === 'fait'
    if (isDoneA && !isDoneB) return 1
    if (!isDoneA && isDoneB) return -1

    // 2. Pour les tâches actives, les non-bloquées passent avant les bloquées
    if (!isDoneA && !isDoneB) {
      const blockedA = checkTaskBlocked(a, tasks, allEvents, allWaitingReturns).isBlocked
      const blockedB = checkTaskBlocked(b, tasks, allEvents, allWaitingReturns).isBlocked
      if (blockedA && !blockedB) return 1
      if (!blockedA && blockedB) return -1
    }

    // 3. Tri par température / indice de latence décroissant (les plus chaudes en haut)
    const tempA = calculateTaskTemperature(a, now).score
    const tempB = calculateTaskTemperature(b, now).score
    if (tempA !== tempB) return tempB - tempA

    // 4. Tri secondaire par priorité nominale
    const orderA = prioOrder[a.priority] || 99
    const orderB = prioOrder[b.priority] || 99
    if (orderA !== orderB) return orderA - orderB

    // 5. En cas d'égalité absolue, les plus anciennes d'abord (pour éviter d'enterrer)
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })
}
