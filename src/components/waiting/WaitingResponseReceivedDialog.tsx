'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Task, Project, EventType, WaitingReturn } from '@/lib/types'
import { createWaitingReturn, updateWaitingReturn } from '@/lib/waiting-returns'
import { TaskFormData } from '@/components/tasks/TaskFormDialog'
import { 
  CheckCircle2, 
  Calendar, 
  FolderKanban, 
  PlusCircle, 
  ArrowRight, 
  Clock, 
  Hourglass, 
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CustomDatePicker } from '@/components/ui/date-picker'
import { CalendarSyncOptions } from '@/components/calendar/CalendarSyncOptions'
import { formatFlexibleEventDescription } from '@/lib/flexible-events'

interface WaitingResponseReceivedDialogProps {
  open: boolean
  returnItem: WaitingReturn | null
  linkedTasks?: Task[]
  onClose: () => void
  onSuccessMessage?: (msg: string) => void
  onRequestCreateTask?: (prefill: Partial<TaskFormData>) => void
  onCompleted?: () => void
}

export function WaitingResponseReceivedDialog({
  open,
  returnItem,
  linkedTasks = [],
  onClose,
  onSuccessMessage,
  onRequestCreateTask,
  onCompleted
}: WaitingResponseReceivedDialogProps) {
  const supabase = createClient()
  const [selectedAction, setSelectedAction] = useState<'none' | 'next_task' | 'calendar' | 'waiting_return' | 'project'>('none')
  const [responseComment, setResponseComment] = useState('')
  const [saving, setSaving] = useState(false)

  // Projects list
  const [projects, setProjects] = useState<Project[]>([])

  // Next task form
  const [nextTaskTitle, setNextTaskTitle] = useState('')
  const [nextTaskDesc, setNextTaskDesc] = useState('')
  const [nextTaskPrio, setNextTaskPrio] = useState<'haute' | 'moyenne' | 'basse'>('moyenne')
  const [nextTaskCat, setNextTaskCat] = useState('Support Utilisateur')

  // Calendar form
  const [calTitle, setCalTitle] = useState('')
  const [calDate, setCalDate] = useState('')
  const [calEndDate, setCalEndDate] = useState('')
  const [calIsFlexible, setCalIsFlexible] = useState(false)
  const [calFlexLabel, setCalFlexLabel] = useState('Dans les 2 prochaines semaines')
  const [calType, setCalType] = useState<EventType>('étape chantier')
  const [calDesc, setCalDesc] = useState('')

  // Waiting return form (Balle dans un autre camp)
  const [waitTitle, setWaitTitle] = useState('')
  const [waitOn, setWaitOn] = useState('')
  const [waitTargetType, setWaitTargetType] = useState('Prestataire')
  const [waitFollowUpDate, setWaitFollowUpDate] = useState('')
  const [waitDesc, setWaitDesc] = useState('')
  const [waitAddToCalendar, setWaitAddToCalendar] = useState(false)
  const [waitCalIsFlexible, setWaitCalIsFlexible] = useState(false)
  const [waitCalDate, setWaitCalDate] = useState('')
  const [waitCalEndDate, setWaitCalEndDate] = useState('')
  const [waitCalFlexLabel, setWaitCalFlexLabel] = useState('Dans les 2 prochaines semaines')

  // Project update form
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [projectStatusChange, setProjectStatusChange] = useState<string>('')
  const [projectNoteToAdd, setProjectNoteToAdd] = useState('')

  useEffect(() => {
    if (open && returnItem) {
      setResponseComment('')
      setSelectedAction('none')

      // Fetch projects
      supabase.from('projects').select('*').order('priority_order', { ascending: true })
        .then(({ data }) => {
          if (data && data.length > 0) {
            setProjects(data)
            setSelectedProjectId(data[0].id)
            setProjectStatusChange(data[0].status)
          }
        })

      // Next task default
      setNextTaskTitle(`Suite retour ${returnItem.waiting_on} : ${returnItem.title}`)
      setNextTaskDesc(`Traitement suite à la réponse reçue de ${returnItem.waiting_on}.`)
      setNextTaskPrio('moyenne')
      setNextTaskCat(linkedTasks.length > 0 ? linkedTasks[0].category : 'Prestataires')

      // Calendar default (+2 days)
      const defaultDate = new Date()
      defaultDate.setDate(defaultDate.getDate() + 2)
      setCalDate(defaultDate.toISOString().split('T')[0])
      setCalTitle(`Intervention / Point suite retour ${returnItem.waiting_on}`)
      setCalDesc(`Fait suite à la réponse de ${returnItem.waiting_on} pour "${returnItem.title}".`)
      setCalType('étape chantier')

      // Another waiting return default
      setWaitTitle(`Suite retour ${returnItem.waiting_on} : `)
      setWaitOn('')
      setWaitTargetType('Prestataire')
      setWaitFollowUpDate('')
      setWaitDesc(`Étape suivante après validation de ${returnItem.waiting_on}.`)

      // Project note default
      setProjectNoteToAdd(`✓ Réponse reçue de ${returnItem.waiting_on} le ${new Date().toLocaleDateString('fr-FR')} : ${returnItem.title}`)
    }
  }, [open, returnItem, linkedTasks, supabase])

  if (!returnItem) return null

  // Finaliser le retour (statut 'reçu' + commentaire éventuel + déblocage tâches)
  const finalizeReturnItem = async (comment?: string) => {
    const todayStr = new Date().toLocaleDateString('fr-FR')
    const finalComment = comment !== undefined ? comment : responseComment

    // 1. Mettre à jour le retour en 'reçu' avec le commentaire consigné
    let updatedDesc = returnItem.description || ''
    if (finalComment.trim()) {
      updatedDesc = `${updatedDesc}\n[Réponse reçue le ${todayStr}] ${finalComment.trim()}`.trim()
    }

    await updateWaitingReturn(supabase, returnItem.id, {
      status: 'reçu',
      description: updatedDesc || null
    })

    // 2. Débloquer ou reprendre les tâches liées qui étaient en attente
    if (linkedTasks.length > 0) {
      for (const t of linkedTasks) {
        if (t.status === 'en attente de retour externe') {
          await supabase.from('tasks').update({
            status: 'en cours',
            updated_at: new Date().toISOString()
          }).eq('id', t.id)
        }
      }
    }
  }

  // 1. Terminer sans créer d'action (juste clore)
  const handleCloseOnly = async () => {
    setSaving(true)
    try {
      await finalizeReturnItem()
      onSuccessMessage?.(`✓ Réponse reçue de ${returnItem.waiting_on} consignée avec succès !`)
      onCompleted?.()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  // 2. Créer une nouvelle tâche de traitement
  const handleSaveNextTask = async () => {
    if (!nextTaskTitle.trim()) return
    setSaving(true)
    try {
      await finalizeReturnItem()

      const { error } = await supabase.from('tasks').insert([{
        title: nextTaskTitle.trim(),
        description: nextTaskDesc.trim() || (responseComment ? `Note reçue : ${responseComment}` : null),
        category: nextTaskCat,
        priority: nextTaskPrio,
        status: 'à faire'
      }])

      if (!error) {
        onSuccessMessage?.(`✓ Tâche d'action « ${nextTaskTitle} » créée avec succès !`)
        onCompleted?.()
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  // 3. Planifier au calendrier
  const handleSaveCalendar = async () => {
    if (!calTitle.trim() || !calDate) return
    setSaving(true)
    try {
      await finalizeReturnItem()

      const finalDesc = calIsFlexible
        ? `[Période flexible : ${calFlexLabel || 'Dans les 2 prochaines semaines'}]\n${calDesc}`.trim()
        : calDesc

      let finalEndDate = calEndDate || null
      if (calIsFlexible && !finalEndDate && calDate) {
        const d = new Date(calDate)
        d.setDate(d.getDate() + 14)
        finalEndDate = d.toISOString().split('T')[0]
      }

      const { error } = await supabase.from('events').insert([{
        title: calTitle.trim(),
        description: finalDesc,
        event_date: calDate,
        end_date: finalEndDate,
        event_type: calType,
        status: 'à venir',
        task_id: linkedTasks.length > 0 ? linkedTasks[0].id : null
      }])

      if (!error) {
        onSuccessMessage?.(
          calIsFlexible
            ? `✓ Événement « ${calTitle} » planifié au calendrier (${calFlexLabel}) !`
            : `✓ Événement « ${calTitle} » ajouté au calendrier !`
        )
        onCompleted?.()
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  // 4. Enchaîner un nouveau retour en attente
  const handleSaveWaitingReturn = async () => {
    if (!waitTitle.trim() || !waitOn.trim()) return
    setSaving(true)
    try {
      await finalizeReturnItem()

      const created = await createWaitingReturn(supabase, {
        title: waitTitle.trim(),
        waiting_on: waitOn.trim(),
        target_type: waitTargetType,
        follow_up_date: waitFollowUpDate || null,
        description: waitDesc.trim() || null,
        status: 'en attente'
      })

      if (created && waitAddToCalendar) {
        const finalEventDate = waitCalDate || waitFollowUpDate || new Date().toISOString().split('T')[0]
        let finalEndDate = waitCalEndDate || null
        if (waitCalIsFlexible && !finalEndDate) {
          const d = new Date(finalEventDate + 'T00:00:00')
          d.setDate(d.getDate() + 14)
          finalEndDate = d.toISOString().split('T')[0]
        }
        const baseDesc = `Retour attendu suite à la réponse de ${returnItem.waiting_on}.`
        const finalDesc = waitCalIsFlexible
          ? formatFlexibleEventDescription(baseDesc, waitCalFlexLabel || 'Dans les 2 prochaines semaines')
          : baseDesc

        await supabase.from('events').insert([{
          title: `Retour attendu : ${waitTitle.trim()} (${waitOn.trim()})`,
          description: finalDesc,
          event_date: finalEventDate,
          end_date: waitCalIsFlexible ? finalEndDate : null,
          event_type: 'échéance',
          status: 'à venir',
          task_id: linkedTasks.length > 0 ? linkedTasks[0].id : null,
          vendor_id: null
        }])
      }

      onSuccessMessage?.(`✓ Nouveau retour attendu de ${waitOn.trim()} consigné en attente !`)
      onCompleted?.()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  // 5. Mettre à jour un chantier IT
  const handleSaveProject = async () => {
    if (!selectedProjectId) return
    setSaving(true)
    try {
      await finalizeReturnItem()

      const proj = projects.find(p => p.id === selectedProjectId)
      if (proj) {
        const currentNotes = proj.notes_blockers ? `${proj.notes_blockers}\n` : ''
        const updatedNotes = `${currentNotes}${projectNoteToAdd}`

        const updates: Record<string, unknown> = {
          notes_blockers: updatedNotes
        }
        if (projectStatusChange && projectStatusChange !== proj.status) {
          updates.status = projectStatusChange
        }

        await supabase.from('projects').update(updates).eq('id', selectedProjectId)
        onSuccessMessage?.(`✓ Chantier « ${proj.name} » mis à jour avec le retour reçu !`)
        onCompleted?.()
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-xl" closeOnClickOutside={false}>
      <DialogHeader>
        <div className="flex items-center gap-2 text-emerald-600">
          <CheckCircle2 className="w-6 h-6" />
          <DialogTitle className="text-xl">Réponse reçue de {returnItem.waiting_on} !</DialogTitle>
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Le retour <strong className="text-slate-900">« {returnItem.title} »</strong> est consigné comme reçu.
          La balle revient dans votre camp !
        </p>

        {linkedTasks.length > 0 && (
          <div className="mt-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Déblocage automatique : </span>
              <span>
                {linkedTasks.length} tâche(s) liée(s) {linkedTasks.length > 1 ? 'sont remises' : 'est remise'} immédiatement en cours :{' '}
                <strong>{linkedTasks.map(t => t.title).join(', ')}</strong>.
              </span>
            </div>
          </div>
        )}
      </DialogHeader>

      <div className="py-3 space-y-4 overflow-y-auto flex-1 pr-1.5 min-h-0">
        {/* Commentaire / Conclusion de la réponse reçue */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="return-response-comment" className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" />
              Commentaire / Résumé de la réponse reçue (optionnel) :
            </Label>
            <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">
              Consigné dans l'historique
            </span>
          </div>
          <Textarea
            id="return-response-comment"
            value={responseComment}
            onChange={e => setResponseComment(e.target.value)}
            placeholder="Ex: Patrick a validé le devis à 1500€, livraison prévue mardi prochain..."
            rows={2}
            className="bg-white text-xs text-slate-800 border-emerald-300 focus-visible:ring-emerald-500 placeholder:text-slate-400"
          />
        </div>

        {/* Choix des suites logiques */}
        {selectedAction === 'none' && (
          <div className="grid grid-cols-1 gap-2.5">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-0.5">
              Que souhaitez-vous déclencher maintenant ?
            </div>

            {/* Option 1 : Créer une tâche d'action */}
            <button
              type="button"
              onClick={() => {
                if (onRequestCreateTask) {
                  finalizeReturnItem()
                  onClose()
                  onRequestCreateTask({
                    title: `Suite retour ${returnItem.waiting_on} : ${returnItem.title}`,
                    description: responseComment ? `Réponse reçue : ${responseComment}` : `Suite à retour de ${returnItem.waiting_on}`,
                    category: linkedTasks.length > 0 ? linkedTasks[0].category : 'Prestataires',
                    priority: 'moyenne',
                    status: 'à faire'
                  })
                } else {
                  setSelectedAction('next_task')
                }
              }}
              className="flex items-start gap-3.5 p-3.5 rounded-xl border border-purple-200 bg-purple-50/30 hover:border-purple-400 hover:bg-purple-50/70 text-left transition-all group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                <PlusCircle className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-900 flex items-center justify-between">
                  Créer une tâche d'action (Prendre le relais)
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-1 shrink-0" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Planifier l'action concrète à réaliser maintenant que vous avez reçu la réponse du tiers.
                </p>
              </div>
            </button>

            {/* Option 2 : Calendrier */}
            <button
              type="button"
              onClick={() => setSelectedAction('calendar')}
              className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 text-left transition-all group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-900 flex items-center justify-between">
                  Planifier un rendez-vous / intervention au calendrier
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1 shrink-0" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fixer une date d'intervention, un point de calage ou une échéance dans votre agenda.
                </p>
              </div>
            </button>

            {/* Option 3 : Enchaîner un autre retour */}
            <button
              type="button"
              onClick={() => setSelectedAction('waiting_return')}
              className="flex items-start gap-3.5 p-3.5 rounded-xl border border-amber-200 bg-amber-50/30 hover:border-amber-400 hover:bg-amber-50/70 text-left transition-all group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-amber-100 text-amber-800 group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
                <Hourglass className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-900 flex items-center justify-between">
                  Enchaîner sur un autre retour (Balle dans un autre camp)
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-1 shrink-0" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Vous attendez maintenant l'accord ou l'action d'un autre tiers (ex: devis reçu → accord direction requis).
                </p>
              </div>
            </button>

            {/* Option 4 : Mettre à jour un chantier */}
            <button
              type="button"
              onClick={() => setSelectedAction('project')}
              className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/40 text-left transition-all group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-slate-900 flex items-center justify-between">
                  Faire avancer un chantier IT lié
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1 shrink-0" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consigner cette avancée dans les notes d'un des 6 chantiers prioritaires (ERP ALTIOR, Lean...).
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Action 1 : Créer la tâche suivante */}
        {selectedAction === 'next_task' && (
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-purple-600" />
                Créer une tâche d'action
              </span>
              <button 
                type="button"
                onClick={() => setSelectedAction('none')} 
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                ← Choisir autre chose
              </button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Titre de la tâche</Label>
              <Input 
                value={nextTaskTitle} 
                onChange={e => setNextTaskTitle(e.target.value)} 
                className="bg-white h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Priorité</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs"
                  value={nextTaskPrio}
                  onChange={e => setNextTaskPrio(e.target.value as any)}
                >
                  <option value="haute">Haute (Express 3j)</option>
                  <option value="moyenne">Moyenne (Standard 10j)</option>
                  <option value="basse">Basse (Fond 30j)</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Catégorie</Label>
                <Input 
                  value={nextTaskCat} 
                  onChange={e => setNextTaskCat(e.target.value)} 
                  className="bg-white h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Description / Objectif</Label>
              <Textarea 
                value={nextTaskDesc} 
                onChange={e => setNextTaskDesc(e.target.value)} 
                rows={2} 
                className="bg-white text-xs"
              />
            </div>

            <Button 
              onClick={handleSaveNextTask} 
              disabled={!nextTaskTitle.trim() || saving} 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
            >
              {saving ? 'Enregistrement...' : 'Créer cette tâche'}
            </Button>
          </div>
        )}

        {/* Action 2 : Planifier au calendrier */}
        {selectedAction === 'calendar' && (
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Planifier un événement au calendrier
              </span>
              <button 
                type="button"
                onClick={() => setSelectedAction('none')} 
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                ← Choisir autre chose
              </button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Titre de l'événement</Label>
              <Input 
                value={calTitle} 
                onChange={e => setCalTitle(e.target.value)} 
                className="bg-white h-9 text-xs"
              />
            </div>

            {/* Mode Date Flexible */}
            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-950 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  Date flexible / Période approximative
                </span>
                <button
                  type="button"
                  onClick={() => setCalIsFlexible(!calIsFlexible)}
                  className={cn(
                    "text-[11px] px-2.5 py-0.5 rounded-full font-medium border cursor-pointer transition-colors",
                    calIsFlexible
                      ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                  )}
                >
                  {calIsFlexible ? "✓ Flexible activé" : "Activer date flexible"}
                </button>
              </div>

              {calIsFlexible ? (
                <div className="space-y-2 pt-1 border-t border-purple-200">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-purple-900 font-medium">Libellé</Label>
                    <Input
                      value={calFlexLabel}
                      onChange={e => setCalFlexLabel(e.target.value)}
                      placeholder="Ex: Dans les deux prochaines semaines"
                      className="bg-white h-8 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Début estimé</Label>
                      <CustomDatePicker value={calDate} onChange={setCalDate} placeholder="Date de début" className="bg-white h-8 text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-slate-600">Fin estimée</Label>
                      <CustomDatePicker value={calEndDate} onChange={setCalEndDate} placeholder="Date de fin" className="bg-white h-8 text-xs" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 pt-1">
                  <Label className="text-xs font-semibold">Date de rendez-vous / intervention</Label>
                  <CustomDatePicker value={calDate} onChange={setCalDate} placeholder="Sélectionner une date" className="bg-white h-9 text-xs" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Type d'événement</Label>
              <select 
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs"
                value={calType} 
                onChange={e => setCalType(e.target.value as EventType)}
              >
                <option value="étape chantier">Étape chantier</option>
                <option value="rdv">Rendez-vous terrain</option>
                <option value="appel">Appel prestataire</option>
                <option value="échéance">Échéance / Contrôle</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Notes / Contexte</Label>
              <Textarea 
                value={calDesc} 
                onChange={e => setCalDesc(e.target.value)} 
                rows={2} 
                className="bg-white text-xs"
              />
            </div>

            <Button 
              onClick={handleSaveCalendar} 
              disabled={!calTitle.trim() || !calDate || saving} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {saving ? 'Enregistrement...' : 'Ajouter au calendrier'}
            </Button>
          </div>
        )}

        {/* Action 3 : Enchaîner un nouveau retour en attente */}
        {selectedAction === 'waiting_return' && (
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-amber-300">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
              <span className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <Hourglass className="w-4 h-4 text-amber-600" />
                Enchaîner un autre retour en attente
              </span>
              <button 
                type="button"
                onClick={() => setSelectedAction('none')} 
                className="text-xs text-amber-800 hover:underline cursor-pointer font-medium"
              >
                ← Choisir autre chose
              </button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-800">
                Objet du nouveau retour attendu <span className="text-red-500">*</span>
              </Label>
              <Input 
                value={waitTitle} 
                onChange={e => setWaitTitle(e.target.value)} 
                placeholder="Ex: Validation commande Patrick, livraison routeur..."
                className="h-9 text-xs bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-800">
                  Interlocuteur / Tiers <span className="text-red-500">*</span>
                </Label>
                <Input 
                  value={waitOn} 
                  onChange={e => setWaitOn(e.target.value)} 
                  placeholder="Ex: Direction, Fournisseur, Orange..."
                  className="h-9 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-800">Type de tiers</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs"
                  value={waitTargetType}
                  onChange={e => setWaitTargetType(e.target.value)}
                >
                  <option value="Prestataire">Prestataire</option>
                  <option value="Fournisseur">Fournisseur</option>
                  <option value="Direction">Direction</option>
                  <option value="Utilisateur">Utilisateur</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-800">
                Date de relance prévue <span className="text-slate-400 font-normal">(Optionnel)</span>
              </Label>
              <CustomDatePicker
                value={waitFollowUpDate}
                onChange={setWaitFollowUpDate}
                placeholder="Sélectionner une date de relance"
                className="h-9 text-xs bg-white"
              />
            </div>

            <CalendarSyncOptions
              enabled={waitAddToCalendar}
              onEnabledChange={setWaitAddToCalendar}
              isFlexible={waitCalIsFlexible}
              onFlexibleChange={setWaitCalIsFlexible}
              date={waitCalDate}
              onDateChange={setWaitCalDate}
              endDate={waitCalEndDate}
              onEndDateChange={setWaitCalEndDate}
              flexLabel={waitCalFlexLabel}
              onFlexLabelChange={setWaitCalFlexLabel}
              defaultSuggestedDate={waitFollowUpDate}
              labelTitle="Retranscrire dans le calendrier"
              labelDescription="Planifier un rappel ou une période de relance dans votre agenda IT"
            />

            <Button 
              onClick={handleSaveWaitingReturn} 
              disabled={!waitTitle.trim() || !waitOn.trim() || saving} 
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer ce nouveau retour'}
            </Button>
          </div>
        )}

        {/* Action 4 : Mettre à jour un chantier IT */}
        {selectedAction === 'project' && (
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-emerald-600" />
                Mettre à jour un chantier IT
              </span>
              <button 
                type="button"
                onClick={() => setSelectedAction('none')} 
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                ← Choisir autre chose
              </button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Sélectionner le chantier concerné</Label>
              <select
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs"
                value={selectedProjectId}
                onChange={e => {
                  setSelectedProjectId(e.target.value)
                  const p = projects.find(proj => proj.id === e.target.value)
                  if (p) setProjectStatusChange(p.status)
                }}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    Chantier {p.priority_order} : {p.name} ({p.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Statut du chantier</Label>
              <select
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs"
                value={projectStatusChange}
                onChange={e => setProjectStatusChange(e.target.value)}
              >
                <option value="À FAIRE">À FAIRE</option>
                <option value="EN COURS">EN COURS</option>
                <option value="EN ATTENTE">EN ATTENTE</option>
                <option value="TERMINÉ">TERMINÉ</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Entrée à ajouter aux notes du chantier</Label>
              <Textarea 
                value={projectNoteToAdd} 
                onChange={e => setProjectNoteToAdd(e.target.value)} 
                rows={2} 
                className="bg-white text-xs"
              />
            </div>

            <Button 
              onClick={handleSaveProject} 
              disabled={saving} 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {saving ? 'Enregistrement...' : 'Mettre à jour le chantier'}
            </Button>
          </div>
        )}
      </div>

      <DialogFooter className="flex flex-col sm:flex-row gap-2 items-center justify-between w-full">
        <span className="text-xs text-slate-500">
          {responseComment.trim() ? "✓ Commentaire prêt à être consigné" : "Aucune suite obligatoire"}
        </span>
        <Button 
          variant={responseComment.trim() ? "default" : "outline"} 
          onClick={handleCloseOnly}
          disabled={saving}
          className={cn(
            "cursor-pointer",
            responseComment.trim() && "bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          )}
        >
          {saving 
            ? 'Enregistrement...' 
            : responseComment.trim() 
            ? 'Enregistrer la réponse & Terminer' 
            : "Pas d'action nécessaire (Terminer)"}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
