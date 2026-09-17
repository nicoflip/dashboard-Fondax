'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Calendar, AlertCircle } from 'lucide-react'
import { Project, Task, CalendarEvent } from '@/lib/types'
import { cn, formatDate, PROJECT_STATUS_COLORS } from '@/lib/utils'

interface ChantierReport {
  project: Project
  totalTasks: number
  doneTasks: number
  progressPercent: number
  tasksCompletedInPeriod: Task[]
  projectEventsInPeriod: CalendarEvent[]
}

interface ReportProjectsListProps {
  chantiersReport: ChantierReport[]
  startDisplay: string
  endDisplay: string
}

export function ReportProjectsList({
  chantiersReport,
  startDisplay,
  endDisplay
}: ReportProjectsListProps) {
  return (
    <section className="space-y-4 print-break-inside-avoid">
      <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
        <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
          3
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Avancement des chantiers & Projets
          </h2>
          <p className="text-xs text-slate-500">
            État d'avancement global et jalons réalisés pour les 6 chantiers prioritaires
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {chantiersReport.map(({ project, totalTasks, doneTasks, progressPercent, tasksCompletedInPeriod, projectEventsInPeriod }) => {
          const isActive = project.status === 'EN COURS'

          return (
            <Card 
              key={project.id} 
              className={cn(
                "border transition-all print-break-inside-avoid",
                isActive ? "border-blue-400 shadow-xs ring-1 ring-blue-100" : "border-slate-200"
              )}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs shrink-0">
                      {project.priority_order}
                    </span>
                    <CardTitle className="text-base font-bold text-slate-900">
                      {project.name}
                    </CardTitle>
                  </div>
                  <Badge className={cn("text-[10px] shrink-0", PROJECT_STATUS_COLORS[project.status])}>
                    {project.status}
                  </Badge>
                </div>
                {project.description && (
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CardContent className="p-4 pt-2 space-y-3">
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Avancement global</span>
                    <span className="font-bold text-slate-900">
                      {progressPercent}% ({doneTasks}/{totalTasks} tâche{totalTasks > 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        progressPercent === 100 ? "bg-green-500" : (progressPercent > 0 ? "bg-blue-600" : "bg-slate-300")
                      )} 
                      style={{ width: `${progressPercent}%` }} 
                    />
                  </div>
                </div>

                {/* Tasks completed in the period */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>Actions achevées sur la période :</span>
                    <span className="text-slate-500 font-normal">
                      {tasksCompletedInPeriod.length} achevée{tasksCompletedInPeriod.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {tasksCompletedInPeriod.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      Aucune tâche rattachée achevée entre le {startDisplay} et le {endDisplay}.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-xs text-slate-700">
                      {tasksCompletedInPeriod.map(t => (
                        <li key={t.id} className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                          <span className="line-clamp-1">{t.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Milestones / Events in the period */}
                {projectEventsInPeriod.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-700 mb-1">
                      Jalons & Événements période :
                    </div>
                    <ul className="space-y-1 text-xs text-slate-600">
                      {projectEventsInPeriod.map(e => (
                        <li key={e.id} className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                          <span>{formatDate(e.event_date)} : {e.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Blockers and notes */}
                {project.notes_blockers && (
                  <div className="pt-2 border-t border-slate-100">
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                      <div className="font-semibold flex items-center gap-1 mb-0.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Points d'attention & blocages :</span>
                      </div>
                      <p className="whitespace-pre-line text-amber-800">
                        {project.notes_blockers}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
