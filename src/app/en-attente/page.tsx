'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Task, CalendarEvent, TaskStatus } from '@/lib/types'
import { 
  checkTaskBlocked, 
  formatTaskDescriptionWithBlocker 
} from '@/lib/blockers'
import { 
  parseWaitingInfo, 
  getTaskWaitingDetails, 
  formatTaskDescriptionWithWaiting, 
  removeWaitingTag,
  WaitingConfig
} from '@/lib/waiting'
import { TaskFormDialog, TaskFormData } from '@/components/tasks/TaskFormDialog'
import { TaskWaitingDialog } from '@/components/tasks/TaskWaitingDialog'
import { 
  cn, 
  TASK_CATEGORY_COLORS, 
  PRIORITY_COLORS, 
  STATUS_COLORS, 
  formatDate 
} from '@/lib/utils'
import { 
  Hourglass, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Lock, 
  Unlock, 
  Flame, 
  Pencil, 
  Trash2, 
  Send, 
  User, 
  FolderKanban,
  Check,
  Calendar,
  AlertCircle
} from 'lucide-react'

type WaitingFilterTab = 'all' | 'due' | 'dragging' | 'blocking' | 'resolved'

function EnAttenteContent() {
  const supabase = createClient()

  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<WaitingFilterTab>('all')
  const [targetFilter, setTargetFilter] = useState<string>('ALL')

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [isWaitingDialogOpen, setIsWaitingDialogOpen] = useState(false)
  const [taskForWaiting, setTaskForWaiting] = useState<Task | null>(null)
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null)

  // Fetch data
  const fetchData = async () => {
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
    fetchData()
  }, [])

  const showNotification = (msg: string) => {
    setNotificationMsg(msg)
    setTimeout(() => setNotificationMsg(null), 4500)
  }

  // Waiting tasks (all tasks that are in waiting state)
  const waitingTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'en attente de retour externe')
  }, [tasks])

  // Resolved waiting tasks (tasks that were recently waiting or have a waiting tag but are now done or en cours)
  const resolvedWaitingTasks = useMemo(() => {
    return tasks.filter(t => {
      if (t.status === 'en attente de retour externe') return false
      // Has received tag or completed
      return (t.description || '').includes('[Retour reçu') || (t.description || '').includes('[waiting:')
    })
  }, [tasks])

  // Map: for each waiting task, get the list of internal tasks that are currently BLOCKED by it
  const blockedTasksByWaitingTask = useMemo(() => {
    const map = new Map<string, Task[]>()
    
    // Check every active task
    tasks.forEach(t => {
      if (t.status === 'fait') return
      const blockedStatus = checkTaskBlocked(t, tasks, events)
      if (blockedStatus.isBlocked && blockedStatus.blocker.type === 'waiting' && blockedStatus.blocker.prereqTaskId) {
        const waitingId = blockedStatus.blocker.prereqTaskId
        const currentList = map.get(waitingId) || []
        currentList.push(t)
        map.set(waitingId, currentList)
      }
    })

    return map
  }, [tasks, events])

  // Overall KPIs
  const totalWaiting = waitingTasks.length
  const draggingTasks = useMemo(() => {
    return waitingTasks.filter(t => getTaskWaitingDetails(t).metrics.isDragging)
  }, [waitingTasks])
  const dueTasks = useMemo(() => {
    return waitingTasks.filter(t => {
      const { metrics } = getTaskWaitingDetails(t)
      return metrics.followUpStatus === 'overdue' || metrics.followUpStatus === 'today'
    })
  }, [waitingTasks])
  const blockingWaitingTasks = useMemo(() => {
    return waitingTasks.filter(t => {
      const blockedList = blockedTasksByWaitingTask.get(t.id) || []
      return blockedList.length > 0
    })
  }, [waitingTasks, blockedTasksByWaitingTask])

  const totalBlockedTasksCount = useMemo(() => {
    let count = 0
    blockedTasksByWaitingTask.forEach(list => {
      count += list.length
    })
    return count
  }, [blockedTasksByWaitingTask])

  // Target interlocuteurs list for quick filters
  const uniqueTargets = useMemo(() => {
    const set = new Set<string>()
    waitingTasks.forEach(t => {
      const { info } = getTaskWaitingDetails(t)
      if (info.waitingOn) {
        set.add(info.waitingOn.trim())
      }
    })
    return Array.from(set)
  }, [waitingTasks])

  // Filtered displayed tasks
  const displayedTasks = useMemo(() => {
    let list = activeTab === 'resolved' ? resolvedWaitingTasks : waitingTasks

    // Tab filter
    if (activeTab === 'due') {
      list = list.filter(t => {
        const { metrics } = getTaskWaitingDetails(t)
        return metrics.followUpStatus === 'overdue' || metrics.followUpStatus === 'today'
      })
    } else if (activeTab === 'dragging') {
      list = list.filter(t => getTaskWaitingDetails(t).metrics.isDragging)
    } else if (activeTab === 'blocking') {
      list = list.filter(t => (blockedTasksByWaitingTask.get(t.id) || []).length > 0)
    }

    // Interlocuteur pill filter
    if (targetFilter !== 'ALL') {
      list = list.filter(t => {
        const { info } = getTaskWaitingDetails(t)
        return info.waitingOn.toLowerCase().includes(targetFilter.toLowerCase())
      })
    }

    // Text search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(t => {
        const { info } = getTaskWaitingDetails(t)
        const titleMatch = t.title.toLowerCase().includes(q)
        const whoMatch = info.waitingOn.toLowerCase().includes(q)
        const descMatch = (t.description || '').toLowerCase().includes(q)
        const catMatch = t.category.toLowerCase().includes(q)
        return titleMatch || whoMatch || descMatch || catMatch
      })
    }

    // Sort: dragging and overdue first, then by days waiting descending
    return [...list].sort((a, b) => {
      const detailsA = getTaskWaitingDetails(a)
      const detailsB = getTaskWaitingDetails(b)
      
      // Overdue first
      const overdueA = detailsA.metrics.followUpStatus === 'overdue' ? 1 : 0
      const overdueB = detailsB.metrics.followUpStatus === 'overdue' ? 1 : 0
      if (overdueA !== overdueB) return overdueB - overdueA

      // Then dragging
      const dragA = detailsA.metrics.isDragging ? 1 : 0
      const dragB = detailsB.metrics.isDragging ? 1 : 0
      if (dragA !== dragB) return dragB - dragA

      // Then days waiting descending
      return detailsB.metrics.daysWaiting - detailsA.metrics.daysWaiting
    })
  }, [waitingTasks, resolvedWaitingTasks, activeTab, targetFilter, searchQuery, blockedTasksByWaitingTask])

  // ACTION 1: Response received -> unblocks dependent tasks!
  const handleResumeTask = async (task: Task) => {
    const todayStr = new Date().toLocaleDateString('fr-FR')
    const cleanDesc = removeWaitingTag(task.description)
    const finalDesc = `${cleanDesc}\n[Retour reçu le ${todayStr}] Reprise de la tâche en cours.`

    const blockedList = blockedTasksByWaitingTask.get(task.id) || []

    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'en cours',
        description: finalDesc.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', task.id)

    if (!error) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'en cours', description: finalDesc.trim() } : t))
      if (blockedList.length > 0) {
        showNotification(`✓ Retour consigné ! Déblocage automatique de ${blockedList.length} tâche(s) : ${blockedList.map(t => t.title).join(', ')}.`)
      } else {
        showNotification(`✓ Retour consigné ! La tâche « ${task.title} » est reprise en cours.`)
      }
    }
  }

  // ACTION 2: Quick follow-up (+3 days)
  const handleQuickFollowUp = async (task: Task) => {
    const info = parseWaitingInfo(task.description, task.updated_at, task.created_at)
    const nextDate = new Date()
    nextDate.setDate(nextDate.getDate() + 3)
    const nextDateStr = nextDate.toISOString().split('T')[0]
    const newCount = (info.followUpCount || 0) + 1
    const todayStr = new Date().toLocaleDateString('fr-FR')

    const waitingConfig: WaitingConfig = {
      waitingOn: info.waitingOn || 'Tiers externe',
      followUpDate: nextDateStr,
      sinceDate: info.sinceDate || undefined,
      followUpCount: newCount,
    }

    let updatedDesc = formatTaskDescriptionWithWaiting(task.description, waitingConfig)
    updatedDesc = `${updatedDesc}\n[Suivi] Relance n°${newCount} effectuée le ${todayStr}. Prochaine relance fixée au ${nextDate.toLocaleDateString('fr-FR')}.`

    const { error } = await supabase
      .from('tasks')
      .update({
        description: updatedDesc,
        updated_at: new Date().toISOString()
      })
      .eq('id', task.id)

    if (!error) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: updatedDesc } : t))
      showNotification(`✓ Relance n°${newCount} consignée pour « ${task.title} » (+3 jours) !`)
    }
  }

  // ACTION 3: Save task from TaskFormDialog
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
        showNotification('Dossier mis à jour avec succès.')
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
        showNotification('Nouveau retour en attente créé avec succès.')
      }
    }
  }

  // ACTION 4: Save waiting dialog
  const handleSaveWaitingDialog = async (taskId: string, newStatus: TaskStatus, newDescription: string) => {
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
        showNotification('✓ Suivi d\'attente et relance mis à jour !')
      }
    }
  }

  // ACTION 5: Delete task
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce dossier ?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== taskId))
      showNotification('Dossier supprimé.')
    }
  }

  // Open modal to create new waiting return
  const handleOpenNewWaiting = () => {
    setEditingTask({
      id: '',
      title: '',
      description: '',
      category: 'Prestataires',
      priority: 'moyenne',
      status: 'en attente de retour externe',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    setIsFormOpen(true)
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Chargement des dossiers en attente...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-white shadow-xs">
              <Hourglass className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">En attente & Délégation</h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Suivi des retours externes attendus et déblocage automatique des tâches internes.
              </p>
            </div>
          </div>
        </div>

        <Button 
          onClick={handleOpenNewWaiting} 
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Nouveau retour en attente
        </Button>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3.5 rounded-xl flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{notificationMsg}</span>
        </div>
      )}

      {/* 4 Indicateurs KPI Supérieurs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total en attente */}
        <Card 
          onClick={() => setActiveTab('all')}
          className={cn(
            "border transition-all cursor-pointer hover:shadow-md",
            activeTab === 'all' ? "ring-2 ring-amber-500 border-amber-400 bg-amber-50/30" : "hover:border-amber-300"
          )}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <Hourglass className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Total en attente</p>
              <h2 className="text-2xl font-bold text-slate-900">{totalWaiting}</h2>
            </div>
          </CardContent>
        </Card>

        {/* Qui traîne (>7j) */}
        <Card 
          onClick={() => setActiveTab('dragging')}
          className={cn(
            "border transition-all cursor-pointer hover:shadow-md",
            draggingTasks.length > 0 ? "border-red-200 bg-red-50/20" : "",
            activeTab === 'dragging' ? "ring-2 ring-red-500 border-red-400" : "hover:border-red-300"
          )}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-red-600">Qui traîne (&gt; 7j)</p>
              <h2 className="text-2xl font-bold text-red-700">{draggingTasks.length}</h2>
            </div>
          </CardContent>
        </Card>

        {/* Relances urgentes / dues */}
        <Card 
          onClick={() => setActiveTab('due')}
          className={cn(
            "border transition-all cursor-pointer hover:shadow-md",
            dueTasks.length > 0 ? "border-amber-300 bg-amber-50/40" : "",
            activeTab === 'due' ? "ring-2 ring-amber-600 border-amber-500" : "hover:border-amber-300"
          )}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white shrink-0">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-amber-900">À relancer</p>
                {dueTasks.length > 0 && (
                  <span className="text-[9px] font-black bg-red-600 text-white px-1 py-0.2 rounded uppercase animate-pulse">
                    Urgent
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-amber-950">{dueTasks.length}</h2>
            </div>
          </CardContent>
        </Card>

        {/* Tâches internes bloquées */}
        <Card 
          onClick={() => setActiveTab('blocking')}
          className={cn(
            "border transition-all cursor-pointer hover:shadow-md",
            totalBlockedTasksCount > 0 ? "border-indigo-300 bg-indigo-50/30" : "",
            activeTab === 'blocking' ? "ring-2 ring-indigo-500 border-indigo-400" : "hover:border-indigo-300"
          )}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-900">Tâches bloquées</p>
              <h2 className="text-2xl font-bold text-indigo-950">{totalBlockedTasksCount}</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre d'onglets de filtrage */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5",
              activeTab === 'all' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <span>Tous</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-200">{totalWaiting}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('due')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5",
              activeTab === 'due' ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
            )}
          >
            <span>🔔 À relancer</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full",
              activeTab === 'due' ? "bg-amber-800 text-white" : "bg-amber-200 text-amber-900"
            )}>
              {dueTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dragging')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5",
              activeTab === 'dragging' ? "bg-red-600 text-white" : "bg-red-50 text-red-900 hover:bg-red-100 border border-red-200"
            )}
          >
            <span>⚠️ Traîne (&gt; 7j)</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full",
              activeTab === 'dragging' ? "bg-red-800 text-white" : "bg-red-200 text-red-900"
            )}>
              {draggingTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('blocking')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5",
              activeTab === 'blocking' ? "bg-indigo-700 text-white" : "bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200"
            )}
          >
            <span>🔒 Bloquent des tâches</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full",
              activeTab === 'blocking' ? "bg-indigo-900 text-white" : "bg-indigo-200 text-indigo-950"
            )}>
              {blockingWaitingTasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resolved')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5",
              activeTab === 'resolved' ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200"
            )}
          >
            <span>✓ Retours reçus récents</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full",
              activeTab === 'resolved' ? "bg-emerald-900 text-white" : "bg-emerald-200 text-emerald-950"
            )}>
              {resolvedWaitingTasks.length}
            </span>
          </button>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Rechercher par mot-clé, tiers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Filtres rapides par interlocuteur */}
      {uniqueTargets.length > 0 && activeTab !== 'resolved' && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
            <User className="w-3.5 h-3.5" /> Interlocuteur :
          </span>
          <button
            type="button"
            onClick={() => setTargetFilter('ALL')}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
              targetFilter === 'ALL' ? "bg-slate-800 text-white font-bold" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            Tous
          </button>
          {uniqueTargets.map(target => (
            <button
              key={target}
              type="button"
              onClick={() => setTargetFilter(targetFilter === target ? 'ALL' : target)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border",
                targetFilter === target 
                  ? "bg-amber-600 text-white border-amber-600 font-bold shadow-2xs" 
                  : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300"
              )}
            >
              {target}
            </button>
          ))}
        </div>
      )}

      {/* Liste des dossiers en attente */}
      {displayedTasks.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-slate-500 border-dashed text-center">
          <Hourglass className="w-10 h-10 text-slate-300 mb-2" />
          <p className="font-medium text-slate-600">Aucun dossier correspondant aux filtres sélectionnés.</p>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'due' && "Toutes vos relances sont à jour !"}
            {activeTab === 'dragging' && "Aucun dossier ne traîne depuis plus de 7 jours, parfait !"}
            {activeTab === 'blocking' && "Aucun retour en attente ne bloque de tâches internes actuellement."}
            {activeTab === 'all' && "La balle est toujours dans votre camp, aucun retour n'est attendu."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {displayedTasks.map(task => {
            const { info: waitingInfo, metrics } = getTaskWaitingDetails(task)
            const blockedList = blockedTasksByWaitingTask.get(task.id) || []
            const isResolved = task.status !== 'en attente de retour externe'

            return (
              <Card 
                key={task.id}
                className={cn(
                  "flex flex-col transition-all overflow-hidden border shadow-xs",
                  isResolved
                    ? "border-slate-200 bg-slate-50/70 opacity-80"
                    : metrics.isDragging
                    ? "border-l-[6px] border-l-red-600 border-red-200 bg-gradient-to-br from-red-50/40 via-white to-amber-50/20 ring-1 ring-red-300/60"
                    : metrics.isWarning
                    ? "border-l-[5px] border-l-amber-600 border-amber-200 bg-amber-50/30"
                    : "border-l-[5px] border-l-amber-500 border-slate-200 bg-white"
                )}
              >
                {/* En-tête de la carte avec Interlocuteur */}
                <div className={cn(
                  "p-3.5 pb-2 border-b flex items-start justify-between gap-2",
                  metrics.isDragging ? "bg-red-100/50 border-red-200" : "bg-amber-50/50 border-amber-100"
                )}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                        Interlocuteur
                      </span>
                      {waitingInfo.waitingOn ? (
                        <span className="text-sm font-bold text-amber-950 truncate">
                          {waitingInfo.waitingOn}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600 italic">
                          Tiers externe non spécifié
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Modifier ce dossier"
                      onClick={() => {
                        setEditingTask(task)
                        setIsFormOpen(true)
                      }}
                      className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Supprimer ce dossier"
                      onClick={() => handleDeleteTask(task.id)}
                      className="h-7 w-7 text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Corps de la carte */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 
                        onClick={() => {
                          setEditingTask(task)
                          setIsFormOpen(true)
                        }}
                        className="font-bold text-base text-slate-900 hover:text-blue-600 cursor-pointer line-clamp-2"
                        title={task.title}
                      >
                        {task.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <Badge variant="outline" className={cn("text-[11px] font-semibold", TASK_CATEGORY_COLORS[task.category])}>
                        {task.category}
                      </Badge>
                      {task.priority === 'haute' && (
                        <Badge className="bg-red-600 text-white font-bold flex items-center gap-1 text-[10px]">
                          <Flame className="w-3 h-3 fill-amber-300 text-amber-300" /> Urgent
                        </Badge>
                      )}
                      <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-semibold", STATUS_COLORS[task.status])}>
                        {task.status}
                      </span>
                    </div>

                    {waitingInfo.cleanDescription && (
                      <p className="text-xs text-slate-600 line-clamp-2 pt-1 italic">
                        {waitingInfo.cleanDescription}
                      </p>
                    )}
                  </div>

                  {/* Section Métriques d'attente & Relance */}
                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-2.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>En attente depuis :</span>
                      </span>
                      <span className="font-bold text-slate-900">
                        {metrics.daysWaiting} jour{metrics.daysWaiting > 1 ? 's' : ''}
                      </span>
                    </div>

                    {metrics.isDragging && (
                      <div className="bg-red-100 text-red-800 px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>⚠️ Dossier qui traîne (&gt; 7 jours) !</span>
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
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
                          <span className="text-slate-600">
                            Prochaine relance : <strong>{metrics.formattedFollowUpDate}</strong>
                          </span>
                        )}
                        {metrics.followUpStatus === 'none' && (
                          <span className="text-slate-400 italic">Pas de date de relance</span>
                        )}
                      </div>

                      <span className="text-slate-500 font-medium">
                        {waitingInfo.followUpCount} relance{waitingInfo.followUpCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* SECTION CLÉ : TÂCHES INTERNES BLOQUÉES PAR CE RETOUR */}
                  <div className="pt-1">
                    {blockedList.length > 0 ? (
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-2.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-indigo-950 font-bold text-xs">
                          <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>🔒 Bloque {blockedList.length} tâche{blockedList.length > 1 ? 's' : ''} interne{blockedList.length > 1 ? 's' : ''} :</span>
                        </div>
                        <ul className="space-y-1 pl-1">
                          {blockedList.map(bt => (
                            <li key={bt.id} className="text-[11px] text-indigo-900 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                              <span className="font-semibold truncate">{bt.title}</span>
                              <span className="text-[10px] text-indigo-600 font-normal">({bt.category})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic flex items-center gap-1">
                        <Unlock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Ne bloque aucune tâche interne pour l&apos;instant.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pied de carte avec actions directes */}
                <div className="p-3 bg-slate-50/90 border-t border-slate-200 flex items-center justify-between gap-2">
                  {!isResolved ? (
                    <>
                      {/* Bouton Réponse Reçue */}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleResumeTask(task)}
                        title="Réponse obtenue : repasse la tâche en cours et débloque les tâches dépendantes"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5 mr-1 stroke-[3]" />
                        Réponse reçue
                      </Button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickFollowUp(task)}
                          title="Consigner une relance effectuée maintenant et reporter de 3 jours"
                          className="text-[11px] h-8 border-amber-300 text-amber-900 hover:bg-amber-100/70 cursor-pointer"
                        >
                          <Send className="w-3 h-3 mr-1 text-amber-600" />
                          Relancé (+3j)
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTaskForWaiting(task)
                            setIsWaitingDialogOpen(true)
                          }}
                          title="Personnaliser les détails de relance et l'interlocuteur"
                          className="text-[11px] h-8 text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          Gérer
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-between text-xs text-emerald-800 font-semibold">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Retour reçu & dossier traité
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingTask(task)
                          setIsFormOpen(true)
                        }}
                        className="text-xs text-slate-600 hover:text-blue-600"
                      >
                        Voir la tâche &rarr;
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
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

      <TaskWaitingDialog
        open={isWaitingDialogOpen}
        task={taskForWaiting}
        onClose={() => {
          setIsWaitingDialogOpen(false)
          setTaskForWaiting(null)
        }}
        onSave={handleSaveWaitingDialog}
      />
    </div>
  )
}

export default function EnAttentePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Chargement de la rubrique En attente...</div>}>
      <EnAttenteContent />
    </Suspense>
  )
}
