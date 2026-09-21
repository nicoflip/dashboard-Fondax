'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { 
  cn, 
  TASK_CATEGORIES, 
  TASK_STATUSES, 
  TASK_PRIORITIES,
  TASK_CATEGORY_THEMES 
} from '@/lib/utils'
import { Flame, Hourglass, FolderKanban, Layers, X } from 'lucide-react'
import { Project } from '@/lib/types'

export type TaskTab = 'urgentes' | 'a-traiter' | 'en-attente' | 'terminees' | 'toutes'
export type ChantierFilterMode = 'all' | 'with_chantier' | 'without_chantier'

interface TaskFiltersProps {
  activeTab: TaskTab
  onTabChange: (tab: TaskTab) => void
  counts: {
    urgentes: number
    aTraiter: number
    enAttente: number
    waitingDueCount?: number
    terminees: number
    toutes: number
    withChantier: number
    withoutChantier: number
  }
  categoryCounts?: Record<string, number>
  filterCat: string
  onFilterCatChange: (cat: string) => void
  filterStatus: string
  onFilterStatusChange: (status: string) => void
  filterPriority: string
  onFilterPriorityChange: (prio: string) => void
  filterChantierMode: ChantierFilterMode
  onFilterChantierModeChange: (mode: ChantierFilterMode) => void
  filterProject: string
  onFilterProjectChange: (projectId: string) => void
  projects: Project[]
  hideBlocked: boolean
  onToggleHideBlocked: () => void
  blockedCount: number
  totalDisplayed: number
}

export function TaskFilters({
  activeTab,
  onTabChange,
  counts,
  categoryCounts,
  filterCat,
  onFilterCatChange,
  filterStatus,
  onFilterStatusChange,
  filterPriority,
  onFilterPriorityChange,
  filterChantierMode,
  onFilterChantierModeChange,
  filterProject,
  onFilterProjectChange,
  projects,
  hideBlocked,
  onToggleHideBlocked,
  blockedCount,
  totalDisplayed
}: TaskFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Onglets de filtrage rapide (Statut principal / urgences) */}
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
            "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-2xs", 
            activeTab === 'en-attente' 
              ? "bg-amber-600 text-white ring-2 ring-amber-400 ring-offset-1" 
              : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
          )}
        >
          <Hourglass className="w-4 h-4 shrink-0" />
          <span>En attente retour ({counts.enAttente})</span>
          {counts.waitingDueCount !== undefined && counts.waitingDueCount > 0 && (
            <span className={cn(
              "px-2 py-0.5 rounded-full text-xs font-black",
              activeTab === 'en-attente' ? "bg-amber-950 text-amber-200" : "bg-red-600 text-white animate-pulse"
            )}>
              {counts.waitingDueCount} à relancer
            </span>
          )}
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

      {/* Barre visuelle des Sujets / Catégories */}
      <div className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            Sujets / Thématiques :
          </span>
          {filterCat !== 'all' && (
            <button
              type="button"
              onClick={() => onFilterCatChange('all')}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
            >
              <X className="w-3.5 h-3.5" /> Voir tous les sujets
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onFilterCatChange('all')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs flex items-center gap-1.5",
              filterCat === 'all'
                ? "bg-slate-900 text-white border-slate-900 ring-2 ring-slate-400/50 scale-102"
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
            )}
          >
            <span>Tous les sujets</span>
            {counts.toutes !== undefined && (
              <span className={cn("px-1.5 py-0.2 rounded-full text-[10px] font-black", filterCat === 'all' ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-700")}>
                {counts.toutes}
              </span>
            )}
          </button>

          {TASK_CATEGORIES.map(cat => {
            const theme = TASK_CATEGORY_THEMES[cat]
            const count = categoryCounts ? (categoryCounts[cat] || 0) : undefined
            const isSelected = filterCat === cat
            const pillStyle = isSelected ? theme?.pillSelectedStyle : theme?.pillStyle
            const counterStyle = isSelected ? theme?.counterSelectedStyle : theme?.counterStyle

            return (
              <button
                key={cat}
                type="button"
                onClick={() => onFilterCatChange(isSelected ? 'all' : cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs flex items-center gap-1.5",
                  isSelected
                    ? "scale-105 shadow-xs ring-2 ring-offset-1"
                    : "hover:scale-102 hover:shadow-xs"
                )}
                style={pillStyle ? {
                  backgroundColor: pillStyle.backgroundColor,
                  borderColor: pillStyle.borderColor,
                  color: pillStyle.color,
                } : undefined}
              >
                <span>{theme?.emoji}</span>
                <span>{cat}</span>
                {count !== undefined && (
                  <span 
                    className="px-1.5 py-0.2 rounded-full text-[10px] font-black transition-colors"
                    style={counterStyle ? {
                      backgroundColor: counterStyle.backgroundColor,
                      color: counterStyle.color,
                    } : undefined}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Barre d'isolation rapide : Chantiers vs Tâches générales */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <FolderKanban className="w-3.5 h-3.5 text-amber-600" />
            Origine :
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                onFilterChantierModeChange('all')
                onFilterProjectChange('all')
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                filterChantierMode === 'all' && filterProject === 'all'
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Toutes les origines</span>
              <span className="text-[10px] opacity-75 font-mono">({counts.toutes})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onFilterChantierModeChange('with_chantier')
                onFilterProjectChange('all')
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                (filterChantierMode === 'with_chantier' || filterProject !== 'all')
                  ? "bg-amber-600 text-white ring-2 ring-amber-400 ring-offset-1 shadow-2xs"
                  : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
              )}
            >
              <FolderKanban className="w-3.5 h-3.5 text-amber-700" />
              <span>Liées à des chantiers IT</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                (filterChantierMode === 'with_chantier' || filterProject !== 'all')
                  ? "bg-amber-800 text-white"
                  : "bg-amber-200 text-amber-900"
              )}>
                {counts.withChantier}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onFilterChantierModeChange('without_chantier')
                onFilterProjectChange('all')
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                filterChantierMode === 'without_chantier'
                  ? "bg-sky-700 text-white ring-2 ring-sky-400 ring-offset-1 shadow-2xs"
                  : "bg-sky-50 text-sky-900 border border-sky-200 hover:bg-sky-100"
              )}
            >
              <span>📋 Tâches générales (Sans chantier)</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                filterChantierMode === 'without_chantier'
                  ? "bg-sky-900 text-white"
                  : "bg-sky-200 text-sky-900"
              )}>
                {counts.withoutChantier}
              </span>
            </button>
          </div>
        </div>

        {/* Indicateur contextuel de filtre actif avec bouton de réinitialisation rapide */}
        {filterProject !== 'all' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-950 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 flex items-center gap-1.5 shadow-2xs">
              <FolderKanban className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>
                Chantier : {projects.find(p => p.id === filterProject)?.name ? `#${projects.find(p => p.id === filterProject)?.priority_order} ${projects.find(p => p.id === filterProject)?.name}` : 'Chantier spécifique'}
              </span>
              <button
                type="button"
                onClick={() => {
                  onFilterProjectChange('all')
                  onFilterChantierModeChange('all')
                }}
                className="hover:text-red-700 hover:bg-amber-200/60 rounded p-0.5 ml-1 transition-colors cursor-pointer"
                title="Désactiver le filtre de chantier"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        ) : filterChantierMode === 'with_chantier' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-950 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 flex items-center gap-1.5 shadow-2xs">
              <FolderKanban className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Origine : Tous les chantiers IT</span>
              <button
                type="button"
                onClick={() => {
                  onFilterChantierModeChange('all')
                  onFilterProjectChange('all')
                }}
                className="hover:text-red-700 hover:bg-amber-200/60 rounded p-0.5 ml-1 transition-colors cursor-pointer"
                title="Réinitialiser vers toutes les origines"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        ) : filterChantierMode === 'without_chantier' ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-sky-950 bg-sky-100 px-2.5 py-1 rounded-md border border-sky-300 flex items-center gap-1.5 shadow-2xs">
              <span>📋 Origine : Tâches générales (Sans chantier)</span>
              <button
                type="button"
                onClick={() => {
                  onFilterChantierModeChange('all')
                  onFilterProjectChange('all')
                }}
                className="hover:text-red-700 hover:bg-sky-200/60 rounded p-0.5 ml-1 transition-colors cursor-pointer"
                title="Réinitialiser vers toutes les origines"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          </div>
        ) : null}
      </div>

      {/* Menus déroulants de filtrage avancés */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-xl border bg-slate-50 p-4 shadow-2xs">
        {/* Filtre Chantier spécifique */}
        <div className="space-y-1">
          <Label htmlFor="project-filter" className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <FolderKanban className="w-3 h-3 text-amber-600" />
            Chantier IT
          </Label>
          <div className="relative">
            <select
              id="project-filter"
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 font-medium"
              value={filterProject !== 'all' ? filterProject : (filterChantierMode === 'with_chantier' ? 'all_chantiers' : filterChantierMode === 'without_chantier' ? 'no_chantier' : 'all')}
              onChange={(e) => {
                const val = e.target.value
                if (val === 'all') {
                  onFilterChantierModeChange('all')
                  onFilterProjectChange('all')
                } else if (val === 'all_chantiers') {
                  onFilterChantierModeChange('with_chantier')
                  onFilterProjectChange('all')
                } else if (val === 'no_chantier') {
                  onFilterChantierModeChange('without_chantier')
                  onFilterProjectChange('all')
                } else {
                  onFilterChantierModeChange('all')
                  onFilterProjectChange(val)
                }
              }}
            >
              <option value="all">Tous (Chantiers + Générales)</option>
              <option value="all_chantiers">🏗️ Tous les chantiers ({counts.withChantier})</option>
              <option value="no_chantier">📋 Tâches générales sans chantier ({counts.withoutChantier})</option>
              {projects.length > 0 && (
                <optgroup label="── Chantiers spécifiques ──">
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      #{p.priority_order} : {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Filtre Catégorie */}
        <div className="space-y-1">
          <Label htmlFor="cat-filter" className="text-xs font-semibold text-slate-700">Catégorie</Label>
          <div className="relative">
            <select
              id="cat-filter"
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 font-medium"
              value={filterCat}
              onChange={(e) => onFilterCatChange(e.target.value)}
            >
              <option value="all">Toutes les catégories</option>
              {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Filtre Statut additionnel */}
        <div className="space-y-1">
          <Label htmlFor="status-filter" className="text-xs font-semibold text-slate-700">Statut (Filtre additionnel)</Label>
          <div className="relative">
            <select
              id="status-filter"
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 font-medium"
              value={filterStatus}
              onChange={(e) => onFilterStatusChange(e.target.value)}
            >
              <option value="all">Tous les statuts</option>
              {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Filtre Priorité */}
        <div className="space-y-1">
          <Label htmlFor="prio-filter" className="text-xs font-semibold text-slate-700">Priorité</Label>
          <div className="relative">
            <select
              id="prio-filter"
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 font-medium"
              value={filterPriority}
              onChange={(e) => onFilterPriorityChange(e.target.value)}
            >
              <option value="all">Toutes les priorités</option>
              {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Barre d'état et masquage des tâches bloquées */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <div className="flex items-center gap-3">
          <span className="font-medium text-slate-700">{totalDisplayed} tâche(s) affichée(s)</span>
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
