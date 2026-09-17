'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CalendarDays, ListOrdered, Hourglass, Filter } from 'lucide-react'
import { cn, EVENT_TYPES } from '@/lib/utils'
import { EVENT_TYPE_CONFIG } from './calendar-utils'
import { CalendarEvent } from '@/lib/types'

interface CalendarFiltersProps {
  events: CalendarEvent[]
  activeTab: 'calendar' | 'agenda' | 'flexible'
  setActiveTab: (tab: 'calendar' | 'agenda' | 'flexible') => void
  calendarViewMode: 'dayGridThreeWeeks' | 'dayGridTwoWeeks' | 'dayGridWeek' | 'dayGridMonth'
  setCalendarViewMode: (mode: 'dayGridThreeWeeks' | 'dayGridTwoWeeks' | 'dayGridWeek' | 'dayGridMonth') => void
  typeFilter: string
  setTypeFilter: (type: string) => void
  statusFilter: string
  setStatusFilter: (status: string) => void
  flexibleCount: number
}

export function CalendarFilters({
  events,
  activeTab,
  setActiveTab,
  calendarViewMode,
  setCalendarViewMode,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  flexibleCount
}: CalendarFiltersProps) {
  return (
    <Card className="border-slate-200 shadow-2xs">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* View Switcher Tabs */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg self-start">
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={cn(
                "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === 'calendar'
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
              <span>Calendrier</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('agenda')}
              className={cn(
                "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === 'agenda'
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <ListOrdered className="w-3.5 h-3.5 text-indigo-600" />
              <span>Planning & Agenda</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('flexible')}
              className={cn(
                "px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === 'flexible'
                  ? "bg-white text-purple-800 shadow-xs"
                  : "text-slate-600 hover:text-purple-700"
              )}
            >
              <Hourglass className="w-3.5 h-3.5 text-purple-600" />
              <span>Dates Flexibles ({flexibleCount})</span>
            </button>
          </div>

          {/* In Calendar Tab: 3 weeks / 2 weeks / 1 week toggle */}
          {activeTab === 'calendar' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Horizon :</span>
              <div className="flex items-center p-0.5 bg-slate-100 rounded-md">
                <button
                  type="button"
                  onClick={() => setCalendarViewMode('dayGridThreeWeeks')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded cursor-pointer transition-colors",
                    calendarViewMode === 'dayGridThreeWeeks' ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  3 semaines
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarViewMode('dayGridTwoWeeks')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded cursor-pointer transition-colors",
                    calendarViewMode === 'dayGridTwoWeeks' ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  2 semaines
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarViewMode('dayGridWeek')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded cursor-pointer transition-colors",
                    calendarViewMode === 'dayGridWeek' ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  1 semaine
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Filter Pills (Type & Status) */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Filter by Type */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Type :
            </span>
            <button
              type="button"
              onClick={() => setTypeFilter('TOUS')}
              className={cn(
                "px-2.5 py-1 rounded-full font-medium transition-colors cursor-pointer",
                typeFilter === 'TOUS' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Tous ({events.length})
            </button>
            {EVENT_TYPES.map(t => {
              const conf = EVENT_TYPE_CONFIG[t] || EVENT_TYPE_CONFIG.rdv
              const Icon = conf.icon
              const count = events.filter(e => e.event_type === t).length
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={cn(
                    "px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 cursor-pointer",
                    typeFilter === t
                      ? `${conf.colorBg} ${conf.colorText} border ${conf.colorBorder} font-bold shadow-2xs`
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  <span>{conf.label}</span>
                  <span className="opacity-60 text-[10px]">({count})</span>
                </button>
              )
            })}
          </div>

          {/* Filter by Status */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-semibold mr-1">Statut :</span>
            {(['TOUS', 'à venir', 'en attente', 'passé', 'clos'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer capitalize",
                  statusFilter === st
                    ? (st === 'clos' ? "bg-emerald-600 text-white font-semibold shadow-2xs" : "bg-blue-600 text-white font-semibold shadow-2xs")
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {st === 'TOUS' ? 'Tous' : (st === 'clos' ? '✓ Clos' : st)}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
