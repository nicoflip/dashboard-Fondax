'use client'

import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import { CalendarEvent, Task, Vendor, EventStatus } from '@/lib/types'
import { cn, formatEventDateTime } from '@/lib/utils'
import { parseFlexibleEvent } from '@/lib/flexible-events'
import { parseEventClosureComment } from '@/lib/closure-comments'
import { EVENT_TYPE_CONFIG } from './calendar-utils'
import { calculateTaskTemperature } from '@/lib/task-temperature'

interface CalendarAgendaViewProps {
  agendaGroups: {
    today: CalendarEvent[]
    tomorrow: CalendarEvent[]
    thisWeek: CalendarEvent[]
    nextWeek: CalendarEvent[]
    later: CalendarEvent[]
    closed: CalendarEvent[]
    past: CalendarEvent[]
  }
  tasks: Task[]
  vendors: Vendor[]
  handleStatusChange: (event: CalendarEvent, newStatus: EventStatus) => void
  handleOpenEdit: (event: CalendarEvent) => void
  handleDeleteEvent: (id: string, titleStr: string) => void
}

export function CalendarAgendaView({
  agendaGroups,
  tasks,
  vendors,
  handleStatusChange,
  handleOpenEdit,
  handleDeleteEvent
}: CalendarAgendaViewProps) {
  return (
    <div className="space-y-6">
      {[
        { id: 'today', title: "Aujourd'hui", items: agendaGroups.today, badgeColor: 'bg-blue-600 text-white' },
        { id: 'tomorrow', title: 'Demain', items: agendaGroups.tomorrow, badgeColor: 'bg-indigo-600 text-white' },
        { id: 'thisWeek', title: 'Cette semaine', items: agendaGroups.thisWeek, badgeColor: 'bg-slate-800 text-white' },
        { id: 'later', title: 'Prochainement (plus tard)', items: agendaGroups.later, badgeColor: 'bg-slate-600 text-white' },
        { id: 'closed', title: 'Événements clos & réglés', items: agendaGroups.closed, badgeColor: 'bg-emerald-600 text-white' },
        { id: 'past', title: 'Événements passés', items: agendaGroups.past, badgeColor: 'bg-slate-400 text-white' }
      ].map(section => {
        if (section.items.length === 0) return null

        return (
          <div key={section.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold", section.badgeColor)}>
                {section.title}
              </span>
              <span className="text-xs text-slate-400">
                ({section.items.length} événement{section.items.length > 1 ? 's' : ''})
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {section.items.map(event => {
                const conf = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.rdv
                const Icon = conf.icon
                const closure = parseEventClosureComment(event.description)
                const parsed = parseFlexibleEvent(closure.cleanDesc)
                const linkedTask = tasks.find(t => t.id === event.task_id)
                const linkedVendor = vendors.find(v => v.id === event.vendor_id)
                const linkedTemp = linkedTask ? calculateTaskTemperature(linkedTask) : null
                const isUrgent = linkedTemp ? linkedTemp.score >= 70 : false
                const isClosed = event.status === 'clos'

                return (
                  <Card
                    key={event.id}
                    className={cn(
                      "border transition-all hover:shadow-xs",
                      isClosed
                        ? "border-l-4 border-l-emerald-500 bg-slate-50/50 opacity-85"
                        : isUrgent
                        ? "border-l-4 border-l-red-500"
                        : parsed.isFlexible
                        ? "border-l-4 border-l-purple-500"
                        : "border-l-4 border-l-blue-500"
                    )}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn("p-1 rounded text-xs", conf.colorBg, conf.colorText)}>
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                            <Badge variant="outline" className={cn("text-[10px] font-semibold", conf.colorBg, conf.colorText, conf.colorBorder)}>
                              {conf.label}
                            </Badge>
                            <span className="text-xs text-slate-500 font-medium">
                              {parsed.isFlexible ? `⏳ ${parsed.flexLabel}` : formatEventDateTime(event.event_date, event.end_date)}
                            </span>
                          </div>
                          <h3 className={cn("font-bold text-sm truncate", isClosed ? "text-slate-500 line-through" : "text-slate-900")}>
                            {event.title}
                          </h3>
                        </div>

                        {/* Status Selector */}
                        <select
                          value={event.status}
                          onChange={(e) => handleStatusChange(event, e.target.value as EventStatus)}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "text-[11px] font-semibold rounded-md px-2 py-1 border transition-colors cursor-pointer",
                            event.status === 'clos' ? "bg-emerald-50 text-emerald-700 border-emerald-300" :
                            event.status === 'à venir' ? "bg-blue-50 text-blue-700 border-blue-200" :
                            event.status === 'en attente' ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-slate-100 text-slate-600 border-slate-200"
                          )}
                        >
                          <option value="à venir">À venir</option>
                          <option value="en attente">En attente</option>
                          <option value="clos">✓ Clos / Réglé</option>
                          <option value="passé">Passé</option>
                        </select>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-1 space-y-2.5">
                      {parsed.cleanDesc && (
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {parsed.cleanDesc}
                        </p>
                      )}

                      {isClosed && closure.closureComment && (
                        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs">
                          <div className="font-semibold text-emerald-800 flex items-center gap-1.5 mb-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Note de résolution / clôture :</span>
                          </div>
                          <p className="text-[11px] text-emerald-900 whitespace-pre-wrap">{closure.closureComment}</p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {linkedTask && (
                            <Badge variant="outline" className={cn("text-[10px]", isUrgent ? "bg-red-50 text-red-700 border-red-200 font-bold" : "bg-blue-50 text-blue-700 border-blue-200")}>
                              {isUrgent ? `🔥 Surchauffe (${linkedTemp?.score}%)` : 'Tâche'} : {linkedTask.title}
                            </Badge>
                          )}
                          {linkedVendor && (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                              Prestataire : {linkedVendor.name}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(event)}
                            className="h-7 px-2 text-xs text-slate-500 hover:text-blue-600 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1" />
                            Modifier
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteEvent(event.id, event.title)}
                            className="h-7 px-2 text-xs text-slate-500 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
