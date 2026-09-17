'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarEvent, Task, Vendor, EventType, EventStatus, TaskCategory, TaskPriority } from '@/lib/types'
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CustomDatePicker } from '@/components/ui/date-picker'
import { TaskSelector } from '@/components/shared/TaskSelector'
import { CheckCircle2, Hourglass, Clock, Building2, Trash2 } from 'lucide-react'
import { 
  EVENT_TYPES, 
  EVENT_STATUSES, 
  EVENT_TYPE_LABELS,
  extractTimeFromDate,
  combineDateAndTime,
  cn,
  TASK_CATEGORIES,
  TASK_PRIORITIES
} from '@/lib/utils'
import { parseFlexibleEvent } from '@/lib/flexible-events'
import { parseEventClosureComment, formatEventDescriptionWithClosure } from '@/lib/closure-comments'
import { toYMD, getPresetDates } from './calendar-utils'

interface EventFormDialogProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  editingEvent: CalendarEvent | null
  defaultDate?: string
  tasks: Task[]
  vendors: Vendor[]
  onSaveSuccess: (message: string) => void
  onDeleteSuccess: () => void
}

export function EventFormDialog({
  isOpen,
  setIsOpen,
  editingEvent,
  defaultDate,
  tasks,
  vendors,
  onSaveSuccess,
  onDeleteSuccess
}: EventFormDialogProps) {
  const supabase = createClient()
  
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formEventDate, setFormEventDate] = useState('')
  const [formEventTime, setFormEventTime] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formIsFlexible, setFormIsFlexible] = useState(false)
  const [formFlexLabel, setFormFlexLabel] = useState('Dans les 2 prochaines semaines')
  const [formEventType, setFormEventType] = useState<EventType>('rdv')
  const [formStatus, setFormStatus] = useState<EventStatus>('à venir')
  const [formClosureComment, setFormClosureComment] = useState('')
  const [formTaskId, setFormTaskId] = useState('')
  const [formVendorId, setFormVendorId] = useState('')

  const [createAlsoTask, setCreateAlsoTask] = useState(false)
  const [formAlsoTaskCategory, setFormAlsoTaskCategory] = useState<TaskCategory>('Autre')
  const [formAlsoTaskPriority, setFormAlsoTaskPriority] = useState<TaskPriority>('moyenne')

  useEffect(() => {
    if (isOpen) {
      if (editingEvent) {
        setFormTitle(editingEvent.title)
        const closure = parseEventClosureComment(editingEvent.description)
        setFormClosureComment(closure.closureComment || '')

        const parsed = parseFlexibleEvent(closure.cleanDesc)
        if (parsed.isFlexible) {
          setFormIsFlexible(true)
          setFormFlexLabel(parsed.flexLabel)
          setFormDescription(parsed.cleanDesc)
        } else {
          setFormIsFlexible(false)
          setFormFlexLabel('Dans les 2 prochaines semaines')
          setFormDescription(closure.cleanDesc || '')
        }
        setFormEventDate(editingEvent.event_date.split('T')[0])
        setFormEventTime(extractTimeFromDate(editingEvent.event_date))
        setFormEndDate(editingEvent.end_date ? editingEvent.end_date.split('T')[0] : '')
        setFormEndTime(extractTimeFromDate(editingEvent.end_date))
        setFormEventType(editingEvent.event_type)
        setFormStatus(editingEvent.status)
        setFormTaskId(editingEvent.task_id || '')
        setFormVendorId(editingEvent.vendor_id || '')
        setCreateAlsoTask(false)
      } else {
        setFormTitle('')
        setFormDescription('')
        setFormClosureComment('')
        setFormEventDate(defaultDate || toYMD(new Date()))
        setFormEventTime('')
        setFormEndDate('')
        setFormEndTime('')
        setFormIsFlexible(false)
        setFormFlexLabel('Dans les 2 prochaines semaines')
        setFormEventType('rdv')
        setFormStatus('à venir')
        setFormTaskId('')
        setFormVendorId('')
        setCreateAlsoTask(false)
        setFormAlsoTaskCategory('Autre')
        setFormAlsoTaskPriority('moyenne')
      }
    }
  }, [isOpen, editingEvent, defaultDate])

  const handleSelectTask = (tid: string | null) => {
    const id = tid || ''
    setFormTaskId(id)
    if (id) {
      setCreateAlsoTask(false)
      if (!formTitle) {
        const t = tasks.find(item => item.id === id)
        if (t) {
          setFormTitle(t.title)
          if (!formDescription && t.description) setFormDescription(t.description)
        }
      }
    }
  }

  const handleDeleteEvent = async (id: string, titleStr: string) => {
    if (!window.confirm(`Supprimer l'événement "${titleStr}" ?`)) return
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (!error) {
      setIsOpen(false)
      onDeleteSuccess()
    }
  }

  const handleSaveEvent = async () => {
    if (!formTitle.trim() || !formEventDate) return

    let finalEndDate = formEndDate || null
    if (formIsFlexible && !finalEndDate && formEventDate) {
      const d = new Date(formEventDate)
      d.setDate(d.getDate() + 14)
      finalEndDate = toYMD(d)
    }

    let finalDesc = formIsFlexible
      ? `[Période flexible : ${formFlexLabel || 'Dans les 2 prochaines semaines'}]\n${formDescription}`.trim()
      : formDescription.trim()

    finalDesc = formatEventDescriptionWithClosure(
      finalDesc,
      formStatus === 'clos' ? formClosureComment : null
    ) || ''

    const finalEventDate = combineDateAndTime(formEventDate, formEventTime)
    const finalEndDateTime = finalEndDate ? combineDateAndTime(finalEndDate, formEndTime) : null

    const payload = {
      title: formTitle.trim(),
      description: finalDesc || null,
      event_date: finalEventDate,
      end_date: finalEndDateTime,
      event_type: formEventType,
      status: formStatus,
      task_id: formTaskId || null,
      vendor_id: formVendorId || null
    }

    if (editingEvent) {
      const { error } = await supabase.from('events').update(payload).eq('id', editingEvent.id)
      if (!error) {
        setIsOpen(false)
        onSaveSuccess(`Événement mis à jour avec succès !`)
      }
    } else {
      if (createAlsoTask) {
        const cat = formAlsoTaskCategory || (formVendorId ? 'Prestataires' : 'Autre')
        const { data: createdTask, error: taskError } = await supabase
          .from('tasks')
          .insert([{
            title: formTitle.trim(),
            description: finalDesc || null,
            category: cat,
            priority: formAlsoTaskPriority,
            status: 'à faire'
          }])
          .select()
          .single()

        if (!taskError && createdTask) {
          payload.task_id = createdTask.id
        }
      }

      const { error } = await supabase.from('events').insert([payload])
      if (!error) {
        setIsOpen(false)
        if (createAlsoTask) {
          onSaveSuccess(`Événement et tâche éponyme créés avec succès !`)
        } else {
          onSaveSuccess(`Événement créé avec succès !`)
        }
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingEvent ? "Modifier l'événement" : "Nouvel événement au calendrier"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-3 text-slate-800">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Titre de l'événement <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="Ex: Intervention fibre SFR, Réunion Altior..."
              className="bg-white text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Type d'événement</Label>
              <select
                value={formEventType}
                onChange={e => setFormEventType(e.target.value as EventType)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {EVENT_TYPES.map(t => (
                  <option key={t} value={t}>{EVENT_TYPE_LABELS[t] || t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Statut</Label>
              <select
                value={formStatus}
                onChange={e => setFormStatus(e.target.value as EventStatus)}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {EVENT_STATUSES.map(s => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </div>
          </div>

          {formStatus === 'clos' && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-3.5 space-y-2 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Commentaire de résolution / clôture (optionnel)</span>
              </div>
              <p className="text-[11px] text-emerald-800">
                Ce motif restera consigné pour l'historique et sera intégré aux rapports d'activité.
              </p>
              <textarea
                rows={2}
                value={formClosureComment}
                onChange={e => setFormClosureComment(e.target.value)}
                placeholder="Ex: Intervention fibre finalisée avec succès par SFR. Tout fonctionne nominalement."
                className="w-full rounded-md border border-emerald-300 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          )}

          <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                <Hourglass className="w-4 h-4 text-purple-600" />
                <span>Mode Période Flexible (date exacte encore inconnue)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!formIsFlexible) {
                    const p = getPresetDates('two_weeks')
                    setFormEventDate(p.startDate)
                    setFormEndDate(p.endDate)
                    setFormFlexLabel(p.label)
                    setFormIsFlexible(true)
                  } else {
                    setFormIsFlexible(false)
                  }
                }}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer",
                  formIsFlexible
                    ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                    : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                )}
              >
                {formIsFlexible ? "✓ Flexible activé" : "Activer date flexible"}
              </button>
            </div>

            {formIsFlexible ? (
              <div className="space-y-2.5 pt-2 border-t border-purple-200">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-500 font-medium">Raccourcis :</span>
                  <button
                    type="button"
                    onClick={() => {
                      const p = getPresetDates('two_weeks')
                      setFormEventDate(p.startDate)
                      setFormEndDate(p.endDate)
                      setFormFlexLabel(p.label)
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-white hover:bg-purple-100 border border-purple-300 text-purple-800 font-semibold cursor-pointer"
                  >
                    Dans 2 semaines
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const p = getPresetDates('this_week')
                      setFormEventDate(p.startDate)
                      setFormEndDate(p.endDate)
                      setFormFlexLabel(p.label)
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                  >
                    Cette semaine
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const p = getPresetDates('end_month')
                      setFormEventDate(p.startDate)
                      setFormEndDate(p.endDate)
                      setFormFlexLabel(p.label)
                    }}
                    className="text-xs px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                  >
                    Fin du mois
                  </button>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-purple-900">Libellé d'estimation</Label>
                  <Input
                    value={formFlexLabel}
                    onChange={e => setFormFlexLabel(e.target.value)}
                    placeholder="Ex: Dans les deux prochaines semaines"
                    className="bg-white text-xs border-purple-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <CustomDatePicker label="Début estimé" value={formEventDate} onChange={setFormEventDate} />
                  </div>
                  <div>
                    <CustomDatePicker label="Fin estimée" value={formEndDate} onChange={setFormEndDate} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <CustomDatePicker label="Date de l'événement" value={formEventDate} onChange={setFormEventDate} />
                  </div>
                  <div>
                    <CustomDatePicker label="Date de fin (optionnelle)" value={formEndDate} onChange={setFormEndDate} />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Préciser une heure (optionnel)</span>
                    </Label>
                    {(formEventTime || formEndTime) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormEventTime('')
                          setFormEndTime('')
                        }}
                        className="text-[11px] font-medium text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        Effacer l'heure
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="event-start-time" className="text-[11px] text-slate-500 font-medium">
                        Heure de début
                      </Label>
                      <Input
                        id="event-start-time"
                        type="time"
                        value={formEventTime}
                        onChange={e => setFormEventTime(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="event-end-time" className="text-[11px] text-slate-500 font-medium">
                        Heure de fin
                      </Label>
                      <Input
                        id="event-end-time"
                        type="time"
                        value={formEndTime}
                        onChange={e => setFormEndTime(e.target.value)}
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 mr-1">Raccourcis :</span>
                    {['08:30', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormEventTime(t)}
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer",
                          formEventTime === t
                            ? "bg-blue-600 text-white border-blue-600 font-bold"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <TaskSelector
            tasks={tasks}
            value={formTaskId || null}
            onChange={handleSelectTask}
            disabled={createAlsoTask}
            disabledMessage="Désactivé : une tâche éponyme sera créée et liée automatiquement"
            label="Lier à une tâche IT (optionnel)"
            placeholder="Rechercher et associer une tâche existante..."
          />

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              Lier à un prestataire (optionnel)
            </Label>
            <select
              value={formVendorId}
              onChange={e => setFormVendorId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs truncate focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
            >
              <option value="">-- Aucun prestataire lié --</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>
                  🏢 {v.name} ({v.scope || 'Prestataire'})
                </option>
              ))}
            </select>
          </div>

          {!editingEvent && (
            <div className={cn(
              "rounded-xl border p-3.5 transition-all",
              createAlsoTask ? "bg-blue-50/60 border-blue-200 shadow-2xs" : "bg-slate-50/60 border-slate-200"
            )}>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={createAlsoTask}
                  onChange={e => {
                    const checked = e.target.checked
                    setCreateAlsoTask(checked)
                    if (checked) {
                      setFormTaskId('')
                    }
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Créer également la tâche éponyme
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-white text-blue-700 border-blue-200 py-0">
                      Synchro Tâches
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Une tâche intitulée &laquo;&nbsp;{formTitle.trim() || "même titre"}&nbsp;&raquo; sera automatiquement ajoutée dans vos tâches et rattachée à cet événement.
                  </p>
                </div>
              </label>

              {createAlsoTask && (
                <div className="mt-3 pt-3 border-t border-blue-100 grid grid-cols-1 sm:grid-cols-2 gap-3 pl-7">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700">Catégorie de la tâche</Label>
                    <select
                      value={formAlsoTaskCategory}
                      onChange={e => setFormAlsoTaskCategory(e.target.value as TaskCategory)}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {TASK_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-slate-700">Priorité de la tâche</Label>
                    <select
                      value={formAlsoTaskPriority}
                      onChange={e => setFormAlsoTaskPriority(e.target.value as TaskPriority)}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {TASK_PRIORITIES.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Détails / Notes complémentaires</Label>
            <Textarea
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="Précisions sur l'intervention, ordre du jour, lien visio..."
              rows={3}
              className="text-xs"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between pt-2 border-t border-slate-100">
          {editingEvent ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => handleDeleteEvent(editingEvent.id, editingEvent.title)}
              className="text-xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Supprimer
            </Button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-xs cursor-pointer"
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveEvent}
              disabled={!formTitle.trim() || !formEventDate}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs cursor-pointer"
            >
              {editingEvent ? "Mettre à jour" : "Créer l'événement"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
