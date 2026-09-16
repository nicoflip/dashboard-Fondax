'use client'

import React, { useState, useMemo } from 'react'
import { Task, TaskCategory } from '@/lib/types'
import { 
  TASK_CATEGORIES, 
  TASK_CATEGORY_COLORS, 
  STATUS_COLORS 
} from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  CheckSquare, 
  Search, 
  X, 
  ChevronRight, 
  Flame, 
  AlertCircle, 
  Check, 
  Clock, 
  Filter
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskSelectorProps {
  tasks: Task[]
  value?: string | null // taskId
  onChange: (taskId: string | null) => void
  disabled?: boolean
  disabledMessage?: string
  label?: string
  placeholder?: string
  className?: string
}

export function TaskSelector({
  tasks,
  value,
  onChange,
  disabled = false,
  disabledMessage,
  label = 'Tâche IT liée',
  placeholder = 'Sélectionner une tâche...',
  className
}: TaskSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')

  const selectedTask = useMemo(() => {
    if (!value) return null
    return tasks.find(t => t.id === value) || null
  }, [tasks, value])

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks.filter(t => {
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false
      if (!q) return true
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      )
    })
  }, [tasks, search, categoryFilter])

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'haute':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
            <Flame className="w-3 h-3 text-red-600 fill-red-600" />
            Haute
          </span>
        )
      case 'moyenne':
        return (
          <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Moyenne
          </span>
        )
      default:
        return (
          <span className="text-[10px] font-normal text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
            Basse
          </span>
        )
    }
  }

  if (disabled) {
    return (
      <div className={cn("space-y-1 opacity-60 cursor-not-allowed", className)}>
        {label && <label className="text-xs font-semibold text-slate-500">{label}</label>}
        <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-100 text-xs text-slate-500 italic flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-slate-400 shrink-0" />
          <span>{disabledMessage || "Sélection désactivée"}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-1.5 text-xs", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="font-semibold text-slate-700 flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
            {label}
          </label>
          {selectedTask && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="text-[11px] text-slate-400 hover:text-red-600 font-medium cursor-pointer transition-colors"
            >
              Délier la tâche
            </button>
          )}
        </div>
      )}

      {/* État 1 : Tâche sélectionnée affichée en carte élégante */}
      {selectedTask && !isOpen ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-2.5 space-y-1.5 transition-all shadow-2xs hover:border-blue-300">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge className={cn("text-[10px] py-0", TASK_CATEGORY_COLORS[selectedTask.category] || 'bg-slate-100 text-slate-700')}>
                {selectedTask.category}
              </Badge>
              {getPriorityBadge(selectedTask.priority)}
              <span className={cn("text-[10px] px-1.5 py-0.2 rounded border font-medium", STATUS_COLORS[selectedTask.status])}>
                {selectedTask.status}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="text-[11px] text-blue-700 hover:text-blue-900 font-semibold px-2 py-0.5 rounded hover:bg-blue-100/70 transition-colors cursor-pointer shrink-0"
            >
              Changer
            </button>
          </div>
          <p className="font-bold text-slate-900 text-xs sm:text-sm truncate">
            {selectedTask.title}
          </p>
          {selectedTask.description && (
            <p className="text-[11px] text-slate-500 line-clamp-1">
              {selectedTask.description.replace(/\[(?:blocker|depends_on|waiting|attente)[^\]]*\]/gi, '').trim()}
            </p>
          )}
        </div>
      ) : null}

      {/* État 2 : Bouton pour ouvrir si aucune tâche sélectionnée */}
      {!selectedTask && !isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full text-left p-2.5 rounded-lg border border-dashed border-slate-300 bg-white hover:bg-blue-50/50 hover:border-blue-400 text-slate-600 transition-all flex items-center justify-between cursor-pointer group shadow-2xs"
        >
          <span className="flex items-center gap-2 text-xs font-medium text-slate-500 group-hover:text-blue-700">
            <CheckSquare className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
            {placeholder}
          </span>
          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded group-hover:bg-blue-600 group-hover:text-white transition-colors">
            Parcourir les tâches
          </span>
        </button>
      ) : null}

      {/* État 3 : Panneau de recherche et sélection déplié */}
      {isOpen && (
        <div className="rounded-xl border border-blue-300 bg-white p-3 space-y-2.5 shadow-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Search className="w-3.5 h-3.5 text-blue-600" />
              Sélectionner une tâche parmi {tasks.length}
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
              placeholder="Rechercher par titre ou mot-clé..."
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

          {/* Filtres de catégorie */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setCategoryFilter('ALL')}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors shrink-0 cursor-pointer",
                categoryFilter === 'ALL'
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Toutes ({tasks.length})
            </button>
            {TASK_CATEGORIES.map(cat => {
              const count = tasks.filter(t => t.category === cat).length
              if (count === 0) return null
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors shrink-0 cursor-pointer",
                    categoryFilter === cat
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {cat} ({count})
                </button>
              )
            })}
          </div>

          {/* Liste déroulante des cartes de tâches */}
          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Aucune tâche trouvée avec ces critères.
              </div>
            ) : (
              filteredTasks.map(task => {
                const isSelected = value === task.id
                return (
                  <div
                    key={task.id}
                    onClick={() => {
                      onChange(task.id)
                      setIsOpen(false)
                    }}
                    className={cn(
                      "p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between gap-2",
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-2xs ring-1 ring-blue-500"
                        : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                    )}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge className={cn("text-[9px] py-0", TASK_CATEGORY_COLORS[task.category] || 'bg-slate-100 text-slate-700')}>
                          {task.category}
                        </Badge>
                        {getPriorityBadge(task.priority)}
                        <span className={cn("text-[9px] px-1 py-0.2 rounded border", STATUS_COLORS[task.status])}>
                          {task.status}
                        </span>
                      </div>
                      <p className="font-semibold text-slate-900 text-xs truncate">
                        {task.title}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <div className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                        isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
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
            {selectedTask && (
              <button
                type="button"
                onClick={() => {
                  onChange(null)
                  setIsOpen(false)
                }}
                className="text-red-600 hover:underline cursor-pointer"
              >
                Délier la tâche
              </button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="ml-auto h-7 text-xs cursor-pointer"
            >
              Fermer
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
