'use client'

import React, { useState, useMemo } from 'react'
import { 
  Task, 
  CalendarEvent, 
  TaskStatus, 
  TaskCategory, 
  EventType,
  BlockerType,
  BlockerConfig
} from '@/lib/types'

import { 
  cn, 
  TASK_CATEGORIES, 
  TASK_STATUSES, 
  TASK_CATEGORY_COLORS, 
  STATUS_COLORS, 
  EVENT_TYPE_LABELS,
  formatDate 
} from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CustomDatePicker } from '@/components/ui/date-picker'
import { 
  Lock, 
  Unlock, 
  CheckSquare, 
  Calendar, 
  Clock, 
  Search, 
  Check, 
  X, 
  Flame, 
  AlertCircle,
  CalendarDays,
  Users,
  Phone,
  Flag,
  FolderKanban
} from 'lucide-react'

export type { BlockerType, BlockerConfig }



interface TaskBlockerSelectorProps {
  currentTaskId?: string
  tasks: Task[]
  events: CalendarEvent[]
  value: BlockerConfig
  onChange: (val: BlockerConfig) => void
}

export function TaskBlockerSelector({
  currentTaskId,
  tasks,
  events,
  value,
  onChange
}: TaskBlockerSelectorProps) {
  // Search & filter states
  const [taskSearch, setTaskSearch] = useState('')
  const [taskCatFilter, setTaskCatFilter] = useState<string>('ALL')

  const [eventSearch, setEventSearch] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('ALL')

  // Filter tasks
  const eligibleTasks = useMemo(() => {
    return tasks.filter(t => !currentTaskId || t.id !== currentTaskId)
  }, [tasks, currentTaskId])

  const filteredTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase()
    return eligibleTasks.filter(t => {
      if (taskCatFilter !== 'ALL' && t.category !== taskCatFilter) return false
      if (q) {
        const titleMatch = t.title.toLowerCase().includes(q)
        const descMatch = (t.description || '').toLowerCase().includes(q)
        const catMatch = t.category.toLowerCase().includes(q)
        if (!titleMatch && !descMatch && !catMatch) return false
      }
      return true
    })
  }, [eligibleTasks, taskSearch, taskCatFilter])

  // Filter events
  const filteredEvents = useMemo(() => {
    const q = eventSearch.trim().toLowerCase()
    return events.filter(e => {
      if (eventTypeFilter !== 'ALL' && e.event_type !== eventTypeFilter) return false
      if (q) {
        const titleMatch = e.title.toLowerCase().includes(q)
        const descMatch = (e.description || '').toLowerCase().includes(q)
        if (!titleMatch && !descMatch) return false
      }
      return true
    })
  }, [events, eventSearch, eventTypeFilter])

  // Selected entities
  const selectedTask = useMemo(() => {
    if (value.type !== 'task' || !value.prereqTaskId) return null
    return tasks.find(t => t.id === value.prereqTaskId) || null
  }, [tasks, value])

  const selectedEvent = useMemo(() => {
    if (value.type !== 'event' || !value.prereqEventId) return null
    return events.find(e => e.id === value.prereqEventId) || null
  }, [events, value])

  // Preset dates helpers
  const setPresetDate = (daysAhead: number) => {
    const d = new Date()
    d.setDate(d.getDate() + daysAhead)
    const ymd = d.toISOString().split('T')[0]
    onChange({
      ...value,
      type: 'date',
      unlockDate: ymd
    })
  }

  const setNextMonday = () => {
    const d = new Date()
    const day = d.getDay()
    const diff = day === 0 ? 1 : 8 - day
    d.setDate(d.getDate() + diff)
    const ymd = d.toISOString().split('T')[0]
    onChange({
      ...value,
      type: 'date',
      unlockDate: ymd
    })
  }

  const setFirstOfNextMonth = () => {
    const now = new Date()
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const ymd = d.toISOString().split('T')[0]
    onChange({
      ...value,
      type: 'date',
      unlockDate: ymd
    })
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'rdv': return <Users className="w-3.5 h-3.5 text-blue-600" />
      case 'appel': return <Phone className="w-3.5 h-3.5 text-indigo-600" />
      case 'échéance': return <Flag className="w-3.5 h-3.5 text-red-600" />
      case 'étape chantier': return <FolderKanban className="w-3.5 h-3.5 text-emerald-600" />
      default: return <Calendar className="w-3.5 h-3.5 text-slate-500" />
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
      {/* Header with Mode Switcher */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600" />
            <Label className="text-sm font-bold text-slate-900">
              Condition de blocage (Prérequis)
            </Label>
          </div>
          {value.type !== 'none' && (
            <button
              type="button"
              onClick={() => onChange({ type: 'none', requiredStatus: 'fait' })}
              className="text-xs text-slate-500 hover:text-red-600 font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
              Désactiver le blocage
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Choisissez ce qui doit se passer avant que cette tâche ne devienne prête à être traitée.
        </p>
      </div>

      {/* 4-Option Segmented Control */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-200/70 rounded-lg text-xs font-semibold">
        <button
          type="button"
          onClick={() => onChange({ ...value, type: 'none' })}
          className={cn(
            "py-2 px-2.5 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center",
            value.type === 'none'
              ? "bg-white text-slate-900 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          )}
        >
          <Unlock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Aucun (Active)</span>
        </button>

        <button
          type="button"
          onClick={() => onChange({ ...value, type: 'task', requiredStatus: value.requiredStatus || 'fait' })}
          className={cn(
            "py-2 px-2.5 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center",
            value.type === 'task'
              ? "bg-white text-blue-700 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          )}
        >
          <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>Autre tâche</span>
        </button>

        <button
          type="button"
          onClick={() => onChange({ ...value, type: 'event' })}
          className={cn(
            "py-2 px-2.5 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center",
            value.type === 'event'
              ? "bg-white text-purple-800 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          )}
        >
          <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
          <span>Événement</span>
        </button>

        <button
          type="button"
          onClick={() => {
            const defaultDate = value.unlockDate || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
            onChange({ ...value, type: 'date', unlockDate: defaultDate })
          }}
          className={cn(
            "py-2 px-2.5 rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center",
            value.type === 'date'
              ? "bg-white text-amber-900 shadow-xs font-bold"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
          )}
        >
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Date précise</span>
        </button>
      </div>

      {/* MODE 1: AUCUN BLOCAGE */}
      {value.type === 'none' && (
        <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Cette tâche sera disponible et prête immédiatement dès sa création.</span>
        </div>
      )}

      {/* MODE 2: BLOQUÉE PAR UNE AUTRE TÂCHE */}
      {value.type === 'task' && (
        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-blue-200 shadow-2xs">
          {/* Selected Task Banner */}
          {selectedTask ? (
            <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">Tâche bloquante sélectionnée :</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">{selectedTask.title}</p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...value, prereqTaskId: '' })}
                className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
              >
                Changer
              </Button>
            </div>
          ) : (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Cliquez sur une tâche ci-dessous pour la définir comme condition bloquante.</span>
            </div>
          )}

          {/* Condition status selector */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-xs font-bold text-slate-700">
              Statut requis pour débloquer :
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {TASK_STATUSES.map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => onChange({ ...value, requiredStatus: st })}
                  className={cn(
                    "px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer text-center",
                    value.requiredStatus === st
                      ? "bg-blue-600 text-white border-blue-600 font-bold shadow-2xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  )}
                >
                  {st === 'fait' ? '✓ fait (Recommandé)' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Search and category filters */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Rechercher une tâche par nom ou mot-clé..."
                value={taskSearch}
                onChange={e => setTaskSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Quick category pills */}
            <div className="flex flex-wrap items-center gap-1 max-h-16 overflow-y-auto">
              <button
                type="button"
                onClick={() => setTaskCatFilter('ALL')}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                  taskCatFilter === 'ALL' ? "bg-slate-800 text-white font-bold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                Toutes ({eligibleTasks.length})
              </button>
              {TASK_CATEGORIES.map(cat => {
                const count = eligibleTasks.filter(t => t.category === cat).length
                if (count === 0) return null
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTaskCatFilter(cat)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                      taskCatFilter === cat ? "bg-blue-600 text-white font-bold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {cat} ({count})
                  </button>
                )
              })}
            </div>

            {/* Visual Task Cards List */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
              {filteredTasks.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  Aucune tâche correspondante trouvée.
                </p>
              ) : (
                filteredTasks.map(t => {
                  const isSelected = value.prereqTaskId === t.id
                  return (
                    <div
                      key={t.id}
                      onClick={() => onChange({ ...value, prereqTaskId: t.id })}
                      className={cn(
                        "p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 text-left group",
                        isSelected
                          ? "border-blue-600 bg-blue-50/70 ring-1 ring-blue-500 shadow-2xs"
                          : "border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 bg-white"
                      )}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {t.title}
                          </span>
                          <span className={cn("text-[10px] px-1.5 py-0.2 rounded border font-semibold", TASK_CATEGORY_COLORS[t.category])}>
                            {t.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className={cn("px-1.5 py-0.2 rounded font-medium", STATUS_COLORS[t.status])}>
                            {t.status}
                          </span>
                          {t.priority === 'haute' && (
                            <span className="text-red-600 font-bold flex items-center gap-0.5">
                              <Flame className="w-3 h-3" /> Haute
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                          isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 group-hover:border-blue-400 bg-white"
                        )}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: BLOQUÉE PAR UN ÉVÉNEMENT DU CALENDRIER */}
      {value.type === 'event' && (
        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-purple-200 shadow-2xs">
          {/* Selected Event Banner */}
          {selectedEvent ? (
            <div className="flex items-center justify-between p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">Événement bloquant :</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {selectedEvent.title} <span className="font-normal text-slate-500">({formatDate(selectedEvent.event_date)})</span>
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...value, prereqEventId: '' })}
                className="h-7 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
              >
                Changer
              </Button>
            </div>
          ) : (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Cliquez sur un événement ci-dessous pour le définir comme condition bloquante.</span>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Rechercher un événement, RDV, appel, intervention..."
                value={eventSearch}
                onChange={e => setEventSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Event Type Filter Pills */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setEventTypeFilter('ALL')}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                  eventTypeFilter === 'ALL' ? "bg-slate-800 text-white font-bold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                Tous ({events.length})
              </button>
              {(['rdv', 'appel', 'échéance', 'étape chantier'] as EventType[]).map(type => {
                const count = events.filter(e => e.event_type === type).length
                if (count === 0) return null
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEventTypeFilter(type)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer capitalize flex items-center gap-1",
                      eventTypeFilter === type ? "bg-purple-700 text-white font-bold" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {getEventIcon(type)}
                    <span>{EVENT_TYPE_LABELS[type]} ({count})</span>
                  </button>
                )
              })}
            </div>

            {/* Visual Event Cards List */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
              {filteredEvents.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  Aucun événement correspondant trouvé dans le calendrier.
                </p>
              ) : (
                filteredEvents.map(e => {
                  const isSelected = value.prereqEventId === e.id
                  return (
                    <div
                      key={e.id}
                      onClick={() => onChange({ ...value, prereqEventId: e.id })}
                      className={cn(
                        "p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-3 text-left group",
                        isSelected
                          ? "border-purple-600 bg-purple-50/70 ring-1 ring-purple-500 shadow-2xs"
                          : "border-slate-200 hover:border-purple-300 hover:bg-slate-50/80 bg-white"
                      )}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {e.title}
                          </span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border font-semibold flex items-center gap-1">
                            {getEventIcon(e.event_type)}
                            {EVENT_TYPE_LABELS[e.event_type]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span className="font-mono font-medium text-purple-700">
                            📅 {formatDate(e.event_date)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            • Statut : {e.status}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <div className={cn(
                          "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                          isSelected ? "bg-purple-600 border-purple-600 text-white" : "border-slate-300 group-hover:border-purple-400 bg-white"
                        )}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            ℹ️ Dès que cet événement est passé ou marqué comme "passé" au calendrier, la tâche sera débloquée.
          </p>
        </div>
      )}

      {/* MODE 4: BLOQUÉE JUSQU'À UNE DATE PRÉCISE */}
      {value.type === 'date' && (
        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-amber-600" />
              Bloquer cette tâche jusqu'au :
            </Label>
            {value.unlockDate && (
              <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                🔒 {formatDate(value.unlockDate)}
              </span>
            )}
          </div>

          {/* Quick Date Shortcuts */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPresetDate(1)}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Demain
            </button>
            <button
              type="button"
              onClick={setNextMonday}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Lundi prochain
            </button>
            <button
              type="button"
              onClick={() => setPresetDate(7)}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Dans 1 semaine
            </button>
            <button
              type="button"
              onClick={() => setPresetDate(14)}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Dans 2 semaines
            </button>
            <button
              type="button"
              onClick={setFirstOfNextMonth}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              1er du mois prochain
            </button>
          </div>

          {/* In-app custom date picker */}
          <div className="max-w-xs pt-1">
            <CustomDatePicker
              value={value.unlockDate || ''}
              onChange={val => onChange({ ...value, unlockDate: val })}
              placeholder="Sélectionner la date de déblocage"
            />
          </div>

          <p className="text-[11px] text-slate-500 italic">
            ℹ️ La tâche restera atténuée avec un cadenas jusqu'à cette date, puis s'activera automatiquement.
          </p>
        </div>
      )}
    </div>
  )
}
