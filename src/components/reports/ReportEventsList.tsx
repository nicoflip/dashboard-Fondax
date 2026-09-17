'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, MessageSquareText } from 'lucide-react'
import { CalendarEvent, Project } from '@/lib/types'
import { formatDate, EVENT_TYPE_LABELS } from '@/lib/utils'
import { parseEventClosureComment } from '@/lib/closure-comments'

interface ReportEventsListProps {
  closedEventsInPeriod: CalendarEvent[]
  getProjectForEvent: (event: CalendarEvent) => Project | undefined
}

export function ReportEventsList({ closedEventsInPeriod, getProjectForEvent }: ReportEventsListProps) {
  return (
    <section className="space-y-4 print-break-inside-avoid">
      <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
        <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
          2
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Événements & Jalons clos sur la période
          </h2>
          <p className="text-xs text-slate-500">
            Interventions, réunions et échéances finalisées ou réglées avec leur motif de clôture ({closedEventsInPeriod.length} événement{closedEventsInPeriod.length > 1 ? 's' : ''})
          </p>
        </div>
      </div>

      {closedEventsInPeriod.length === 0 ? (
        <Card className="bg-slate-50/50 border-dashed border-slate-300">
          <CardContent className="p-6 text-center text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
            <p className="font-semibold text-xs text-slate-700">Aucun événement clos sur cette période</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {closedEventsInPeriod.map(ev => {
            const project = getProjectForEvent(ev)
            const closure = parseEventClosureComment(ev.description)
            const eventDate = formatDate(ev.event_date)

            return (
              <div
                key={ev.id}
                className="bg-white rounded-xl border border-emerald-200 p-3.5 shadow-2xs space-y-2 border-l-4 border-l-emerald-600 print-break-inside-avoid"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 font-bold">
                        ✓ Clos
                      </Badge>
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 border-slate-200 capitalize">
                        {EVENT_TYPE_LABELS[ev.event_type] || ev.event_type}
                      </Badge>
                      {project && (
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                          Chantier #{project.priority_order}
                        </Badge>
                      )}
                      <span className="text-[11px] text-slate-500 font-medium">
                        {eventDate}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 truncate">
                      {ev.title}
                    </h4>
                  </div>
                </div>

                {closure.cleanDesc && (
                  <p className="text-[11px] text-slate-500 line-clamp-2">
                    {closure.cleanDesc}
                  </p>
                )}

                {/* Motif de clôture & résolution */}
                {closure.closureComment ? (
                  <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-950 text-xs">
                    <div className="font-semibold text-emerald-800 flex items-center gap-1 mb-0.5 text-[11px]">
                      <MessageSquareText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Motif de clôture & Résolution :</span>
                    </div>
                    <p className="text-[11px] text-emerald-900 whitespace-pre-wrap">
                      {closure.closureComment}
                    </p>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 italic">
                    Clôturé sans commentaire spécifique.
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
