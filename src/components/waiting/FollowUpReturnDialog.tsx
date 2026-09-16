'use client'

import React, { useState } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WaitingReturn } from '@/lib/types'
import { 
  Bell, 
  Calendar, 
  Check, 
  CalendarPlus,
  Ban,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface FollowUpReturnDialogProps {
  open: boolean
  returnItem: WaitingReturn | null
  onClose: () => void
  onConfirm: (
    newFollowUpDate: string | null,
    addToCalendar: boolean
  ) => Promise<void>
}

export function FollowUpReturnDialog({
  open,
  returnItem,
  onClose,
  onConfirm
}: FollowUpReturnDialogProps) {
  // Mode : 'preset' | 'custom' | 'none'
  const [selectedMode, setSelectedMode] = useState<'preset' | 'custom' | 'none'>('preset')
  const [selectedDays, setSelectedDays] = useState<number>(3)
  const [customDate, setCustomDate] = useState<string>('')
  const [addToCalendar, setAddToCalendar] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialisation à l'ouverture
  React.useEffect(() => {
    if (open) {
      setSelectedMode('preset')
      setSelectedDays(3)
      setCustomDate('')
      setAddToCalendar(true)
    }
  }, [open])

  if (!returnItem) return null

  const calculateDateFromDays = (days: number): string => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }

  const handlePresetSelect = (days: number) => {
    setSelectedMode('preset')
    setSelectedDays(days)
  }

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      let nextDate: string | null = null
      if (selectedMode === 'preset') {
        nextDate = calculateDateFromDays(selectedDays)
      } else if (selectedMode === 'custom') {
        nextDate = customDate || calculateDateFromDays(3)
      } else if (selectedMode === 'none') {
        nextDate = null
      }

      await onConfirm(nextDate, selectedMode !== 'none' && addToCalendar)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextCount = (returnItem.follow_up_count || 0) + 1

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-2 text-amber-600">
          <Bell className="w-5 h-5 animate-bounce" />
          <DialogTitle className="text-lg font-bold">Consigner la relance effectuée</DialogTitle>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Vous venez de relancer votre contact. Enregistrez cette démarche dans l&apos;historique et déterminez la suite.
        </p>
      </DialogHeader>

      <div className="space-y-4 py-3">
        {/* Rappel du dossier & interlocuteur */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-sm truncate">{returnItem.title}</span>
            <span className="bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded text-[10px]">
              Relance n° {nextCount}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <User className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>Interlocuteur : <strong>{returnItem.waiting_on}</strong> ({returnItem.target_type || 'Prestataire'})</span>
          </div>
        </div>

        {/* Choix de la prochaine étape */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-slate-800">
            Quand souhaitez-vous prévoir la prochaine relance si vous n&apos;avez pas de réponse ?
          </Label>

          {/* Boutons rapides de délais */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Dans 2 jours', days: 2 },
              { label: 'Dans 3 jours', days: 3 },
              { label: 'Dans 5 jours', days: 5 },
              { label: 'Dans 1 semaine', days: 7 },
              { label: 'Dans 10 jours', days: 10 },
              { label: 'Dans 2 semaines', days: 14 }
            ].map(item => {
              const isChosen = selectedMode === 'preset' && selectedDays === item.days
              return (
                <button
                  key={item.days}
                  type="button"
                  onClick={() => handlePresetSelect(item.days)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                    isChosen
                      ? "border-amber-500 bg-amber-500 text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50/50"
                  )}
                >
                  <span>{item.label}</span>
                  <span className={cn("text-[10px] font-normal", isChosen ? "text-amber-100" : "text-slate-400")}>
                    +{item.days} j
                  </span>
                </button>
              )
            })}
          </div>

          {/* Date personnalisée */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setSelectedMode('custom')}
              className={cn(
                "w-full text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors cursor-pointer",
                selectedMode === 'custom'
                  ? "border-amber-500 bg-amber-50 text-amber-950 font-semibold"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Choisir une date précise...
              </span>
              {selectedMode === 'custom' && <Check className="w-4 h-4 text-amber-600" />}
            </button>

            {selectedMode === 'custom' && (
              <div className="mt-2 pl-2 animate-in fade-in">
                <Input
                  type="date"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="h-9 text-xs"
                />
              </div>
            )}
          </div>

          {/* Option : Ne plus relancer */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setSelectedMode('none')}
              className={cn(
                "w-full text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors cursor-pointer",
                selectedMode === 'none'
                  ? "border-slate-800 bg-slate-100 text-slate-900 font-semibold"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              )}
            >
              <span className="flex items-center gap-1.5">
                <Ban className="w-3.5 h-3.5 text-slate-500" />
                Ne plus programmer de relance (consigner uniquement cette relance)
              </span>
              {selectedMode === 'none' && <Check className="w-4 h-4 text-slate-800" />}
            </button>
          </div>
        </div>

        {/* Option Calendrier si une date de relance est prévue */}
        {selectedMode !== 'none' && (
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 hover:bg-slate-100/70 border border-slate-200 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={addToCalendar}
                onChange={e => setAddToCalendar(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 mt-0.5 h-4 w-4 cursor-pointer"
              />
              <div className="text-xs">
                <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <CalendarPlus className="w-3.5 h-3.5 text-purple-600" />
                  Inscrire cette relance dans le calendrier
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Un événement d&apos;échéance sera ajouté pour vous rappeler de relancer le jour J.
                </p>
              </div>
            </label>
          </div>
        )}
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={isSubmitting || (selectedMode === 'custom' && !customDate)}
          className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
        >
          {isSubmitting ? 'Enregistrement...' : 'Valider la relance'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
