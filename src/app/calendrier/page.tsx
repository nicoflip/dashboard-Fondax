'use client'

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { CalendarEvent, Task, Vendor, EventType, EventStatus, TaskCategory, TaskPriority } from '@/lib/types'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

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

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogContent } from '@/components/ui/dialog'
import { CustomDatePicker } from '@/components/ui/date-picker'
import { TaskSelector } from '@/components/ui/TaskSelector'
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Pencil, 
  CheckCircle2, 
  Flame, 
  Clock, 
  Sparkles, 
  Phone, 
  Users, 
  Flag, 
  FolderKanban, 
  ChevronRight, 
  Filter, 
  CalendarDays, 
  ListOrdered, 
  Hourglass, 
  Check, 
  AlertCircle,
  X,
  Building2
} from 'lucide-react'
import { 
  EVENT_TYPES, 
  EVENT_STATUSES, 
  EVENT_TYPE_LABELS, 
  formatDate, 
  formatDateTime,
  hasSpecificTime,
  extractTimeFromDate,
  combineDateAndTime,
  formatTimeDisplay,
  formatEventDateTime,
  cn, 
  PRIORITY_COLORS,
  TASK_CATEGORIES,
  TASK_PRIORITIES
} from '@/lib/utils'
import { parseFlexibleEvent } from '@/lib/flexible-events'
import { parseEventClosureComment, formatEventDescriptionWithClosure } from '@/lib/closure-comments'
import { EventClosureDialog } from '@/components/calendar/EventClosureDialog'

// Helper: Format YYYY-MM-DD

function toYMD(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getExclusiveEndDate(dateStr: string) {
  const parts = dateStr.split('-').map(Number)
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2] + 1)
    return toYMD(d)
  }
  return dateStr
}

function getPresetDates(preset: 'two_weeks' | 'this_week' | 'next_week' | 'end_month') {
  const now = new Date()
  const todayStr = toYMD(now)

  if (preset === 'two_weeks') {
    const end = new Date(now)
    end.setDate(now.getDate() + 14)
    return {
      label: 'Dans les 2 prochaines semaines',
      startDate: todayStr,
      endDate: toYMD(end)
    }
  }
  if (preset === 'this_week') {
    const day = now.getDay()
    const diff = day === 0 ? 0 : 7 - day
    const end = new Date(now)
    end.setDate(now.getDate() + diff)
    return {
      label: 'Cette semaine',
      startDate: todayStr,
      endDate: toYMD(end)
    }
  }
  if (preset === 'next_week') {
    const day = now.getDay()
    const daysUntilNextMonday = day === 0 ? 1 : 8 - day
    const nextMonday = new Date(now)
    nextMonday.setDate(now.getDate() + daysUntilNextMonday)
    const nextSunday = new Date(nextMonday)
    nextSunday.setDate(nextMonday.getDate() + 6)
    return {
      label: 'Semaine prochaine',
      startDate: toYMD(nextMonday),
      endDate: toYMD(nextSunday)
    }
  }
  if (preset === 'end_month') {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      label: "D'ici fin du mois",
      startDate: todayStr,
      endDate: toYMD(lastDay)
    }
  }
  return { label: 'Dans les 2 prochaines semaines', startDate: todayStr, endDate: todayStr }
}

// Event Type Metadata (Colors & Icons)
const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: any; colorBg: string; colorText: string; colorBorder: string; hex: string }> = {
  rdv: {
    label: 'Rendez-vous',
    icon: Users,
    colorBg: 'bg-blue-50',
    colorText: 'text-blue-700',
    colorBorder: 'border-blue-200',
    hex: '#2563eb'
  },
  appel: {
    label: 'Appel téléphonique',
    icon: Phone,
    colorBg: 'bg-emerald-50',
    colorText: 'text-emerald-700',
    colorBorder: 'border-emerald-200',
    hex: '#059669'
  },
  'échéance': {
    label: 'Échéance',
    icon: Flag,
    colorBg: 'bg-rose-50',
    colorText: 'text-rose-700',
    colorBorder: 'border-rose-200',
    hex: '#e11d48'
  },
  'étape chantier': {
    label: 'Étape chantier',
    icon: FolderKanban,
    colorBg: 'bg-indigo-50',
    colorText: 'text-indigo-700',
    colorBorder: 'border-indigo-200',
    hex: '#6366f1'
  }
}

function CalendrierInner() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const urlFilter = searchParams.get('filter')

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)

  // View mode: 'calendar' | 'agenda' | 'flexible'
  const [activeTab, setActiveTab] = useState<'calendar' | 'agenda' | 'flexible'>('calendar')
  const [calendarViewMode, setCalendarViewMode] = useState<'dayGridThreeWeeks' | 'dayGridTwoWeeks' | 'dayGridWeek' | 'dayGridMonth'>('dayGridThreeWeeks')

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('TOUS')
  const [statusFilter, setStatusFilter] = useState<string>('TOUS')

  // Selected date on calendar click
  const [selectedDayDate, setSelectedDayDate] = useState<string>(() => toYMD(new Date()))

  // Dialog state (Unified Add/Edit)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)

  // Dialog form state
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formEventDate, setFormEventDate] = useState('')
  const [formEventTime, setFormEventTime] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formEndTime, setFormEndTime] = useState('')
  const [formIsFlexible, setFormIsFlexible] = useState(false)
  const [formFlexLabel, setFormFlexLabel] = useState('Dans les 2 prochaines semaines')
  const [formEventType, setFormEventType] = useState<EventType>('rdv')
  const [formStatus, setFormStatus] = useState<EventStatus>('à venir')
  const [formClosureComment, setFormClosureComment] = useState('')
  const [formTaskId, setFormTaskId] = useState('')
  const [formVendorId, setFormVendorId] = useState('')

  // Clôture rapide avec motif
  const [isClosureDialogOpen, setIsClosureDialogOpen] = useState(false)
  const [eventToClose, setEventToClose] = useState<CalendarEvent | null>(null)

  // Option: Créer la tâche éponyme
  const [createAlsoTask, setCreateAlsoTask] = useState(false)
  const [formAlsoTaskCategory, setFormAlsoTaskCategory] = useState<TaskCategory>('Autre')
  const [formAlsoTaskPriority, setFormAlsoTaskPriority] = useState<TaskPriority>('moyenne')
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotificationMsg(msg)
    setTimeout(() => setNotificationMsg(null), 4000)
  }

  useEffect(() => {
    if (urlFilter === 'a_venir') {
      setStatusFilter('à venir')
      setActiveTab('agenda')
    }
  }, [urlFilter])

  const fetchEvents = async () => {
    setLoading(true)
    const [eventsRes, tasksRes, vendorsRes] = await Promise.all([
      supabase.from('events').select('*').order('event_date', { ascending: true }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('vendors').select('*').order('name', { ascending: true })
    ])
      
    if (eventsRes.data) setEvents(eventsRes.data as CalendarEvent[])
    if (tasksRes.data) setTasks(tasksRes.data as Task[])
    if (vendorsRes.data) setVendors(vendorsRes.data as Vendor[])
    setLoading(false)
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  // Open Add Dialog
  const handleOpenAdd = (defaultDate?: string) => {
    setEditingEvent(null)
    setFormTitle('')
    setFormDescription('')
    setFormClosureComment('')
    const dateToSet = defaultDate || selectedDayDate || toYMD(new Date())
    setFormEventDate(dateToSet)
    setFormEventTime('')
    setFormEndDate('')
    setFormEndTime('')
    setFormIsFlexible(false)
    setFormFlexLabel('Dans les 2 prochaines semaines')
    setFormEventType('rdv')
    setFormStatus('à venir')
    setFormTaskId('')
    setFormVendorId('')
    setCreateAlsoTask(false)
    setFormAlsoTaskCategory('Autre')
    setFormAlsoTaskPriority('moyenne')
    setIsDialogOpen(true)
  }

  // Open Edit Dialog
  const handleOpenEdit = (event: CalendarEvent) => {
    setEditingEvent(event)
    setFormTitle(event.title)
    const closure = parseEventClosureComment(event.description)
    setFormClosureComment(closure.closureComment || '')

    const parsed = parseFlexibleEvent(closure.cleanDesc)
    if (parsed.isFlexible) {
      setFormIsFlexible(true)
      setFormFlexLabel(parsed.flexLabel)
      setFormDescription(parsed.cleanDesc)
    } else {
      setFormIsFlexible(false)
      setFormFlexLabel('Dans les 2 prochaines semaines')
      setFormDescription(closure.cleanDesc || '')
    }
    setFormEventDate(event.event_date.split('T')[0])
    setFormEventTime(extractTimeFromDate(event.event_date))
    setFormEndDate(event.end_date ? event.end_date.split('T')[0] : '')
    setFormEndTime(extractTimeFromDate(event.end_date))
    setFormEventType(event.event_type)
    setFormStatus(event.status)
    setFormTaskId(event.task_id || '')
    setFormVendorId(event.vendor_id || '')
    setCreateAlsoTask(false)
    setIsDialogOpen(true)
  }

  // Auto-fill title from task if empty
  const handleSelectTask = (tid: string | null) => {
    const id = tid || ''
    setFormTaskId(id)
    if (id) {
      setCreateAlsoTask(false)
      if (!formTitle) {
        const t = tasks.find(item => item.id === id)
        if (t) {
          setFormTitle(t.title)
          if (!formDescription && t.description) setFormDescription(t.description)
        }
      }
    }
  }

  // Save (Insert or Update)
  const handleSaveEvent = async () => {
    if (!formTitle.trim() || !formEventDate) return

    let finalEndDate = formEndDate || null
    if (formIsFlexible && !finalEndDate && formEventDate) {
      const d = new Date(formEventDate)
      d.setDate(d.getDate() + 14)
      finalEndDate = toYMD(d)
    }

    let finalDesc = formIsFlexible
      ? `[Période flexible : ${formFlexLabel || 'Dans les 2 prochaines semaines'}]\n${formDescription}`.trim()
      : formDescription.trim()

    finalDesc = formatEventDescriptionWithClosure(
      finalDesc,
      formStatus === 'clos' ? formClosureComment : null
    ) || ''

    const finalEventDate = combineDateAndTime(formEventDate, formEventTime)
    const finalEndDateTime = finalEndDate ? combineDateAndTime(finalEndDate, formEndTime) : null

    const payload = {
      title: formTitle.trim(),
      description: finalDesc || null,
      event_date: finalEventDate,
      end_date: finalEndDateTime,
      event_type: formEventType,
      status: formStatus,
      task_id: formTaskId || null,
      vendor_id: formVendorId || null
    }

    if (editingEvent) {
      const { error } = await supabase.from('events').update(payload).eq('id', editingEvent.id)
      if (!error) {
        setIsDialogOpen(false)
        fetchEvents()
        showNotification(`Événement mis à jour avec succès !`)
      }
    } else {
      if (createAlsoTask) {
        const cat = formAlsoTaskCategory || (formVendorId ? 'Prestataires' : 'Autre')
        const { data: createdTask, error: taskError } = await supabase
          .from('tasks')
          .insert([{
            title: formTitle.trim(),
            description: finalDesc || null,
            category: cat,
            priority: formAlsoTaskPriority,
            status: 'à faire'
          }])
          .select()
          .single()

        if (!taskError && createdTask) {
          payload.task_id = createdTask.id
        }
      }

      const { error } = await supabase.from('events').insert([payload])
      if (!error) {
        setIsDialogOpen(false)
        fetchEvents()
        if (createAlsoTask) {
          showNotification(`Événement et tâche éponyme créés avec succès !`)
        } else {
          showNotification(`Événement créé avec succès !`)
        }
      }
    }
  }

  // Delete event
  const handleDeleteEvent = async (id: string, titleStr: string) => {
    if (!window.confirm(`Supprimer l'événement "${titleStr}" ?`)) return
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (!error) {
      if (editingEvent?.id === id) setIsDialogOpen(false)
      fetchEvents()
    }
  }

  // Confirmer clôture avec commentaire
  const handleConfirmClosure = async (event: CalendarEvent, comment: string) => {
    const updatedDesc = formatEventDescriptionWithClosure(event.description, comment)
    setEvents(prev => prev.map(e => e.id === event.id ? { ...e, status: 'clos', description: updatedDesc } : e))
    await supabase.from('events').update({ status: 'clos', description: updatedDesc }).eq('id', event.id)
    showNotification(`Événement "${event.title}" clos avec succès !`)
  }

  // Change event status directly
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

  // FullCalendar event click & date click
  const handleFcDateClick = (arg: any) => {
    setSelectedDayDate(arg.dateStr)
  }

  const handleFcEventClick = (arg: any) => {
    const event = events.find(e => e.id === arg.event.id)
    if (event) {
      handleOpenEdit(event)
    }
  }

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (typeFilter !== 'TOUS' && e.event_type !== typeFilter) return false
      if (statusFilter !== 'TOUS' && e.status !== statusFilter) return false
      return true
    })
  }, [events, typeFilter, statusFilter])

  // FullCalendar event items mapping
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
      const hasEndTime = hasSpecificTime(e.end_date)
      const endTime = extractTimeFromDate(e.end_date)

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

  // Events for selected day
  const eventsForSelectedDay = useMemo(() => {
    if (!selectedDayDate) return []
    return events.filter(e => {
      const s = e.event_date.split('T')[0]
      const end = e.end_date ? e.end_date.split('T')[0] : s
      return selectedDayDate >= s && selectedDayDate <= end
    })
  }, [events, selectedDayDate])

  // KPIs (Excluent les événements clos pour ne pas alerter inutilement)
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

  // Chronological grouping for Agenda view
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
    } = {
      today: [],
      tomorrow: [],
      thisWeek: [],
      nextWeek: [],
      later: [],
      closed: [],
      past: []
    }

    filteredEvents.forEach(e => {
      // Les événements clos sont isolés dans leur propre section
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

  // Custom FullCalendar event render
  const renderEventContent = (eventInfo: any) => {
    const type = eventInfo.event.extendedProps.eventType
    const isFlex = eventInfo.event.extendedProps.isFlexible
    const hasTime = eventInfo.event.extendedProps.hasTime
    const timeStr = eventInfo.event.extendedProps.timeStr
    const conf = EVENT_TYPE_CONFIG[type] || EVENT_TYPE_CONFIG.rdv
    const IconComponent = conf.icon

    return (
      <div 
        className="flex items-center gap-1 overflow-hidden px-1.5 py-0.5 text-[11px] font-medium leading-tight select-none cursor-pointer"
        title={eventInfo.event.title}
      >
        {isFlex ? (
          <Hourglass className="w-3 h-3 shrink-0 text-amber-200" />
        ) : (
          <IconComponent className="w-3 h-3 shrink-0 opacity-80" />
        )}
        {hasTime && timeStr && (
          <span className="font-bold text-[10px] bg-black/25 text-white px-1 py-0.2 rounded shrink-0">
            {timeStr}
          </span>
        )}
        <span className="truncate">{eventInfo.event.title}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Calendrier & Agenda IT
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Gestion visuelle des rendez-vous, échéances, interventions prestataires et jalons
          </p>
        </div>

        <Button
          onClick={() => handleOpenAdd()}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvel événement</span>
        </Button>
      </div>

      {/* Notification banner */}
      {notificationMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3.5 rounded-xl flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{notificationMsg}</span>
        </div>
      )}

      {/* KPI Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Aujourd'hui</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{todayCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CalendarIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cette semaine</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{thisWeekCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dates flexibles</p>
            <p className="text-2xl font-bold text-purple-700 mt-0.5">{flexibleCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Hourglass className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">En attente</p>
            <p className="text-2xl font-bold text-amber-700 mt-0.5">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Clos / Réglés</p>
            <p className="text-2xl font-bold text-emerald-700 mt-0.5">{closedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar: View Switcher Tabs & Filters */}
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

      {/* TAB 1: INTERACTIVE CALENDAR VIEW WITH RIGHT-SIDE QUICK FOCUS */}
      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Calendar Area (8 cols on desktop) */}
          <div className="lg:col-span-8">
            <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-medium text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Vue ciblée : <strong>Lundi au Jeudi inclus</strong>
                  </span>
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-medium">
                    Horizon : {calendarViewMode === 'dayGridThreeWeeks' ? '3 prochaines semaines' : calendarViewMode === 'dayGridTwoWeeks' ? '2 prochaines semaines' : 'Semaine en cours'}
                  </span>
                </div>
                <FullCalendar
                  key={calendarViewMode}
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView={calendarViewMode}
                  locale="fr"
                  firstDay={1}
                  hiddenDays={[0, 5, 6]}
                  views={{
                    dayGridThreeWeeks: {
                      type: 'dayGrid',
                      duration: { weeks: 3 },
                      buttonText: '3 semaines'
                    },
                    dayGridTwoWeeks: {
                      type: 'dayGrid',
                      duration: { weeks: 2 },
                      buttonText: '2 semaines'
                    }
                  }}
                  buttonText={{
                    today: "Aujourd'hui",
                    month: 'Mois',
                    week: 'Semaine'
                  }}
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: ''
                  }}
                  events={calendarEvents}
                  eventContent={renderEventContent}
                  dateClick={handleFcDateClick}
                  eventClick={handleFcEventClick}
                  height="auto"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Side Panel: Day Focus & Upcoming events (4 cols on desktop) */}
          <div className="lg:col-span-4 space-y-4">
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
                      const timeStr = extractTimeFromDate(ev.event_date)

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
                    {events.filter(e => e.status !== 'clos' && e.status !== 'passé' && new Date(e.event_date) >= new Date(todayYMD)).length} à venir
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-1 divide-y divide-slate-100">
                {events.filter(e => e.status !== 'clos' && e.status !== 'passé' && new Date(e.event_date) >= new Date(todayYMD)).length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center italic">
                    Aucun événement à venir.
                  </p>
                ) : (
                  events
                    .filter(e => e.status !== 'clos' && e.status !== 'passé' && new Date(e.event_date) >= new Date(todayYMD))
                    .slice(0, 5)
                    .map(ev => {
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
        </div>
      )}

      {/* TAB 2: PLANNING CHRONOLOGIQUE (AGENDA VIEW) */}
      {activeTab === 'agenda' && (
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
                    const isUrgent = linkedTask?.priority === 'haute'
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
                                <Badge variant="outline" className={cn("text-[10px]", isUrgent ? "bg-red-50 text-red-700 border-red-200" : "bg-blue-50 text-blue-700 border-blue-200")}>
                                  {isUrgent ? '🔥 Tâche urgente' : 'Tâche'} : {linkedTask.title}
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
      )}

      {/* TAB 3: DATES FLEXIBLES VIEW */}
      {activeTab === 'flexible' && (
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

          {events.filter(e => parseFlexibleEvent(e.description).isFlexible).length === 0 ? (
            <Card className="bg-slate-50 border-dashed">
              <CardContent className="p-8 text-center text-slate-500 text-xs">
                Aucun événement en période flexible pour le moment.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {events
                .filter(e => parseFlexibleEvent(e.description).isFlexible)
                .map(ev => {
                  const parsed = parseFlexibleEvent(ev.description)
                  const conf = EVENT_TYPE_CONFIG[ev.event_type] || EVENT_TYPE_CONFIG.rdv
                  const Icon = conf.icon

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
      )}

      {/* UNIFIED DIALOG FOR ADDING & EDITING EVENTS */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "Modifier l'événement" : "Nouvel événement au calendrier"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3 text-slate-800">
            {/* Titre */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Titre de l'événement <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="Ex: Intervention fibre SFR, Réunion Altior..."
                className="bg-white text-sm"
              />
            </div>

            {/* Type & Statut */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Type d'événement</Label>
                <select
                  value={formEventType}
                  onChange={e => setFormEventType(e.target.value as EventType)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t} value={t}>{EVENT_TYPE_LABELS[t] || t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Statut</Label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value as EventStatus)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {EVENT_STATUSES.map(s => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Champ Commentaire de Clôture lorsque le statut est "clos" */}
            {formStatus === 'clos' && (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-3.5 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Commentaire de résolution / clôture (optionnel)</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Ce motif restera consigné pour l'historique et sera intégré aux rapports d'activité.
                </p>
                <textarea
                  rows={2}
                  value={formClosureComment}
                  onChange={e => setFormClosureComment(e.target.value)}
                  placeholder="Ex: Intervention fibre finalisée avec succès par SFR. Tout fonctionne nominalement."
                  className="w-full rounded-md border border-emerald-300 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            )}

            {/* Mode Date Flexible vs Date Fixe */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                  <Hourglass className="w-4 h-4 text-purple-600" />
                  <span>Mode Période Flexible (date exacte encore inconnue)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!formIsFlexible) {
                      const p = getPresetDates('two_weeks')
                      setFormEventDate(p.startDate)
                      setFormEndDate(p.endDate)
                      setFormFlexLabel(p.label)
                      setFormIsFlexible(true)
                    } else {
                      setFormIsFlexible(false)
                    }
                  }}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer",
                    formIsFlexible
                      ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                  )}
                >
                  {formIsFlexible ? "✓ Flexible activé" : "Activer date flexible"}
                </button>
              </div>

              {formIsFlexible ? (
                <div className="space-y-2.5 pt-2 border-t border-purple-200">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-500 font-medium">Raccourcis :</span>
                    <button
                      type="button"
                      onClick={() => {
                        const p = getPresetDates('two_weeks')
                        setFormEventDate(p.startDate)
                        setFormEndDate(p.endDate)
                        setFormFlexLabel(p.label)
                      }}
                      className="text-xs px-2 py-0.5 rounded bg-white hover:bg-purple-100 border border-purple-300 text-purple-800 font-semibold cursor-pointer"
                    >
                      Dans 2 semaines
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const p = getPresetDates('this_week')
                        setFormEventDate(p.startDate)
                        setFormEndDate(p.endDate)
                        setFormFlexLabel(p.label)
                      }}
                      className="text-xs px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                    >
                      Cette semaine
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const p = getPresetDates('end_month')
                        setFormEventDate(p.startDate)
                        setFormEndDate(p.endDate)
                        setFormFlexLabel(p.label)
                      }}
                      className="text-xs px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                    >
                      Fin du mois
                    </button>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-purple-900">Libellé d'estimation</Label>
                    <Input
                      value={formFlexLabel}
                      onChange={e => setFormFlexLabel(e.target.value)}
                      placeholder="Ex: Dans les deux prochaines semaines"
                      className="bg-white text-xs border-purple-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <CustomDatePicker label="Début estimé" value={formEventDate} onChange={setFormEventDate} />
                    </div>
                    <div>
                      <CustomDatePicker label="Fin estimée" value={formEndDate} onChange={setFormEndDate} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <CustomDatePicker label="Date de l'événement" value={formEventDate} onChange={setFormEventDate} />
                    </div>
                    <div>
                      <CustomDatePicker label="Date de fin (optionnelle)" value={formEndDate} onChange={setFormEndDate} />
                    </div>
                  </div>

                  {/* Heures optionnelles (début et fin) */}
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Préciser une heure (optionnel)</span>
                      </Label>
                      {(formEventTime || formEndTime) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFormEventTime('')
                            setFormEndTime('')
                          }}
                          className="text-[11px] font-medium text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          Effacer l'heure
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="event-start-time" className="text-[11px] text-slate-500 font-medium">
                          Heure de début
                        </Label>
                        <Input
                          id="event-start-time"
                          type="time"
                          value={formEventTime}
                          onChange={e => setFormEventTime(e.target.value)}
                          className="h-8 text-xs bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="event-end-time" className="text-[11px] text-slate-500 font-medium">
                          Heure de fin
                        </Label>
                        <Input
                          id="event-end-time"
                          type="time"
                          value={formEndTime}
                          onChange={e => setFormEndTime(e.target.value)}
                          className="h-8 text-xs bg-white"
                        />
                      </div>
                    </div>

                    {/* Raccourcis d'heures courantes */}
                    <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-100">
                      <span className="text-[10px] text-slate-400 mr-1">Raccourcis :</span>
                      {['08:30', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormEventTime(t)}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border transition-colors cursor-pointer",
                            formEventTime === t
                              ? "bg-blue-600 text-white border-blue-600 font-bold"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Liaison Tâche IT */}
            <TaskSelector
              tasks={tasks}
              value={formTaskId || null}
              onChange={handleSelectTask}
              disabled={createAlsoTask}
              disabledMessage="Désactivé : une tâche éponyme sera créée et liée automatiquement"
              label="Lier à une tâche IT (optionnel)"
              placeholder="Rechercher et associer une tâche existante..."
            />

            {/* Liaison Prestataire */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                Lier à un prestataire (optionnel)
              </Label>
              <select
                value={formVendorId}
                onChange={e => setFormVendorId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs truncate focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              >
                <option value="">-- Aucun prestataire lié --</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>
                    🏢 {v.name} ({v.scope || 'Prestataire'})
                  </option>
                ))}
              </select>
            </div>

            {/* Option : Créer également la tâche éponyme */}
            {!editingEvent && (
              <div className={cn(
                "rounded-xl border p-3.5 transition-all",
                createAlsoTask ? "bg-blue-50/60 border-blue-200 shadow-2xs" : "bg-slate-50/60 border-slate-200"
              )}>
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={createAlsoTask}
                    onChange={e => {
                      const checked = e.target.checked
                      setCreateAlsoTask(checked)
                      if (checked) {
                        setFormTaskId('')
                      }
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        Créer également la tâche éponyme
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-white text-blue-700 border-blue-200 py-0">
                        Synchro Tâches
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Une tâche intitulée &laquo;&nbsp;{formTitle.trim() || "même titre"}&nbsp;&raquo; sera automatiquement ajoutée dans vos tâches et rattachée à cet événement.
                    </p>
                  </div>
                </label>

                {createAlsoTask && (
                  <div className="mt-3 pt-3 border-t border-blue-100 grid grid-cols-1 sm:grid-cols-2 gap-3 pl-7">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">Catégorie de la tâche</Label>
                      <select
                        value={formAlsoTaskCategory}
                        onChange={e => setFormAlsoTaskCategory(e.target.value as TaskCategory)}
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        {TASK_CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">Priorité de la tâche</Label>
                      <select
                        value={formAlsoTaskPriority}
                        onChange={e => setFormAlsoTaskPriority(e.target.value as TaskPriority)}
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        {TASK_PRIORITIES.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Détails / Notes complémentaires</Label>
              <Textarea
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Précisions sur l'intervention, ordre du jour, lien visio..."
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between pt-2 border-t border-slate-100">
            {editingEvent ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteEvent(editingEvent.id, editingEvent.title)}
                className="text-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Supprimer
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDialogOpen(false)}
                className="text-xs cursor-pointer"
              >
                Annuler
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveEvent}
                disabled={!formTitle.trim() || !formEventDate}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs cursor-pointer"
              >
                {editingEvent ? "Mettre à jour" : "Créer l'événement"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Closure Dialog */}
      <EventClosureDialog
        isOpen={isClosureDialogOpen}
        onClose={() => {
          setIsClosureDialogOpen(false)
          setEventToClose(null)
        }}
        event={eventToClose}
        onConfirmClosure={handleConfirmClosure}
      />
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
