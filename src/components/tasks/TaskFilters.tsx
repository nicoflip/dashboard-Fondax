'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { 
  cn, 
  TASK_CATEGORIES, 
  TASK_STATUSES, 
  TASK_PRIORITIES 
} from '@/lib/utils'
import { Flame, Hourglass } from 'lucide-react'

export type TaskTab = 'urgentes' | 'a-traiter' | 'en-attente' | 'terminees' | 'toutes'

interface TaskFiltersProps {
  activeTab: TaskTab
  onTabChange: (tab: TaskTab) => void
  counts: {
    urgentes: number
    aTraiter: number
    enAttente: number
    terminees: number
    toutes: number
  }
  filterCat: string
  onFilterCatChange: (cat: string) => void
  filterStatus: string
  onFilterStatusChange: (status: string) => void
  filterPriority: string
  onFilterPriorityChange: (prio: string) => void
  hideBlocked: boolean
  onToggleHideBlocked: () => void
  blockedCount: number
  totalDisplayed: number
}

export function TaskFilters({
  activeTab,
  onTabChange,
  counts,
  filterCat,
  onFilterCatChange,
  filterStatus,
  onFilterStatusChange,
  filterPriority,
  onFilterPriorityChange,
  hideBlocked,
  onToggleHideBlocked,
  blockedCount,
  totalDisplayed
}: TaskFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Onglets de filtrage rapide */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {/* Onglet URGENTES en premier et mis en valeur */}
        <button 
          type="button"
          onClick={() => onTabChange('urgentes')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer", 
            activeTab === 'urgentes' 
              ? "bg-red-600 text-white ring-2 ring-red-400 ring-offset-1" 
              : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
          )}
        >
          <Flame className={cn("w-4 h-4 shrink-0", activeTab === 'urgentes' ? "fill-amber-300 text-amber-300 animate-pulse" : "text-red-500 fill-red-400")} />
          <span>Urgentes (Priorité haute)</span>
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-black", activeTab === 'urgentes' ? "bg-red-800 text-white" : "bg-red-200 text-red-900")}>
            {counts.urgentes}
          </span>
        </button>

        <button 
          type="button"
          onClick={() => onTabChange('a-traiter')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer", 
            activeTab === 'a-traiter' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          À traiter <span className="ml-1 opacity-70">({counts.aTraiter})</span>
        </button>

        <button 
          type="button"
          onClick={() => onTabChange('en-attente')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer", 
            activeTab === 'en-attente' ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
          )}
        >
          <Hourglass className="w-4 h-4" />
          En attente retour externe <span className="opacity-70">({counts.enAttente})</span>
        </button>

        <button 
          type="button"
          onClick={() => onTabChange('terminees')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer", 
            activeTab === 'terminees' ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          )}
        >
          Terminées <span className="ml-1 opacity-70">({counts.terminees})</span>
        </button>

        <button 
          type="button"
          onClick={() => onTabChange('toutes')}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer", 
            activeTab === 'toutes' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          Toutes <span className="ml-1 opacity-70">({counts.toutes})</span>
        </button>
      </div>

      {/* Menus déroulants de filtrage */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center rounded-lg border bg-slate-50 p-4">
        <div className="flex-1 space-y-1">
          <Label htmlFor="cat-filter">Catégorie</Label>
          <div className="relative">
            <select
              id="cat-filter"
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              value={filterCat}
              onChange={(e) => onFilterCatChange(e.target.value)}
            >
              <option value="all">Toutes</option>
              {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 space-y-1">
          <Label htmlFor="status-filter">Statut (Filtre additionnel)</Label>
          <div className="relative">
            <select
              id="status-filter"
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              value={filterStatus}
              onChange={(e) => onFilterStatusChange(e.target.value)}
            >
              <option value="all">Tous</option>
              {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 space-y-1">
          <Label htmlFor="prio-filter">Priorité</Label>
          <div className="relative">
            <select
              id="prio-filter"
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              value={filterPriority}
              onChange={(e) => onFilterPriorityChange(e.target.value)}
            >
              <option value="all">Toutes</option>
              {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Barre d'état et masquage des tâches bloquées */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <div className="flex items-center gap-3">
          <span>{totalDisplayed} tâche(s) affichée(s)</span>
          {blockedCount > 0 && (
            <button
              type="button"
              onClick={onToggleHideBlocked}
              className={cn(
                "text-xs px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 cursor-pointer",
                hideBlocked 
                  ? "bg-amber-100 text-amber-800 border-amber-300 font-semibold" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              )}
            >
              <Hourglass className="w-3 h-3 text-amber-600" />
              <span>
                {hideBlocked 
                  ? `Afficher les tâches bloquées (${blockedCount})` 
                  : `Masquer les tâches bloquées (${blockedCount})`}
              </span>
            </button>
          )}
        </div>
        {activeTab === 'urgentes' && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
            <Flame className="w-3.5 h-3.5 fill-red-500 text-red-600" />
            Mode Urgences activé
          </div>
        )}
      </div>
    </div>
  )
}
