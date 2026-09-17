'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CalendarEvent, Task, Vendor } from '@/lib/types'
import { parseFlexibleEvent } from '@/lib/flexible-events'
import { hasSpecificTime, extractTimeFromDate, formatTimeDisplay } from '@/lib/utils'
import { toYMD, getExclusiveEndDate, EVENT_TYPE_CONFIG } from './calendar-utils'

export function useCalendarData() {
  const supabase = createClient()
  
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])

  const fetchEvents = async () => {
    const [eventsRes, tasksRes, vendorsRes] = await Promise.all([
      supabase.from('events').select('*').order('event_date', { ascending: true }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('vendors').select('*').order('name', { ascending: true })
    ])
      
    if (eventsRes.data) setEvents(eventsRes.data as CalendarEvent[])
    if (tasksRes.data) setTasks(tasksRes.data as Task[])
    if (vendorsRes.data) setVendors(vendorsRes.data as Vendor[])
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  return { events, setEvents, tasks, vendors, fetchEvents, supabase }
}

export function useCalendarStats(events: CalendarEvent[]) {
  const todayYMD = toYMD(new Date())
  const todayCount = events.filter(e => e.status !== 'clos' && e.event_date.startsWith(todayYMD)).length
  
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1))
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekStartYMD = toYMD(weekStart)
  const weekEndYMD = toYMD(weekEnd)

  const thisWeekCount = events.filter(e => {
    if (e.status === 'clos') return false
    const d = e.event_date.split('T')[0]
    return d >= weekStartYMD && d <= weekEndYMD
  }).length

  const flexibleCount = events.filter(e => e.status !== 'clos' && parseFlexibleEvent(e.description).isFlexible).length
  const pendingCount = events.filter(e => e.status === 'en attente').length
  const closedCount = events.filter(e => e.status === 'clos').length

  return { todayYMD, todayCount, thisWeekCount, flexibleCount, pendingCount, closedCount }
}

export function useProcessedEvents(events: CalendarEvent[], typeFilter: string, statusFilter: string) {
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (typeFilter !== 'TOUS' && e.event_type !== typeFilter) return false
      if (statusFilter !== 'TOUS' && e.status !== statusFilter) return false
      return true
    })
  }, [events, typeFilter, statusFilter])

  const calendarEvents = useMemo(() => {
    return filteredEvents.map(e => {
      const parsed = parseFlexibleEvent(e.description)
      const conf = EVENT_TYPE_CONFIG[e.event_type] || EVENT_TYPE_CONFIG.rdv
      
      let color = conf.hex
      if (e.status === 'clos') color = '#10b981'
      else if (e.status === 'passé') color = '#94a3b8'
      else if (parsed.isFlexible) color = '#8b5cf6'
      else if (e.status === 'en attente') color = '#f59e0b'

      const hasTime = hasSpecificTime(e.event_date)
      const startDate = e.event_date.split('T')[0]
      const startTime = extractTimeFromDate(e.event_date)
      const hasEndDate = !!e.end_date
      const hasEndTime = hasSpecificTime(e.end_date || '')
      const endTime = extractTimeFromDate(e.end_date || '')

      let calendarStart = startDate
      if (hasTime && startTime) {
        calendarStart = `${startDate}T${startTime}:00`
      }

      let calendarEnd: string | undefined = undefined
      if (hasEndDate && e.end_date) {
        const endDateStr = e.end_date.split('T')[0]
        if (hasEndTime && endTime) {
          calendarEnd = `${endDateStr}T${endTime}:00`
        } else {
          calendarEnd = getExclusiveEndDate(endDateStr)
        }
      }

      const displayTitle = e.status === 'clos' 
        ? `✓ ${e.title} [Clos]` 
        : (parsed.isFlexible ? `⏳ ${e.title}` : e.title)

      return {
        id: e.id,
        title: displayTitle,
        start: calendarStart,
        end: calendarEnd,
        allDay: !hasTime,
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          eventType: e.event_type,
          status: e.status,
          isFlexible: parsed.isFlexible,
          flexLabel: parsed.flexLabel,
          hasTime,
          timeStr: hasTime && startTime ? formatTimeDisplay(startTime) : ''
        }
      }
    })
  }, [filteredEvents])

  const agendaGroups = useMemo(() => {
    const today = new Date(new Date().setHours(0, 0, 0, 0))
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const nextWeekDate = new Date(today)
    nextWeekDate.setDate(today.getDate() + 7)

    const groups: {
      today: CalendarEvent[]
      tomorrow: CalendarEvent[]
      thisWeek: CalendarEvent[]
      nextWeek: CalendarEvent[]
      later: CalendarEvent[]
      closed: CalendarEvent[]
      past: CalendarEvent[]
    } = { today: [], tomorrow: [], thisWeek: [], nextWeek: [], later: [], closed: [], past: [] }

    filteredEvents.forEach(e => {
      if (e.status === 'clos') {
        groups.closed.push(e)
        return
      }

      const eDate = new Date(e.event_date.includes('T') ? e.event_date : e.event_date + 'T00:00:00')
      if (eDate < today && toYMD(eDate) !== toYMD(today)) {
        groups.past.push(e)
      } else if (toYMD(eDate) === toYMD(today)) {
        groups.today.push(e)
      } else if (toYMD(eDate) === toYMD(tomorrow)) {
        groups.tomorrow.push(e)
      } else if (eDate <= nextWeekDate) {
        groups.thisWeek.push(e)
      } else {
        groups.later.push(e)
      }
    })

    return groups
  }, [filteredEvents])

  return { filteredEvents, calendarEvents, agendaGroups }
}
