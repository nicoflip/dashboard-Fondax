'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'
import { CalendarEvent } from '@/lib/types'
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
import { Calendar as CalendarIcon, Plus, Trash2 } from 'lucide-react'
import { EVENT_TYPES, EVENT_STATUSES, EVENT_TYPE_LABELS, formatDate } from '@/lib/utils'

export default function CalendrierPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  
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

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })
      
    if (!error && data) {
      setEvents(data as CalendarEvent[])
    }
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
    setSelectedEvent(null)
  }

  const handleAdd = async () => {
    const { error } = await supabase.from('events').insert([
      {
        title,
        description,
        event_date: eventDate,
        end_date: endDate || null,
        event_type: eventType,
        status
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
        status
      })
      .eq('id', selectedEvent.id)
      
    if (!error) {
      setIsEditOpen(false)
      fetchEvents()
    }
  }

  const handleDelete = async () => {
    if (!selectedEvent) return
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

  const upcomingEvents = events.filter(e => new Date(e.event_date) >= new Date(new Date().setHours(0,0,0,0)))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Calendrier</h1>
        <Button onClick={() => { resetForm(); setEventDate(new Date().toISOString().split('T')[0]); setIsAddOpen(true); }}>
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

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Événements à venir</h2>
        {loading ? (
          <p>Chargement...</p>
        ) : upcomingEvents.length === 0 ? (
          <p className="text-muted-foreground">Aucun événement à venir.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map(event => {
              const typeLabel = EVENT_TYPE_LABELS[event.event_type] || event.event_type
              const isPastEvent = event.status === 'passé'
              const borderClass = isPastEvent ? 'border-l-4 border-l-slate-400' : 
                                 event.status === 'en attente' ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-blue-500'
              return (
                <Card key={event.id} className={`${borderClass} cursor-pointer hover:bg-slate-50`} onClick={() => handleEventClick({event: {id: event.id}})}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{event.title}</CardTitle>
                      <Badge variant={isPastEvent ? "secondary" : "default"}>{typeLabel}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-slate-500 flex items-center mb-2">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDate(event.event_date)}
                    </div>
                    {event.description && (
                      <p className="text-sm text-slate-700 line-clamp-2">{event.description}</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un événement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de l'événement" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date de fin (optionnelle)</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={eventType} 
                onChange={e => setEventType(e.target.value)}
              >
                {EVENT_TYPES.map(t => (
                  <option key={t} value={t}>{EVENT_TYPE_LABELS[t] || t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={status} 
                onChange={e => setStatus(e.target.value)}
              >
                {EVENT_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Détails..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Annuler</Button>
            <Button onClick={handleAdd}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'événement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre de l'événement" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Date de fin (optionnelle)</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={eventType} 
                onChange={e => setEventType(e.target.value)}
              >
                {EVENT_TYPES.map(t => (
                  <option key={t} value={t}>{EVENT_TYPE_LABELS[t] || t}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={status} 
                onChange={e => setStatus(e.target.value)}
              >
                {EVENT_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Détails..." />
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
