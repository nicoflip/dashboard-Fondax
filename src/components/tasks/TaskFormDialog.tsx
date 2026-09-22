'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  TASK_CATEGORIES, 
  TASK_STATUSES, 
  TASK_PRIORITIES,
  cn
} from '@/lib/utils'
import { Task, CalendarEvent, TaskCategory, TaskPriority, TaskStatus, BlockerConfig, EventType, WaitingReturn, Project } from '@/lib/types'
import { parseTaskBlocker } from '@/lib/blockers'
import { extractWaitingReturnId, formatTaskWithWaitingReturn } from '@/lib/waiting-returns'
import { extractTaskProjectId } from '@/lib/projects'
import { TaskBlockerSelector } from './TaskBlockerSelector'
import { CustomDatePicker } from '@/components/ui/date-picker'
import { CalendarSyncOptions } from '@/components/calendar/CalendarSyncOptions'
import { ProjectSelector } from '@/components/shared/ProjectSelector'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarIcon, User, Plus, Clock, FolderKanban, Flame } from 'lucide-react'

export interface TaskFormData {
  title: string
  description: string
  category: TaskCategory
  priority: TaskPriority
  status: TaskStatus
  blocker: BlockerConfig
  waitingReturnId?: string | null
  projectId?: string | null
  createAlsoEvent?: boolean
  eventDate?: string
  eventTime?: string
  eventEndDate?: string
  eventIsFlexible?: boolean
  eventFlexLabel?: string
  eventType?: EventType
}

interface TaskFormDialogProps {
  open: boolean
  onClose: () => void
  editingTask: Task | null
  initialData?: Partial<TaskFormData> | null
  onBackToFollowUp?: () => void
  tasks: Task[]
  events: CalendarEvent[]
  waitingReturns?: WaitingReturn[]
  projects?: Project[]
  onSave: (data: TaskFormData) => Promise<void>
  onCreateReturnInline?: (title: string, waiting_on: string) => Promise<WaitingReturn | null>
}

const DEFAULT_FORM_DATA: TaskFormData = {
  title: '',
  description: '',
  category: TASK_CATEGORIES[0],
  priority: TASK_PRIORITIES[1],
  status: TASK_STATUSES[0],
  blocker: {
    type: 'none',
    prereqTaskId: '',
    requiredStatus: 'fait',
    prereqEventId: '',
    unlockDate: '',
    prereqReturnId: ''
  },
  waitingReturnId: null,
  projectId: null,
  createAlsoEvent: false,
  eventDate: new Date().toISOString().split('T')[0],
  eventTime: '',
  eventEndDate: '',
  eventIsFlexible: false,
  eventFlexLabel: 'Dans les 2 prochaines semaines',
  eventType: 'échéance'
}

export function TaskFormDialog({
  open,
  onClose,
  editingTask,
  initialData,
  onBackToFollowUp,
  tasks,
  events,
  waitingReturns = [],
  projects = [],
  onSave,
  onCreateReturnInline
}: TaskFormDialogProps) {
  const [formData, setFormData] = useState<TaskFormData>(DEFAULT_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (editingTask) {
        const blocker = parseTaskBlocker(editingTask.description)
        const returnId = extractWaitingReturnId(editingTask.description)
        const projId = extractTaskProjectId(editingTask.description)

        setFormData({
          title: editingTask.title,
          description: blocker.cleanDescription,
          category: editingTask.category,
          priority: editingTask.priority,
          status: editingTask.status,
          blocker: {
            type: blocker.type,
            prereqTaskId: blocker.prereqTaskId || '',
            requiredStatus: blocker.requiredStatus || 'fait',
            prereqEventId: blocker.prereqEventId || '',
            unlockDate: blocker.unlockDate || '',
            prereqReturnId: blocker.prereqReturnId || ''
          },
          waitingReturnId: returnId,
          projectId: projId,
          createAlsoEvent: false,
          eventDate: new Date().toISOString().split('T')[0],
          eventTime: '',
          eventEndDate: '',
          eventIsFlexible: false,
          eventFlexLabel: 'Dans les 2 prochaines semaines',
          eventType: 'échéance'
        })
      } else {
        setFormData({
          ...DEFAULT_FORM_DATA,
          eventDate: new Date().toISOString().split('T')[0],
          ...(initialData || {}),
          blocker: initialData?.blocker || DEFAULT_FORM_DATA.blocker
        })
      }
    }
  }, [open, editingTask, initialData])

  const handleSubmit = async () => {
    if (!formData.title.trim()) return
    setIsSubmitting(true)
    try {
      const returnId = formData.blocker.type === 'waiting'
        ? (formData.blocker.prereqReturnId || formData.blocker.prereqTaskId || null)
        : null
      const payload: TaskFormData = {
        ...formData,
        waitingReturnId: returnId
      }
      await onSave(payload)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} closeOnClickOutside={false} className="max-w-2xl">
      <DialogHeader>
        <div className="flex items-center justify-between gap-2 pr-6">
          <DialogTitle>
            {editingTask ? 'Modifier la tâche' : initialData?.title ? 'Nouvelle tâche de suivi' : 'Nouvelle tâche'}
          </DialogTitle>
          {onBackToFollowUp && (
            <button
              type="button"
              onClick={onBackToFollowUp}
              className="text-xs text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              ← Retour au choix
            </button>
          )}
        </div>
      </DialogHeader>

      <div className="space-y-4 py-2 overflow-y-auto flex-1 pr-1.5 min-h-0">
        <div className="space-y-2">
          <Label htmlFor="task-title">
            Titre <span className="text-red-500">*</span>
          </Label>
          <Input 
            id="task-title" 
            value={formData.title} 
            onChange={e => setFormData({ ...formData, title: e.target.value })} 
            placeholder="Ex: Mettre à jour les serveurs"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-description">Description</Label>
          <Textarea 
            id="task-description" 
            value={formData.description} 
            onChange={e => setFormData({ ...formData, description: e.target.value })} 
            placeholder="Détails de la tâche..."
            rows={4}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="task-category">Catégorie</Label>
            <select
              id="task-category"
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value as TaskCategory })}
            >
              {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Rythme de traitement (Enjeu)</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, priority: 'haute' })}
                className={cn(
                  "py-2 px-2 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer",
                  formData.priority === 'haute'
                    ? "bg-rose-700 text-white border-rose-800 ring-2 ring-rose-400/50 shadow-xs scale-102"
                    : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                )}
                title="Critique / Express : ébullition en 3 jours sans action"
              >
                <span className="flex items-center gap-1">⚡ Express</span>
                <span className="text-[10px] font-normal opacity-90">3 jours max</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, priority: 'moyenne' })}
                className={cn(
                  "py-2 px-2 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer",
                  formData.priority === 'moyenne'
                    ? "bg-amber-600 text-white border-amber-700 ring-2 ring-amber-400/50 shadow-xs scale-102"
                    : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100"
                )}
                title="Standard : ébullition en 10 jours sans action"
              >
                <span className="flex items-center gap-1">Standard</span>
                <span className="text-[10px] font-normal opacity-90">10 jours max</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, priority: 'basse' })}
                className={cn(
                  "py-2 px-2 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer",
                  formData.priority === 'basse'
                    ? "bg-blue-600 text-white border-blue-700 ring-2 ring-blue-400/50 shadow-xs scale-102"
                    : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
                )}
                title="Tâche de fond : ébullition en 30 jours sans action"
              >
                <span className="flex items-center gap-1">🌱 Fond</span>
                <span className="text-[10px] font-normal opacity-90">30 jours max</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-status">Statut</Label>
          <select
            id="task-status"
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
            value={formData.status}
            onChange={e => {
              const newStatus = e.target.value as TaskStatus
              setFormData(prev => ({
                ...prev,
                status: newStatus,
                ...(newStatus === 'en attente de retour externe' && prev.blocker.type === 'none'
                  ? { blocker: { ...prev.blocker, type: 'waiting' } }
                  : {})
              }))
            }}
          >
            {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Rattachement à un chantier IT */}
        <ProjectSelector
          projects={projects}
          value={formData.projectId || null}
          onChange={pId => setFormData({ ...formData, projectId: pId })}
          label="Rattacher à un chantier IT (optionnel)"
          placeholder="Sélectionner un chantier IT..."
        />

        {/* Option : Créer l'événement éponyme au calendrier avec choix fixe / flexible */}
        {!editingTask && (
          <CalendarSyncOptions
            enabled={formData.createAlsoEvent || false}
            onEnabledChange={val => setFormData({ ...formData, createAlsoEvent: val })}
            isFlexible={formData.eventIsFlexible || false}
            onFlexibleChange={val => setFormData({ ...formData, eventIsFlexible: val })}
            date={formData.eventDate || new Date().toISOString().split('T')[0]}
            onDateChange={d => setFormData({ ...formData, eventDate: d })}
            time={formData.eventTime || ''}
            onTimeChange={t => setFormData({ ...formData, eventTime: t })}
            endDate={formData.eventEndDate || ''}
            onEndDateChange={d => setFormData({ ...formData, eventEndDate: d })}
            flexLabel={formData.eventFlexLabel || 'Dans les 2 prochaines semaines'}
            onFlexLabelChange={l => setFormData({ ...formData, eventFlexLabel: l })}
            showEventType={true}
            eventType={formData.eventType || 'échéance'}
            onEventTypeChange={t => setFormData({ ...formData, eventType: t })}
            labelTitle="Créer également l'événement éponyme dans le calendrier"
            labelDescription={`Un événement « ${formData.title.trim() || 'même titre'} » sera créé au calendrier et rattaché à cette tâche.`}
          />
        )}

        {/* Dépendance conditionnelle (centralise tous les blocages, y compris les retours attendus) */}
        <TaskBlockerSelector
          currentTaskId={editingTask?.id}
          tasks={tasks}
          events={events}
          waitingReturns={waitingReturns}
          value={formData.blocker}
          onChange={b => setFormData({ ...formData, blocker: b })}
          onCreateReturnInline={onCreateReturnInline}
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} disabled={!formData.title.trim() || isSubmitting}>
          {isSubmitting ? 'Enregistrement...' : editingTask ? 'Enregistrer' : 'Créer'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
