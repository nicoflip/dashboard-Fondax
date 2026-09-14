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
import { Calendar as CalendarIcon, Plus, Trash2, Pencil, CheckCircle2, Flame, Clock } from 'lucide-react'
import { EVENT_TYPES, EVENT_STATUSES, EVENT_TYPE_LABELS, formatDate, cn } from '@/lib/utils'

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
      setDescription(event.description || '')
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
    const { error } = await supabase.from('events').insert([
      {
        title,
        description,
        event_date: eventDate,
        end_date: endDate || null,
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
    const { error } = await supabase
      .from('events')
      .update({
        title,
        description,
        event_date: eventDate,
        end_date: endDate || null,
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
    let color = '#3b82f6' // à venir (blue)
    if (e.status === 'passé') color = '#94a3b8' // gray
    if (e.status === 'en attente') color = '#f59e0b' // amber
    
    return {
      id: e.id,
      title: e.title,
      date: e.event_date.split('T')[0],
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

              const borderClass = isLinkedUrgent 
                ? 'border-l-[5px] border-l-red-600 border-red-200 bg-red-50/20' 
                : isPastEvent 
                ? 'border-l-4 border-l-slate-400' 
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
                        <CardTitle className="text-base truncate" title={event.title}>{event.title}</CardTitle>
                        <div className="text-xs text-slate-500 flex items-center mt-1">
                          <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                          {formatDate(event.event_date)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
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
                    {event.description && (
                      <p className="text-sm text-slate-700 line-clamp-2">{event.description}</p>
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
        <DialogContent>
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
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date de fin (optionnelle)</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
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
        <DialogContent>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Date de fin (optionnelle)</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
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
