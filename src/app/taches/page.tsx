'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Task, CalendarEvent, TaskStatus, WaitingReturn, Project } from '@/lib/types'
import { 
  formatTaskDescriptionWithBlocker, 
  checkTaskBlocked, 
  sortTasksWithBlockers 
} from '@/lib/blockers'
import { 
  fetchWaitingReturns, 
  createWaitingReturn, 
  formatTaskWithWaitingReturn, 
  extractWaitingReturnId 
} from '@/lib/waiting-returns'
import { 
  formatTaskDescriptionWithProject, 
  isTaskLinkedToChantier, 
  getTaskProject 
} from '@/lib/projects'
import { combineDateAndTime, normalizeTaskCategory, TASK_CATEGORIES } from '@/lib/utils'
import { TaskCard } from '@/components/tasks/TaskCard'
import { TaskFilters, ChantierFilterMode } from '@/components/tasks/TaskFilters'
import { TaskFormDialog, TaskFormData } from '@/components/tasks/TaskFormDialog'
import { TaskScheduleDialog, ScheduleEventData } from '@/components/tasks/TaskScheduleDialog'
import { TaskFollowUpDialog } from '@/components/tasks/TaskFollowUpDialog'
import { TaskWaitingDialog } from '@/components/tasks/TaskWaitingDialog'
import { TaskSelectReturnDialog } from '@/components/tasks/TaskSelectReturnDialog'
import { 
  formatTaskDescriptionWithWaiting, 
  removeWaitingTag, 
  getTaskWaitingDetails 
} from '@/lib/waiting'
import { formatFlexibleEventDescription } from '@/lib/flexible-events'
import { Plus, CheckCircle2, Flame, Hourglass } from 'lucide-react'

function TasksContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab')
  const urlPriority = searchParams.get('priority')

  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [waitingReturns, setWaitingReturns] = useState<WaitingReturn[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  // Filters state
  const [filterCat, setFilterCat] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterChantierMode, setFilterChantierMode] = useState<ChantierFilterMode>('all')
  const [filterProject, setFilterProject] = useState('all')
  const [hideBlocked, setHideBlocked] = useState(false)

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [initialFormData, setInitialFormData] = useState<Partial<TaskFormData> | null>(null)

  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [taskToSchedule, setTaskToSchedule] = useState<Task | null>(null)

  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false)
  const [followUpTask, setFollowUpTask] = useState<Task | null>(null)

  const [isWaitingOpen, setIsWaitingOpen] = useState(false)
  const [taskForWaiting, setTaskForWaiting] = useState<Task | null>(null)

  // Dialogue de sélection du retour attendu
  const [isSelectReturnOpen, setIsSelectReturnOpen] = useState(false)
  const [taskForReturnSelect, setTaskForReturnSelect] = useState<Task | null>(null)

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null)

  // Fetch initial tasks, events and waiting returns
  const fetchTasks = async () => {
    setLoading(true)
    const [tasksRes, eventsRes, returnsRes, projectsRes] = await Promise.all([
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('event_date', { ascending: true }),
      fetchWaitingReturns(supabase),
      supabase.from('projects').select('*').order('priority_order', { ascending: true })
    ])
    if (tasksRes.data) setTasks(tasksRes.data)
    if (eventsRes.data) setEvents(eventsRes.data as CalendarEvent[])
    if (returnsRes) setWaitingReturns(returnsRes)
    if (projectsRes.data) setProjects(projectsRes.data as Project[])
    setLoading(false)
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  // Sync priority from URL query parameters
  useEffect(() => {
    if (urlTab === 'urgentes' || urlPriority === 'haute') {
      setFilterPriority('haute')
    } else if (urlTab === 'a-traiter' || urlTab === 'toutes') {
      setFilterPriority('all')
    } else if (urlTab === 'en-attente') {
      setFilterPriority('en-attente')
    } else if (urlTab === 'terminees') {
      setFilterPriority('terminees')
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
    if (!currentTask) return

    // Si la tâche passe en attente de retour externe -> ouvrir le dialogue pour choisir le retour attendu
    if (newStatus === 'en attente de retour externe') {
      setTaskForReturnSelect(currentTask)
      setIsSelectReturnOpen(true)
      return
    }

    let updatedDesc = currentTask.description || ''

    if (newStatus === 'en cours' || newStatus === 'fait') {
      updatedDesc = removeWaitingTag(updatedDesc)
      // Détacher l'étiquette de retour si la tâche n'est plus en attente
      updatedDesc = formatTaskWithWaitingReturn(updatedDesc, null)
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
      }
    }
  }

  // Associer un retour attendu existant à la tâche sélectionnée
  const handleAssignWaitingReturn = async (returnId: string) => {
    if (!taskForReturnSelect) return
    const updatedDesc = formatTaskWithWaitingReturn(taskForReturnSelect.description || '', returnId)

    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'en attente de retour externe',
        description: updatedDesc,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskForReturnSelect.id)

    if (!error) {
      setTasks(prev => prev.map(t => t.id === taskForReturnSelect.id ? {
        ...t,
        status: 'en attente de retour externe',
        description: updatedDesc
      } : t))
      const returnObj = waitingReturns.find(r => r.id === returnId)
      showNotification(`✓ Tâche mise en attente du retour « ${returnObj?.title || 'tiers'} » !`)
    }
    setIsSelectReturnOpen(false)
    setTaskForReturnSelect(null)
  }

  // Créer un nouveau retour attendu et l'associer immédiatement à la tâche
  const handleCreateAndAssignWaitingReturn = async (data: {
    title: string
    waiting_on: string
    target_type?: string
    follow_up_date?: string
    addToCalendar?: boolean
    calIsFlexible?: boolean
    calDate?: string
    calEndDate?: string
    calFlexLabel?: string
  }) => {
    if (!taskForReturnSelect) return
    const newReturn = await createWaitingReturn(supabase, {
      title: data.title,
      waiting_on: data.waiting_on,
      target_type: data.target_type || 'Prestataire',
      follow_up_date: data.follow_up_date || null,
      status: 'en attente'
    })

    if (newReturn) {
      setWaitingReturns(prev => [newReturn, ...prev])
      const updatedDesc = formatTaskWithWaitingReturn(taskForReturnSelect.description || '', newReturn.id)
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'en attente de retour externe',
          description: updatedDesc,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskForReturnSelect.id)

      if (!error) {
        setTasks(prev => prev.map(t => t.id === taskForReturnSelect.id ? {
          ...t,
          status: 'en attente de retour externe',
          description: updatedDesc
        } : t))

        if (data.addToCalendar) {
          const finalEventDate = data.calDate || data.follow_up_date || new Date().toISOString().split('T')[0]
          let finalEndDate = data.calEndDate || null
          if (data.calIsFlexible && !finalEndDate) {
            const d = new Date(finalEventDate + 'T00:00:00')
            d.setDate(d.getDate() + 14)
            finalEndDate = d.toISOString().split('T')[0]
          }
          const baseDesc = `Retour attendu lié à la tâche « ${taskForReturnSelect.title} ».`
          const finalDesc = data.calIsFlexible
            ? formatFlexibleEventDescription(baseDesc, data.calFlexLabel || 'Dans les 2 prochaines semaines')
            : baseDesc

          const { data: newEv } = await supabase
            .from('events')
            .insert([{
              title: `Retour attendu : ${data.title.trim()} (${data.waiting_on.trim()})`,
              description: finalDesc,
              event_date: finalEventDate,
              end_date: data.calIsFlexible ? finalEndDate : null,
              event_type: 'échéance',
              status: 'à venir',
              task_id: taskForReturnSelect.id,
              vendor_id: null
            }])
            .select()
            .single()

          if (newEv) {
            setEvents(prev => [...prev, newEv as CalendarEvent])
          }
        }

        showNotification(`✓ Nouveau retour « ${newReturn.title} » créé et lié à la tâche${data.addToCalendar ? ' (avec rappel au calendrier)' : ''} !`)
      }
    }
    setIsSelectReturnOpen(false)
    setTaskForReturnSelect(null)
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

    const returnId = formData.blocker.type === 'waiting'
      ? (formData.blocker.prereqReturnId || formData.blocker.prereqTaskId || formData.waitingReturnId || null)
      : (formData.waitingReturnId || null)

    if (returnId) {
      finalDescription = formatTaskWithWaitingReturn(finalDescription, returnId)
    } else {
      finalDescription = formatTaskWithWaitingReturn(finalDescription, null)
      finalDescription = removeWaitingTag(finalDescription)
    }

    // Rattachement au chantier IT sélectionné
    finalDescription = formatTaskDescriptionWithProject(finalDescription, formData.projectId || null)

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
            : (baseDesc || null)

          const { data: newEvent, error: evError } = await supabase
            .from('events')
            .insert([{
              title: formData.title.trim(),
              description: finalDesc,
              event_date: eventDate,
              end_date: formData.eventIsFlexible ? finalEndDate : (finalEndDate || null),
              event_type: eventType,
              status: 'à venir',
              task_id: data.id,
              vendor_id: null
            }])
            .select()
            .single()

          if (!evError && newEvent) {
            setEvents(prev => [...prev, newEvent as CalendarEvent])
            showNotification(
              formData.eventIsFlexible
                ? `Tâche et événement éponyme en période flexible créés avec succès !`
                : `Tâche et événement éponyme créés avec succès !`
            )
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

  // Counts for filter tabs and chantier isolation
  const tabCounts = useMemo(() => ({
    urgentes: tasks.filter(t => t.priority === 'haute' && t.status !== 'fait').length,
    aTraiter: tasks.filter(t => ['à faire', 'en cours'].includes(t.status)).length,
    enAttente: waitingTasks.length,
    waitingDueCount,
    terminees: tasks.filter(t => t.status === 'fait').length,
    toutes: tasks.length,
    withChantier: tasks.filter(t => isTaskLinkedToChantier(t, projects)).length,
    withoutChantier: tasks.filter(t => !isTaskLinkedToChantier(t, projects)).length
  }), [tasks, waitingTasks, waitingDueCount, projects])

  // Counts by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    TASK_CATEGORIES.forEach(cat => { counts[cat] = 0 })
    tasks.forEach(t => {
      const norm = normalizeTaskCategory(t.category)
      counts[norm] = (counts[norm] || 0) + 1
    })
    return counts
  }, [tasks])

  // Counts by priority
  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = {
      haute: tasks.filter(t => t.priority === 'haute' && t.status !== 'fait').length,
      moyenne: tasks.filter(t => t.priority === 'moyenne' && t.status !== 'fait').length,
      basse: tasks.filter(t => t.priority === 'basse' && t.status !== 'fait').length,
    }
    return counts
  }, [tasks])

  // Filtered & sorted tasks
  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter(task => {
      // Priority / Status filter
      if (filterPriority === 'haute') {
        if (task.priority !== 'haute' || task.status === 'fait') return false
      } else if (filterPriority === 'moyenne') {
        if (task.priority !== 'moyenne' || task.status === 'fait') return false
      } else if (filterPriority === 'basse') {
        if (task.priority !== 'basse' || task.status === 'fait') return false
      } else if (filterPriority === 'en-attente') {
        if (task.status !== 'en attente de retour externe') return false
      } else if (filterPriority === 'terminees') {
        if (task.status !== 'fait') return false
      }

      // Chantier Isolation Filter
      if (filterChantierMode === 'with_chantier') {
        if (!isTaskLinkedToChantier(task, projects)) return false
      } else if (filterChantierMode === 'without_chantier') {
        if (isTaskLinkedToChantier(task, projects)) return false
      }

      // Specific Project Filter
      if (filterProject !== 'all') {
        const p = getTaskProject(task, projects)
        if (!p || p.id !== filterProject) return false
      }

      // Dropdown filters (avec normalisation de la catégorie)
      if (filterCat !== 'all' && normalizeTaskCategory(task.category) !== filterCat) return false
      if (filterStatus !== 'all' && task.status !== filterStatus) return false

      // Masquage optionnel des tâches bloquées
      if (hideBlocked && task.status !== 'fait') {
        const { isBlocked } = checkTaskBlocked(task, tasks, events, waitingReturns)
        if (isBlocked) return false
      }

      return true
    })

    return sortTasksWithBlockers(filtered, events, waitingReturns)
  }, [tasks, events, waitingReturns, projects, filterChantierMode, filterProject, filterCat, filterStatus, filterPriority, hideBlocked])

  const activeTasks = useMemo(() => filteredTasks.filter(t => t.status !== 'fait'), [filteredTasks])
  const doneTasks = useMemo(() => filteredTasks.filter(t => t.status === 'fait'), [filteredTasks])
  const blockedCount = useMemo(() => tasks.filter(t => t.status !== 'fait' && checkTaskBlocked(t, tasks, events, waitingReturns).isBlocked).length, [tasks, events, waitingReturns])

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
            setInitialFormData(null)
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
        counts={tabCounts}
        categoryCounts={categoryCounts}
        priorityCounts={priorityCounts}
        filterCat={filterCat}
        onFilterCatChange={setFilterCat}
        filterStatus={filterStatus}
        onFilterStatusChange={setFilterStatus}
        filterPriority={filterPriority}
        onFilterPriorityChange={setFilterPriority}
        filterChantierMode={filterChantierMode}
        onFilterChantierModeChange={setFilterChantierMode}
        filterProject={filterProject}
        onFilterProjectChange={setFilterProject}
        projects={projects}
        hideBlocked={hideBlocked}
        onToggleHideBlocked={() => setHideBlocked(h => !h)}
        blockedCount={blockedCount}
        totalDisplayed={filteredTasks.length}
      />

      {/* Bandeau explicatif & stats spécifiques au filtre "En attente" */}
      {filterPriority === 'en-attente' && (
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
          {filterCat !== 'all' && (
            <p className="text-xs text-blue-600 font-semibold mt-1">
              💡 Le sujet « {filterCat} » est sélectionné ({categoryCounts[filterCat] || 0} tâche(s) au total).
            </p>
          )}
          {filterPriority === 'haute' && (
            <p className="text-xs text-slate-400 mt-1">Bonne nouvelle ! Aucune tâche prioritaire haute en attente.</p>
          )}
          {filterPriority === 'en-attente' && (
            <p className="text-xs text-slate-400 mt-1">Aucune tâche en attente de retour externe actuellement.</p>
          )}
          {filterPriority === 'terminees' && (
            <p className="text-xs text-slate-400 mt-1">Aucune tâche terminée dans cette sélection.</p>
          )}
        </Card>
      ) : (
        <div className="space-y-10">
          {/* Section 1 : Tâches actives / prioritaires */}
          {filterPriority !== 'terminees' && (
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
                      waitingReturns={waitingReturns}
                      allProjects={projects}
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
                        setTaskForReturnSelect(t)
                        setIsSelectReturnOpen(true)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 2 : Tâches terminées reléguées en bas de page */}
          {(filterPriority === 'terminees' || (filterPriority === 'all' && doneTasks.length > 0)) && (
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
                    waitingReturns={waitingReturns}
                    allProjects={projects}
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
                      setTaskForReturnSelect(t)
                      setIsSelectReturnOpen(true)
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
          setInitialFormData(null)
        }}
        editingTask={editingTask}
        initialData={initialFormData}
        onBackToFollowUp={followUpTask ? () => {
          setIsFormOpen(false)
          setEditingTask(null)
          setInitialFormData(null)
          setIsFollowUpOpen(true)
        } : undefined}
        tasks={tasks}
        events={events}
        waitingReturns={waitingReturns}
        projects={projects}
        onCreateReturnInline={async (title, waiting_on) => {
          const created = await createWaitingReturn(supabase, {
            title,
            waiting_on,
            target_type: 'Prestataire',
            status: 'en attente'
          })
          if (created) {
            setWaitingReturns(prev => [created, ...prev])
          }
          return created
        }}
        onSave={async (data) => {
          await handleSaveTask(data)
          setInitialFormData(null)
        }}
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
        onRequestCreateTask={(prefill) => {
          setEditingTask(null)
          setInitialFormData(prefill)
          setIsFormOpen(true)
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

      {/* Dialogue de sélection / création du retour attendu par une tâche */}
      <TaskSelectReturnDialog
        open={isSelectReturnOpen}
        task={taskForReturnSelect}
        waitingReturns={waitingReturns}
        currentSelectedReturnId={taskForReturnSelect ? extractWaitingReturnId(taskForReturnSelect.description) : null}
        onClose={() => {
          setIsSelectReturnOpen(false)
          setTaskForReturnSelect(null)
        }}
        onSelectReturn={handleAssignWaitingReturn}
        onCreateAndSelectReturn={handleCreateAndAssignWaitingReturn}
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
