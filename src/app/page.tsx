'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, PRIORITY_COLORS, STATUS_COLORS, EVENT_TYPE_LABELS, formatDate, formatEventDateTime, combineDateAndTime } from '@/lib/utils'
import { AlertCircle, Calendar, CheckCircle2, ClipboardList, Clock, Flame, FolderKanban, Hourglass, Plus } from 'lucide-react'
import { Task, Project, CalendarEvent, WaitingReturn } from '@/lib/types'
import { TaskFollowUpDialog } from '@/components/tasks/TaskFollowUpDialog'
import { TaskFormDialog, TaskFormData } from '@/components/tasks/TaskFormDialog'
import { parseFlexibleEvent, formatFlexibleEventDescription } from '@/lib/flexible-events'
import { 
  fetchWaitingReturns, 
  updateWaitingReturn, 
  getWaitingReturnMetrics,
  formatTaskWithWaitingReturn,
  createWaitingReturn
} from '@/lib/waiting-returns'
import { formatTaskDescriptionWithBlocker } from '@/lib/blockers'
import { formatTaskDescriptionWithProject } from '@/lib/projects'
import { removeWaitingTag } from '@/lib/waiting'

export default function Dashboard() {
  const supabase = createClient()
  const [stats, setStats] = useState({ 
    openTasks: 0, 
    highPriorityTasks: 0, 
    waitingTasksCount: 0,
    waitingDueCount: 0,
    draggingCount: 0,
    activeProjects: 0, 
    upcomingEvents: 0 
  })
  const [highPriorityTasks, setHighPriorityTasks] = useState<Task[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [projectsList, setProjectsList] = useState<Project[]>([])
  const [waitingReturnsList, setWaitingReturnsList] = useState<WaitingReturn[]>([])
  const [upcomingEventsList, setUpcomingEventsList] = useState<CalendarEvent[]>([])
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Smart follow-up modal state
  const [followUpTask, setFollowUpTask] = useState<Task | null>(null)
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false)

  // Task form modal state
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false)
  const [initialFormData, setInitialFormData] = useState<Partial<TaskFormData> | null>(null)
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotificationMsg(msg)
    setTimeout(() => {
      setNotificationMsg(null)
    }, 4000)
  }

  const fetchData = async () => {
    const now = new Date().toISOString()
    
    const [
      openTasksRes,
      highPriorityCountRes,
      activeProjectsRes,
      upcomingEventsRes,
      topTasksRes,
      eventsRes,
      returnsRes,
      allProjectsRes,
      allTasksRes,
      allEventsRes
    ] = await Promise.all([
      supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'fait'),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('priority', 'haute').neq('status', 'fait'),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'EN COURS'),
      supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'à venir'),
      supabase.from('tasks').select('*').eq('priority', 'haute').neq('status', 'fait').order('created_at', { ascending: false }).limit(5),
      supabase.from('events').select('*').neq('status', 'clos').neq('status', 'passé').gte('event_date', now).order('event_date', { ascending: true }).limit(5),
      fetchWaitingReturns(supabase),
      supabase.from('projects').select('*').order('priority_order', { ascending: true }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('event_date', { ascending: true })
    ])

    const activeReturns = (returnsRes || []).filter(r => r.status === 'en attente')
    const waitingDueCount = activeReturns.filter(r => {
      const metrics = getWaitingReturnMetrics(r)
      return metrics.followUpStatus === 'overdue' || metrics.followUpStatus === 'today'
    }).length
    const draggingCount = activeReturns.filter(r => {
      const metrics = getWaitingReturnMetrics(r)
      return metrics.isDragging
    }).length

    setStats({
      openTasks: openTasksRes.count || 0,
      highPriorityTasks: highPriorityCountRes.count || 0,
      waitingTasksCount: activeReturns.length,
      waitingDueCount,
      draggingCount,
      activeProjects: activeProjectsRes.count || 0,
      upcomingEvents: upcomingEventsRes.count || 0
    })

    if (topTasksRes.data) setHighPriorityTasks(topTasksRes.data)
    if (allTasksRes.data) setAllTasks(allTasksRes.data)
    if (allProjectsRes.data) setProjectsList(allProjectsRes.data)
    setWaitingReturnsList(activeReturns)
    if (eventsRes.data) setUpcomingEventsList(eventsRes.data)
    if (allEventsRes.data) setAllEvents(allEventsRes.data as CalendarEvent[])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSaveTask = async (formData: TaskFormData) => {
    let finalDescription = formatTaskDescriptionWithBlocker(
      formData.description,
      formData.blocker
    )

    const returnId = formData.blocker.type === 'waiting'
      ? (formData.blocker.prereqReturnId || formData.blocker.prereqTaskId || formData.waitingReturnId || null)
      : (formData.waitingReturnId || null)

    if (returnId) {
      finalDescription = formatTaskWithWaitingReturn(finalDescription, returnId)
    } else {
      finalDescription = formatTaskWithWaitingReturn(finalDescription, null)
      finalDescription = removeWaitingTag(finalDescription)
    }

    finalDescription = formatTaskDescriptionWithProject(finalDescription, formData.projectId || null)

    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        title: formData.title,
        description: finalDescription,
        category: formData.category,
        priority: formData.priority,
        status: formData.status
      }])
      .select()
      .single()

    if (data && !error) {
      setIsTaskFormOpen(false)
      setInitialFormData(null)

      if (formData.createAlsoEvent) {
        const baseEventDate = formData.eventDate || new Date().toISOString().split('T')[0]
        const eventDate = combineDateAndTime(baseEventDate, formData.eventTime)
        const eventType = formData.eventType || 'échéance'
        let finalEndDate = formData.eventEndDate ? combineDateAndTime(formData.eventEndDate, formData.eventTime) : null
        if (formData.eventIsFlexible && !finalEndDate) {
          const d = new Date(baseEventDate + 'T00:00:00')
          d.setDate(d.getDate() + 14)
          finalEndDate = d.toISOString().split('T')[0]
        }
        const baseDesc = formData.description.trim() || ''
        const finalDesc = formData.eventIsFlexible 
          ? formatFlexibleEventDescription(baseDesc, formData.eventFlexLabel || 'Dans les 2 prochaines semaines')
          : baseDesc

        await supabase
          .from('events')
          .insert([{
            title: formData.title,
            description: finalDesc,
            event_date: eventDate,
            end_date: formData.eventIsFlexible ? finalEndDate : null,
            event_type: eventType,
            status: 'à venir',
            task_id: data.id,
            vendor_id: null
          }])
      }

      showNotification(`✓ Tâche "${formData.title}" créée avec succès !`)
      fetchData()
    }
  }

  const handleMarkReturnReceived = async (returnItem: WaitingReturn) => {
    await updateWaitingReturn(supabase, returnItem.id, { status: 'reçu' })
    
    // Débloquer ou reprendre les tâches qui attendaient ce retour
    const { data: allTasksData } = await supabase.from('tasks').select('*')
    if (allTasksData) {
      for (const t of allTasksData) {
        if (t.status === 'en attente de retour externe' && t.description?.includes(`[waiting_return:${returnItem.id}]`)) {
          await supabase.from('tasks').update({
            status: 'en cours',
            updated_at: new Date().toISOString()
          }).eq('id', t.id)
        }
      }
    }

    setWaitingReturnsList(prev => prev.filter(r => r.id !== returnItem.id))
    setStats(prev => ({
      ...prev,
      waitingTasksCount: Math.max(0, prev.waitingTasksCount - 1),
    }))
  }

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.status === 'en cours' ? 'fait' : 'en cours'
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', task.id)
    
    if (!error) {
      setHighPriorityTasks(prev => 
        prev.map(t => t.id === task.id ? { ...t, status: newStatus as any } : t)
      )
      if (newStatus === 'fait') {
        setFollowUpTask(task)
        setIsFollowUpOpen(true)
      }
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement du tableau de bord...</div>

  return (
    <div className="space-y-6">
      {/* Header avec action Nouvelle tâche */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tableau de Bord IT</h1>
        <Button 
          onClick={() => {
            setInitialFormData(null)
            setIsTaskFormOpen(true)
          }} 
          className="flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Nouvelle tâche
        </Button>
      </div>

      {/* Notification banner */}
      {notificationMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3.5 rounded-xl flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{notificationMsg}</span>
        </div>
      )}

      {/* Stats Cards cliquables avec filtrage ciblé */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Link href="/taches?tab=a-traiter" className="block group" title="Voir les tâches ouvertes à traiter">
          <Card className="transition-all duration-200 group-hover:border-blue-400 group-hover:shadow-md cursor-pointer h-full">
            <CardContent className="flex items-center gap-3.5 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 group-hover:text-blue-600 transition-colors">Tâches ouvertes</p>
                <h2 className="text-2xl font-bold text-slate-900">{stats.openTasks}</h2>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/taches?tab=urgentes" className="block group" title="Voir uniquement les tâches urgentes / priorité haute">
          <Card className="transition-all duration-200 border-red-200 group-hover:border-red-500 group-hover:shadow-md cursor-pointer h-full bg-red-50/20">
            <CardContent className="flex items-center gap-3.5 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors shrink-0">
                <Flame className="h-5 w-5 fill-red-500 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-xs font-bold text-red-600">Priorité haute</p>
                  <span className="text-[9px] font-black bg-red-600 text-white px-1.5 py-0.2 rounded uppercase">Urgent</span>
                </div>
                <h2 className="text-2xl font-bold text-red-700">{stats.highPriorityTasks}</h2>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/en-attente" className="block group" title="Voir les dossiers en attente de retour externe">
          <Card className={cn(
            "transition-all duration-200 group-hover:border-amber-400 group-hover:shadow-md cursor-pointer h-full",
            stats.waitingDueCount > 0 ? "border-amber-300 bg-amber-50/30" : ""
          )}>
            <CardContent className="flex items-center gap-3.5 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
                <Hourglass className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-xs font-semibold text-slate-500 group-hover:text-amber-700 transition-colors">
                    En attente tiers
                  </p>
                  {stats.waitingDueCount > 0 && (
                    <span className="text-[9px] font-black bg-red-600 text-white px-1.5 py-0.2 rounded uppercase animate-pulse">
                      {stats.waitingDueCount} relance{stats.waitingDueCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{stats.waitingTasksCount}</h2>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/chantiers?status=EN_COURS" className="block group" title="Voir les chantiers en cours">
          <Card className="transition-all duration-200 group-hover:border-emerald-400 group-hover:shadow-md cursor-pointer h-full">
            <CardContent className="flex items-center gap-3.5 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                <FolderKanban className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 group-hover:text-emerald-600 transition-colors">Chantiers</p>
                <h2 className="text-2xl font-bold text-slate-900">{stats.activeProjects}</h2>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/calendrier?filter=a_venir" className="block group" title="Voir les événements à venir">
          <Card className="transition-all duration-200 group-hover:border-purple-400 group-hover:shadow-md cursor-pointer h-full">
            <CardContent className="flex items-center gap-3.5 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 group-hover:text-purple-600 transition-colors">Événements</p>
                <h2 className="text-2xl font-bold text-slate-900">{stats.upcomingEvents}</h2>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Colonne 1 : Actions prioritaires & Section En attente de tiers */}
        <div className="space-y-6">
          <Card className="border-red-200 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-red-700 text-base font-bold">
                  <Flame className="h-5 w-5 fill-red-500 text-red-600 animate-pulse" />
                  Actions prioritaires ({highPriorityTasks.length})
                </CardTitle>
                <Link 
                  href="/taches?tab=urgentes" 
                  className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline flex items-center gap-1"
                >
                  Filtrer les urgences &rarr;
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {highPriorityTasks.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune action prioritaire en attente.</p>
              ) : (
                highPriorityTasks.map(task => (
                  <div key={task.id} className="flex items-start justify-between rounded-lg border border-red-200 border-l-[5px] border-l-red-600 bg-red-50/40 p-3.5 shadow-xs transition-colors hover:bg-red-50/70">
                    <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-sm shadow-xs uppercase tracking-wider shrink-0">
                          <Flame className="w-3 h-3 fill-amber-300 text-amber-300" /> URGENT
                        </span>
                        <h4 className="font-bold text-slate-950 text-sm truncate" title={task.title}>{task.title}</h4>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs border-red-200 bg-white text-slate-700">{task.category}</Badge>
                        <Badge className={cn("text-xs font-semibold", STATUS_COLORS[task.status])}>{task.status}</Badge>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="shrink-0 font-medium hover:bg-red-100 border-red-200 text-red-900 cursor-pointer"
                      onClick={() => toggleTaskStatus(task)}
                    >
                      {task.status === 'en cours' ? 'Terminer' : 'Reprendre'}
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Section "En attente de retour externe & Relances" */}
          <Card className={cn(
            "shadow-xs transition-all",
            stats.waitingDueCount > 0 ? "border-amber-300" : "border-slate-200"
          )}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                    <Hourglass className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      Retours attendus ({waitingReturnsList.length})
                    </CardTitle>
                    <p className="text-[11px] text-slate-500">
                      Balle dans leur camp • Délais & relances
                    </p>
                  </div>
                </div>
                <Link
                  href="/en-attente"
                  className="text-xs font-semibold text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1"
                >
                  Voir la rubrique &rarr;
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {waitingReturnsList.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed">
                  Aucun retour en attente de tiers. La balle est toujours dans votre camp !
                </div>
              ) : (
                waitingReturnsList.slice(0, 5).map(returnItem => {
                  const metrics = getWaitingReturnMetrics(returnItem)
                  return (
                    <div
                      key={returnItem.id}
                      className={cn(
                        "rounded-xl border p-3.5 text-xs space-y-2 transition-all shadow-2xs",
                        metrics.isDragging 
                          ? "border-l-[5px] border-l-red-600 border-red-200 bg-red-50/40 hover:bg-red-50/60" 
                          : metrics.isWarning
                          ? "border-l-[5px] border-l-amber-600 border-amber-200 bg-amber-50/30 hover:bg-amber-50/50"
                          : "border-l-[5px] border-l-amber-500 border-slate-200 bg-slate-50/60 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-slate-900 text-sm truncate" title={returnItem.title}>
                            {returnItem.title}
                          </h4>
                          <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-amber-950">
                              Attente de : <strong className="underline decoration-amber-400">{returnItem.waiting_on}</strong> ({returnItem.target_type || 'Prestataire'})
                            </span>
                            <span>•</span>
                            <span className="text-slate-600">Depuis <strong>{metrics.daysWaiting} j</strong></span>
                            {metrics.isDragging && (
                              <span className="bg-red-600 text-white font-black text-[9px] px-1.5 py-0.2 rounded uppercase">
                                ⚠️ Traîne
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkReturnReceived(returnItem)}
                          title="Le tiers a répondu : consigner la réponse reçue"
                          className="h-7 px-2.5 text-[11px] border-emerald-300 text-emerald-800 hover:bg-emerald-100 shrink-0 font-semibold cursor-pointer shadow-2xs"
                        >
                          ✓ Réponse reçue
                        </Button>
                      </div>

                      {/* Échéance de relance */}
                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/70 text-slate-500">
                        <div>
                          {metrics.followUpStatus === 'overdue' && (
                            <span className="font-bold text-red-700 flex items-center gap-1">
                              🚨 Relance en retard ({Math.abs(metrics.daysDiffFollowUp || 0)}j)
                            </span>
                          )}
                          {metrics.followUpStatus === 'today' && (
                            <span className="font-bold text-amber-800 flex items-center gap-1">
                              🔔 À relancer aujourd&apos;hui !
                            </span>
                          )}
                          {metrics.followUpStatus === 'upcoming' && (
                            <span>
                              Relance prévue le <strong>{metrics.formattedFollowUpDate}</strong>
                            </span>
                          )}
                          {metrics.followUpStatus === 'none' && (
                            <span className="italic text-slate-400">Date de relance non fixée</span>
                          )}
                        </div>

                        <Link
                          href="/en-attente"
                          className="text-amber-800 hover:underline font-semibold ml-auto flex items-center gap-1"
                        >
                          Détails rubrique &rarr;
                        </Link>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Événements à venir */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-purple-600" />
                  Événements à venir ({upcomingEventsList.length})
                </CardTitle>
                <Link
                  href="/calendrier?filter=a_venir"
                  className="text-xs font-semibold text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1"
                >
                  Voir tout &rarr;
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingEventsList.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun événement à venir.</p>
              ) : (
                upcomingEventsList.map(event => {
                  const parsed = parseFlexibleEvent(event.description)
                  return (
                    <Link
                      key={event.id}
                      href="/calendrier"
                      className={cn(
                        "flex flex-col gap-2 rounded-lg border p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between transition-colors hover:shadow-xs",
                        parsed.isFlexible 
                          ? "border-l-[5px] border-l-purple-500 border-purple-200 bg-purple-50/25 hover:bg-purple-50/50" 
                          : "hover:bg-slate-50 border-slate-200"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-slate-900 text-sm truncate flex items-center gap-1.5" title={event.title}>
                          {parsed.isFlexible && <span className="text-purple-600 text-xs">⏳</span>}
                          <span>{event.title}</span>
                        </h4>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Calendar className={cn("w-3.5 h-3.5", parsed.isFlexible ? "text-purple-600" : "text-slate-400")} />
                          {parsed.isFlexible && event.end_date ? (
                            <span className="font-semibold text-purple-900">
                              Entre le {formatDate(event.event_date)} et le {formatDate(event.end_date)}
                            </span>
                          ) : (
                            <span>{formatEventDateTime(event.event_date, event.end_date)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        {parsed.isFlexible && (
                          <Badge className="text-[10px] bg-purple-100 text-purple-800 border border-purple-300 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-purple-600" />
                            {parsed.flexLabel}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{event.status}</Badge>
                      </div>
                    </Link>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogue de suite logique sur tâche terminée */}
      <TaskFollowUpDialog
        open={isFollowUpOpen}
        task={followUpTask}
        onClose={() => {
          setIsFollowUpOpen(false)
          setFollowUpTask(null)
        }}
        onRequestCreateTask={(prefill) => {
          setInitialFormData(prefill)
          setIsTaskFormOpen(true)
        }}
        onSuccessMessage={(msg) => {
          showNotification(msg)
          fetchData()
        }}
      />

      {/* Dialogue de création de tâche complète */}
      <TaskFormDialog
        open={isTaskFormOpen}
        onClose={() => {
          setIsTaskFormOpen(false)
          setInitialFormData(null)
        }}
        editingTask={null}
        initialData={initialFormData}
        onBackToFollowUp={followUpTask ? () => {
          setIsTaskFormOpen(false)
          setInitialFormData(null)
          setIsFollowUpOpen(true)
        } : undefined}
        tasks={allTasks}
        events={allEvents}
        waitingReturns={waitingReturnsList}
        projects={projectsList}
        onCreateReturnInline={async (title, waiting_on) => {
          const created = await createWaitingReturn(supabase, {
            title,
            waiting_on,
            target_type: 'Prestataire',
            status: 'en attente'
          })
          if (created) {
            setWaitingReturnsList(prev => [created, ...prev])
          }
          return created
        }}
        onSave={handleSaveTask}
      />
    </div>
  )
}
