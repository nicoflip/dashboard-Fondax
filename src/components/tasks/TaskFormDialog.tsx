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
import { Task, CalendarEvent, TaskCategory, TaskPriority, TaskStatus, BlockerConfig, EventType } from '@/lib/types'
import { parseTaskBlocker } from '@/lib/blockers'
import { TaskBlockerSelector } from './TaskBlockerSelector'
import { CustomDatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'

export interface TaskFormData {
  title: string
  description: string
  category: TaskCategory
  priority: TaskPriority
  status: TaskStatus
  blocker: BlockerConfig
  createAlsoEvent?: boolean
  eventDate?: string
  eventType?: EventType
}

interface TaskFormDialogProps {
  open: boolean
  onClose: () => void
  editingTask: Task | null
  tasks: Task[]
  events: CalendarEvent[]
  onSave: (data: TaskFormData) => Promise<void>
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
    unlockDate: ''
  },
  createAlsoEvent: false,
  eventDate: new Date().toISOString().split('T')[0],
  eventType: 'échéance'
}

export function TaskFormDialog({
  open,
  onClose,
  editingTask,
  tasks,
  events,
  onSave
}: TaskFormDialogProps) {
  const [formData, setFormData] = useState<TaskFormData>(DEFAULT_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      if (editingTask) {
        const blocker = parseTaskBlocker(editingTask.description)
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
            unlockDate: blocker.unlockDate || ''
          },
          createAlsoEvent: false,
          eventDate: new Date().toISOString().split('T')[0],
          eventType: 'échéance'
        })
      } else {
        setFormData({
          ...DEFAULT_FORM_DATA,
          eventDate: new Date().toISOString().split('T')[0]
        })
      }
    }
  }, [open, editingTask])

  const handleSubmit = async () => {
    if (!formData.title.trim()) return
    setIsSubmitting(true)
    try {
      await onSave(formData)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 py-4 max-h-[75vh] overflow-y-auto pr-1">
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
            <Label htmlFor="task-priority">Priorité</Label>
            <select
              id="task-priority"
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              value={formData.priority}
              onChange={e => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
            >
              {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-status">Statut</Label>
          <select
            id="task-status"
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value as TaskStatus })}
          >
            {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Option : Créer l'événement éponyme au calendrier */}
        {!editingTask && (
          <div className={cn(
            "rounded-xl border p-3.5 transition-all",
            formData.createAlsoEvent ? "bg-purple-50/60 border-purple-200 shadow-2xs" : "bg-slate-50/60 border-slate-200"
          )}>
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.createAlsoEvent || false}
                onChange={e => setFormData({ 
                  ...formData, 
                  createAlsoEvent: e.target.checked,
                  eventDate: formData.eventDate || new Date().toISOString().split('T')[0],
                  eventType: formData.eventType || 'échéance'
                })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Créer également l'événement éponyme dans le calendrier
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-white text-purple-700 border-purple-200 py-0">
                    Synchro Calendrier
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 leading-tight">
                  Un événement &laquo;&nbsp;{formData.title.trim() || "même titre"}&nbsp;&raquo; sera automatiquement créé au calendrier et rattaché à cette tâche.
                </p>
              </div>
            </label>

            {formData.createAlsoEvent && (
              <div className="mt-3 pt-3 border-t border-purple-100 grid grid-cols-1 sm:grid-cols-2 gap-3 pl-7">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">Date de l'événement</Label>
                  <CustomDatePicker
                    value={formData.eventDate || new Date().toISOString().split('T')[0]}
                    onChange={d => setFormData({ ...formData, eventDate: d })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">Type d'événement</Label>
                  <select
                    value={formData.eventType || 'échéance'}
                    onChange={e => setFormData({ ...formData, eventType: e.target.value as EventType })}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    <option value="échéance">Échéance</option>
                    <option value="rdv">Rendez-vous</option>
                    <option value="appel">Appel</option>
                    <option value="étape chantier">Étape chantier</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dépendance conditionnelle (Prérequis : Autre tâche, Événement calendrier ou Date précise) */}
        <TaskBlockerSelector
          currentTaskId={editingTask?.id}
          tasks={tasks}
          events={events}
          value={formData.blocker}
          onChange={b => setFormData({ ...formData, blocker: b })}
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
