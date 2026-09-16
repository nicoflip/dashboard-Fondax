'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Task, CalendarEvent, TaskStatus } from '@/lib/types'
import { 
  formatTaskDescriptionWithBlocker, 
  checkTaskBlocked, 
  sortTasksWithBlockers 
} from '@/lib/blockers'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskFilters, TaskTab } from '@/components/tasks/TaskFilters'
import { TaskFormDialog, TaskFormData } from '@/components/tasks/TaskFormDialog'
import { TaskScheduleDialog, ScheduleEventData } from '@/components/tasks/TaskScheduleDialog'
import { TaskFollowUpDialog } from '@/components/tasks/TaskFollowUpDialog'
import { TaskWaitingDialog } from '@/components/tasks/TaskWaitingDialog'
import { 
  formatTaskDescriptionWithWaiting, 
  removeWaitingTag, 
  getTaskWaitingDetails 
} from '@/lib/waiting'
import { Plus, CheckCircle2, Flame, Hourglass } from 'lucide-react'

function TasksContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab')
  const urlPriority = searchParams.get('priority')

  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Filters state
  const [activeTab, setActiveTab] = useState<TaskTab>('a-traiter')
  const [filterCat, setFilterCat] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [hideBlocked, setHideBlocked] = useState(false)

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [taskToSchedule, setTaskToSchedule] = useState<Task | null>(null)

  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false)
  const [followUpTask, setFollowUpTask] = useState<Task | null>(null)

  const [isWaitingOpen, setIsWaitingOpen] = useState(false)
  const [taskForWaiting, setTaskForWaiting] = useState<Task | null>(null)

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null)

  // Fetch initial tasks and events
  const fetchTasks = async () => {
    setLoading(true)
    const [tasksRes, eventsRes] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('event_date', { ascending: true })
    ])
    if (tasksRes.data) setTasks(tasksRes.data)
    if (eventsRes.data) setEvents(eventsRes.data as CalendarEvent[])
    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  // Sync tab and priority from URL query parameters
  useEffect(() => {
    if (urlTab === 'urgentes' || urlPriority === 'haute') {
      setActiveTab('urgentes')
      setFilterPriority('haute')
    } else if (urlTab === 'a-traiter') {
      setActiveTab('a-traiter')
      setFilterPriority('all')
    } else if (urlTab === 'en-attente') {
      setActiveTab('en-attente')
    } else if (urlTab === 'terminees') {
      setActiveTab('terminees')
    } else if (urlTab === 'toutes') {
      setActiveTab('toutes')
    }
  }, [urlTab, urlPriority])

  // Notification helper
  const showNotification = (msg: string) => {
    setNotificationMsg(msg)
    setTimeout(() => setNotificationMsg(null), 4000)
  }

  // Task status change
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const currentTask = tasks.find(t => t.id === taskId)
    let updatedDesc = currentTask?.description || null

    if (newStatus === 'en cours' && currentTask?.description) {
      updatedDesc = removeWaitingTag(currentTask.description)
    }

    const { error } = await supabase
      .from('tasks')
      .update({ 
        status: newStatus,
        description: updatedDesc,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)

    if (!error) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, description: updatedDesc } : t))
      if (newStatus === 'fait') {
        const found = tasks.find(t => t.id === taskId)
        if (found) {
          setFollowUpTask({ ...found, status: 'fait' })
          setIsFollowUpOpen(true)
        }
      } else if (newStatus === 'en attente de retour externe') {
        const found = tasks.find(t => t.id === taskId)
        if (found) {
          setTaskForWaiting(found)
          setIsWaitingOpen(true)
        }
      }
    }
  }

  // Enregistrement spécifique pour le dialogue d'attente
  const handleSaveWaiting = async (taskId: string, newStatus: TaskStatus, newDescription: string) => {
    const { error } = await supabase.from('tasks').update({
      status: newStatus,
      description: newDescription,
      updated_at: new Date().toISOString()
    }).eq('id', taskId)

    if (!error) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, description: newDescription } : t))
      if (newStatus === 'en cours') {
        showNotification('✓ Réponse consignée : tâche reprise en cours !')
      } else {
        showNotification('✓ Suivi d\'attente et relance enregistrés !')
      }
    }
  }

  // Delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette tâche ?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== taskId))
    }
  }

  // Save task (create or update)
  const handleSaveTask = async (formData: TaskFormData) => {
    let finalDescription = formatTaskDescriptionWithBlocker(
      formData.description,
      formData.blocker
    )

    if (formData.status === 'en attente de retour externe') {
      finalDescription = formatTaskDescriptionWithWaiting(finalDescription, {
        waitingOn: formData.waitingOn || '',
        followUpDate: formData.followUpDate || '',
      })
    } else {
      finalDescription = removeWaitingTag(finalDescription)
    }

    if (editingTask) {
      const wasFait = editingTask.status === 'fait'
      const isNowFait = formData.status === 'fait'

      const { data, error } = await supabase
        .from('tasks')
        .update({
          title: formData.title,
          description: finalDescription,
          category: formData.category,
          priority: formData.priority,
          status: formData.status
        })
        .eq('id', editingTask.id)
        .select()
        .single()

      if (data && !error) {
        setTasks(prev => prev.map(t => t.id === data.id ? data : t))
        setIsFormOpen(false)
        if (!wasFait && isNowFait) {
          setFollowUpTask(data)
          setIsFollowUpOpen(true)
        }
      }
    } else {
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
        setTasks(prev => [data, ...prev])
        setIsFormOpen(false)

        if (formData.createAlsoEvent) {
          const eventDate = formData.eventDate || new Date().toISOString().split('T')[0]
          const eventType = formData.eventType || 'échéance'
          const { data: newEvent, error: evError } = await supabase
            .from('events')
            .insert([{
              title: formData.title.trim(),
              description: formData.description.trim() || null,
              event_date: eventDate,
              end_date: null,
              event_type: eventType,
              status: 'à venir',
              task_id: data.id,
              vendor_id: null
            }])
            .select()
            .single()

          if (!evError && newEvent) {
            setEvents(prev => [...prev, newEvent as CalendarEvent])
            showNotification(`Tâche et événement éponyme créés avec succès !`)
          } else {
            showNotification(`Tâche créée avec succès !`)
          }
        } else {
          showNotification(`Tâche créée avec succès !`)
        }

        if (data.status === 'fait') {
          setFollowUpTask(data)
          setIsFollowUpOpen(true)
        }
      }
    }
  }

  // Schedule task to calendar
  const handleScheduleTask = async (eventData: ScheduleEventData) => {
    const { error } = await supabase.from('events').insert([eventData])
    if (!error) {
      setIsScheduleOpen(false)
      showNotification(`Tâche planifiée au calendrier avec succès !`)
    }
  }

  // Waiting metrics computation
  const waitingTasks = useMemo(() => tasks.filter(t => t.status === 'en attente de retour externe'), [tasks])
  const waitingDueCount = useMemo(() => {
    return waitingTasks.filter(t => {
      const { metrics } = getTaskWaitingDetails(t)
      return metrics.followUpStatus === 'overdue' || metrics.followUpStatus === 'today'
    }).length
  }, [waitingTasks])
  const draggingCount = useMemo(() => {
    return waitingTasks.filter(t => {
      const { metrics } = getTaskWaitingDetails(t)
      return metrics.isDragging
    }).length
  }, [waitingTasks])

  // Counts for filter tabs
  const tabCounts = useMemo(() => ({
    urgentes: tasks.filter(t => t.priority === 'haute' && t.status !== 'fait').length,
    aTraiter: tasks.filter(t => ['à faire', 'en cours'].includes(t.status)).length,
    enAttente: waitingTasks.length,
    waitingDueCount,
    terminees: tasks.filter(t => t.status === 'fait').length,
    toutes: tasks.length
  }), [tasks, waitingTasks, waitingDueCount])

  // Filtered & sorted tasks
  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter(task => {
      // Tab filter
      if (activeTab === 'urgentes' && (task.priority !== 'haute' || task.status === 'fait')) return false
      if (activeTab === 'a-traiter' && !['à faire', 'en cours'].includes(task.status)) return false
      if (activeTab === 'en-attente' && task.status !== 'en attente de retour externe') return false
      if (activeTab === 'terminees' && task.status !== 'fait') return false

      // Dropdown filters
      if (filterCat !== 'all' && task.category !== filterCat) return false
      if (filterStatus !== 'all' && task.status !== filterStatus) return false
      if (filterPriority !== 'all' && task.priority !== filterPriority) return false

      // Masquage optionnel des tâches bloquées
      if (hideBlocked && task.status !== 'fait') {
        const { isBlocked } = checkTaskBlocked(task, tasks, events)
        if (isBlocked) return false
      }

      return true
    })

    return sortTasksWithBlockers(filtered, events)
  }, [tasks, events, activeTab, filterCat, filterStatus, filterPriority, hideBlocked])

  const activeTasks = useMemo(() => filteredTasks.filter(t => t.status !== 'fait'), [filteredTasks])
  const doneTasks = useMemo(() => filteredTasks.filter(t => t.status === 'fait'), [filteredTasks])
  const blockedCount = useMemo(() => tasks.filter(t => t.status !== 'fait' && checkTaskBlocked(t, tasks, events).isBlocked).length, [tasks, events])

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Chargement des tâches...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tâches</h1>
        <Button 
          onClick={() => {
            setEditingTask(null)
            setIsFormOpen(true)
          }} 
          className="flex items-center gap-2 cursor-pointer"
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

      {/* Barre de filtres et onglets */}
      <TaskFilters
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab)
          if (tab === 'urgentes') setFilterPriority('haute')
          else setFilterPriority('all')
        }}
        counts={tabCounts}
        filterCat={filterCat}
        onFilterCatChange={setFilterCat}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        filterPriority={filterPriority}
        onFilterPriorityChange={setFilterPriority}
        hideBlocked={hideBlocked}
        onToggleHideBlocked={() => setHideBlocked(h => !h)}
        blockedCount={blockedCount}
        totalDisplayed={filteredTasks.length}
      />

      {/* Bandeau explicatif & stats spécifiques à l'onglet "En attente" */}
      {activeTab === 'en-attente' && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/90 via-white to-amber-50/40 p-4 shadow-xs space-y-3 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-amber-100 pb-3">
            <div className="flex items-center gap-3 text-amber-950">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Hourglass className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  Délégation & Tâches en attente
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    Balle dans leur camp
                  </span>
                </h2>
                <p className="text-xs text-slate-600">
                  Ces tâches sont bloquées par l&apos;attente d&apos;une réponse ou d&apos;une action externe (prestataire, direction, collègue).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white text-slate-700 border border-slate-200 shadow-2xs">
                Total : <strong>{tabCounts.enAttente}</strong> dossier(s)
              </span>
              {tabCounts.waitingDueCount !== undefined && tabCounts.waitingDueCount > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-red-600 text-white shadow-2xs animate-pulse">
                  🔔 {tabCounts.waitingDueCount} relance(s) due(s)
                </span>
              )}
              {draggingCount > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-900 text-amber-100 shadow-2xs">
                  ⚠️ {draggingCount} qui traîne(nt) (&gt; 7j)
                </span>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
            <span>
              💡 <strong>Gestion rapide :</strong> Cliquez sur <em>« Gérer relance »</em> pour consigner un rappel, ou sur <em>« Réponse reçue »</em> dès que le retour arrive pour remettre la tâche en cours.
            </span>
          </div>
        </div>
      )}

      {/* Liste des tâches */}
      {filteredTasks.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-slate-500 border-dashed">
          <Flame className="w-10 h-10 text-slate-300 mb-2" />
          <p className="font-medium text-slate-600">Aucune tâche ne correspond aux critères sélectionnés.</p>
          {activeTab === 'urgentes' && (
            <p className="text-xs text-slate-400 mt-1">Bonne nouvelle ! Aucune tâche prioritaire en attente.</p>
          )}
          {activeTab === 'en-attente' && (
            <p className="text-xs text-slate-400 mt-1">Aucune tâche en attente de retour externe actuellement.</p>
          )}
        </Card>
      ) : (
        <div className="space-y-10">
          {/* Section 1 : Tâches actives / prioritaires */}
          {activeTab !== 'terminees' && (
            <div>
              {activeTasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed rounded-lg bg-slate-50/50">
                  Toutes les tâches sélectionnées sont terminées et rangées tout en bas de page ci-dessous.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {activeTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      allTasks={tasks}
                      allEvents={events}
                      onEdit={(t) => {
                        setEditingTask(t)
                        setIsFormOpen(true)
                      }}
                      onDelete={handleDeleteTask}
                      onSchedule={(t) => {
                        setTaskToSchedule(t)
                        setIsScheduleOpen(true)
                      }}
                      onStatusChange={handleStatusChange}
                      onManageWaiting={(t) => {
                        setTaskForWaiting(t)
                        setIsWaitingOpen(true)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 2 : Tâches terminées reléguées en bas de page */}
          {(activeTab === 'terminees' || (activeTab === 'toutes' && doneTasks.length > 0)) && (
            <div className="pt-8 border-t border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                    Tâches terminées ({doneTasks.length})
                  </h2>
                  <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                    — Rangées tout en bas de page pour ne pas encombrer l'espace actif
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {doneTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    allTasks={tasks}
                    allEvents={events}
                    onEdit={(t) => {
                      setEditingTask(t)
                      setIsFormOpen(true)
                    }}
                    onDelete={handleDeleteTask}
                    onSchedule={(t) => {
                      setTaskToSchedule(t)
                      setIsScheduleOpen(true)
                    }}
                    onStatusChange={handleStatusChange}
                    onManageWaiting={(t) => {
                      setTaskForWaiting(t)
                      setIsWaitingOpen(true)
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialogues */}
      <TaskFormDialog
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingTask(null)
        }}
        editingTask={editingTask}
        tasks={tasks}
        events={events}
        onSave={handleSaveTask}
      />

      <TaskScheduleDialog
        open={isScheduleOpen}
        onClose={() => {
          setIsScheduleOpen(false)
          setTaskToSchedule(null)
        }}
        task={taskToSchedule}
        onSchedule={handleScheduleTask}
      />

      <TaskFollowUpDialog
        open={isFollowUpOpen}
        task={followUpTask}
        onClose={() => {
          setIsFollowUpOpen(false)
          setFollowUpTask(null)
        }}
        onSuccessMessage={(msg) => {
          showNotification(msg)
          fetchTasks()
        }}
      />

      <TaskWaitingDialog
        open={isWaitingOpen}
        task={taskForWaiting}
        onClose={() => {
          setIsWaitingOpen(false)
          setTaskForWaiting(null)
        }}
        onSave={handleSaveWaiting}
      />
    </div>
  )
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Chargement des tâches...</div>}>
      <TasksContent />
    </Suspense>
  )
}
