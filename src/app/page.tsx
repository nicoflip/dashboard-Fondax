'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, PRIORITY_COLORS, STATUS_COLORS, EVENT_TYPE_LABELS, formatDate } from '@/lib/utils'
import { AlertCircle, Calendar, CheckCircle2, ClipboardList, Clock, Flame, FolderKanban } from 'lucide-react'
import { Task, Project, CalendarEvent } from '@/lib/types'
import { TaskFollowUpDialog } from '@/components/tasks/TaskFollowUpDialog'

export default function Dashboard() {
  const supabase = createClient()
  const [stats, setStats] = useState({ openTasks: 0, highPriorityTasks: 0, activeProjects: 0, upcomingEvents: 0 })
  const [highPriorityTasks, setHighPriorityTasks] = useState<Task[]>([])
  const [upcomingEventsList, setUpcomingEventsList] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Smart follow-up modal state
  const [followUpTask, setFollowUpTask] = useState<Task | null>(null)
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false)

  useEffect(() => {
    async function fetchData() {
      const now = new Date().toISOString()
      
      const [
        openTasksRes,
        highPriorityCountRes,
        activeProjectsRes,
        upcomingEventsRes,
        topTasksRes,
        eventsRes
      ] = await Promise.all([
        supabase.from('tasks').select('*', { count: 'exact', head: true }).neq('status', 'fait'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('priority', 'haute').neq('status', 'fait'),
        supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'EN COURS'),
        supabase.from('events').select('*', { count: 'exact', head: true }).eq('status', 'à venir'),
        supabase.from('tasks').select('*').eq('priority', 'haute').neq('status', 'fait').order('created_at', { ascending: false }).limit(5),
        supabase.from('events').select('*').gte('event_date', now).order('event_date', { ascending: true }).limit(5)
      ])

      setStats({
        openTasks: openTasksRes.count || 0,
        highPriorityTasks: highPriorityCountRes.count || 0,
        activeProjects: activeProjectsRes.count || 0,
        upcomingEvents: upcomingEventsRes.count || 0
      })

      if (topTasksRes.data) setHighPriorityTasks(topTasksRes.data)
      if (eventsRes.data) setUpcomingEventsList(eventsRes.data)
      setLoading(false)
    }
    fetchData()
  }, [])

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
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tableau de Bord IT</h1>

      {/* Stats Cards cliquables avec filtrage ciblé */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link href="/taches?tab=a-traiter" className="block group" title="Voir les tâches ouvertes à traiter">
          <Card className="transition-all duration-200 group-hover:border-blue-400 group-hover:shadow-md cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <ClipboardList className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 group-hover:text-blue-600 transition-colors">Tâches ouvertes</p>
                <h2 className="text-3xl font-bold text-slate-900">{stats.openTasks}</h2>
              </div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/taches?tab=urgentes" className="block group" title="Voir uniquement les tâches urgentes / priorité haute">
          <Card className="transition-all duration-200 border-red-200 group-hover:border-red-500 group-hover:shadow-md cursor-pointer h-full bg-red-50/20">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                <Flame className="h-6 w-6 fill-red-500 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-red-600">Priorité haute</p>
                  <span className="text-[10px] font-black bg-red-600 text-white px-1.5 py-0.2 rounded uppercase">Urgent</span>
                </div>
                <h2 className="text-3xl font-bold text-red-700">{stats.highPriorityTasks}</h2>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/chantiers?status=EN_COURS" className="block group" title="Voir les chantiers en cours">
          <Card className="transition-all duration-200 group-hover:border-emerald-400 group-hover:shadow-md cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <FolderKanban className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 group-hover:text-emerald-600 transition-colors">Chantiers en cours</p>
                <h2 className="text-3xl font-bold text-slate-900">{stats.activeProjects}</h2>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/calendrier?filter=a_venir" className="block group" title="Voir les événements à venir">
          <Card className="transition-all duration-200 group-hover:border-purple-400 group-hover:shadow-md cursor-pointer h-full">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 group-hover:text-purple-600 transition-colors">Événements à venir</p>
                <h2 className="text-3xl font-bold text-slate-900">{stats.upcomingEvents}</h2>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Actions Prioritaires & Alertes */}
        <div className="space-y-6">
          <Card className="border-red-200 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-red-700">
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Alertes en cours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {highPriorityTasks.length === 0 ? (
                <p className="text-sm text-slate-500">Aucune alerte en cours.</p>
              ) : (
                highPriorityTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 rounded-md border-l-4 border-l-red-500 bg-slate-50 p-3">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-slate-900">{task.title}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Événements à venir */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-slate-500" />
                Événements à venir
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {upcomingEventsList.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun événement à venir.</p>
              ) : (
                upcomingEventsList.map(event => (
                  <div key={event.id} className="flex flex-col gap-2 rounded-lg border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-900">{event.title}</h4>
                      <p className="text-sm text-slate-500">{formatDate(event.event_date)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                      <Badge variant="secondary" className="text-xs">
                        {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{event.status}</Badge>
                    </div>
                  </div>
                ))
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
      />
    </div>
  )
}
