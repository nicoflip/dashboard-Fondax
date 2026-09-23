'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { 
  cn, 
  TASK_STATUSES, 
  PRIORITY_COLORS, 
  STATUS_COLORS, 
  TASK_CATEGORY_COLORS,
  TASK_CATEGORY_THEMES,
  normalizeTaskCategory,
  formatDate 
} from '@/lib/utils'
import { Task, CalendarEvent, TaskStatus, WaitingReturn, Project } from '@/lib/types'
import { checkTaskBlocked } from '@/lib/blockers'
import { extractWaitingReturnId, getWaitingReturnMetrics } from '@/lib/waiting-returns'
import { getTaskWaitingDetails } from '@/lib/waiting'
import { extractTaskProjectId, cleanTaskDescriptionProject, isTaskInProject } from '@/lib/projects'
import { 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Hourglass, 
  Flame, 
  Pencil, 
  Calendar, 
  Check, 
  Lock, 
  Unlock,
  User,
  FolderKanban,
  Thermometer,
  Snowflake
} from 'lucide-react'
import { calculateTaskTemperature, formatInactiveTime } from '@/lib/task-temperature'
import { parseTaskClosureComment } from '@/lib/closure-comments'

interface TaskCardProps {
  task: Task
  allTasks: Task[]
  allEvents: CalendarEvent[]
  waitingReturns?: WaitingReturn[]
  allProjects?: Project[]
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onSchedule: (task: Task) => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
  onManageWaiting?: (task: Task) => void
  onCoolDown?: (task: Task) => void
}

export function TaskCard({
  task,
  allTasks,
  allEvents,
  waitingReturns = [],
  allProjects = [],
  onEdit,
  onDelete,
  onSchedule,
  onStatusChange,
  onManageWaiting,
  onCoolDown
}: TaskCardProps) {
  const isAttente = task.status === 'en attente de retour externe'
  const isFait = task.status === 'fait'
  const isEnCours = task.status === 'en cours'
  const isHighPrio = task.priority === 'haute'
  const tempInfo = calculateTaskTemperature(task)
  const isUrgent = tempInfo.score >= 70 && !isFait

  // Normaliser la catégorie et trouver la couleur thématique
  const normalizedCategory = normalizeTaskCategory(task.category)
  const theme = TASK_CATEGORY_THEMES[normalizedCategory] || TASK_CATEGORY_THEMES['Autre']

  // Trouver le retour attendu associé à cette tâche (s'il existe)
  const waitingReturnId = extractWaitingReturnId(task.description)
  const associatedReturn = waitingReturns.find(r => r.id === waitingReturnId) || null
  const returnMetrics = associatedReturn ? getWaitingReturnMetrics(associatedReturn) : null

  // Trouver le chantier associé à cette tâche (s'il existe)
  const taskProjectId = extractTaskProjectId(task.description)
  const associatedProject = allProjects.find(p => p.id === taskProjectId || isTaskInProject(task, p)) || null

  // Métriques de secours
  const { info: waitingInfo, metrics: fallbackWaitingMetrics } = getTaskWaitingDetails(task)

  const activeMetrics = returnMetrics || fallbackWaitingMetrics
  const waitingMetrics = activeMetrics

  // Évaluation des conditions de blocage
  const { isBlocked, blocker, prereqTask, prereqEvent, prereqReturn, unlockDate } = checkTaskBlocked(
    task,
    allTasks,
    allEvents,
    waitingReturns
  )

  // Styling visuel gai et coloré par catégorie et état
  const borderClass = isBlocked
    ? 'border-l-[6px] border-l-slate-400 border-slate-300 border-dashed opacity-75 hover:opacity-95 transition-all'
    : isFait 
    ? 'border-l-[6px] border-l-emerald-500 border-emerald-300 opacity-80' 
    : 'border-l-[6px] shadow-xs hover:shadow-md transition-shadow'

  const bgClass = isBlocked
    ? 'bg-slate-100/90 border-slate-300 shadow-2xs'
    : isFait 
    ? 'bg-gradient-to-br from-emerald-100/80 via-green-50 to-emerald-50/60 border-emerald-300 opacity-85' 
    : ''

  const cardCustomStyle: React.CSSProperties | undefined = (!isBlocked && !isFait && theme?.cardStyle) ? {
    backgroundColor: theme.cardStyle.backgroundColor,
    borderColor: theme.cardStyle.borderColor,
    borderLeftColor: theme.cardStyle.borderLeftColor,
    borderLeftWidth: '6px',
    borderLeftStyle: 'solid',
  } : undefined

  return (
    <Card 
      className={cn("flex flex-col transition-all relative overflow-hidden", borderClass, bgClass)}
      style={cardCustomStyle}
    >
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isFait && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {!isFait && !isBlocked && (
              tempInfo.level === 'boiling' ? (
                <span title={`Surchauffe critique (${tempInfo.score}%) : ${formatInactiveTime(tempInfo.daysInactive, tempInfo.hoursInactive)}`}>
                  <Flame className="w-5 h-5 text-red-600 fill-red-500 shrink-0 animate-pulse" />
                </span>
              ) : tempInfo.level === 'hot' ? (
                <span title={`Tâche chaude (${tempInfo.score}%) : ${formatInactiveTime(tempInfo.daysInactive, tempInfo.hoursInactive)}`}>
                  <Flame className="w-5 h-5 text-orange-500 fill-orange-400 shrink-0" />
                </span>
              ) : tempInfo.level === 'warm' ? (
                <span title={`Tâche tiède (${tempInfo.score}%) : ${formatInactiveTime(tempInfo.daysInactive, tempInfo.hoursInactive)}`}>
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                </span>
              ) : (
                <span title={`Tâche fraîche (${tempInfo.score}%) : ${formatInactiveTime(tempInfo.daysInactive, tempInfo.hoursInactive)}`}>
                  <Thermometer className="w-4 h-4 text-blue-500 shrink-0" />
                </span>
              )
            )}
            {isBlocked && (
              blocker.type === 'date' ? (
                <span title="Bloquée jusqu'à une date"><Lock className="w-4 h-4 text-amber-600 shrink-0" /></span>
              ) : blocker.type === 'event' ? (
                <span title="Bloquée par un événement"><Calendar className="w-4 h-4 text-purple-600 shrink-0" /></span>
              ) : blocker.type === 'waiting' ? (
                <span title="Bloquée par un retour tiers en attente"><Hourglass className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" /></span>
              ) : (
                <span title="Bloquée par une autre tâche"><Hourglass className="w-4 h-4 text-slate-400 shrink-0" /></span>
              )
            )}
            <CardTitle 
              className={cn(
                "cursor-pointer text-lg hover:text-blue-600 hover:underline truncate",
                tempInfo.score >= 70 && !isBlocked && !isFait && "font-bold text-slate-900",
                isFait && "line-through text-slate-400 font-normal",
                isBlocked && "text-slate-600 font-medium"
              )}
              onClick={() => onEdit(task)}
              title={task.title}
            >
              {task.title}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isAttente && onManageWaiting && (
              <Button 
                variant="ghost" 
                size="icon" 
                title="Gérer l'attente et les relances" 
                onClick={() => onManageWaiting(task)} 
                className="h-8 w-8 text-amber-600 hover:text-amber-800 hover:bg-amber-100/70 cursor-pointer"
              >
                <Hourglass className="h-4 w-4" />
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              title="Planifier au calendrier" 
              onClick={() => onSchedule(task)} 
              className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
            >
              <Calendar className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              title="Modifier cette tâche" 
              onClick={() => onEdit(task)} 
              className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              title="Supprimer cette tâche" 
              onClick={() => onDelete(task.id)} 
              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Badges explicatifs de blocage par prérequis */}
        {isBlocked && (
          blocker.type === 'waiting' && prereqReturn ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50/90 text-amber-950 border border-amber-300 px-2.5 py-1 text-xs font-semibold w-fit shadow-2xs">
              <Hourglass className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                ⏳ Bloquée : en attente du retour de <strong className="font-bold underline">{prereqReturn.waiting_on}</strong> sur « {prereqReturn.title} »
              </span>
            </div>
          ) : blocker.type === 'waiting' && prereqTask ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50/90 text-amber-950 border border-amber-300 px-2.5 py-1 text-xs font-semibold w-fit shadow-2xs">
              <Hourglass className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                ⏳ Bloquée : en attente du retour sur « {prereqTask.title} »
              </span>
            </div>
          ) : blocker.type === 'task' && prereqTask ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50/90 text-amber-900 border border-amber-300 px-2.5 py-1 text-xs font-semibold w-fit shadow-2xs">
              <Hourglass className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                ⏳ En attente de la tâche : <strong className="font-bold underline">{prereqTask.title}</strong> (statut requis : {blocker.requiredStatus})
              </span>
            </div>
          ) : blocker.type === 'event' && prereqEvent ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-purple-50 text-purple-900 border border-purple-300 px-2.5 py-1 text-xs font-semibold w-fit shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>
                📅 En attente de l'événement : <strong className="font-bold underline">{prereqEvent.title}</strong> ({formatDate(prereqEvent.event_date)})
              </span>
            </div>
          ) : blocker.type === 'date' && unlockDate ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 px-2.5 py-1 text-xs font-semibold w-fit shadow-2xs">
              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                🔒 Bloquée jusqu'au : <strong className="font-bold">{formatDate(unlockDate)}</strong>
              </span>
            </div>
          ) : null
        )}

        {/* Badges de prérequis satisfait */}
        {!isBlocked && !isFait && (
          blocker.type === 'waiting' && prereqReturn ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium w-fit">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>✓ Retour reçu de {prereqReturn.waiting_on} sur « {prereqReturn.title} » (Débloquée !)</span>
            </div>
          ) : blocker.type === 'waiting' && prereqTask ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium w-fit">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>✓ Retour reçu sur « {prereqTask.title} » (Débloquée !)</span>
            </div>
          ) : blocker.type === 'task' && prereqTask ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium w-fit">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>✓ Prérequis validé : {prereqTask.title}</span>
            </div>
          ) : blocker.type === 'event' && prereqEvent ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium w-fit">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>✓ Événement passé : {prereqEvent.title}</span>
            </div>
          ) : blocker.type === 'date' && unlockDate ? (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium w-fit">
              <Unlock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>✓ Débloquée (depuis le {formatDate(unlockDate)})</span>
            </div>
          ) : null
        )}

        {isAttente && (
          <div className={cn(
            "mt-2.5 rounded-xl border p-2.5 space-y-2 text-xs transition-all",
            activeMetrics.isDragging 
              ? "bg-red-50/90 border-red-300 text-red-950 shadow-2xs" 
              : activeMetrics.isWarning
              ? "bg-amber-50 border-amber-300 text-amber-950"
              : "bg-amber-50/60 border-amber-200 text-amber-900"
          )}>
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-amber-950">
                <Hourglass className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                En attente d'un retour
              </span>
              {activeMetrics.isDragging ? (
                <Badge className="bg-red-600 text-white text-[10px] font-black uppercase px-1.5 py-0 shadow-2xs">
                  ⚠️ Traîne ({activeMetrics.daysWaiting}j)
                </Badge>
              ) : (
                <span className="text-[11px] font-medium text-slate-600">
                  Attente : <strong>{activeMetrics.daysWaiting}j</strong>
                </span>
              )}
            </div>

            <div className="text-xs font-semibold text-slate-900">
              {associatedReturn ? (
                <div className="space-y-0.5">
                  <p className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">Retour attendu associé :</p>
                  <p className="text-xs font-bold text-slate-900">{associatedReturn.title}</p>
                  <p className="text-[11px] text-amber-900 font-medium">Interlocuteur : <strong>{associatedReturn.waiting_on}</strong> ({associatedReturn.target_type || 'Prestataire'})</p>
                </div>
              ) : waitingInfo.waitingOn ? (
                <span>En attente de : <strong className="underline decoration-amber-400 font-bold">{waitingInfo.waitingOn}</strong></span>
              ) : (
                <span className="italic text-slate-500">Aucun retour attendu associé</span>
              )}
            </div>

            {/* Statut relance & bouton d'action */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/60">
              <div className="text-[11px]">
                {activeMetrics.followUpStatus === 'overdue' && (
                  <span className="font-bold text-red-700 flex items-center gap-1">
                    🚨 Relance en retard ({Math.abs(activeMetrics.daysDiffFollowUp || 0)}j)
                  </span>
                )}
                {activeMetrics.followUpStatus === 'today' && (
                  <span className="font-bold text-amber-800 flex items-center gap-1">
                    🔔 À relancer aujourd&apos;hui !
                  </span>
                )}
                {activeMetrics.followUpStatus === 'upcoming' && (
                  <span className="text-slate-600">
                    Relance : <strong>{activeMetrics.formattedFollowUpDate}</strong>
                  </span>
                )}
                {activeMetrics.followUpStatus === 'none' && (
                  <span className="text-slate-400 italic">Pas de relance fixée</span>
                )}
              </div>

              {onManageWaiting && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onManageWaiting(task)
                  }}
                  className="text-[11px] px-2 py-0.5 rounded font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 cursor-pointer transition-colors shadow-2xs shrink-0"
                >
                  {associatedReturn ? "Changer retour →" : "Choisir retour →"}
                </button>
              )}
            </div>
          </div>
        )}

        {isFait && (
          <div className="space-y-2 mt-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600 border border-slate-300 w-fit">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Terminé (Classé en bas)
            </div>
            {(() => {
              const closure = parseTaskClosureComment(task.description)
              if (!closure.closureComment) return null
              return (
                <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-950 text-xs shadow-2xs">
                  <div className="font-semibold text-emerald-800 flex items-center gap-1.5 mb-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Conclusion & Bilan de fin :</span>
                  </div>
                  <p className="text-xs text-emerald-900 whitespace-pre-wrap">{closure.closureComment}</p>
                </div>
              )
            })()}
          </div>
        )}

        <CardDescription className="line-clamp-2 mt-2">
          {(() => {
            const raw = isAttente ? waitingInfo.cleanDescription : blocker.cleanDescription
            const withoutClosure = parseTaskClosureComment(raw).cleanDesc
            const cleaned = cleanTaskDescriptionProject(withoutClosure)
            if (!cleaned) return <span className="italic text-slate-400">Aucune description</span>
            if (isBlocked) return <span className="text-slate-500 italic">{cleaned}</span>
            if (isAttente) return <span className="text-amber-900 font-medium">{cleaned}</span>
            if (isUrgent) return <span className="text-slate-800 font-medium">{cleaned}</span>
            if (isFait) return <span className="text-slate-400 italic">{cleaned}</span>
            return <span className="text-slate-700 font-medium">{cleaned}</span>
          })()}
        </CardDescription>

        {!isFait && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className={cn(
                "font-medium flex items-center gap-1.5",
                tempInfo.isPaused ? "text-sky-700 font-semibold" : "text-slate-500"
              )}>
                {tempInfo.isPaused ? (
                  <Snowflake className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                ) : (
                  <Thermometer className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                {formatInactiveTime(tempInfo.daysInactive, tempInfo.hoursInactive, tempInfo.isPaused)}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "font-bold px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 border",
                  tempInfo.isPaused ? "bg-sky-100 text-sky-900 border-sky-300" : tempInfo.color.badge
                )}>
                  {tempInfo.isPaused ? (
                    <Snowflake className="w-3 h-3 text-sky-600 shrink-0" />
                  ) : (
                    <>
                      {tempInfo.level === 'boiling' && <Flame className="w-3 h-3 fill-amber-300 text-amber-300 animate-pulse" />}
                      {tempInfo.level === 'hot' && <Flame className="w-3 h-3 fill-orange-200 text-white" />}
                    </>
                  )}
                  <span>{tempInfo.score}%</span>
                  <span className="text-[10px] font-normal opacity-90">
                    {tempInfo.isPaused ? '(figé)' : `(${tempInfo.label})`}
                  </span>
                </span>
                {onCoolDown && (
                  <button
                    type="button"
                    onClick={() => onCoolDown(task)}
                    title="Régler la température de la tâche (gérer la chaleur)"
                    className="text-slate-400 hover:text-sky-600 hover:bg-sky-50 border border-slate-200 hover:border-sky-200 p-1 rounded-md transition-all cursor-pointer shadow-2xs"
                  >
                    <Snowflake className="w-3.5 h-3.5 text-sky-500" />
                  </button>
                )}
              </div>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className={cn("h-full rounded-full transition-all duration-300", tempInfo.color.progress)} 
                style={{ width: `${tempInfo.score}%` }} 
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="mt-auto pb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {associatedProject && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs font-semibold border bg-amber-50/90 text-amber-900 border-amber-300 flex items-center gap-1",
                isFait && "opacity-60"
              )}
              title={`Rattachée au chantier #${associatedProject.priority_order} : ${associatedProject.name}`}
            >
              <FolderKanban className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="truncate max-w-[170px]">
                Chantier #{associatedProject.priority_order} : {associatedProject.name}
              </span>
            </Badge>
          )}

          <Badge 
            variant="outline" 
            className={cn(
              "text-xs font-bold border px-2.5 py-0.5 shadow-2xs flex items-center gap-1.5",
              isFait && "opacity-75"
            )}
            style={theme?.badgeStyle ? {
              backgroundColor: theme.badgeStyle.backgroundColor,
              borderColor: theme.badgeStyle.borderColor,
              color: theme.badgeStyle.color,
            } : undefined}
          >
            <span>{theme.emoji}</span>
            <span>{normalizedCategory}</span>
          </Badge>

          {/* Rythme / Enjeu */}
          <Badge 
            variant="outline"
            className={cn(
              "text-xs font-semibold border flex items-center gap-1",
              PRIORITY_COLORS[task.priority],
              isFait && "opacity-60"
            )}
            title={`Rythme de chauffe : 100% en ${tempInfo.targetDays} jours`}
          >
            {task.priority === 'haute' ? '⚡ Express (3j)' : task.priority === 'moyenne' ? 'Standard (10j)' : 'Fond (30j)'}
          </Badge>

          {/* Badge d'alerte en surchauffe si score >= 70 */}
          {!isFait && tempInfo.score >= 70 && (
            <Badge className="bg-red-600 text-white font-black flex items-center gap-1 shadow-xs border-red-700 animate-pulse">
              <Flame className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              Surchauffe {tempInfo.score}%
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <div className="w-full">
          <Label className="sr-only">Changer statut</Label>
          <select
            aria-label="Changer statut de la tâche"
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border px-3 py-1 text-sm shadow-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-950",
              STATUS_COLORS[task.status],
              isFait && "opacity-75"
            )}
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
          >
            {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </CardFooter>
    </Card>
  )
}
