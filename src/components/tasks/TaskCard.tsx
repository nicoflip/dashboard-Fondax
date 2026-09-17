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
  FolderKanban
} from 'lucide-react'

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
  onManageWaiting
}: TaskCardProps) {
  const isAttente = task.status === 'en attente de retour externe'
  const isFait = task.status === 'fait'
  const isEnCours = task.status === 'en cours'
  const isHighPrio = task.priority === 'haute'
  const isUrgent = isHighPrio && !isFait

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

  // Styling visuel selon état et blocage
  const borderClass = isBlocked
    ? 'border-l-4 border-slate-300 border-dashed opacity-50 hover:opacity-85 transition-opacity'
    : isUrgent 
    ? 'border-l-[6px] border-l-red-600 border-red-300 ring-2 ring-red-400/40 shadow-md shadow-red-100/70' 
    : isAttente 
    ? (activeMetrics.isDragging 
        ? 'border-l-[6px] border-l-red-600 border-red-200 ring-1 ring-red-300 shadow-xs' 
        : activeMetrics.isWarning
        ? 'border-l-4 border-amber-600'
        : 'border-l-4 border-amber-500')
    : isFait 
    ? 'border-l-4 border-slate-300 opacity-60 bg-slate-50' 
    : isEnCours 
    ? 'border-l-4 border-blue-500' 
    : 'border-l-4 border-slate-300'

  const bgClass = isBlocked
    ? 'bg-slate-50/70 shadow-2xs'
    : isUrgent 
    ? 'bg-gradient-to-br from-red-50/70 via-white to-red-50/30' 
    : isAttente 
    ? (activeMetrics.isDragging ? 'bg-gradient-to-br from-red-50/60 via-amber-50/30 to-white' : 'bg-amber-50/40') 
    : isFait 
    ? 'bg-slate-50/90' 
    : 'bg-white'

  return (
    <Card className={cn("flex flex-col transition-all relative overflow-hidden", borderClass, bgClass)}>
      {/* Bandeau d'alerte URGENT en haut de la carte */}
      {isUrgent && !isBlocked && (
        <div className="bg-gradient-to-r from-red-600 via-red-600 to-rose-600 text-white px-3 py-1.5 text-xs font-black shadow-xs flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Flame className="w-4 h-4 fill-amber-300 text-amber-300 animate-pulse shrink-0" />
            <span>URGENT — PRIORITÉ HAUTE</span>
          </span>
          <span className="bg-red-800/90 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded">
            Action immédiate
          </span>
        </div>
      )}

      <CardHeader className={cn("pb-3", isUrgent && !isBlocked ? "pt-3" : "pt-4")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isFait && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
            {isUrgent && !isBlocked && <Flame className="w-5 h-5 text-red-600 fill-red-500 shrink-0 animate-bounce" />}
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
                isUrgent && !isBlocked && "font-black text-red-950",
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
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600 border border-slate-300 w-fit">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            Terminé (Classé en bas)
          </div>
        )}

        <CardDescription className="line-clamp-2 mt-2">
          {(() => {
            const raw = isAttente ? waitingInfo.cleanDescription : blocker.cleanDescription
            const cleaned = cleanTaskDescriptionProject(raw)
            if (!cleaned) return <span className="italic text-slate-400">Aucune description</span>
            if (isBlocked) return <span className="text-slate-500 italic">{cleaned}</span>
            if (isAttente) return <span className="text-amber-900 font-medium">{cleaned}</span>
            if (isUrgent) return <span className="text-slate-800 font-medium">{cleaned}</span>
            if (isFait) return <span className="text-slate-400 italic">{cleaned}</span>
            return cleaned
          })()}
        </CardDescription>
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
              "text-xs font-semibold border",
              TASK_CATEGORY_COLORS[task.category] || "border-slate-200 bg-slate-50 text-slate-700",
              isUrgent && "font-bold", 
              isFait && "opacity-60"
            )}
          >
            {task.category}
          </Badge>
          {isUrgent ? (
            <Badge className="bg-red-600 text-white font-black flex items-center gap-1 shadow-xs border-red-700">
              <Flame className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              Haute priorité (Urgent)
            </Badge>
          ) : isHighPrio ? (
            <Badge className={cn("bg-red-100 text-red-700 border-red-200 flex items-center gap-1", isFait && "opacity-60")}>
              <Flame className="w-3 h-3" />
              Haute
            </Badge>
          ) : (
            <Badge className={cn(PRIORITY_COLORS[task.priority], isFait && "opacity-60")}>{task.priority}</Badge>
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
