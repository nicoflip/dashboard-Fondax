'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { CalendarEvent, Task, Vendor } from '@/lib/types'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

const FullCalendar = dynamic(() => import('@fullcalendar/react'), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-slate-500">Chargement du calendrier...</div>,
})
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogContent } from '@/components/ui/dialog'
import { Calendar as CalendarIcon, Plus, Trash2, Pencil, CheckCircle2, Flame, Clock, Sparkles } from 'lucide-react'
import { EVENT_TYPES, EVENT_STATUSES, EVENT_TYPE_LABELS, formatDate, cn } from '@/lib/utils'

function parseFlexibleEvent(desc: string | null | undefined) {
  if (!desc) return { isFlexible: false, flexLabel: '', cleanDesc: '' }
  const match = desc.match(/^\[Période flexible\s*:\s*([^\]]+)\]\s*\n?([\s\S]*)$/i)
  if (match) {
    return {
      isFlexible: true,
      flexLabel: match[1].trim(),
      cleanDesc: match[2].trim()
    }
  }
  return { isFlexible: false, flexLabel: '', cleanDesc: desc }
}

function getExclusiveEndDate(dateStr: string) {
  const parts = dateStr.split('-').map(Number)
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2] + 1)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return dateStr
}

function getPresetDates(preset: 'two_weeks' | 'this_week' | 'next_week' | 'end_month') {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  if (preset === 'two_weeks') {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14)
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    return {
      label: 'Dans les 2 prochaines semaines',
      startDate: todayStr,
      endDate: endStr
    }
  }
  if (preset === 'this_week') {
    const day = now.getDay()
    const diff = day === 0 ? 0 : 7 - day
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff)
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    return {
      label: 'Cette semaine',
      startDate: todayStr,
      endDate: endStr
    }
  }
  if (preset === 'next_week') {
    const day = now.getDay()
    const daysUntilNextMonday = day === 0 ? 1 : 8 - day
    const nextMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilNextMonday)
    const nextSunday = new Date(nextMonday.getFullYear(), nextMonday.getMonth(), nextMonday.getDate() + 6)
    const startStr = `${nextMonday.getFullYear()}-${String(nextMonday.getMonth() + 1).padStart(2, '0')}-${String(nextMonday.getDate()).padStart(2, '0')}`
    const endStr = `${nextSunday.getFullYear()}-${String(nextSunday.getMonth() + 1).padStart(2, '0')}-${String(nextSunday.getDate()).padStart(2, '0')}`
    return {
      label: 'Semaine prochaine',
      startDate: startStr,
      endDate: endStr
    }
  }
  if (preset === 'end_month') {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const endStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
    return {
      label: "D'ici fin du mois",
      startDate: todayStr,
      endDate: endStr
    }
  }
  return { label: 'Dans les 2 prochaines semaines', startDate: todayStr, endDate: todayStr }
}

function CalendrierContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const urlFilter = searchParams.get('filter')
  const listRef = useRef<HTMLDivElement>(null)

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [eventFilter, setEventFilter] = useState<'TOUS' | 'A_VENIR' | 'PASSE'>('TOUS')
  
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  
  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isFlexible, setIsFlexible] = useState(false)
  const [flexLabel, setFlexLabel] = useState('Dans les 2 prochaines semaines')
  const [eventType, setEventType] = useState('intervention')
  const [status, setStatus] = useState('à venir')
  const [taskId, setTaskId] = useState('')
  const [vendorId, setVendorId] = useState('')

  useEffect(() => {
    if (urlFilter === 'a_venir') {
      setEventFilter('A_VENIR')
      setTimeout(() => {
        listRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 400)
    }
  }, [urlFilter])

  useEffect(() => {
    fetchEvents()
  }, [])

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

  const handleDateClick = (arg: any) => {
    resetForm()
    setEventDate(arg.dateStr)
    setSelectedDate(arg.dateStr)
    setIsAddOpen(true)
  }

  const handleEventClick = (arg: any) => {
    const event = events.find(e => e.id === arg.event.id)
    if (event) {
      setSelectedEvent(event)
      setTitle(event.title)
      const parsed = parseFlexibleEvent(event.description)
      if (parsed.isFlexible) {
        setIsFlexible(true)
        setFlexLabel(parsed.flexLabel)
        setDescription(parsed.cleanDesc)
      } else {
        setIsFlexible(false)
        setFlexLabel('Dans les 2 prochaines semaines')
        setDescription(event.description || '')
      }
      setEventDate(event.event_date.split('T')[0])
      setEndDate(event.end_date ? event.end_date.split('T')[0] : '')
      setEventType(event.event_type)
      setStatus(event.status)
      setTaskId(event.task_id || '')
      setVendorId(event.vendor_id || '')
      setIsEditOpen(true)
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setEventDate('')
    setEndDate('')
    setIsFlexible(false)
    setFlexLabel('Dans les 2 prochaines semaines')
    setEventType('intervention')
    setStatus('à venir')
    setTaskId('')
    setVendorId('')
    setSelectedEvent(null)
  }

  const handleSelectTaskForEvent = (selectedTid: string) => {
    setTaskId(selectedTid)
    if (selectedTid) {
      const t = tasks.find(tsk => tsk.id === selectedTid)
      if (t) {
        if (!title) setTitle(t.title)
        if (!description && t.description) setDescription(t.description)
      }
    }
  }

  const handleAdd = async () => {
    let finalEndDate = endDate || null
    if (isFlexible && !finalEndDate && eventDate) {
      const d = new Date(eventDate)
      d.setDate(d.getDate() + 14)
      finalEndDate = d.toISOString().split('T')[0]
    }
    const finalDesc = isFlexible
      ? `[Période flexible : ${flexLabel || 'Dans les 2 prochaines semaines'}]\n${description}`.trim()
      : description

    const { error } = await supabase.from('events').insert([
      {
        title,
        description: finalDesc,
        event_date: eventDate,
        end_date: finalEndDate,
        event_type: eventType,
        status,
        task_id: taskId || null,
        vendor_id: vendorId || null
      }
    ])
    if (!error) {
      setIsAddOpen(false)
      fetchEvents()
    }
  }

  const handleUpdate = async () => {
    if (!selectedEvent) return
    let finalEndDate = endDate || null
    if (isFlexible && !finalEndDate && eventDate) {
      const d = new Date(eventDate)
      d.setDate(d.getDate() + 14)
      finalEndDate = d.toISOString().split('T')[0]
    }
    const finalDesc = isFlexible
      ? `[Période flexible : ${flexLabel || 'Dans les 2 prochaines semaines'}]\n${description}`.trim()
      : description

    const { error } = await supabase
      .from('events')
      .update({
        title,
        description: finalDesc,
        event_date: eventDate,
        end_date: finalEndDate,
        event_type: eventType,
        status,
        task_id: taskId || null,
        vendor_id: vendorId || null
      })
      .eq('id', selectedEvent.id)
      
    if (!error) {
      setIsEditOpen(false)
      fetchEvents()
    }
  }

  const handleDelete = async () => {
    if (!selectedEvent) return
    if (!window.confirm('Voulez-vous supprimer cet événement du calendrier ?')) return
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', selectedEvent.id)
      
    if (!error) {
      setIsEditOpen(false)
      fetchEvents()
    }
  }

  const calendarEvents = events.map(e => {
    const parsed = parseFlexibleEvent(e.description)
    let color = '#3b82f6' // à venir (blue)
    if (e.status === 'passé') color = '#94a3b8' // gray
    else if (parsed.isFlexible) color = '#8b5cf6' // purple for flexible!
    else if (e.status === 'en attente') color = '#f59e0b' // amber
    
    const startDate = e.event_date.split('T')[0]
    const hasEndDate = !!e.end_date
    const displayTitle = parsed.isFlexible 
      ? `⏳ ${e.title} (~ ${parsed.flexLabel})`
      : e.title

    if (hasEndDate && e.end_date) {
      const exclusiveEnd = getExclusiveEndDate(e.end_date.split('T')[0])
      return {
        id: e.id,
        title: displayTitle,
        start: startDate,
        end: exclusiveEnd,
        allDay: true,
        backgroundColor: color,
        borderColor: color
      }
    }

    return {
      id: e.id,
      title: displayTitle,
      date: startDate,
      allDay: true,
      backgroundColor: color,
      borderColor: color
    }
  })

  const today = new Date(new Date().setHours(0,0,0,0))
  const upcomingEvents = events.filter(e => new Date(e.event_date) >= today)
  const pastEvents = events.filter(e => new Date(e.event_date) < today)
  const displayedEvents = eventFilter === 'A_VENIR' ? upcomingEvents : eventFilter === 'PASSE' ? pastEvents : events

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Calendrier</h1>
        <Button onClick={() => { resetForm(); setEventDate(new Date().toISOString().split('T')[0]); setIsAddOpen(true); }} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" /> Nouvel événement
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale="fr"
            firstDay={1}
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
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            height="auto"
          />
        </CardContent>
      </Card>

      <div ref={listRef} className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            {eventFilter === 'A_VENIR' ? 'Événements à venir' : eventFilter === 'PASSE' ? 'Événements passés' : 'Tous les événements'}
          </h2>

          {/* Filtres d'affichage */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setEventFilter('TOUS')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                eventFilter === 'TOUS' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Tous ({events.length})
            </button>
            <button
              onClick={() => setEventFilter('A_VENIR')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs",
                eventFilter === 'A_VENIR' ? "bg-purple-600 text-white ring-2 ring-purple-300" : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              À venir uniquement ({upcomingEvents.length})
            </button>
            <button
              onClick={() => setEventFilter('PASSE')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                eventFilter === 'PASSE' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Passés ({pastEvents.length})
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500">Chargement...</p>
        ) : displayedEvents.length === 0 ? (
          <p className="text-muted-foreground">Aucun événement ne correspond à ce filtre.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {displayedEvents.map(event => {
              const typeLabel = EVENT_TYPE_LABELS[event.event_type] || event.event_type
              const isPastEvent = event.status === 'passé'
              const linkedTask = tasks.find(t => t.id === event.task_id)
              const linkedVendor = vendors.find(v => v.id === event.vendor_id)
              const isLinkedUrgent = linkedTask?.priority === 'haute'
              const parsed = parseFlexibleEvent(event.description)

              const borderClass = isLinkedUrgent 
                ? 'border-l-[5px] border-l-red-600 border-red-200 bg-red-50/20' 
                : isPastEvent 
                ? 'border-l-4 border-l-slate-400' 
                : parsed.isFlexible
                ? 'border-l-[5px] border-l-purple-500 bg-purple-50/20'
                : event.status === 'en attente' 
                ? 'border-l-4 border-l-amber-500' 
                : 'border-l-4 border-l-blue-500'

              return (
                <Card 
                  key={event.id} 
                  className={`${borderClass} cursor-pointer hover:shadow-sm transition-all`} 
                  onClick={() => handleEventClick({event: {id: event.id}})}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate flex items-center gap-1.5" title={event.title}>
                          {parsed.isFlexible && <span className="text-purple-600 text-sm">⏳</span>}
                          <span>{event.title}</span>
                        </CardTitle>
                        <div className="text-xs text-slate-500 flex items-center mt-1">
                          <CalendarIcon className={cn("mr-1.5 h-3.5 w-3.5", parsed.isFlexible ? "text-purple-600" : "text-slate-400")} />
                          {parsed.isFlexible && event.end_date ? (
                            <span className="font-semibold text-purple-900">
                              Entre le {formatDate(event.event_date)} et le {formatDate(event.end_date)}
                            </span>
                          ) : (
                            <span>{formatDate(event.event_date)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {parsed.isFlexible && (
                          <Badge className="text-[10px] bg-purple-100 text-purple-800 border border-purple-300 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-600" />
                            {parsed.flexLabel}
                          </Badge>
                        )}
                        <Badge variant={isPastEvent ? "secondary" : "default"} className="text-xs">{typeLabel}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Modifier cet événement"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEventClick({ event: { id: event.id } })
                          }}
                          className="h-7 w-7 text-slate-400 hover:text-blue-600 cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Supprimer cet événement"
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (window.confirm('Voulez-vous supprimer cet événement ?')) {
                              await supabase.from('events').delete().eq('id', event.id)
                              fetchEvents()
                            }
                          }}
                          className="h-7 w-7 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {parsed.cleanDesc && (
                      <p className="text-sm text-slate-700 line-clamp-2">{parsed.cleanDesc}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {linkedTask && (
                        isLinkedUrgent ? (
                          <Badge className="text-[11px] bg-red-600 text-white font-bold flex items-center gap-1 shadow-xs border-red-700">
                            <Flame className="w-3 h-3 fill-amber-300 text-amber-300" />
                            Tâche urgente : {linkedTask.title}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-800 border-blue-200">
                            Tâche : {linkedTask.title}
                          </Badge>
                        )
                      )}
                      {linkedVendor && (
                        <Badge variant="outline" className="text-[11px] bg-amber-50 text-amber-800 border-amber-200">
                          Prestataire : {linkedVendor.name}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Dialog: Ajouter un événement */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un événement au calendrier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Lier à une tâche IT existante (optionnel)</Label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                value={taskId}
                onChange={e => handleSelectTaskForEvent(e.target.value)}
              >
                <option value="">-- Aucune tâche liée --</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.category}] {t.title} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Titre de l'événement <span className="text-red-500">*</span></Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de l'événement" />
            </div>

            {/* Sélecteur de date flexible ou date fixe */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-950">Mode Date Flexible</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isFlexible) {
                      const p = getPresetDates('two_weeks')
                      setEventDate(p.startDate)
                      setEndDate(p.endDate)
                      setFlexLabel(p.label)
                      setIsFlexible(true)
                    } else {
                      setIsFlexible(false)
                    }
                  }}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer",
                    isFlexible 
                      ? "bg-purple-600 text-white border-purple-600 shadow-xs" 
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                  )}
                >
                  {isFlexible ? "✓ Flexible activé" : "Activer date flexible"}
                </button>
              </div>

              {isFlexible ? (
                <div className="space-y-3 pt-1 border-t border-purple-200/60">
                  <p className="text-xs text-purple-700">
                    💡 Date exacte inconnue ? Définissez une période estimée (ex: dans les 2 prochaines semaines).
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-500 mr-1">Raccourcis :</span>
                    <button
                      type="button"
                      onClick={() => {
                        const p = getPresetDates('two_weeks')
                        setEventDate(p.startDate)
                        setEndDate(p.endDate)
                        setFlexLabel(p.label)
                      }}
                      className="text-xs px-2.5 py-1 rounded bg-white hover:bg-purple-100 border border-purple-300 text-purple-800 font-semibold cursor-pointer shadow-xs transition-colors"
                    >
                      ⚡ Dans les 2 prochaines semaines
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const p = getPresetDates('this_week')
                        setEventDate(p.startDate)
                        setEndDate(p.endDate)
                        setFlexLabel(p.label)
                      }}
                      className="text-xs px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                    >
                      Cette semaine
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const p = getPresetDates('next_week')
                        setEventDate(p.startDate)
                        setEndDate(p.endDate)
                        setFlexLabel(p.label)
                      }}
                      className="text-xs px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                    >
                      Semaine prochaine
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const p = getPresetDates('end_month')
                        setEventDate(p.startDate)
                        setEndDate(p.endDate)
                        setFlexLabel(p.label)
                      }}
                      className="text-xs px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                    >
                      D'ici fin du mois
                    </button>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-purple-900 font-semibold">Libellé de la période flexible</Label>
                    <Input
                      value={flexLabel}
                      onChange={e => setFlexLabel(e.target.value)}
                      placeholder="Ex: Dans les deux prochaines semaines"
                      className="bg-white border-purple-200 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">Début estimé</Label>
                      <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="bg-white" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">Fin estimée</Label>
                      <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs">Date fixe</Label>
                    <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="bg-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date de fin (optionnelle)</Label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white" />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={eventType} 
                  onChange={e => setEventType(e.target.value as any)}
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t} value={t}>{EVENT_TYPE_LABELS[t] || t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={status} 
                  onChange={e => setStatus(e.target.value as any)}
                >
                  {EVENT_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Lier à un prestataire (optionnel)</Label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                value={vendorId}
                onChange={e => setVendorId(e.target.value)}
              >
                <option value="">-- Aucun prestataire lié --</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Description / Notes</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Détails..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
            <Button onClick={handleAdd} disabled={!title || !eventDate}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Modifier un événement */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l'événement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Lier à une tâche IT (optionnel)</Label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                value={taskId}
                onChange={e => setTaskId(e.target.value)}
              >
                <option value="">-- Aucune tâche liée --</option>
                {tasks.map(t => (
                  <option key={t.id} value={t.id}>
                    [{t.category}] {t.title} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de l'événement" />
            </div>

            {/* Sélecteur de date flexible ou date fixe */}
            <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-950">Mode Date Flexible</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isFlexible) {
                      const p = getPresetDates('two_weeks')
                      setEventDate(p.startDate)
                      setEndDate(p.endDate)
                      setFlexLabel(p.label)
                      setIsFlexible(true)
                    } else {
                      setIsFlexible(false)
                    }
                  }}
                  className={cn(
                    "px-3 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer",
                    isFlexible 
                      ? "bg-purple-600 text-white border-purple-600 shadow-xs" 
                      : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                  )}
                >
                  {isFlexible ? "✓ Flexible activé" : "Activer date flexible"}
                </button>
              </div>

              {isFlexible ? (
                <div className="space-y-3 pt-1 border-t border-purple-200/60">
                  <p className="text-xs text-purple-700">
                    💡 Date exacte inconnue ? Définissez une période estimée (ex: dans les 2 prochaines semaines).
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-500 mr-1">Raccourcis :</span>
                    <button
                      type="button"
                      onClick={() => {
                        const p = getPresetDates('two_weeks')
                        setEventDate(p.startDate)
                        setEndDate(p.endDate)
                        setFlexLabel(p.label)
                      }}
                      className="text-xs px-2.5 py-1 rounded bg-white hover:bg-purple-100 border border-purple-300 text-purple-800 font-semibold cursor-pointer shadow-xs transition-colors"
                    >
                      ⚡ Dans les 2 prochaines semaines
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const p = getPresetDates('this_week')
                        setEventDate(p.startDate)
                        setEndDate(p.endDate)
                        setFlexLabel(p.label)
                      }}
                      className="text-xs px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                    >
                      Cette semaine
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const p = getPresetDates('next_week')
                        setEventDate(p.startDate)
                        setEndDate(p.endDate)
                        setFlexLabel(p.label)
                      }}
                      className="text-xs px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                    >
                      Semaine prochaine
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const p = getPresetDates('end_month')
                        setEventDate(p.startDate)
                        setEndDate(p.endDate)
                        setFlexLabel(p.label)
                      }}
                      className="text-xs px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer"
                    >
                      D'ici fin du mois
                    </button>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-purple-900 font-semibold">Libellé de la période flexible</Label>
                    <Input
                      value={flexLabel}
                      onChange={e => setFlexLabel(e.target.value)}
                      placeholder="Ex: Dans les deux prochaines semaines"
                      className="bg-white border-purple-200 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">Début estimé</Label>
                      <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="bg-white" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-600">Fin estimée</Label>
                      <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs">Date fixe</Label>
                    <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="bg-white" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date de fin (optionnelle)</Label>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white" />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={eventType} 
                  onChange={e => setEventType(e.target.value as any)}
                >
                  {EVENT_TYPES.map(t => (
                    <option key={t} value={t}>{EVENT_TYPE_LABELS[t] || t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={status} 
                  onChange={e => setStatus(e.target.value as any)}
                >
                  {EVENT_STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Lier à un prestataire (optionnel)</Label>
              <select
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                value={vendorId}
                onChange={e => setVendorId(e.target.value)}
              >
                <option value="">-- Aucun prestataire lié --</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Détails..." rows={3} />
            </div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="destructive" onClick={handleDelete}><Trash2 className="h-4 w-4 mr-2"/> Supprimer</Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
              <Button onClick={handleUpdate}>Enregistrer</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function CalendrierPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Chargement du calendrier...</div>}>
      <CalendrierContent />
    </Suspense>
  )
}
