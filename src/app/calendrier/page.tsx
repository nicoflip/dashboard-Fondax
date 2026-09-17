'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { CalendarEvent, EventStatus } from '@/lib/types'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CalendarDays, Plus, CheckCircle2, Hourglass } from 'lucide-react'
import { formatEventDescriptionWithClosure } from '@/lib/closure-comments'

import { toYMD, EVENT_TYPE_CONFIG } from '@/components/calendar/calendar-utils'
import { useCalendarData, useCalendarStats, useProcessedEvents } from '@/components/calendar/useCalendarData'
import { CalendarFilters } from '@/components/calendar/CalendarFilters'
import { CalendarRightPanel } from '@/components/calendar/CalendarRightPanel'
import { CalendarKPIBar } from '@/components/calendar/CalendarKPIBar'
import { CalendarAgendaView } from '@/components/calendar/CalendarAgendaView'
import { FlexibleEventsView } from '@/components/calendar/FlexibleEventsView'
import { EventFormDialog } from '@/components/calendar/EventFormDialog'
import { EventClosureDialog } from '@/components/calendar/EventClosureDialog'

const FullCalendar = dynamic(() => import('@fullcalendar/react'), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] flex items-center justify-center bg-slate-50/50 rounded-xl border border-slate-200 text-slate-500 font-medium">
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        Chargement du calendrier...
      </div>
    </div>
  ),
})

function CalendrierInner() {
  const searchParams = useSearchParams()
  const urlFilter = searchParams.get('filter')

  const { events, setEvents, tasks, vendors, fetchEvents, supabase } = useCalendarData()
  
  const [activeTab, setActiveTab] = useState<'calendar' | 'agenda' | 'flexible'>('calendar')
  const [calendarViewMode, setCalendarViewMode] = useState<'dayGridThreeWeeks' | 'dayGridTwoWeeks' | 'dayGridWeek' | 'dayGridMonth'>('dayGridThreeWeeks')
  const [typeFilter, setTypeFilter] = useState<string>('TOUS')
  const [statusFilter, setStatusFilter] = useState<string>('TOUS')
  const [selectedDayDate, setSelectedDayDate] = useState<string>(() => toYMD(new Date()))

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined)
  
  const [isClosureDialogOpen, setIsClosureDialogOpen] = useState(false)
  const [eventToClose, setEventToClose] = useState<CalendarEvent | null>(null)
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null)

  const { todayYMD, todayCount, thisWeekCount, flexibleCount, pendingCount, closedCount } = useCalendarStats(events)
  const { calendarEvents, agendaGroups } = useProcessedEvents(events, typeFilter, statusFilter)

  useEffect(() => {
    if (urlFilter === 'a_venir') {
      setStatusFilter('à venir')
      setActiveTab('agenda')
    }
  }, [urlFilter])

  const showNotification = (msg: string) => {
    setNotificationMsg(msg)
    setTimeout(() => setNotificationMsg(null), 4000)
  }

  const handleOpenAdd = (date?: string) => {
    setEditingEvent(null)
    setDefaultDate(date || selectedDayDate || toYMD(new Date()))
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (event: CalendarEvent) => {
    setEditingEvent(event)
    setIsDialogOpen(true)
  }

  const handleConfirmClosure = async (event: CalendarEvent, comment: string) => {
    const updatedDesc = formatEventDescriptionWithClosure(event.description, comment)
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: 'clos', description: updatedDesc } : e))
    await supabase.from('events').update({ status: 'clos', description: updatedDesc }).eq('id', event.id)
    showNotification(`Événement "${event.title}" clos avec succès !`)
  }

  const handleStatusChange = async (event: CalendarEvent, newStatus: EventStatus) => {
    if (newStatus === 'clos') {
      setEventToClose(event)
      setIsClosureDialogOpen(true)
      return
    }
    const cleanDesc = formatEventDescriptionWithClosure(event.description, null)
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: newStatus, description: cleanDesc } : e))
    await supabase.from('events').update({ status: newStatus, description: cleanDesc }).eq('id', event.id)
  }

  const renderEventContent = (eventInfo: any) => {
    const { eventType, isFlexible, hasTime, timeStr } = eventInfo.event.extendedProps
    const conf = EVENT_TYPE_CONFIG[eventType] || EVENT_TYPE_CONFIG.rdv
    const IconComponent = conf.icon

    return (
      <div className="flex items-center gap-1 overflow-hidden px-1.5 py-0.5 text-[11px] font-medium leading-tight select-none cursor-pointer" title={eventInfo.event.title}>
        {isFlexible ? <Hourglass className="w-3 h-3 shrink-0 text-amber-200" /> : <IconComponent className="w-3 h-3 shrink-0 opacity-80" />}
        {hasTime && timeStr && <span className="font-bold text-[10px] bg-black/25 text-white px-1 py-0.2 rounded shrink-0">{timeStr}</span>}
        <span className="truncate">{eventInfo.event.title}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Calendrier & Agenda IT</h1>
          </div>
          <p className="text-sm text-slate-500">Gestion visuelle des rendez-vous, échéances, interventions prestataires et jalons</p>
        </div>
        <Button onClick={() => handleOpenAdd()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" /><span>Nouvel événement</span>
        </Button>
      </div>

      {notificationMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3.5 rounded-xl flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{notificationMsg}</span>
        </div>
      )}

      <CalendarKPIBar todayCount={todayCount} thisWeekCount={thisWeekCount} flexibleCount={flexibleCount} pendingCount={pendingCount} closedCount={closedCount} />
      <CalendarFilters events={events} activeTab={activeTab} setActiveTab={setActiveTab} calendarViewMode={calendarViewMode} setCalendarViewMode={setCalendarViewMode} typeFilter={typeFilter} setTypeFilter={setTypeFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} flexibleCount={flexibleCount} />

      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8">
            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />Vue ciblée : <strong>Lundi au Jeudi inclus</strong>
                  </span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-medium">
                    Horizon : {calendarViewMode === 'dayGridThreeWeeks' ? '3 prochaines semaines' : calendarViewMode === 'dayGridTwoWeeks' ? '2 prochaines semaines' : 'Semaine en cours'}
                  </span>
                </div>
                <FullCalendar
                  key={calendarViewMode} plugins={[dayGridPlugin, interactionPlugin]} initialView={calendarViewMode}
                  locale="fr" firstDay={1} hiddenDays={[0, 5, 6]}
                  views={{ dayGridThreeWeeks: { type: 'dayGrid', duration: { weeks: 3 }, buttonText: '3 semaines' }, dayGridTwoWeeks: { type: 'dayGrid', duration: { weeks: 2 }, buttonText: '2 semaines' } }}
                  buttonText={{ today: "Aujourd'hui", month: 'Mois', week: 'Semaine' }}
                  headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
                  events={calendarEvents} eventContent={renderEventContent} dateClick={(arg) => setSelectedDayDate(arg.dateStr)}
                  eventClick={(arg) => { const event = events.find(e => e.id === arg.event.id); if (event) handleOpenEdit(event) }}
                  height="auto"
                />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-4 space-y-4">
            <CalendarRightPanel events={events} selectedDayDate={selectedDayDate} handleOpenAdd={handleOpenAdd} handleOpenEdit={handleOpenEdit} todayYMD={todayYMD} />
          </div>
        </div>
      )}

      {activeTab === 'agenda' && (
        <CalendarAgendaView agendaGroups={agendaGroups} tasks={tasks} vendors={vendors} handleStatusChange={handleStatusChange} handleOpenEdit={handleOpenEdit} handleDeleteEvent={async (id, title) => { if (!window.confirm(`Supprimer l'événement "${title}" ?`)) return; await supabase.from('events').delete().eq('id', id); fetchEvents(); }} />
      )}

      {activeTab === 'flexible' && <FlexibleEventsView events={events} handleOpenEdit={handleOpenEdit} />}

      <EventFormDialog isOpen={isDialogOpen} setIsOpen={setIsDialogOpen} editingEvent={editingEvent} defaultDate={defaultDate} tasks={tasks} vendors={vendors} onSaveSuccess={(msg) => { showNotification(msg); fetchEvents(); }} onDeleteSuccess={() => fetchEvents()} />
      <EventClosureDialog isOpen={isClosureDialogOpen} onClose={() => { setIsClosureDialogOpen(false); setEventToClose(null); }} event={eventToClose} onConfirmClosure={handleConfirmClosure} />
    </div>
  )
}

export default function CalendrierPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Chargement...</div>}>
      <CalendrierInner />
    </Suspense>
  )
}
