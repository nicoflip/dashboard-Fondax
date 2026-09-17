import React from 'react'
import { Sparkles } from 'lucide-react'

interface ProjectProgressBarProps {
  completedCount: number
  totalCount: number
  progressPercent: number
}

export function ProjectProgressBar({ completedCount, totalCount, progressPercent }: ProjectProgressBarProps) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
      <div className="flex justify-between items-center mb-2.5">
        <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          Progression globale des chantiers
        </span>
        <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-full">
          {completedCount} / {totalCount} terminés ({progressPercent}%)
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/60">
        <div 
          className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}
