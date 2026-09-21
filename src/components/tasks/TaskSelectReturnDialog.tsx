'use client'

import React, { useState, useMemo } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Task, WaitingReturn } from '@/lib/types'
import { getWaitingReturnMetrics } from '@/lib/waiting-returns'
import { 
  Hourglass, 
  Search, 
  Plus, 
  Check, 
  User, 
  Calendar, 
  AlertCircle,
  Clock, 
  ArrowRight,
  CalendarPlus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CustomDatePicker } from '@/components/ui/date-picker'
import { CalendarSyncOptions } from '@/components/calendar/CalendarSyncOptions'

interface TaskSelectReturnDialogProps {
  open: boolean
  task: Task | null
  waitingReturns: WaitingReturn[]
  currentSelectedReturnId?: string | null
  onClose: () => void
  onSelectReturn: (returnId: string) => Promise<void>
  onCreateAndSelectReturn: (data: {
    title: string
    waiting_on: string
    target_type?: string
    follow_up_date?: string
    addToCalendar?: boolean
    calIsFlexible?: boolean
    calDate?: string
    calEndDate?: string
    calFlexLabel?: string
  }) => Promise<void>
}

export function TaskSelectReturnDialog({
  open,
  task,
  waitingReturns,
  currentSelectedReturnId,
  onClose,
  onSelectReturn,
  onCreateAndSelectReturn
}: TaskSelectReturnDialogProps) {
  const [selectedId, setSelectedId] = useState<string>(currentSelectedReturnId || '')
  const [search, setSearch] = useState('')
  const [isCreatingNew, setIsCreatingNew] = useState(false)

  // New return form
  const [newTitle, setNewTitle] = useState('')
  const [newWaitingOn, setNewWaitingOn] = useState('')
  const [newTargetType, setNewTargetType] = useState('Prestataire')
  const [newFollowUpDate, setNewFollowUpDate] = useState('')
  const [newAddToCalendar, setNewAddToCalendar] = useState(false)
  const [newCalIsFlexible, setNewCalIsFlexible] = useState(false)
  const [newCalDate, setNewCalDate] = useState('')
  const [newCalEndDate, setNewCalEndDate] = useState('')
  const [newCalFlexLabel, setNewCalFlexLabel] = useState('Dans les 2 prochaines semaines')
  const [isSubmitting, setIsSubmitting] = useState(false)

  React.useEffect(() => {
    if (open) {
      setSelectedId(currentSelectedReturnId || '')
      setSearch('')
      setIsCreatingNew(false)
      setNewTitle('')
      setNewWaitingOn('')
      setNewFollowUpDate('')
      setNewAddToCalendar(false)
      setNewCalIsFlexible(false)
      setNewCalDate('')
      setNewCalEndDate('')
      setNewCalFlexLabel('Dans les 2 prochaines semaines')
    }
  }, [open, currentSelectedReturnId])

  // Filter returns
  const filteredReturns = useMemo(() => {
    const q = search.trim().toLowerCase()
    return waitingReturns.filter(r => {
      if (r.status !== 'en attente' && r.id !== selectedId) return false
      if (!q) return true
      return (
        r.title.toLowerCase().includes(q) ||
        r.waiting_on.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      )
    })
  }, [waitingReturns, search, selectedId])

  const handleConfirmSelection = async () => {
    if (!selectedId) return
    setIsSubmitting(true)
    try {
      await onSelectReturn(selectedId)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateNew = async () => {
    if (!newTitle.trim() || !newWaitingOn.trim()) return
    setIsSubmitting(true)
    try {
      await onCreateAndSelectReturn({
        title: newTitle.trim(),
        waiting_on: newWaitingOn.trim(),
        target_type: newTargetType,
        follow_up_date: newFollowUpDate || undefined,
        addToCalendar: newAddToCalendar,
        calIsFlexible: newCalIsFlexible,
        calDate: newCalDate,
        calEndDate: newCalEndDate,
        calFlexLabel: newCalFlexLabel
      })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const setQuickDate = (daysAhead: number) => {
    const d = new Date()
    d.setDate(d.getDate() + daysAhead)
    setNewFollowUpDate(d.toISOString().split('T')[0])
  }

  if (!task) return null

  return (
    <Dialog open={open} onClose={onClose} className="max-w-xl">
      <DialogHeader>
        <div className="flex items-center gap-2 text-amber-600">
          <Hourglass className="w-5 h-5 animate-pulse" />
          <DialogTitle className="text-lg">Quel retour cette tâche attend-elle ?</DialogTitle>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Tâche concernée : <strong className="text-slate-800">{task.title}</strong>
        </p>
      </DialogHeader>

      <div className="space-y-4 py-3 overflow-y-auto flex-1 pr-1.5 min-h-0">
        {!isCreatingNew ? (
          <>
            {/* Search and list of existing returns */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800">
                  Sélectionnez parmi les retours que vous attendez :
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreatingNew(true)}
                  className="h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Nouveau retour
                </Button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Rechercher par sujet ou interlocuteur..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                {filteredReturns.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed space-y-2">
                    <p>Aucun retour attendu correspondant.</p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsCreatingNew(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Créer ce retour que vous attendez
                    </Button>
                  </div>
                ) : (
                  filteredReturns.map(r => {
                    const isSelected = selectedId === r.id
                    const metrics = getWaitingReturnMetrics(r)
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedId(r.id)}
                        className={cn(
                          "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left group",
                          isSelected
                            ? "border-amber-500 bg-amber-50/80 ring-1 ring-amber-400 shadow-2xs"
                            : "border-slate-200 hover:border-amber-300 hover:bg-amber-50/20 bg-white"
                        )}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {r.title}
                            </span>
                            <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {r.waiting_on}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Depuis {metrics.daysWaiting}j
                            </span>
                            {metrics.formattedFollowUpDate && (
                              <span>• Relance : {metrics.formattedFollowUpDate}</span>
                            )}
                            {r.status === 'reçu' && (
                              <Badge className="bg-emerald-600 text-white text-[9px] py-0">
                                ✓ Reçu
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0">
                          <div className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                            isSelected ? "bg-amber-600 border-amber-600 text-white" : "border-slate-300 group-hover:border-amber-400 bg-white"
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
          </>
        ) : (
          /* Create new return form inline */
          <div className="rounded-xl border border-amber-300 bg-amber-50/50 p-4 space-y-3.5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-amber-200 pb-2">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-amber-600" />
                Déclarer un nouveau retour attendu
              </span>
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Retour à la liste
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Objet / Que devez-vous recevoir ? <span className="text-red-500">*</span>
              </Label>
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Ex: Devis raccordement fibre, Validation budget direction..."
                className="h-9 text-xs bg-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Interlocuteur / De qui attendez-vous le retour ? <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={newWaitingOn}
                  onChange={e => setNewWaitingOn(e.target.value)}
                  placeholder="Ex: Orange, Direction, Patrick..."
                  className="h-9 text-xs bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Type d'interlocuteur
                </Label>
                <select
                  value={newTargetType}
                  onChange={e => setNewTargetType(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="Prestataire">Prestataire</option>
                  <option value="Fournisseur">Fournisseur</option>
                  <option value="Direction">Direction</option>
                  <option value="Utilisateur">Utilisateur</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-800">
                  Date de relance prévue <span className="text-slate-400 font-normal">(Optionnel)</span>
                </Label>
                {newFollowUpDate && (
                  <button
                    type="button"
                    onClick={() => setNewFollowUpDate('')}
                    className="text-[10px] text-slate-400 hover:text-red-600 cursor-pointer underline"
                  >
                    Effacer la date
                  </button>
                )}
              </div>
              <CustomDatePicker
                value={newFollowUpDate}
                onChange={setNewFollowUpDate}
                placeholder="Sélectionner une date de relance (optionnel)"
                className="h-9 text-xs bg-white"
              />
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setQuickDate(1)}
                  className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-amber-100 cursor-pointer"
                >
                  Demain
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(3)}
                  className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-amber-100 cursor-pointer"
                >
                  Dans 3 jours
                </button>
                <button
                  type="button"
                  onClick={() => setQuickDate(7)}
                  className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-white text-slate-700 hover:bg-amber-100 cursor-pointer"
                >
                  Dans 1 semaine
                </button>
              </div>
            </div>

            {/* Case à cocher calendrier avec choix fixe / flexible */}
            <CalendarSyncOptions
              enabled={newAddToCalendar}
              onEnabledChange={setNewAddToCalendar}
              isFlexible={newCalIsFlexible}
              onFlexibleChange={setNewCalIsFlexible}
              date={newCalDate}
              onDateChange={setNewCalDate}
              endDate={newCalEndDate}
              onEndDateChange={setNewCalEndDate}
              flexLabel={newCalFlexLabel}
              onFlexLabelChange={setNewCalFlexLabel}
              defaultSuggestedDate={newFollowUpDate}
              labelTitle="Retranscrire dans le calendrier"
              labelDescription={
                newFollowUpDate
                  ? `Planifier un rappel ou une période de relance dans votre agenda IT (suggéré le ${newFollowUpDate})`
                  : "Planifier un rappel ou une période de relance dans votre agenda IT"
              }
            />

            <p className="text-[11px] text-slate-500 italic pt-1">
              ℹ️ Ce retour sera automatiquement ajouté à votre rubrique « En attente » et rattaché à cette tâche.
            </p>
          </div>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Annuler
        </Button>
        {isCreatingNew ? (
          <Button
            onClick={handleCreateNew}
            disabled={!newTitle.trim() || !newWaitingOn.trim() || isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSubmitting ? 'Création...' : 'Créer et lier ce retour'}
          </Button>
        ) : (
          <Button
            onClick={handleConfirmSelection}
            disabled={!selectedId || isSubmitting}
            className="bg-slate-900 hover:bg-slate-800 text-white"
          >
            {isSubmitting ? 'Association...' : 'Valider ce retour'}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  )
}
