'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CustomDatePicker } from '@/components/ui/date-picker'
import { Task, EventType, EventStatus } from '@/lib/types'
import { parseTaskBlocker } from '@/lib/blockers'
import { formatFlexibleEventDescription } from '@/lib/flexible-events'
import { combineDateAndTime } from '@/lib/utils'
import { Calendar, Clock } from 'lucide-react'

export interface ScheduleEventData {
  title: string
  description: string
  event_date: string
  end_date: string | null
  event_type: EventType
  status: EventStatus
  task_id: string
}

interface TaskScheduleDialogProps {
  open: boolean
  onClose: () => void
  task: Task | null
  onSchedule: (eventData: ScheduleEventData) => Promise<void>
}

export function TaskScheduleDialog({
  open,
  onClose,
  task,
  onSchedule
}: TaskScheduleDialogProps) {
  const [schedTitle, setSchedTitle] = useState('')
  const [schedDate, setSchedDate] = useState('')
  const [schedTime, setSchedTime] = useState('')
  const [schedEndDate, setSchedEndDate] = useState('')
  const [schedIsFlexible, setSchedIsFlexible] = useState(false)
  const [schedFlexLabel, setSchedFlexLabel] = useState('Dans les 2 prochaines semaines')
  const [schedType, setSchedType] = useState<EventType>('échéance')
  const [schedNotes, setSchedNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open && task) {
      const blocker = parseTaskBlocker(task.description)
      setSchedTitle(task.title)
      setSchedNotes(blocker.cleanDescription || '')
      const defaultDate = new Date()
      defaultDate.setDate(defaultDate.getDate() + 1)
      setSchedDate(defaultDate.toISOString().split('T')[0])
      setSchedTime('')
      setSchedEndDate('')
      setSchedIsFlexible(false)
      setSchedFlexLabel('Dans les 2 prochaines semaines')
      setSchedType('échéance')
    }
  }, [open, task])

  const handleSubmit = async () => {
    if (!task || !schedDate || !schedTitle.trim()) return

    setIsSubmitting(true)
    try {
      const finalDesc = schedIsFlexible
        ? formatFlexibleEventDescription(schedNotes, schedFlexLabel || 'Dans les 2 prochaines semaines')
        : schedNotes

      const finalEventDate = combineDateAndTime(schedDate, schedTime)

      await onSchedule({
        title: schedTitle.trim(),
        description: finalDesc,
        event_date: finalEventDate,
        end_date: schedIsFlexible && schedEndDate ? schedEndDate : null,
        event_type: schedType,
        status: 'à venir',
        task_id: task.id
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <div className="flex items-center gap-2 text-blue-600">
          <Calendar className="w-5 h-5" />
          <DialogTitle>Planifier la tâche au calendrier</DialogTitle>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Créer un point de calendrier ou une échéance rattachée à cette tâche.
        </p>
      </DialogHeader>

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="sched-title">Titre de l'événement</Label>
          <Input 
            id="sched-title"
            value={schedTitle} 
            onChange={e => setSchedTitle(e.target.value)} 
            placeholder="ex: Échéance : Finalisation licences M365"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date de l'événement</Label>
            <CustomDatePicker 
              value={schedDate} 
              onChange={setSchedDate} 
              placeholder="Date de l'échéance"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sched-time" className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Heure (optionnel)
              </Label>
              {schedTime && (
                <button
                  type="button"
                  onClick={() => setSchedTime('')}
                  className="text-[10px] text-slate-400 hover:text-red-600 cursor-pointer"
                >
                  Effacer l'heure
                </button>
              )}
            </div>
            <Input
              id="sched-time"
              type="time"
              value={schedTime}
              onChange={e => setSchedTime(e.target.value)}
              className="bg-white"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sched-type">Type d'événement</Label>
          <select
            id="sched-type"
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            value={schedType}
            onChange={e => setSchedType(e.target.value as EventType)}
          >
            <option value="échéance">Échéance</option>
            <option value="étape chantier">Étape chantier</option>
            <option value="rdv">Rendez-vous terrain</option>
            <option value="appel">Appel prestataire</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sched-notes">Détails complémentaires</Label>
          <Textarea 
            id="sched-notes"
            value={schedNotes} 
            onChange={e => setSchedNotes(e.target.value)} 
            rows={3} 
            placeholder="Notes ou consignes pour cette échéance..."
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={!schedTitle.trim() || !schedDate || isSubmitting}
        >
          {isSubmitting ? 'Planification...' : 'Ajouter au calendrier'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
