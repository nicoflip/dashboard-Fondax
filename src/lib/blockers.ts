import { Task, CalendarEvent, TaskStatus, TaskBlockerInfo, BlockerConfig, TaskBlockedStatus } from './types'

/**
 * Extrait les métadonnées de dépendance/blocage d'une tâche à partir de sa description textuelle.
 */
export function parseTaskBlocker(desc?: string | null): TaskBlockerInfo {
  if (!desc) {
    return { type: 'none', requiredStatus: 'fait', cleanDescription: '' }
  }

  // 1. Bloqueur par tâche (nouveau format) : [depends_on:task:<taskId>:<status>]
  const taskMatch = desc.match(/^\[depends_on:task:([^:]+):([^\]]+)\]\s*\n?([\s\S]*)$/i)
  if (taskMatch) {
    return {
      type: 'task',
      prereqTaskId: taskMatch[1].trim(),
      requiredStatus: (taskMatch[2].trim() as TaskStatus) || 'fait',
      cleanDescription: taskMatch[3].trim()
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
  allEvents: CalendarEvent[] = []
): TaskBlockedStatus {
  const blocker = parseTaskBlocker(t.description)
  if (blocker.type === 'none') {
    return { isBlocked: false, blocker }
  }

  if (blocker.type === 'task' && blocker.prereqTaskId) {
    const prereq = allTasks.find(item => item.id === blocker.prereqTaskId)
    if (!prereq) return { isBlocked: false, blocker }
    const isBlocked = prereq.status !== blocker.requiredStatus
    return { isBlocked, blocker, prereqTask: prereq }
  }

  if (blocker.type === 'event' && blocker.prereqEventId) {
    const ev = allEvents.find(item => item.id === blocker.prereqEventId)
    if (!ev) return { isBlocked: false, blocker }
    const todayStr = new Date().toISOString().split('T')[0]
    const isPast = ev.status === 'passé' || (ev.event_date && ev.event_date < todayStr)
    const isBlocked = !isPast
    return { isBlocked, blocker, prereqEvent: ev }
  }

  if (blocker.type === 'date' && blocker.unlockDate) {
    const todayStr = new Date().toISOString().split('T')[0]
    const isBlocked = todayStr < blocker.unlockDate
    return { isBlocked, blocker, unlockDate: blocker.unlockDate }
  }

  return { isBlocked: false, blocker }
}

/**
 * Trie une liste de tâches intelligemment :
 * 1. Tâches terminées tout en bas
 * 2. Tâches bloquées après les tâches prêtes à être exécutées
 * 3. Tâches prêtes ordonnées par priorité (haute > moyenne > basse)
 * 4. Plus récentes d'abord en cas d'égalité
 */
export function sortTasksWithBlockers(
  tasks: Task[],
  allEvents: CalendarEvent[] = []
): Task[] {
  const prioOrder: Record<string, number> = { haute: 1, moyenne: 2, basse: 3 }

  return [...tasks].sort((a, b) => {
    // 1. Terminées tout en bas
    const isDoneA = a.status === 'fait'
    const isDoneB = b.status === 'fait'
    if (isDoneA && !isDoneB) return 1
    if (!isDoneA && isDoneB) return -1

    // 2. Pour les tâches actives, les non-bloquées passent avant les bloquées
    if (!isDoneA && !isDoneB) {
      const blockedA = checkTaskBlocked(a, tasks, allEvents).isBlocked
      const blockedB = checkTaskBlocked(b, tasks, allEvents).isBlocked
      if (blockedA && !blockedB) return 1
      if (!blockedA && blockedB) return -1
    }

    // 3. Tri par priorité
    const orderA = prioOrder[a.priority] || 99
    const orderB = prioOrder[b.priority] || 99
    if (orderA !== orderB) return orderA - orderB

    // 4. Tri par date de création décroissante
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}
