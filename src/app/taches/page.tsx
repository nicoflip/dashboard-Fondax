'use client'

import { useEffect, useState } from 'react'
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
import { Plus, Trash2, CheckCircle2, Clock, Hourglass, Flame } from 'lucide-react'

export default function TasksPage() {
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<'a-traiter' | 'en-attente' | 'terminees' | 'toutes'>('a-traiter')

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

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    setLoading(true)
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
    if (data) setTasks(data)
    setLoading(false)
  }

  const filteredTasks = tasks.filter(task => {
    // Quick tabs filter
    if (activeTab === 'a-traiter' && !['à faire', 'en cours'].includes(task.status)) return false
    if (activeTab === 'en-attente' && task.status !== 'en attente de retour externe') return false
    if (activeTab === 'terminees' && task.status !== 'fait') return false

    // Dropdown filters
    if (filterCat !== 'all' && task.category !== filterCat) return false
    if (filterStatus !== 'all' && task.status !== filterStatus) return false
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false
    return true
  })

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    if (!error) {
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t))
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
      }
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement des tâches...</div>

  const countATraiter = tasks.filter(t => ['à faire', 'en cours'].includes(t.status)).length
  const countAttente = tasks.filter(t => t.status === 'en attente de retour externe').length
  const countFait = tasks.filter(t => t.status === 'fait').length
  const countToutes = tasks.length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tâches</h1>
        <Button onClick={openNewTaskDialog} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle tâche
        </Button>
      </div>

      {/* Onglets de filtrage rapide */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        <button 
          onClick={() => setActiveTab('a-traiter')}
          className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors", activeTab === 'a-traiter' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
        >
          À traiter <span className="ml-1 opacity-70">({countATraiter})</span>
        </button>
        <button 
          onClick={() => setActiveTab('en-attente')}
          className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2", activeTab === 'en-attente' ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100")}
        >
          <Hourglass className="w-4 h-4" />
          En attente retour externe <span className="opacity-70">({countAttente})</span>
        </button>
        <button 
          onClick={() => setActiveTab('terminees')}
          className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors", activeTab === 'terminees' ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100")}
        >
          Terminées <span className="ml-1 opacity-70">({countFait})</span>
        </button>
        <button 
          onClick={() => setActiveTab('toutes')}
          className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors", activeTab === 'toutes' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}
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

      <div className="text-sm text-slate-500">
        {filteredTasks.length} tâche(s) trouvée(s)
      </div>

      {filteredTasks.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-slate-500">
          <p>Aucune tâche ne correspond à vos critères.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredTasks.map(task => {
            const isAttente = task.status === 'en attente de retour externe'
            const isFait = task.status === 'fait'
            const isEnCours = task.status === 'en cours'
            const isAFaire = task.status === 'à faire'
            const isHighPrio = task.priority === 'haute'

            const borderClass = isAttente ? 'border-amber-500' : isFait ? 'border-slate-200' : isEnCours ? 'border-blue-500' : 'border-slate-300'
            const bgClass = isAttente ? 'bg-amber-50/40' : isFait ? 'bg-slate-50 opacity-65' : 'bg-white'

            return (
              <Card key={task.id} className={cn("flex flex-col border-l-4 transition-all", borderClass, bgClass)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {isFait && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                      <CardTitle 
                        className={cn(
                          "cursor-pointer text-lg hover:text-blue-600 hover:underline",
                          isFait && "line-through text-slate-500"
                        )}
                        onClick={() => openEditTaskDialog(task)}
                      >
                        {task.title}
                      </CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)} className="h-8 w-8 text-slate-400 hover:text-red-600 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {isAttente && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200 w-fit">
                      <Hourglass className="w-3.5 h-3.5" />
                      En attente retour externe
                    </div>
                  )}
                  {isFait && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200 w-fit">
                      Terminé
                    </div>
                  )}

                  <CardDescription className="line-clamp-2 mt-2">
                    {task.description ? (
                      isAttente ? 
                        <span className="text-amber-900 font-medium">{task.description}</span> 
                        : task.description
                    ) : <span className="italic text-slate-400">Aucune description</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto pb-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{task.category}</Badge>
                    {isHighPrio ? (
                      <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200 flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        {task.priority}
                      </Badge>
                    ) : (
                      <Badge className={cn(PRIORITY_COLORS[task.priority])}>{task.priority}</Badge>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <div className="w-full">
                    <Label className="sr-only">Changer statut</Label>
                    <select
                      className={cn(
                        "flex h-9 w-full items-center justify-between rounded-md border px-3 py-1 text-sm shadow-sm font-medium focus:outline-none focus:ring-1 focus:ring-slate-950",
                        STATUS_COLORS[task.status]
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
          })}
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
    </div>
  )
}
