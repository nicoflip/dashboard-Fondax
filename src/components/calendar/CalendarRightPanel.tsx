'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Clock, ChevronRight } from 'lucide-react'
import { CalendarEvent } from '@/lib/types'
import { EVENT_TYPE_CONFIG } from './calendar-utils'
import { 
  formatDate, 
  formatEventDateTime,
  hasSpecificTime,
  extractTimeFromDate,
  cn 
} from '@/lib/utils'
import { parseFlexibleEvent } from '@/lib/flexible-events'
import { parseEventClosureComment } from '@/lib/closure-comments'

interface CalendarRightPanelProps {
  events: CalendarEvent[]
  selectedDayDate: string
  handleOpenAdd: (date?: string) => void
  handleOpenEdit: (event: CalendarEvent) => void
  todayYMD: string
}

export function CalendarRightPanel({
  events,
  selectedDayDate,
  handleOpenAdd,
  handleOpenEdit,
  todayYMD
}: CalendarRightPanelProps) {
  const eventsForSelectedDay = React.useMemo(() => {
    if (!selectedDayDate) return []
    return events.filter(e => {
      const s = e.event_date.split('T')[0]
      const end = e.end_date ? e.end_date.split('T')[0] : s
      return selectedDayDate >= s && selectedDayDate <= end
    })
  }, [events, selectedDayDate])

  const upcomingEvents = React.useMemo(() => {
    return events
      .filter(e => e.status !== 'clos' && e.status !== 'passé' && new Date(e.event_date) >= new Date(todayYMD))
      .slice(0, 5)
  }, [events, todayYMD])

  const upcomingCount = events.filter(e => e.status !== 'clos' && e.status !== 'passé' && new Date(e.event_date) >= new Date(todayYMD)).length

  return (
    <div className="space-y-4">
      {/* Selected Day Focus Card */}
      <Card className="border-blue-200 bg-blue-50/30 shadow-2xs">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
              Jour sélectionné
            </span>
            <CardTitle className="text-base font-bold text-slate-900 mt-0.5">
              {formatDate(selectedDayDate)}
            </CardTitle>
          </div>
          <Button
            size="sm"
            onClick={() => handleOpenAdd(selectedDayDate)}
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter</span>
          </Button>
        </CardHeader>

        <CardContent className="p-4 pt-2">
          {eventsForSelectedDay.length === 0 ? (
            <p className="text-xs text-slate-500 py-3 text-center italic">
              Aucun événement prévu à cette date.
            </p>
          ) : (
            <div className="space-y-2">
              {eventsForSelectedDay.map(ev => {
                const conf = EVENT_TYPE_CONFIG[ev.event_type] || EVENT_TYPE_CONFIG.rdv
                const Icon = conf.icon
                const closure = parseEventClosureComment(ev.description)
                const parsed = parseFlexibleEvent(closure.cleanDesc)
                const hasTime = hasSpecificTime(ev.event_date)

                return (
                  <div
                    key={ev.id}
                    onClick={() => handleOpenEdit(ev)}
                    className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-blue-300 transition-all cursor-pointer shadow-2xs flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={cn("p-1 rounded text-xs", conf.colorBg, conf.colorText)}>
                          <Icon className="w-3 h-3" />
                        </span>
                        <span className={cn("font-semibold text-xs truncate", ev.status === 'clos' ? "text-slate-500 line-through" : "text-slate-900")}>
                          {ev.title}
                        </span>
                      </div>
                      {hasTime && (
                        <p className="text-[11px] font-semibold text-blue-700 flex items-center gap-1 mb-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{formatEventDateTime(ev.event_date, ev.end_date)}</span>
                        </p>
                      )}
                      {parsed.cleanDesc && (
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {parsed.cleanDesc}
                        </p>
                      )}
                      {ev.status === 'clos' && closure.closureComment && (
                        <p className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 mt-1 line-clamp-2">
                          ✓ Résolution : {closure.closureComment}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] shrink-0 capitalize",
                        ev.status === 'clos' ? "bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold" : ""
                      )}
                    >
                      {ev.status === 'clos' ? '✓ Clos' : ev.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Next Events Mini-list */}
      <Card className="border-slate-200 shadow-2xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              Prochains événements
            </CardTitle>
            <span className="text-xs text-slate-400 font-medium">
              {upcomingCount} à venir
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-1 divide-y divide-slate-100">
          {upcomingEvents.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center italic">
              Aucun événement à venir.
            </p>
          ) : (
            upcomingEvents.map(ev => {
              const conf = EVENT_TYPE_CONFIG[ev.event_type] || EVENT_TYPE_CONFIG.rdv
              const Icon = conf.icon
              const parsed = parseFlexibleEvent(ev.description)

              return (
                <div
                  key={ev.id}
                  onClick={() => handleOpenEdit(ev)}
                  className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn("w-3.5 h-3.5 shrink-0", conf.colorText)} />
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {ev.title}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {parsed.isFlexible ? `⏳ ${parsed.flexLabel}` : formatEventDateTime(ev.event_date, ev.end_date)}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
