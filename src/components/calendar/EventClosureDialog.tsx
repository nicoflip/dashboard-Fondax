'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { CalendarEvent } from '@/lib/types'
import { parseEventClosureComment } from '@/lib/closure-comments'
import { CheckCircle2, MessageSquareText, Sparkles } from 'lucide-react'

interface EventClosureDialogProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEvent | null
  onConfirmClosure: (event: CalendarEvent, closureComment: string) => Promise<void>
}

const PRESET_COMMENTS = [
  "Intervention réalisée avec succès",
  "Point résolu et validé en interne",
  "Rendez-vous / Échange effectué",
  "Échéance traitée",
  "Annulé car non nécessaire"
]

export function EventClosureDialog({
  isOpen,
  onClose,
  event,
  onConfirmClosure
}: EventClosureDialogProps) {
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (event) {
      const parsed = parseEventClosureComment(event.description)
      setComment(parsed.closureComment || '')
    } else {
      setComment('')
    }
  }, [event, isOpen])

  if (!event) return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirmClosure(event, comment.trim())
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Clôture d'événement</span>
          </div>
          <DialogTitle className="text-base text-slate-900 leading-snug">
            Clôturer : <span className="text-emerald-700 font-semibold">{event.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          <p className="text-xs text-slate-600">
            L'événement ne remontera plus dans les alertes actives. Vous pouvez préciser ci-dessous la note de résolution ou la raison de la clôture (celle-ci apparaîtra dans les rapports d'activité).
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="closure-comment" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <MessageSquareText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Commentaire de résolution / clôture (optionnel)</span>
            </Label>
            <textarea
              id="closure-comment"
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Ex: Intervention fibre finalisée avec succès par SFR. Débit mesuré à 950 Mbps."
              className="w-full rounded-md border border-emerald-200 bg-emerald-50/20 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Raccourcis rapides */}
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Suggestions rapides :
            </span>
            <div className="flex flex-wrap gap-1">
              {PRESET_COMMENTS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setComment(preset)}
                  className="text-[10px] px-2 py-0.5 rounded bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="text-xs h-9 cursor-pointer"
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 cursor-pointer font-semibold shadow-xs"
          >
            {loading ? "Enregistrement..." : "Confirmer la clôture"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
