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
import { Task, CalendarEvent, TaskCategory, TaskPriority, TaskStatus, BlockerConfig, EventType, WaitingReturn } from '@/lib/types'
import { parseTaskBlocker } from '@/lib/blockers'
import { extractWaitingReturnId, formatTaskWithWaitingReturn } from '@/lib/waiting-returns'
import { TaskBlockerSelector } from './TaskBlockerSelector'
import { CustomDatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import { Hourglass, Calendar as CalendarIcon, User, Plus, Clock } from 'lucide-react'

export interface TaskFormData {
  title: string
  description: string
  category: TaskCategory
  priority: TaskPriority
  status: TaskStatus
  blocker: BlockerConfig
  waitingReturnId?: string | null
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
  waitingReturns?: WaitingReturn[]
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
  waitingReturns = [],
  onSave,
  onCreateReturnInline
}: TaskFormDialogProps) {
  const [formData, setFormData] = useState<TaskFormData>(DEFAULT_FORM_DATA)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreatingReturnInline, setIsCreatingReturnInline] = useState(false)
  const [inlineReturnTitle, setInlineReturnTitle] = useState('')
  const [inlineReturnWho, setInlineReturnWho] = useState('')

  useEffect(() => {
    if (open) {
      setIsCreatingReturnInline(false)
      setInlineReturnTitle('')
      setInlineReturnWho('')
      if (editingTask) {
        const blocker = parseTaskBlocker(editingTask.description)
        const returnId = extractWaitingReturnId(editingTask.description)

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

        {/* Choix du retour attendu si la tâche est en attente */}
        {formData.status === 'en attente de retour externe' && (
          <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-3.5 space-y-3 shadow-2xs animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <Hourglass className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Quel retour cette tâche attend-elle ?</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingReturnInline(v => !v)}
                className="text-[11px] font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                {isCreatingReturnInline ? "Choisir existant" : "Nouveau retour"}
              </button>
            </div>

            {!isCreatingReturnInline ? (
              <div className="space-y-2">
                <select
                  value={formData.waitingReturnId || ''}
                  onChange={e => setFormData({ ...formData, waitingReturnId: e.target.value || null })}
                  className="flex h-10 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  <option value="">-- Sélectionner un retour que vous attendez --</option>
                  {waitingReturns.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.waiting_on}) {r.status === 'reçu' ? '✓ Reçu' : ''}
                    </option>
                  ))}
                </select>

                {formData.waitingReturnId && (
                  (() => {
                    const found = waitingReturns.find(r => r.id === formData.waitingReturnId)
                    if (!found) return null
                    return (
                      <div className="p-2 bg-white rounded-lg border border-amber-200 text-xs flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{found.title}</p>
                          <p className="text-[11px] text-slate-500">Tiers : <strong>{found.waiting_on}</strong> ({found.target_type || 'Prestataire'})</p>
                        </div>
                        {found.follow_up_date && (
                          <span className="text-[11px] text-amber-900 bg-amber-100 px-2 py-0.5 rounded font-medium">
                            Relance : {found.follow_up_date}
                          </span>
                        )}
                      </div>
                    )
                  })()
                )}

                {waitingReturns.length === 0 && (
                  <p className="text-[11px] text-slate-500 italic">
                    Aucun retour n'a encore été créé. Cliquez sur "+ Nouveau retour" pour définir ce que vous attendez.
                  </p>
                )}
              </div>
            ) : (
              /* Inline form to create new return */
              <div className="space-y-2 bg-white p-3 rounded-lg border border-amber-200">
                <p className="text-[11px] font-bold text-amber-900">Nouveau retour attendu :</p>
                <Input
                  placeholder="Objet du retour (ex: Devis fibre Orange, Validation devis...)"
                  value={inlineReturnTitle}
                  onChange={e => setInlineReturnTitle(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Interlocuteur (ex: Orange, Direction, Patrick...)"
                  value={inlineReturnWho}
                  onChange={e => setInlineReturnWho(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    if (!inlineReturnTitle.trim() || !inlineReturnWho.trim() || !onCreateReturnInline) return
                    const created = await onCreateReturnInline(inlineReturnTitle.trim(), inlineReturnWho.trim())
                    if (created) {
                      setFormData(prev => ({ ...prev, waitingReturnId: created.id }))
                      setIsCreatingReturnInline(false)
                      setInlineReturnTitle('')
                      setInlineReturnWho('')
                    }
                  }}
                  disabled={!inlineReturnTitle.trim() || !inlineReturnWho.trim()}
                  className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Créer et associer à cette tâche
                </Button>
              </div>
            )}
          </div>
        )}

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

        {/* Dépendance conditionnelle */}
        <TaskBlockerSelector
          currentTaskId={editingTask?.id}
          tasks={tasks}
          events={events}
          waitingReturns={waitingReturns}
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
