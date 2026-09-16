'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Task, TaskStatus } from '@/lib/types'
import { CustomDatePicker } from '@/components/ui/date-picker'
import {
  parseWaitingInfo,
  formatTaskDescriptionWithWaiting,
  removeWaitingTag,
  getWaitingMetrics,
  WaitingConfig,
} from '@/lib/waiting'
import {
  Hourglass,
  Clock,
  Calendar,
  User,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  ArrowRight,
  Flame,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskWaitingDialogProps {
  task: Task | null
  open: boolean
  onClose: () => void
  onSave: (taskId: string, newStatus: TaskStatus, newDescription: string) => Promise<void>
}

const COMMON_TARGETS = ['Prestataire', 'Fournisseur', 'Direction', 'Utilisateur', 'Support éditeur']

export function TaskWaitingDialog({
  task,
  open,
  onClose,
  onSave,
}: TaskWaitingDialogProps) {
  const [waitingOn, setWaitingOn] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [sinceDate, setSinceDate] = useState('')
  const [followUpCount, setFollowUpCount] = useState(0)
  const [relanceNote, setRelanceNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open && task) {
      const info = parseWaitingInfo(task.description, task.updated_at, task.created_at)
      setWaitingOn(info.waitingOn || '')
      setFollowUpDate(info.followUpDate || '')
      setSinceDate(info.sinceDate || new Date().toISOString().split('T')[0])
      setFollowUpCount(info.followUpCount || 0)
      setRelanceNote('')
    }
  }, [open, task])

  if (!task) return null

  const info = parseWaitingInfo(task.description, task.updated_at, task.created_at)
  const metrics = getWaitingMetrics(info)

  // Raccourcis de date de relance
  const setQuickFollowUp = (daysAhead: number) => {
    const d = new Date()
    d.setDate(d.getDate() + daysAhead)
    setFollowUpDate(d.toISOString().split('T')[0])
  }

  // Action 1 : Enregistrer les paramètres d'attente
  const handleSaveWaiting = async () => {
    setIsSaving(true)
    try {
      const waitingConfig: WaitingConfig = {
        waitingOn: waitingOn.trim(),
        followUpDate: followUpDate || undefined,
        sinceDate: sinceDate || undefined,
        followUpCount,
      }

      let updatedDesc = formatTaskDescriptionWithWaiting(task.description, waitingConfig)

      if (relanceNote.trim()) {
        const todayStr = new Date().toLocaleDateString('fr-FR')
        updatedDesc = `${updatedDesc}\n[Relance ${todayStr}] : ${relanceNote.trim()}`
      }

      await onSave(task.id, 'en attente de retour externe', updatedDesc)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  // Action 2 : Enregistrer une relance effectuée et décaler la prochaine
  const handleLogFollowUp = async (daysPostpone: number = 3) => {
    setIsSaving(true)
    try {
      const nextDate = new Date()
      nextDate.setDate(nextDate.getDate() + daysPostpone)
      const nextDateStr = nextDate.toISOString().split('T')[0]

      const newCount = followUpCount + 1
      const todayStr = new Date().toLocaleDateString('fr-FR')

      const waitingConfig: WaitingConfig = {
        waitingOn: waitingOn.trim() || 'Tiers externe',
        followUpDate: nextDateStr,
        sinceDate: sinceDate || undefined,
        followUpCount: newCount,
      }

      let updatedDesc = formatTaskDescriptionWithWaiting(task.description, waitingConfig)
      const noteToAdd = relanceNote.trim()
        ? `Relance n°${newCount} effectuée le ${todayStr} : ${relanceNote.trim()}`
        : `Relance n°${newCount} effectuée le ${todayStr}. Prochaine relance fixée au ${nextDate.toLocaleDateString('fr-FR')}.`

      updatedDesc = `${updatedDesc}\n[Suivi] ${noteToAdd}`

      await onSave(task.id, 'en attente de retour externe', updatedDesc)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  // Action 3 : Réponse reçue -> repasser immédiatement en cours !
  const handleResumeTask = async () => {
    setIsSaving(true)
    try {
      const todayStr = new Date().toLocaleDateString('fr-FR')
      const cleanDesc = removeWaitingTag(task.description)
      const finalDesc = `${cleanDesc}\n[Retour reçu le ${todayStr}] Reprise de la tâche en cours.`

      await onSave(task.id, 'en cours', finalDesc.trim())
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-xl">
      <DialogHeader>
        <div className="flex items-center gap-2 text-amber-600">
          <Hourglass className="w-5 h-5 animate-pulse" />
          <DialogTitle className="text-lg">Suivi d&apos;attente & Relances</DialogTitle>
        </div>
        <p className="text-sm font-semibold text-slate-800 line-clamp-1 mt-1">
          {task.title}
        </p>
      </DialogHeader>

      <div className="space-y-4 py-3 max-h-[75vh] overflow-y-auto pr-1">
        {/* Bandeau de situation actuel */}
        <div className={cn(
          "rounded-xl border p-3.5 space-y-2 text-xs",
          metrics.isDragging 
            ? "bg-red-50/70 border-red-200 text-red-900" 
            : metrics.isWarning
            ? "bg-amber-50/70 border-amber-200 text-amber-900"
            : "bg-slate-50 border-slate-200 text-slate-800"
        )}>
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>En attente depuis : <strong>{metrics.daysWaiting} jour(s)</strong></span>
            </span>
            {metrics.isDragging && (
              <Badge className="bg-red-600 text-white font-bold text-[10px] uppercase px-2">
                ⚠️ Traîne (&gt; 7 jours)
              </Badge>
            )}
            {metrics.isWarning && !metrics.isDragging && (
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                À surveiller (4-6j)
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
            <span>Depuis le : {metrics.formattedSinceDate}</span>
            <span>Relances faites : <strong>{followUpCount}</strong></span>
          </div>

          {metrics.followUpStatus === 'overdue' && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-100/70 px-2 py-1 rounded">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Relance en retard depuis {Math.abs(metrics.daysDiffFollowUp || 0)} jour(s) !</span>
            </div>
          )}

          {metrics.followUpStatus === 'today' && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-200/70 px-2 py-1 rounded">
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
              <span>À relancer aujourd&apos;hui !</span>
            </div>
          )}
        </div>

        {/* Bouton clé : Réponse reçue (La balle revient dans notre camp) */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-950">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Le tiers vous a répondu ?</span>
            </div>
            <p className="text-[11px] text-emerald-800">
              Repassez immédiatement la tâche en <strong>« En cours »</strong> pour l&apos;exécuter.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleResumeTask}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer shadow-xs"
          >
            ✓ Réponse reçue
          </Button>
        </div>

        {/* Formulaire de l'attente */}
        <div className="space-y-3 pt-1">
          {/* Qui / Quoi */}
          <div className="space-y-1.5">
            <Label htmlFor="waiting-on" className="text-xs font-semibold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>De qui / quoi attendez-vous le retour ?</span>
            </Label>
            <Input
              id="waiting-on"
              value={waitingOn}
              onChange={(e) => setWaitingOn(e.target.value)}
              placeholder="Ex: Prestataire SFR, Direction (devis), Fournisseur..."
              className="h-9 text-xs"
            />
            {/* Suggestions rapides */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {COMMON_TARGETS.map((target) => (
                <button
                  key={target}
                  type="button"
                  onClick={() => setWaitingOn(target)}
                  className="text-[10px] px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors cursor-pointer"
                >
                  + {target}
                </button>
              ))}
            </div>
          </div>

          {/* Date de relance */}
          <div className="space-y-1.5">
            <Label htmlFor="followup-date" className="text-xs font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Quand devez-vous relancer ?</span>
            </Label>
            <div className="flex gap-2">
              <CustomDatePicker
                value={followUpDate}
                onChange={setFollowUpDate}
                placeholder="Sélectionner une date de relance"
                className="h-9 text-xs flex-1"
              />
            </div>
            {/* Raccourcis de relance */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setQuickFollowUp(1)}
                className="text-[10px] px-2 py-0.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-800 cursor-pointer"
              >
                Demain
              </button>
              <button
                type="button"
                onClick={() => setQuickFollowUp(3)}
                className="text-[10px] px-2 py-0.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-800 cursor-pointer"
              >
                Dans 3 jours
              </button>
              <button
                type="button"
                onClick={() => setQuickFollowUp(7)}
                className="text-[10px] px-2 py-0.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-800 cursor-pointer"
              >
                Dans 1 semaine
              </button>
              <button
                type="button"
                onClick={() => setQuickFollowUp(14)}
                className="text-[10px] px-2 py-0.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-800 cursor-pointer"
              >
                Dans 2 semaines
              </button>
            </div>
          </div>

          {/* Note optionnelle de relance */}
          <div className="space-y-1.5">
            <Label htmlFor="relance-note" className="text-xs font-semibold">
              Consigner une action ou note de relance (optionnel)
            </Label>
            <Input
              id="relance-note"
              value={relanceNote}
              onChange={(e) => setRelanceNote(e.target.value)}
              placeholder="Ex: Mail envoyé ce matin à Patrick, appel laissé sur répondeur..."
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Action rapide : Noter la relance effectuée maintenant */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 flex items-center justify-between gap-3">
          <div className="text-[11px] text-amber-950">
            <span className="font-bold flex items-center gap-1">
              <Send className="w-3.5 h-3.5 text-amber-600" />
              Vous venez de relancer ?
            </span>
            <span>Incrémente le compteur et décale la prochaine relance de 3 jours.</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleLogFollowUp(3)}
            disabled={isSaving}
            className="border-amber-300 text-amber-900 hover:bg-amber-100 shrink-0 text-xs cursor-pointer"
          >
            Consigner relance (+3j)
          </Button>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Annuler
        </Button>
        <Button onClick={handleSaveWaiting} disabled={isSaving} className="bg-slate-900 hover:bg-slate-800 text-white">
          {isSaving ? 'Enregistrement...' : 'Enregistrer le suivi'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
