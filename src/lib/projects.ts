import { Task, Project } from './types'

/**
 * Extrait l'identifiant de chantier [chantier_id:xxx] présent dans la description d'une tâche.
 */
export function extractTaskProjectId(desc?: string | null): string | null {
  if (!desc) return null
  const match = desc.match(/\[chantier_id:([^\]]+)\]/i)
  return match ? match[1].trim() : null
}

/**
 * Nettoie la description d'une tâche en retirant les tags de chantier.
 */
export function cleanTaskDescriptionProject(desc?: string | null): string {
  if (!desc) return ''
  return desc.replace(/\[chantier_id:[^\]]+\]/gi, '').trim()
}

/**
 * Formate la description d'une tâche avec son tag de chantier [chantier_id:xxx].
 */
export function formatTaskDescriptionWithProject(
  desc: string | null | undefined, 
  projectId: string | null | undefined
): string {
  const cleaned = cleanTaskDescriptionProject(desc)
  if (!projectId) return cleaned
  return cleaned ? `${cleaned} [chantier_id:${projectId}]` : `[chantier_id:${projectId}]`
}

/**
 * Détermine si une tâche appartient à un projet (soit par tag [chantier_id:xxx], soit par nom/numéro).
 */
export function isTaskInProject(task: Task, project: Project): boolean {
  const pId = project.id
  const pNameLow = project.name.toLowerCase()
  const pShort = pNameLow.slice(0, 15)
  const desc = (task.description || '').toLowerCase()
  const title = (task.title || '').toLowerCase()

  if (desc.includes(`[chantier_id:${pId.toLowerCase()}]`)) return true
  if (desc.includes(`chantier #${project.priority_order}`)) return true
  if (title.includes(`chantier #${project.priority_order}`)) return true
  if (task.category === 'Cahier des charges' && (desc.includes(pShort) || title.includes(pShort))) return true

  return false
}

/**
 * Trouve le chantier associé à une tâche s'il existe parmi la liste des projets.
 */
export function getTaskProject(task: Task, projects: Project[]): Project | null {
  const pId = extractTaskProjectId(task.description)
  if (pId) {
    const found = projects.find(p => p.id === pId)
    if (found) return found
  }
  return projects.find(p => isTaskInProject(task, p)) || null
}

/**
 * Détermine si une tâche est rattachée à un chantier IT (vrai si liée, faux si tâche générale / indépendante).
 */
export function isTaskLinkedToChantier(task: Task, projects: Project[]): boolean {
  return getTaskProject(task, projects) !== null
}
