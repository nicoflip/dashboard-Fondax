'use client'

import React from 'react'
import { 
  cn, 
  TASK_CATEGORIES, 
  TASK_STATUSES, 
  TASK_PRIORITIES,
  TASK_CATEGORY_THEMES 
} from '@/lib/utils'
import { Flame, Hourglass, FolderKanban, Layers, X, CheckCircle2, Thermometer } from 'lucide-react'
import { Project } from '@/lib/types'

export type ChantierFilterMode = 'all' | 'with_chantier' | 'without_chantier'

interface TaskFiltersProps {
  counts: {
    surchauffe?: number
    urgentes?: number
    aTraiter: number
    enAttente: number
    waitingDueCount?: number
    terminees: number
    toutes: number
    withChantier: number
    withoutChantier: number
  }
  categoryCounts?: Record<string, number>
  priorityCounts?: Record<string, number>
  filterCat: string
  onFilterCatChange: (cat: string) => void
  filterStatus?: string
  onFilterStatusChange?: (status: string) => void
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
  counts,
  categoryCounts,
  priorityCounts,
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
        <div className="flex items-center gap-1.5 flex-wrap">
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
                (filterChantierMode === 'with_chantier' && filterProject === 'all')
                  ? "bg-amber-600 text-white ring-2 ring-amber-400 ring-offset-1 shadow-2xs"
                  : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
              )}
            >
              <FolderKanban className="w-3.5 h-3.5 text-amber-700" />
              <span>Liées à des chantiers IT</span>
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                (filterChantierMode === 'with_chantier' && filterProject === 'all')
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

            {projects.length > 0 && (
              <select
                aria-label="Sélectionner un chantier spécifique"
                value={filterProject}
                onChange={(e) => {
                  const val = e.target.value
                  onFilterProjectChange(val)
                  if (val !== 'all') onFilterChantierModeChange('with_chantier')
                }}
                className={cn(
                  "h-8 rounded-lg border px-2 text-xs font-semibold cursor-pointer shadow-2xs transition-colors ml-1",
                  filterProject !== 'all'
                    ? "bg-amber-100 text-amber-950 border-amber-300 ring-2 ring-amber-400/50"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                )}
              >
                <option value="all">🎯 Chantier spécifique...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    #{p.priority_order} : {p.name}
                  </option>
                ))}
              </select>
            )}
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

      {/* Barre visuelle des Priorités & Statut */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Flame className="w-3.5 h-3.5 text-red-600" />
            Priorité & État :
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Toutes les priorités */}
            <button
              type="button"
              onClick={() => onFilterPriorityChange('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs flex items-center gap-1.5",
                filterPriority === 'all'
                  ? "bg-slate-900 text-white border-slate-900 ring-2 ring-slate-400/50 scale-102"
                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
              )}
            >
              <span>Toutes</span>
              {counts.toutes !== undefined && (
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                  filterPriority === 'all' ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-700"
                )}>
                  {counts.toutes}
                </span>
              )}
            </button>

            {/* En surchauffe (≥ 70%) */}
            <button
              type="button"
              onClick={() => onFilterPriorityChange(filterPriority === 'surchauffe' ? 'all' : 'surchauffe')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs flex items-center gap-1.5",
                filterPriority === 'surchauffe'
                  ? "bg-red-600 text-white border-red-700 ring-2 ring-red-400/50 scale-105 shadow-xs"
                  : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 hover:scale-102"
              )}
            >
              <Flame className={cn("w-3.5 h-3.5 shrink-0", filterPriority === 'surchauffe' ? "fill-amber-300 text-amber-300 animate-pulse" : "fill-red-400 text-red-500")} />
              <span>En surchauffe (≥ 70%)</span>
              {counts.surchauffe !== undefined && (
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                  filterPriority === 'surchauffe' ? "bg-red-800 text-white" : "bg-red-200 text-red-900"
                )}>
                  {counts.surchauffe}
                </span>
              )}
            </button>

            {/* Express (3j) / Haute */}
            <button
              type="button"
              onClick={() => onFilterPriorityChange(filterPriority === 'haute' ? 'all' : 'haute')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs flex items-center gap-1.5",
                filterPriority === 'haute'
                  ? "bg-rose-700 text-white border-rose-800 ring-2 ring-rose-400/50 scale-105 shadow-xs"
                  : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 hover:scale-102"
              )}
              title="Rythme express : ébullition en 3 jours"
            >
              <span>⚡</span>
              <span>Express (3j)</span>
              {priorityCounts?.haute !== undefined && (
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                  filterPriority === 'haute' ? "bg-rose-900 text-white" : "bg-rose-200 text-rose-900"
                )}>
                  {priorityCounts.haute}
                </span>
              )}
            </button>

            {/* Standard (10j) / Moyenne */}
            <button
              type="button"
              onClick={() => onFilterPriorityChange(filterPriority === 'moyenne' ? 'all' : 'moyenne')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs flex items-center gap-1.5",
                filterPriority === 'moyenne'
                  ? "bg-amber-600 text-white border-amber-700 ring-2 ring-amber-400/50 scale-105 shadow-xs"
                  : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 hover:scale-102"
              )}
              title="Rythme standard : ébullition en 10 jours"
            >
              <span>Standard (10j)</span>
              {priorityCounts?.moyenne !== undefined && (
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                  filterPriority === 'moyenne' ? "bg-amber-800 text-white" : "bg-amber-200 text-amber-900"
                )}>
                  {priorityCounts.moyenne}
                </span>
              )}
            </button>

            {/* Fond (30j) / Basse */}
            <button
              type="button"
              onClick={() => onFilterPriorityChange(filterPriority === 'basse' ? 'all' : 'basse')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs flex items-center gap-1.5",
                filterPriority === 'basse'
                  ? "bg-blue-600 text-white border-blue-700 ring-2 ring-blue-400/50 scale-105 shadow-xs"
                  : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100 hover:scale-102"
              )}
              title="Rythme tâche de fond : ébullition en 30 jours"
            >
              <span>🌱</span>
              <span>Fond (30j)</span>
              {priorityCounts?.basse !== undefined && (
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                  filterPriority === 'basse' ? "bg-blue-800 text-white" : "bg-blue-200 text-blue-900"
                )}>
                  {priorityCounts.basse}
                </span>
              )}
            </button>

            {/* En attente retour */}
            <button
              type="button"
              onClick={() => onFilterPriorityChange(filterPriority === 'en-attente' ? 'all' : 'en-attente')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs flex items-center gap-1.5",
                filterPriority === 'en-attente'
                  ? "bg-amber-600 text-white border-amber-700 ring-2 ring-amber-400/50 scale-105 shadow-xs"
                  : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 hover:scale-102"
              )}
            >
              <Hourglass className="w-3.5 h-3.5 shrink-0" />
              <span>En attente retour</span>
              {counts.enAttente !== undefined && (
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                  filterPriority === 'en-attente' ? "bg-amber-950 text-amber-200" : "bg-amber-200 text-amber-900"
                )}>
                  {counts.enAttente}
                </span>
              )}
              {counts.waitingDueCount !== undefined && counts.waitingDueCount > 0 && (
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                  filterPriority === 'en-attente' ? "bg-red-800 text-white" : "bg-red-600 text-white animate-pulse"
                )}>
                  {counts.waitingDueCount} à relancer
                </span>
              )}
            </button>

            {/* Terminées */}
            <button
              type="button"
              onClick={() => onFilterPriorityChange(filterPriority === 'terminees' ? 'all' : 'terminees')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-2xs flex items-center gap-1.5",
                filterPriority === 'terminees'
                  ? "bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-400/50 scale-105 shadow-xs"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:scale-102"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Terminées</span>
              {counts.terminees !== undefined && (
                <span className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                  filterPriority === 'terminees' ? "bg-emerald-800 text-white" : "bg-emerald-200 text-emerald-800"
                )}>
                  {counts.terminees}
                </span>
              )}
            </button>
          </div>
        </div>

        {filterPriority !== 'all' && (
          <button
            type="button"
            onClick={() => onFilterPriorityChange('all')}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
          >
            <X className="w-3.5 h-3.5" /> Voir toutes les tâches
          </button>
        )}
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
      </div>
    </div>
  )
}
