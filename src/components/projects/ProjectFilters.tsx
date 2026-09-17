import React from 'react'
import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'

interface ProjectFiltersProps {
  statusFilter: 'TOUS' | 'EN COURS' | 'À FAIRE' | 'TERMINÉ'
  setStatusFilter: (status: 'TOUS' | 'EN COURS' | 'À FAIRE' | 'TERMINÉ') => void
  totalCount: number
  inProgressCount: number
  todoCount: number
  completedCount: number
}

export function ProjectFilters({ statusFilter, setStatusFilter, totalCount, inProgressCount, todoCount, completedCount }: ProjectFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
      <button
        onClick={() => setStatusFilter('TOUS')}
        className={cn(
          "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer",
          statusFilter === 'TOUS' ? "bg-slate-900 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        )}
      >
        Tous les chantiers ({totalCount})
      </button>
      <button
        onClick={() => setStatusFilter('EN COURS')}
        className={cn(
          "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
          statusFilter === 'EN COURS' 
            ? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-300" 
            : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
        )}
      >
        <Clock className="w-3.5 h-3.5" />
        En cours ({inProgressCount})
      </button>
      <button
        onClick={() => setStatusFilter('À FAIRE')}
        className={cn(
          "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer",
          statusFilter === 'À FAIRE' ? "bg-slate-900 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
        )}
      >
        À faire ({todoCount})
      </button>
      <button
        onClick={() => setStatusFilter('TERMINÉ')}
        className={cn(
          "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer",
          statusFilter === 'TERMINÉ' ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        )}
      >
        Terminés ({completedCount})
      </button>
    </div>
  )
}
