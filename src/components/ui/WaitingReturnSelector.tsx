'use client'

import React, { useState, useMemo } from 'react'
import { WaitingReturn } from '@/lib/types'
import { getWaitingReturnMetrics } from '@/lib/waiting-returns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Hourglass, 
  Search, 
  X, 
  Check, 
  User, 
  Calendar, 
  Plus, 
  Building2,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WaitingReturnSelectorProps {
  waitingReturns: WaitingReturn[]
  value?: string | null // returnId
  onChange: (returnId: string | null) => void
  disabled?: boolean
  label?: string
  placeholder?: string
  onCreateNew?: () => void
  className?: string
}

export function WaitingReturnSelector({
  waitingReturns,
  value,
  onChange,
  disabled = false,
  label = 'Retour attendu bloquant',
  placeholder = 'Sélectionner un retour que vous attendez...',
  onCreateNew,
  className
}: WaitingReturnSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'en attente' | 'reçu'>('ALL')

  const selectedReturn = useMemo(() => {
    if (!value) return null
    return waitingReturns.find(r => r.id === value) || null
  }, [waitingReturns, value])

  const filteredReturns = useMemo(() => {
    const q = search.trim().toLowerCase()
    return waitingReturns.filter(r => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false
      if (!q) return true
      return (
        r.title.toLowerCase().includes(q) ||
        r.waiting_on.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      )
    })
  }, [waitingReturns, search, statusFilter])

  if (disabled) {
    return null
  }

  return (
    <div className={cn("space-y-1.5 text-xs", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Hourglass className="w-3.5 h-3.5 text-amber-600" />
            {label}
          </label>
          <div className="flex items-center gap-2">
            {onCreateNew && (
              <button
                type="button"
                onClick={onCreateNew}
                className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Nouveau retour
              </button>
            )}
            {selectedReturn && (
              <button
                type="button"
                onClick={() => onChange(null)}
                className="text-[11px] text-slate-400 hover:text-red-600 font-medium cursor-pointer transition-colors"
              >
                Délier
              </button>
            )}
          </div>
        </div>
      )}

      {/* État 1 : Retour sélectionné affiché en carte élégante */}
      {selectedReturn && !isOpen ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-2.5 space-y-1.5 transition-all shadow-2xs hover:border-amber-400">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge className="bg-amber-200 text-amber-950 font-semibold text-[10px] py-0">
                {selectedReturn.target_type || 'Prestataire'}
              </Badge>
              <span className="text-[11px] text-slate-700 font-medium flex items-center gap-1">
                <User className="w-3 h-3 text-amber-700" />
                {selectedReturn.waiting_on}
              </span>
              {selectedReturn.status === 'reçu' ? (
                <Badge className="bg-emerald-600 text-white text-[9px] py-0">
                  ✓ Reçu
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-700 border-amber-300 text-[9px] py-0">
                  En attente
                </Badge>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="text-[11px] text-amber-800 hover:text-amber-950 font-semibold px-2 py-0.5 rounded hover:bg-amber-100/70 transition-colors cursor-pointer shrink-0"
            >
              Changer
            </button>
          </div>
          <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">
            {selectedReturn.title}
          </p>
          {selectedReturn.follow_up_date && (
            <div className="flex items-center gap-1 text-[11px] text-amber-900">
              <Calendar className="w-3 h-3 text-amber-600" />
              <span>Relance prévue le {selectedReturn.follow_up_date}</span>
            </div>
          )}
        </div>
      ) : null}

      {/* État 2 : Bouton pour ouvrir si aucun retour sélectionné */}
      {!selectedReturn && !isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full text-left p-2.5 rounded-lg border border-dashed border-slate-300 bg-white hover:bg-amber-50/50 hover:border-amber-400 text-slate-600 transition-all flex items-center justify-between cursor-pointer group shadow-2xs"
        >
          <span className="flex items-center gap-2 text-xs font-medium text-slate-500 group-hover:text-amber-800">
            <Hourglass className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
            {placeholder}
          </span>
          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded group-hover:bg-amber-600 group-hover:text-white transition-colors">
            Choisir un retour
          </span>
        </button>
      ) : null}

      {/* État 3 : Panneau de recherche et sélection déplié */}
      {isOpen && (
        <div className="rounded-xl border border-amber-300 bg-white p-3 space-y-2.5 shadow-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Hourglass className="w-3.5 h-3.5 text-amber-600" />
              Retours en attente disponibles ({waitingReturns.length})
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Recherche */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par objet ou interlocuteur..."
              className="h-8 pl-8 text-xs bg-slate-50 focus:bg-white"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtres d'état */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer",
                statusFilter === 'ALL'
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Tous ({waitingReturns.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('en attente')}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer",
                statusFilter === 'en attente'
                  ? "bg-amber-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              En attente ({waitingReturns.filter(r => r.status === 'en attente').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('reçu')}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors cursor-pointer",
                statusFilter === 'reçu'
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Reçus ({waitingReturns.filter(r => r.status === 'reçu').length})
            </button>
          </div>

          {/* Liste déroulante des retours */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {filteredReturns.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Aucun retour trouvé.
                {onCreateNew && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        onCreateNew()
                      }}
                      className="text-xs text-amber-700 font-bold underline cursor-pointer"
                    >
                      + Créer ce retour maintenant
                    </button>
                  </div>
                )}
              </div>
            ) : (
              filteredReturns.map(r => {
                const isSelected = value === r.id
                const metrics = getWaitingReturnMetrics(r)
                return (
                  <div
                    key={r.id}
                    onClick={() => {
                      onChange(r.id)
                      setIsOpen(false)
                    }}
                    className={cn(
                      "p-2.5 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between gap-2",
                      isSelected
                        ? "border-amber-500 bg-amber-50 shadow-2xs ring-1 ring-amber-500"
                        : "border-slate-200 hover:border-amber-300 hover:bg-slate-50"
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className="bg-amber-100 text-amber-900 border-amber-200 text-[9px] py-0">
                          {r.target_type || 'Prestataire'}
                        </Badge>
                        <span className="text-[11px] font-medium text-slate-700 flex items-center gap-1">
                          <User className="w-3 h-3 text-amber-600" />
                          {r.waiting_on}
                        </span>
                        {r.status === 'reçu' ? (
                          <Badge className="bg-emerald-600 text-white text-[9px] py-0">
                            ✓ Reçu
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            Depuis {metrics.daysWaiting}j
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-900 text-xs truncate">
                        {r.title}
                      </p>
                      {metrics.formattedFollowUpDate && (
                        <p className="text-[10px] text-amber-800 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Relance : {metrics.formattedFollowUpDate}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0">
                      <div className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                        isSelected ? "bg-amber-600 border-amber-600 text-white" : "border-slate-300 bg-white"
                      )}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Pied du sélecteur */}
          <div className="pt-1 flex items-center justify-between border-t border-slate-100 text-[11px]">
            {onCreateNew ? (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false)
                  onCreateNew()
                }}
                className="text-amber-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                Nouveau retour
              </button>
            ) : <div />}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-7 text-xs cursor-pointer"
            >
              Fermer
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
