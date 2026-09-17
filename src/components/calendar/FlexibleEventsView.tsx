'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Hourglass } from 'lucide-react'
import { CalendarEvent } from '@/lib/types'
import { EVENT_TYPE_CONFIG } from './calendar-utils'
import { parseFlexibleEvent } from '@/lib/flexible-events'
import { formatDate } from '@/lib/utils'

interface FlexibleEventsViewProps {
  events: CalendarEvent[]
  handleOpenEdit: (event: CalendarEvent) => void
}

export function FlexibleEventsView({
  events,
  handleOpenEdit
}: FlexibleEventsViewProps) {
  const flexibleEvents = events.filter(e => parseFlexibleEvent(e.description).isFlexible)

  return (
    <div className="space-y-4">
      <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
        <div className="text-xs text-purple-950 space-y-1">
          <p className="font-bold text-sm">Gestion des dates et périodes flexibles</p>
          <p>
            Ces événements n'ont pas encore de date fixe arrêtée (par exemple « dans les deux prochaines semaines »).
            Dès que la date d'intervention ou de livraison est confirmée, cliquez sur un événement pour lui assigner sa date définitive.
          </p>
        </div>
      </div>

      {flexibleEvents.length === 0 ? (
        <Card className="bg-slate-50 border-dashed">
          <CardContent className="p-8 text-center text-slate-500 text-xs">
            Aucun événement en période flexible pour le moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flexibleEvents.map(ev => {
            const parsed = parseFlexibleEvent(ev.description)
            const conf = EVENT_TYPE_CONFIG[ev.event_type] || EVENT_TYPE_CONFIG.rdv
            
            return (
              <Card key={ev.id} className="border-purple-200 border-l-4 border-l-purple-600 shadow-2xs">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full mb-1">
                        <Hourglass className="w-3 h-3" />
                        {parsed.flexLabel}
                      </span>
                      <CardTitle className="text-base font-bold text-slate-900">
                        {ev.title}
                      </CardTitle>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {ev.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1 space-y-3">
                  <p className="text-xs text-slate-600">
                    {parsed.cleanDesc || "Aucun détail complémentaire renseigné."}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-xs text-slate-400">
                      Fenêtre : {formatDate(ev.event_date)} {ev.end_date ? `au ${formatDate(ev.end_date)}` : ''}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleOpenEdit(ev)}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-7 cursor-pointer"
                    >
                      Fixer la date définitive
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
