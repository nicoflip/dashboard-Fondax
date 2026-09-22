import { Task, Project, CalendarEvent } from '@/lib/types'
import { formatDate, EVENT_TYPE_LABELS } from '@/lib/utils'
import { parseEventClosureComment, parseTaskClosureComment } from '@/lib/closure-comments'

interface GenerateMarkdownParams {
  startDate: string
  endDate: string
  completedTasksInPeriod: Task[]
  closedEventsInPeriod: CalendarEvent[]
  chantiersReport: any[]
  kpis: any
  getProjectForTask: (task: Task) => Project | undefined
  getProjectForEvent: (event: CalendarEvent) => Project | undefined
}

export function generateMarkdownReport({
  startDate,
  endDate,
  completedTasksInPeriod,
  closedEventsInPeriod,
  chantiersReport,
  kpis,
  getProjectForTask,
  getProjectForEvent
}: GenerateMarkdownParams) {
  const startDisplay = startDate ? formatDate(startDate) : 'Début historique'
  const endDisplay = endDate ? formatDate(endDate) : "Aujourd'hui"
  const nowStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  let md = `# RAPPORT D'ACTIVITÉ IT & AVANCEMENT DES CHANTIERS — FONDAX\n\n`
  md += `**Période analysée :** Du ${startDisplay} au ${endDisplay}\n`
  md += `**Date de génération :** ${nowStr}\n`
  md += `**Destinataire :** Jean-Baptiste TOUZE (Gérant) & Direction Fondax\n\n`

  md += `## 1. SYNTHÈSE EXÉCUTIVE\n\n`
  md += `- **Tâches accomplies sur la période :** ${kpis.totalDone}\n`
  md += `- **Tâches critiques / haute priorité traitées :** ${kpis.highPriorityDone}\n`
  md += `- **Événements & Jalons clos/réglés sur la période :** ${kpis.closedEventsCount}\n`
  md += `- **Chantiers en cours :** ${kpis.activeProjects}\n`
  md += `- **Chantiers terminés :** ${kpis.finishedProjects}\n`
  md += `- **Taux de réalisation global du parc IT/Projets :** ${kpis.globalCompletionRate}%\n\n`

  md += `## 2. TÂCHES ACCOMPLIES SUR LA PÉRIODE (${completedTasksInPeriod.length})\n\n`
  if (completedTasksInPeriod.length === 0) {
    md += `*Aucune tâche enregistrée comme terminée sur cette période.*\n\n`
  } else {
    md += `| Date | Priorité | Catégorie | Tâche & Bilan | Chantier rattaché |\n`
    md += `| :--- | :--- | :--- | :--- | :--- |\n`
    completedTasksInPeriod.forEach((t: Task) => {
      const d = formatDate(t.updated_at || t.created_at)
      const p = getProjectForTask(t)
      const pName = p ? `#${p.priority_order} ${p.name}` : 'Transversal'
      const closure = parseTaskClosureComment(t.description)
      const conclusionText = closure.closureComment ? `<br>*Bilan : ${closure.closureComment}*` : ''
      md += `| ${d} | ${t.priority.toUpperCase()} | ${t.category} | ${t.title}${conclusionText} | ${pName} |\n`
    })
    md += `\n`
  }

  md += `## 3. ÉVÉNEMENTS & JALONS CLOS SUR LA PÉRIODE (${closedEventsInPeriod.length})\n\n`
  if (closedEventsInPeriod.length === 0) {
    md += `*Aucun événement ou jalon marqué comme clos sur cette période.*\n\n`
  } else {
    md += `| Date | Type | Événement | Chantier / Contexte | Motif de clôture & Résolution |\n`
    md += `| :--- | :--- | :--- | :--- | :--- |\n`
    closedEventsInPeriod.forEach((e: CalendarEvent) => {
      const d = formatDate(e.event_date)
      const p = getProjectForEvent(e)
      const pName = p ? `#${p.priority_order} ${p.name}` : 'Général / Transversal'
      const closure = parseEventClosureComment(e.description)
      const comment = closure.closureComment || 'Clos sans commentaire particulier'
      md += `| ${d} | ${EVENT_TYPE_LABELS[e.event_type] || e.event_type} | ${e.title} | ${pName} | ${comment} |\n`
    })
    md += `\n`
  }

  md += `## 4. AVANCEMENT DES CHANTIERS & CAHIER DES CHARGES\n\n`
  chantiersReport.forEach(({ project, totalTasks, doneTasks, progressPercent, tasksCompletedInPeriod, projectEventsInPeriod }: any) => {
    md += `### Chantier #${project.priority_order} : ${project.name}\n`
    md += `- **Statut actuel :** ${project.status}\n`
    md += `- **Avancement global :** ${progressPercent}% (${doneTasks}/${totalTasks} tâches terminées)\n`
    if (project.description) {
      md += `- **Objectif :** ${project.description}\n`
    }
    if (project.notes_blockers) {
      md += `- **Notes & Points de blocage :** ${project.notes_blockers}\n`
    }

    if (tasksCompletedInPeriod.length > 0) {
      md += `- **Réalisations sur la période :**\n`
      tasksCompletedInPeriod.forEach((t: Task) => {
        const closure = parseTaskClosureComment(t.description)
        md += `  - [x] ${t.title}${closure.closureComment ? ` *(Bilan : ${closure.closureComment})*` : ''}\n`
      })
    } else {
      md += `- **Réalisations sur la période :** Aucune tâche finalisée dans cet intervalle.\n`
    }

    if (projectEventsInPeriod.length > 0) {
      md += `- **Jalons / Événements de la période :**\n`
      projectEventsInPeriod.forEach((e: CalendarEvent) => {
        const closure = parseEventClosureComment(e.description)
        if (e.status === 'clos') {
          md += `  - [x] ${formatDate(e.event_date)} : ${e.title} (${e.event_type}) — **Clos**${closure.closureComment ? ` (Résolution : ${closure.closureComment})` : ''}\n`
        } else {
          md += `  - [ ] ${formatDate(e.event_date)} : ${e.title} (${e.event_type})\n`
        }
      })
    }
    md += `\n`
  })

  return md
}
