'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Task, Project, EventType } from '@/lib/types'
import { createWaitingReturn } from '@/lib/waiting-returns'
import { extractTaskProjectId } from '@/lib/projects'
import { TaskFormData } from './TaskFormDialog'
import { CheckCircle2, Calendar, FolderKanban, PlusCircle, ArrowRight, Clock, Hourglass, CalendarPlus, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CustomDatePicker } from '@/components/ui/date-picker'
import { CalendarSyncOptions } from '@/components/calendar/CalendarSyncOptions'
import { formatFlexibleEventDescription } from '@/lib/flexible-events'

interface TaskFollowUpDialogProps {
  task: Task | null
  open: boolean
  onClose: () => void
  onSuccessMessage?: (msg: string) => void
  onRequestCreateTask?: (prefill: Partial<TaskFormData>) => void
}

export function TaskFollowUpDialog({ task, open, onClose, onSuccessMessage, onRequestCreateTask }: TaskFollowUpDialogProps) {
  const supabase = createClient()
  const [selectedAction, setSelectedAction] = useState<'none' | 'calendar' | 'project' | 'next_task' | 'waiting_return'>('none')
  
  // Projects list
  const [projects, setProjects] = useState<Project[]>([])
  
  // Calendar form
  const [calTitle, setCalTitle] = useState('')
  const [calDate, setCalDate] = useState('')
  const [calEndDate, setCalEndDate] = useState('')
  const [calIsFlexible, setCalIsFlexible] = useState(false)
  const [calFlexLabel, setCalFlexLabel] = useState('Dans les 2 prochaines semaines')
  const [calType, setCalType] = useState<EventType>('étape chantier')
  const [calDesc, setCalDesc] = useState('')

  // Project update form
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [projectStatusChange, setProjectStatusChange] = useState<string>('')
  const [projectNoteToAdd, setProjectNoteToAdd] = useState('')

  // Next task form
  const [nextTaskTitle, setNextTaskTitle] = useState('')
  const [nextTaskDesc, setNextTaskDesc] = useState('')
  const [nextTaskPrio, setNextTaskPrio] = useState<'haute' | 'moyenne' | 'basse'>('moyenne')

  // Waiting return form (Balle dans le camp d'un tiers)
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

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && task) {
      // Fetch available projects
      supabase.from('projects').select('*').order('priority_order', { ascending: true })
        .then(({ data }) => {
          if (data && data.length > 0) {
            setProjects(data)
            setSelectedProjectId(data[0].id)
            setProjectStatusChange(data[0].status)
          }
        })

      // Set default calendar date to +2 days
      const defaultDate = new Date()
      defaultDate.setDate(defaultDate.getDate() + 2)
      setCalDate(defaultDate.toISOString().split('T')[0])
      
      setCalTitle(`Débrief / Contrôle : ${task.title}`)
      setCalDesc(`Vérification de la mise en œuvre de la tâche "${task.title}".`)
      
      setProjectNoteToAdd(`✓ Réalisé le ${new Date().toLocaleDateString('fr-FR')} : ${task.title}`)
      
      setNextTaskTitle(`Suivi / Validation suite à : ${task.title}`)
      setNextTaskDesc(`Vérification de l'adoption et bon fonctionnement.`)
      setNextTaskPrio('moyenne')

      // Waiting return default values
      setWaitTitle(`Retour attendu suite à : ${task.title}`)
      setWaitOn('')
      setWaitTargetType('Prestataire')
      setWaitFollowUpDate('')
      setWaitDesc(`Fait suite à l'achèvement de la tâche : "${task.title}".`)
      setWaitAddToCalendar(false)
      setWaitCalIsFlexible(false)
      setWaitCalDate('')
      setWaitCalEndDate('')
      setWaitCalFlexLabel('Dans les 2 prochaines semaines')

      setSelectedAction('none')
    }
  }, [open, task, supabase])

  if (!task) return null

  const handleSaveCalendar = async () => {
    if (!calTitle || !calDate) return
    setSaving(true)
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
      title: calTitle,
      description: finalDesc,
      event_date: calDate,
      end_date: finalEndDate,
      event_type: calType,
      status: 'à venir',
      task_id: task.id
    }])
    setSaving(false)
    if (!error) {
      onSuccessMessage?.(
        calIsFlexible 
          ? `Événement "${calTitle}" planifié au calendrier (${calFlexLabel}) !`
          : `Événement "${calTitle}" ajouté au calendrier !`
      )
      onClose()
    }
  }

  const handleSaveProject = async () => {
    if (!selectedProjectId) return
    setSaving(true)
    const proj = projects.find(p => p.id === selectedProjectId)
    if (!proj) {
      setSaving(false)
      return
    }

    const currentNotes = proj.notes_blockers ? `${proj.notes_blockers}\n` : ''
    const updatedNotes = `${currentNotes}${projectNoteToAdd}`
    
    const updates: Record<string, unknown> = {
      notes_blockers: updatedNotes
    }
    if (projectStatusChange && projectStatusChange !== proj.status) {
      updates.status = projectStatusChange
    }

    const { error } = await supabase.from('projects').update(updates).eq('id', selectedProjectId)
    setSaving(false)
    if (!error) {
      onSuccessMessage?.(`Chantier "${proj.name}" mis à jour avec le suivi de la tâche !`)
      onClose()
    }
  }


  const handleSaveNextTask = async () => {
    if (!nextTaskTitle) return
    setSaving(true)
    const { error } = await supabase.from('tasks').insert([{
      title: nextTaskTitle,
      description: nextTaskDesc,
      category: task.category,
      priority: nextTaskPrio,
      status: 'à faire'
    }])
    setSaving(false)
    if (!error) {
      onSuccessMessage?.(`Tâche suivante "${nextTaskTitle}" créée avec succès !`)
      onClose()
    }
  }

  const handleSaveWaitingReturn = async () => {
    if (!waitTitle.trim() || !waitOn.trim()) return
    setSaving(true)
    try {
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
        const baseDesc = `Retour attendu suite à la tâche « ${task.title} ».`
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
          task_id: task.id,
          vendor_id: null
        }])
      }

      onSuccessMessage?.(`✓ Retour attendu de ${waitOn.trim()} consigné dans la rubrique « En attente » !`)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-xl" closeOnClickOutside={false}>
      <DialogHeader>
        <div className="flex items-center gap-2 text-emerald-600">
          <CheckCircle2 className="w-6 h-6" />
          <DialogTitle className="text-xl">Tâche terminée !</DialogTitle>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Bravo, <strong className="text-slate-800">« {task.title} »</strong> est désormais terminée. Pour maintenir une organisation fluide, que souhaitez-vous déclencher ensuite ?
        </p>
      </DialogHeader>

      <div className="py-3 space-y-4 overflow-y-auto flex-1 pr-1.5 min-h-0">
        {/* Choix des suites logiques */}
        {selectedAction === 'none' && (
          <div className="grid grid-cols-1 gap-3">
            {/* Option 1 : Déclarer un retour attendu */}
            <button
              onClick={() => setSelectedAction('waiting_return')}
              className="flex items-start gap-4 p-4 rounded-xl border border-amber-300 bg-amber-50/40 hover:border-amber-500 hover:bg-amber-50 text-left transition-all group cursor-pointer"
            >
              <div className="p-2.5 rounded-lg bg-amber-200/80 text-amber-900 group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
                <Hourglass className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900 flex items-center justify-between">
                  Rajouter un retour en attente (Balle dans leur camp)
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-1" />
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Vous avez fait votre part, et vous attendez désormais la réponse ou la validation d&apos;un tiers (prestataire, direction, collègue).
                </p>
              </div>
            </button>

            {/* Option 2 : Calendrier */}
            <button
              onClick={() => setSelectedAction('calendar')}
              className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/40 text-left transition-all group cursor-pointer"
            >
              <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900 flex items-center justify-between">
                  Planifier un retour ou un contrôle au calendrier
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Programmer un point de contrôle à J+2 ou J+7 pour vérifier que tout fonctionne bien avec les utilisateurs.
                </p>
              </div>
            </button>

            {/* Option 3 : Chantier */}
            <button
              onClick={() => setSelectedAction('project')}
              className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/40 text-left transition-all group cursor-pointer"
            >
              <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900 flex items-center justify-between">
                  Faire avancer un chantier IT lié
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1" />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Consigner cette avancée dans les notes d&apos;un des 6 chantiers prioritaires (ERP ALTIOR, Lean, etc.).
                </p>
              </div>
            </button>

            {/* Option 4 : Tâche suivante */}
            <button
              onClick={() => {
                if (onRequestCreateTask) {
                  onClose()
                  onRequestCreateTask({
                    title: `Suivi / Validation suite à : ${task.title}`,
                    description: `Vérification de l'adoption et bon fonctionnement.`,
                    category: task.category,
                    priority: 'moyenne',
                    projectId: extractTaskProjectId(task.description) || null,
                    status: 'à faire'
                  })
                } else {
                  setSelectedAction('next_task')
                }
              }}
              className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-purple-400 hover:bg-purple-50/40 text-left transition-all group cursor-pointer"
            >
              <div className="p-2.5 rounded-lg bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900 flex items-center justify-between">
                  Créer une nouvelle tâche de suivi
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-transform group-hover:translate-x-1" />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Enchaîner sur la phase suivante avec la fiche complète de création (chantier, calendrier, dépendance...).
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Action A : Planifier au calendrier */}
        {selectedAction === 'calendar' && (
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Nouvel événement au calendrier
              </span>
              <button 
                onClick={() => setSelectedAction('none')} 
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                ← Choisir autre chose
              </button>
            </div>

            <div className="space-y-2">
              <Label>Titre de l'événement</Label>
              <Input value={calTitle} onChange={e => setCalTitle(e.target.value)} />
            </div>

            {/* Mode Date Flexible */}
            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-950 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  Date flexible / Période approximative
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!calIsFlexible) {
                      const start = new Date()
                      const end = new Date()
                      end.setDate(start.getDate() + 14)
                      setCalDate(start.toISOString().split('T')[0])
                      setCalEndDate(end.toISOString().split('T')[0])
                      setCalFlexLabel('Dans les 2 prochaines semaines')
                      setCalIsFlexible(true)
                    } else {
                      setCalIsFlexible(false)
                    }
                  }}
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
                  <button
                    type="button"
                    onClick={() => {
                      const start = new Date()
                      const end = new Date()
                      end.setDate(start.getDate() + 14)
                      setCalDate(start.toISOString().split('T')[0])
                      setCalEndDate(end.toISOString().split('T')[0])
                      setCalFlexLabel('Dans les 2 prochaines semaines')
                    }}
                    className="text-xs px-2.5 py-1 rounded bg-white hover:bg-purple-100 border border-purple-300 text-purple-800 font-semibold cursor-pointer shadow-2xs"
                  >
                    ⚡ Dans les 2 prochaines semaines
                  </button>
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
                  <Label className="text-xs">Date fixe de rendez-vous / débrief</Label>
                  <CustomDatePicker value={calDate} onChange={setCalDate} placeholder="Sélectionner une date" className="bg-white h-9 text-xs" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>Type d'événement</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
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
              <Label>Notes / Description</Label>
              <Textarea value={calDesc} onChange={e => setCalDesc(e.target.value)} rows={2} />
            </div>

            <Button onClick={handleSaveCalendar} disabled={saving} className="w-full">
              {saving ? 'Enregistrement...' : 'Ajouter au calendrier'}
            </Button>
          </div>
        )}

        {/* Action B : Mettre à jour un chantier */}
        {selectedAction === 'project' && (
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-amber-600" />
                Mettre à jour un chantier IT
              </span>
              <button 
                onClick={() => setSelectedAction('none')} 
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                ← Choisir autre chose
              </button>
            </div>

            <div className="space-y-1">
              <Label>Sélectionner le chantier concerné</Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
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
              <Label>Statut du chantier</Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
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
              <Label>Entrée à ajouter aux notes du chantier</Label>
              <Textarea 
                value={projectNoteToAdd} 
                onChange={e => setProjectNoteToAdd(e.target.value)} 
                rows={2} 
              />
            </div>

            <Button onClick={handleSaveProject} disabled={saving} className="w-full">
              {saving ? 'Enregistrement...' : 'Mettre à jour le chantier'}
            </Button>
          </div>
        )}

        {/* Action C : Créer la tâche suivante */}
        {selectedAction === 'next_task' && (
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-purple-600" />
                Créer la tâche suivante
              </span>
              <button 
                onClick={() => setSelectedAction('none')} 
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                ← Choisir autre chose
              </button>
            </div>

            <div className="space-y-1">
              <Label>Titre de la nouvelle tâche</Label>
              <Input value={nextTaskTitle} onChange={e => setNextTaskTitle(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label>Priorité</Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={nextTaskPrio}
                onChange={e => setNextTaskPrio(e.target.value as any)}
              >
                <option value="haute">Haute</option>
                <option value="moyenne">Moyenne</option>
                <option value="basse">Basse</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label>Description / Objectif</Label>
              <Textarea value={nextTaskDesc} onChange={e => setNextTaskDesc(e.target.value)} rows={2} />
            </div>

            <Button onClick={handleSaveNextTask} disabled={saving} className="w-full">
              {saving ? 'Création...' : 'Créer cette tâche'}
            </Button>
          </div>
        )}

        {/* Action D : Déclarer un retour attendu (Balle dans leur camp) */}
        {selectedAction === 'waiting_return' && (
          <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-amber-300">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
              <span className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                <Hourglass className="w-4 h-4 text-amber-600" />
                Rajouter un retour en attente (Balle dans leur camp)
              </span>
              <button 
                onClick={() => setSelectedAction('none')} 
                className="text-xs text-amber-800 hover:underline cursor-pointer font-medium"
              >
                ← Choisir autre chose
              </button>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-800">
                Objet du retour attendu <span className="text-red-500">*</span>
              </Label>
              <Input 
                value={waitTitle} 
                onChange={e => setWaitTitle(e.target.value)} 
                placeholder="Ex: Validation devis Patrick, Réception matériel Orange..."
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
                  placeholder="Ex: Orange, Direction, Patrick..."
                  className="h-9 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-800">Type de tiers</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
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

            {/* Date de relance (Optionnel) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-800">
                  Date de relance prévue <span className="text-slate-400 font-normal">(Optionnel)</span>
                </Label>
                {waitFollowUpDate && (
                  <button
                    type="button"
                    onClick={() => setWaitFollowUpDate('')}
                    className="text-[10px] text-slate-400 hover:text-red-600 cursor-pointer underline"
                  >
                    Effacer
                  </button>
                )}
              </div>
              <CustomDatePicker
                value={waitFollowUpDate}
                onChange={setWaitFollowUpDate}
                placeholder="Sélectionner une date de relance (optionnel)"
                className="h-9 text-xs bg-white"
              />
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {[
                  { label: 'Demain', days: 1 },
                  { label: 'Dans 3j', days: 3 },
                  { label: 'Dans 1 sem.', days: 7 },
                  { label: 'Dans 2 sem.', days: 14 }
                ].map(({ label, days }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      const d = new Date()
                      d.setDate(d.getDate() + days)
                      setWaitFollowUpDate(d.toISOString().split('T')[0])
                    }}
                    className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-amber-100 cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Retranscrire dans le calendrier avec choix fixe / flexible */}
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
              labelDescription={
                waitFollowUpDate
                  ? `Planifier un rappel ou une période de relance dans votre agenda IT (suggéré le ${waitFollowUpDate})`
                  : "Planifier un rappel ou une période de relance dans votre agenda IT"
              }
            />

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-800">Description / Contexte (optionnel)</Label>
              <Textarea 
                value={waitDesc} 
                onChange={e => setWaitDesc(e.target.value)} 
                rows={2} 
                className="text-xs bg-white"
              />
            </div>

            <Button 
              onClick={handleSaveWaitingReturn} 
              disabled={!waitTitle.trim() || !waitOn.trim() || saving} 
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer ce retour attendu'}
            </Button>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Pas d'action nécessaire (Terminer)
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
