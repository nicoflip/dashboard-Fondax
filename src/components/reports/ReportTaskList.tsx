'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock } from 'lucide-react'
import { Task, Project } from '@/lib/types'
import { cn, formatDate, PRIORITY_COLORS, TASK_CATEGORIES, TASK_CATEGORY_COLORS } from '@/lib/utils'

interface ReportTaskListProps {
  completedTasksInPeriod: Task[]
  startDisplay: string
  endDisplay: string
  selectedCategory: string
  setSelectedCategory: (cat: string) => void
  categoryCounts: Record<string, number>
  getProjectForTask: (task: Task) => Project | undefined
  formatTaskDesc: (desc: string | null) => string | null
}

export function ReportTaskList({
  completedTasksInPeriod,
  startDisplay,
  endDisplay,
  selectedCategory,
  setSelectedCategory,
  categoryCounts,
  getProjectForTask,
  formatTaskDesc
}: ReportTaskListProps) {
  return (
    <section className="space-y-4 print-break-inside-avoid">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-green-600 text-white flex items-center justify-center font-bold text-sm">
            1
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Tâches accomplies sur la période
            </h2>
            <p className="text-xs text-slate-500">
              Du {startDisplay} au {endDisplay} ({completedTasksInPeriod.length} tâche{completedTasksInPeriod.length > 1 ? 's' : ''})
            </p>
          </div>
        </div>

        {/* Interactive Category Filter Pills (Screen only) */}
        <div className="flex flex-wrap items-center gap-1.5 print:hidden">
          <button
            type="button"
            onClick={() => setSelectedCategory('TOUS')}
            className={cn(
              "px-2 py-0.5 text-xs rounded-md font-medium cursor-pointer transition-colors",
              selectedCategory === 'TOUS' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Toutes ({completedTasksInPeriod.length})
          </button>
          {TASK_CATEGORIES.map(cat => {
            const count = categoryCounts[cat] || 0
            if (count === 0) return null
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-2 py-0.5 text-xs rounded-md font-medium cursor-pointer transition-colors",
                  selectedCategory === cat ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {cat} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Tasks List */}
      {completedTasksInPeriod.length === 0 ? (
        <Card className="bg-slate-50/50 border-dashed border-slate-300">
          <CardContent className="p-8 text-center text-slate-500">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Aucune tâche accomplie sur cette période</p>
            <p className="text-xs mt-1 text-slate-400">
              Élargissez l'intervalle de dates ou sélectionnez "Tout l'historique" pour visualiser les actions précédentes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {completedTasksInPeriod.map(task => {
            const project = getProjectForTask(task)
            const cleanDesc = formatTaskDesc(task.description)
            const completionDate = formatDate(task.updated_at || task.created_at)

            return (
              <div
                key={task.id}
                className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="mt-0.5 shrink-0 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-slate-900">
                        {task.title}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px] py-0 px-2", PRIORITY_COLORS[task.priority])}>
                        {task.priority}
                      </Badge>
                      <Badge variant="outline" className={cn("text-[10px] py-0 px-2 font-medium", TASK_CATEGORY_COLORS[task.category] || "bg-slate-100 text-slate-700")}>
                        {task.category}
                      </Badge>
                      {project && (
                        <Badge variant="outline" className="text-[10px] py-0 px-2 bg-blue-50 text-blue-700 border-blue-200">
                          Chantier #{project.priority_order}
                        </Badge>
                      )}
                    </div>

                    {cleanDesc && (
                      <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                        {cleanDesc}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-center shrink-0 text-xs text-slate-500 font-medium pl-8 sm:pl-0">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Terminée le {completionDate}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
