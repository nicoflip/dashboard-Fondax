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
import { Task, CalendarEvent, TaskStatus } from '@/lib/types'
import { checkTaskBlocked } from '@/lib/blockers'
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
  Unlock 
} from 'lucide-react'

interface TaskCardProps {
  task: Task
  allTasks: Task[]
  allEvents: CalendarEvent[]
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onSchedule: (task: Task) => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
}

export function TaskCard({
  task,
  allTasks,
  allEvents,
  onEdit,
  onDelete,
  onSchedule,
  onStatusChange
}: TaskCardProps) {
  const isAttente = task.status === 'en attente de retour externe'
  const isFait = task.status === 'fait'
  const isEnCours = task.status === 'en cours'
  const isHighPrio = task.priority === 'haute'
  const isUrgent = isHighPrio && !isFait

  // Évaluation des conditions de blocage
  const { isBlocked, blocker, prereqTask, prereqEvent, unlockDate } = checkTaskBlocked(
    task,
    allTasks,
    allEvents
  )

  // Styling visuel selon état et blocage
  const borderClass = isBlocked
    ? 'border-l-4 border-slate-300 border-dashed opacity-50 hover:opacity-85 transition-opacity'
    : isUrgent 
    ? 'border-l-[6px] border-l-red-600 border-red-300 ring-2 ring-red-400/40 shadow-md shadow-red-100/70' 
    : isAttente 
    ? 'border-l-4 border-amber-500' 
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
    ? 'bg-amber-50/40' 
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
          blocker.type === 'task' && prereqTask ? (
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
          blocker.type === 'task' && prereqTask ? (
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
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200 w-fit">
            <Hourglass className="w-3.5 h-3.5" />
            En attente retour externe
          </div>
        )}
        {isFait && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600 border border-slate-300 w-fit">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            Terminé (Classé en bas)
          </div>
        )}

        <CardDescription className="line-clamp-2 mt-2">
          {blocker.cleanDescription ? (
            isBlocked ? (
              <span className="text-slate-500 italic">{blocker.cleanDescription}</span>
            ) : isAttente ? (
              <span className="text-amber-900 font-medium">{blocker.cleanDescription}</span> 
            ) : isUrgent ? (
              <span className="text-slate-800 font-medium">{blocker.cleanDescription}</span>
            ) : isFait ? (
              <span className="text-slate-400 italic">{blocker.cleanDescription}</span>
            ) : (
              blocker.cleanDescription
            )
          ) : (
            <span className="italic text-slate-400">Aucune description</span>
          )}
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-auto pb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
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
