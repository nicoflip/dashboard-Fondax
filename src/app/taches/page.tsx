'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn, TASK_CATEGORIES, TASK_STATUSES, TASK_PRIORITIES, PRIORITY_COLORS, STATUS_COLORS } from '@/lib/utils'
import { Task, TaskCategory, TaskPriority, TaskStatus } from '@/lib/types'
import { Plus, Trash2, CheckCircle2, Clock, Hourglass, Flame, Pencil, Calendar, Check, AlertTriangle } from 'lucide-react'
import { TaskFollowUpDialog } from '@/components/tasks/TaskFollowUpDialog'

function TasksContent() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab')
  const urlPriority = searchParams.get('priority')

  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'urgentes' | 'a-traiter' | 'en-attente' | 'terminees' | 'toutes'>('a-traiter')

  const [filterCat, setFilterCat] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState<{
    title: string
    description: string
    category: TaskCategory
    priority: TaskPriority
    status: TaskStatus
  }>({
    title: '',
    description: '',
    category: TASK_CATEGORIES[0],
    priority: TASK_PRIORITIES[1],
    status: TASK_STATUSES[0]
  })

  // Quick schedule to calendar state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [taskToSchedule, setTaskToSchedule] = useState<Task | null>(null)
  const [schedDate, setSchedDate] = useState('')
  const [schedEndDate, setSchedEndDate] = useState('')
  const [schedIsFlexible, setSchedIsFlexible] = useState(false)
  const [schedFlexLabel, setSchedFlexLabel] = useState('Dans les 2 prochaines semaines')
  const [schedTitle, setSchedTitle] = useState('')
  const [schedType, setSchedType] = useState('échéance')
  const [schedNotes, setSchedNotes] = useState('')

  // Smart follow-up modal state
  const [followUpTask, setFollowUpTask] = useState<Task | null>(null)
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false)
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null)

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

  const fetchTasks = async () => {
    setLoading(true)
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    if (data) setTasks(data)
    setLoading(false)
  }

  const filteredTasks = tasks.filter(task => {
    // Quick tabs filter
    if (activeTab === 'urgentes') {
      if (task.priority !== 'haute' || task.status === 'fait') return false
    }
    if (activeTab === 'a-traiter' && !['à faire', 'en cours'].includes(task.status)) return false
    if (activeTab === 'en-attente' && task.status !== 'en attente de retour externe') return false
    if (activeTab === 'terminees' && task.status !== 'fait') return false

    // Dropdown filters
    if (filterCat !== 'all' && task.category !== filterCat) return false
    if (filterStatus !== 'all' && task.status !== filterStatus) return false
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false
    return true
  }).sort((a, b) => {
    // 1. Les tâches terminées ("fait") sont systématiquement reléguées TOUT EN BAS de la page
    const isDoneA = a.status === 'fait'
    const isDoneB = b.status === 'fait'
    if (isDoneA && !isDoneB) return 1
    if (!isDoneA && isDoneB) return -1

    // 2. Pour les tâches actives : tri par priorité (haute d'abord, puis moyenne, puis basse)
    const prioOrder: Record<string, number> = { 'haute': 1, 'moyenne': 2, 'basse': 3 }
    const orderA = prioOrder[a.priority] || 99
    const orderB = prioOrder[b.priority] || 99
    if (orderA !== orderB) return orderA - orderB

    // 3. À priorité égale : les plus récentes d'abord
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    if (!error) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t))
      if (newStatus === 'fait') {
        const found = tasks.find(t => t.id === taskId)
        if (found) {
          setFollowUpTask({ ...found, status: 'fait' })
          setIsFollowUpOpen(true)
        }
      }
    }
  }

  const openScheduleDialog = (task: Task) => {
    setTaskToSchedule(task)
    setSchedTitle(task.title)
    setSchedNotes(task.description || '')
    const defaultDate = new Date()
    defaultDate.setDate(defaultDate.getDate() + 1)
    setSchedDate(defaultDate.toISOString().split('T')[0])
    setSchedEndDate('')
    setSchedIsFlexible(false)
    setSchedFlexLabel('Dans les 2 prochaines semaines')
    setSchedType('échéance')
    setIsScheduleOpen(true)
  }

  const setSchedFlexiblePreset2Weeks = () => {
    const start = new Date()
    const end = new Date()
    end.setDate(start.getDate() + 14)
    setSchedDate(start.toISOString().split('T')[0])
    setSchedEndDate(end.toISOString().split('T')[0])
    setSchedIsFlexible(true)
    setSchedFlexLabel('Dans les 2 prochaines semaines')
  }

  const handleSaveSchedule = async () => {
    if (!taskToSchedule || !schedDate || !schedTitle) return
    const finalDesc = schedIsFlexible
      ? `[Période flexible : ${schedFlexLabel || 'Dans les 2 prochaines semaines'}]\n${schedNotes}`.trim()
      : schedNotes

    const { error } = await supabase.from('events').insert([{
      title: schedTitle,
      description: finalDesc,
      event_date: schedDate,
      end_date: schedIsFlexible && schedEndDate ? schedEndDate : null,
      event_type: schedType,
      status: 'à venir',
      task_id: taskToSchedule.id
    }])
    if (!error) {
      setIsScheduleOpen(false)
      setNotificationMsg(
        schedIsFlexible 
          ? `Tâche planifiée au calendrier (${schedFlexLabel || 'Période flexible'}) !`
          : `Tâche planifiée au calendrier pour le ${new Date(schedDate).toLocaleDateString('fr-FR')} !`
      )
      setTimeout(() => setNotificationMsg(null), 4000)
    }
  }

  const handleDelete = async (taskId: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette tâche ?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (!error) {
      setTasks(tasks.filter(t => t.id !== taskId))
    }
  }

  const openNewTaskDialog = () => {
    setEditingTask(null)
    setFormData({
      title: '',
      description: '',
      category: TASK_CATEGORIES[0],
      priority: TASK_PRIORITIES[1],
      status: TASK_STATUSES[0]
    })
    setIsDialogOpen(true)
  }

  const openEditTaskDialog = (task: Task) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description || '',
      category: task.category,
      priority: task.priority,
      status: task.status
    })
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.title) return

    if (editingTask) {
      const wasFait = editingTask.status === 'fait'
      const isNowFait = formData.status === 'fait'

      const { data, error } = await supabase
        .from('tasks')
        .update({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          status: formData.status
        })
        .eq('id', editingTask.id)
        .select()
        .single()
      
      if (data && !error) {
        setTasks(tasks.map(t => t.id === data.id ? data : t))
        setIsDialogOpen(false)
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
          description: formData.description,
          category: formData.category,
          priority: formData.priority,
          status: formData.status
        }])
        .select()
        .single()
      
      if (data && !error) {
        setTasks([data, ...tasks])
        setIsDialogOpen(false)
        if (data.status === 'fait') {
          setFollowUpTask(data)
          setIsFollowUpOpen(true)
        }
      }
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement des tâches...</div>

  const countUrgentes = tasks.filter(t => t.priority === 'haute' && t.status !== 'fait').length
  const countATraiter = tasks.filter(t => ['à faire', 'en cours'].includes(t.status)).length
  const countAttente = tasks.filter(t => t.status === 'en attente de retour externe').length
  const countFait = tasks.filter(t => t.status === 'fait').length
  const countToutes = tasks.length

  const activeTasks = filteredTasks.filter(t => t.status !== 'fait')
  const doneTasks = filteredTasks.filter(t => t.status === 'fait')

  const renderTaskCard = (task: Task) => {
    const isAttente = task.status === 'en attente de retour externe'
    const isFait = task.status === 'fait'
    const isEnCours = task.status === 'en cours'
    const isAFaire = task.status === 'à faire'
    const isHighPrio = task.priority === 'haute'
    const isUrgent = isHighPrio && !isFait

    // Styling fort pour les tâches urgentes afin qu'elles sautent immédiatement aux yeux
    const borderClass = isUrgent 
      ? 'border-l-[6px] border-l-red-600 border-red-300 ring-2 ring-red-400/40 shadow-md shadow-red-100/70' 
      : isAttente 
      ? 'border-l-4 border-amber-500' 
      : isFait 
      ? 'border-l-4 border-slate-300 opacity-60 bg-slate-50' 
      : isEnCours 
      ? 'border-l-4 border-blue-500' 
      : 'border-l-4 border-slate-300'

    const bgClass = isUrgent 
      ? 'bg-gradient-to-br from-red-50/70 via-white to-red-50/30' 
      : isAttente 
      ? 'bg-amber-50/40' 
      : isFait 
      ? 'bg-slate-50/90' 
      : 'bg-white'

    return (
      <Card key={task.id} className={cn("flex flex-col transition-all relative overflow-hidden", borderClass, bgClass)}>
        {/* Bandeau d'alerte URGENT en haut de la carte */}
        {isUrgent && (
          <div className="bg-gradient-to-r from-red-600 via-red-600 to-rose-600 text-white px-3 py-1.5 text-xs font-black shadow-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 fill-amber-300 text-amber-300 animate-pulse shrink-0" />
              <span>URGENT — PRIORITÉ HAUTE</span>
            </span>
            <span className="bg-red-800/90 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded">
              Action immédiate
            </span>
          </div>
        )}

        <CardHeader className={cn("pb-3", isUrgent ? "pt-3" : "pt-4")}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {isFait && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
              {isUrgent && <Flame className="w-5 h-5 text-red-600 fill-red-500 shrink-0 animate-bounce" />}
              <CardTitle 
                className={cn(
                  "cursor-pointer text-lg hover:text-blue-600 hover:underline truncate",
                  isUrgent && "font-black text-red-950",
                  isFait && "line-through text-slate-400 font-normal"
                )}
                onClick={() => openEditTaskDialog(task)}
                title={task.title}
              >
                {task.title}
              </CardTitle>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                title="Planifier au calendrier" 
                onClick={() => openScheduleDialog(task)} 
                className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
              >
                <Calendar className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                title="Modifier cette tâche" 
                onClick={() => openEditTaskDialog(task)} 
                className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                title="Supprimer cette tâche" 
                onClick={() => handleDelete(task.id)} 
                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {isAttente && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200 w-fit">
              <Hourglass className="w-3.5 h-3.5" />
              En attente retour externe
            </div>
          )}
          {isFait && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 px-2.5 py-0.5 text-xs font-medium text-slate-600 border border-slate-300 w-fit">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Terminé (Classé en bas)
            </div>
          )}

          <CardDescription className="line-clamp-2 mt-2">
            {task.description ? (
              isAttente ? 
                <span className="text-amber-900 font-medium">{task.description}</span> 
                : isUrgent ?
                <span className="text-slate-800 font-medium">{task.description}</span>
                : isFait ?
                <span className="text-slate-400 italic">{task.description}</span>
                : task.description
            ) : <span className="italic text-slate-400">Aucune description</span>}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto pb-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn(isUrgent && "border-red-200 bg-white text-slate-800 font-semibold", isFait && "opacity-60")}>
              {task.category}
            </Badge>
            {isUrgent ? (
              <Badge className="bg-red-600 text-white font-black flex items-center gap-1 shadow-xs border-red-700">
                <Flame className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                Haute priorité (Urgent)
              </Badge>
            ) : isHighPrio ? (
              <Badge className={cn("bg-red-100 text-red-700 border-red-200 flex items-center gap-1", isFait && "opacity-60")}>
                <Flame className="w-3 h-3" />
                Haute
              </Badge>
            ) : (
              <Badge className={cn(PRIORITY_COLORS[task.priority], isFait && "opacity-60")}>{task.priority}</Badge>
            )}
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <div className="w-full">
            <Label className="sr-only">Changer statut</Label>
            <select
              className={cn(
                "flex h-9 w-full items-center justify-between rounded-md border px-3 py-1 text-sm shadow-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-950",
                STATUS_COLORS[task.status],
                isFait && "opacity-75"
              )}
              value={task.status}
              onChange={(e) => handleStatusChange(task.id, e.target.value)}
            >
              {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tâches</h1>
        <Button onClick={openNewTaskDialog} className="flex items-center gap-2 cursor-pointer">
          <Plus className="h-4 w-4" />
          Nouvelle tâche
        </Button>
      </div>

      {/* Bannière de notification */}
      {notificationMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3.5 rounded-xl flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{notificationMsg}</span>
        </div>
      )}

      {/* Onglets de filtrage rapide */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {/* Onglet URGENTES en premier et mis en valeur */}
        <button 
          onClick={() => {
            setActiveTab('urgentes')
            setFilterPriority('all')
          }}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer", 
            activeTab === 'urgentes' 
              ? "bg-red-600 text-white ring-2 ring-red-400 ring-offset-1" 
              : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
          )}
        >
          <Flame className={cn("w-4 h-4 shrink-0", activeTab === 'urgentes' ? "fill-amber-300 text-amber-300 animate-pulse" : "text-red-500 fill-red-400")} />
          <span>Urgentes (Priorité haute)</span>
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-black", activeTab === 'urgentes' ? "bg-red-800 text-white" : "bg-red-200 text-red-900")}>
            {countUrgentes}
          </span>
        </button>

        <button 
          onClick={() => {
            setActiveTab('a-traiter')
            setFilterPriority('all')
          }}
          className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer", activeTab === 'a-traiter' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
        >
          À traiter <span className="ml-1 opacity-70">({countATraiter})</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('en-attente')
            setFilterPriority('all')
          }}
          className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer", activeTab === 'en-attente' ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100")}
        >
          <Hourglass className="w-4 h-4" />
          En attente retour externe <span className="opacity-70">({countAttente})</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('terminees')
            setFilterPriority('all')
          }}
          className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer", activeTab === 'terminees' ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100")}
        >
          Terminées <span className="ml-1 opacity-70">({countFait})</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('toutes')
            setFilterPriority('all')
          }}
          className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer", activeTab === 'toutes' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
        >
          Toutes <span className="ml-1 opacity-70">({countToutes})</span>
        </button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center rounded-lg border bg-slate-50 p-4">
        <div className="flex-1 space-y-1">
          <Label htmlFor="cat-filter">Catégorie</Label>
          <div className="relative">
            <select
              id="cat-filter"
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
            >
              <option value="all">Toutes</option>
              {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor="status-filter">Statut (Filtre additionnel)</Label>
          <div className="relative">
            <select
              id="status-filter"
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tous</option>
              {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <Label htmlFor="prio-filter">Priorité</Label>
          <div className="relative">
            <select
              id="prio-filter"
              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="all">Toutes</option>
              {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <div>{filteredTasks.length} tâche(s) affichée(s)</div>
        {activeTab === 'urgentes' && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-md border border-red-200">
            <Flame className="w-3.5 h-3.5 fill-red-500 text-red-600" />
            Mode Urgences activé
          </div>
        )}
      </div>

      {filteredTasks.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-slate-500 border-dashed">
          <Flame className="w-10 h-10 text-slate-300 mb-2" />
          <p className="font-medium text-slate-600">Aucune tâche ne correspond aux critères sélectionnés.</p>
          {activeTab === 'urgentes' && (
            <p className="text-xs text-slate-400 mt-1">Bonne nouvelle ! Aucune tâche prioritaire en attente.</p>
          )}
        </Card>
      ) : (
        <div className="space-y-10">
          {/* Section 1 : Tâches actives / prioritaires (si pas sur l'onglet terminées) */}
          {activeTab !== 'terminees' && (
            <div>
              {activeTasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed rounded-lg bg-slate-50/50">
                  Toutes les tâches sélectionnées sont terminées et rangées tout en bas de page ci-dessous.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {activeTasks.map(renderTaskCard)}
                </div>
              )}
            </div>
          )}

          {/* Section 2 : Tâches terminées reléguées TOUT EN BAS de la page */}
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
                {doneTasks.map(renderTaskCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dialog Ajout/Edition */}
      <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>{editingTask ? 'Modifier la tâche' : 'Nouvelle tâche'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre <span className="text-red-500">*</span></Label>
            <Input 
              id="title" 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
              placeholder="Ex: Mettre à jour les serveurs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})} 
              placeholder="Détails de la tâche..."
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value as TaskCategory})}
              >
                {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Priorité</Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value as TaskPriority})}
              >
                {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <select
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              value={formData.status}
              onChange={e => setFormData({...formData, status: e.target.value as TaskStatus})}
            >
              {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={!formData.title}>
            {editingTask ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Dialog Planifier au Calendrier */}
      <Dialog open={isScheduleOpen} onClose={() => setIsScheduleOpen(false)}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-blue-600">
            <Calendar className="w-5 h-5" />
            <DialogTitle>Planifier la tâche au calendrier</DialogTitle>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Créer un point de calendrier ou une échéance rattachée à cette tâche.
          </p>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Titre de l'événement</Label>
            <Input 
              value={schedTitle} 
              onChange={e => setSchedTitle(e.target.value)} 
              placeholder="ex: Échéance : Finalisation licences M365"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date de l'événement</Label>
              <Input 
                type="date" 
                value={schedDate} 
                onChange={e => setSchedDate(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Type d'événement</Label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                value={schedType}
                onChange={e => setSchedType(e.target.value)}
              >
                <option value="échéance">Échéance</option>
                <option value="étape chantier">Étape chantier</option>
                <option value="rdv">Rendez-vous terrain</option>
                <option value="appel">Appel prestataire</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Détails complémentaires</Label>
            <Textarea 
              value={schedNotes} 
              onChange={e => setSchedNotes(e.target.value)} 
              rows={3} 
              placeholder="Notes ou consignes pour cette échéance..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>Annuler</Button>
          <Button onClick={handleSaveSchedule} disabled={!schedTitle || !schedDate}>
            Ajouter au calendrier
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Workflow Intelligent Suite Logique */}
      <TaskFollowUpDialog
        open={isFollowUpOpen}
        task={followUpTask}
        onClose={() => {
          setIsFollowUpOpen(false)
          setFollowUpTask(null)
        }}
        onSuccessMessage={(msg) => {
          setNotificationMsg(msg)
          setTimeout(() => setNotificationMsg(null), 4000)
          fetchTasks()
        }}
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
