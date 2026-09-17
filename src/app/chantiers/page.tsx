'use client'

import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { CustomDatePicker } from '@/components/ui/date-picker'
import { TaskSelector } from '@/components/ui/TaskSelector'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PROJECT_STATUS_COLORS, PRIORITY_COLORS, STATUS_COLORS, cn } from '@/lib/utils'
import { Project, ProjectStatus, Task, TaskPriority, TaskStatus, CalendarEvent } from '@/lib/types'
import { isTaskInProject, formatTaskDescriptionWithProject, cleanTaskDescriptionProject } from '@/lib/projects'
import { 
  Plus, Pencil, Trash2, FolderKanban, CheckCircle2, Clock, 
  ListTodo, Calendar, AlertTriangle, CheckSquare, Square, 
  ArrowRight, Sparkles, ChevronRight, X, Layers, Flag, Link2, FolderMinus
} from 'lucide-react'

function ChantiersContent() {
  const searchParams = useSearchParams()
  const urlStatus = searchParams.get('status')

  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'TOUS' | 'EN COURS' | 'À FAIRE' | 'TERMINÉ'>('TOUS')
  const supabase = createClient()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Project Add & Edit Modals
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false)
  const [newProject, setNewProject] = useState({ priority_order: 1, name: '', description: '', status: 'À FAIRE', notes_blockers: '' })

  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editProjectForm, setEditProjectForm] = useState({
    priority_order: 1,
    name: '',
    description: '',
    status: 'À FAIRE' as ProjectStatus,
    notes_blockers: ''
  })

  // Project Workspace Modal (Drill-down interactive management)
  const [activeWorkspaceProject, setActiveWorkspaceProject] = useState<Project | null>(null)
  const [workspaceTab, setWorkspaceTab] = useState<'tasks' | 'milestones' | 'calendar' | 'notes'>('tasks')

  // New task form inside workspace
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('moyenne')
  const [taskAttachMode, setTaskAttachMode] = useState<'create' | 'link'>('create')
  const [taskToLink, setTaskToLink] = useState<string | null>(null)

  // New event form inside workspace
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDate, setNewEventDate] = useState('')
  const [newEventType, setNewEventType] = useState<'étape chantier' | 'échéance' | 'rdv'>('étape chantier')

  // Notification toast
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const showToast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 4000)
  }

  useEffect(() => {
    if (urlStatus === 'EN_COURS' || urlStatus === 'EN COURS') {
      setStatusFilter('EN COURS')
    }
  }, [urlStatus])

  const fetchData = async () => {
    setLoading(true)
    const [projRes, taskRes, eventRes] = await Promise.all([
      supabase.from('projects').select('*').order('priority_order', { ascending: true }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('event_date', { ascending: true })
    ])
    if (projRes.data) setProjects(projRes.data)
    if (taskRes.data) setTasks(taskRes.data)
    if (eventRes.data) setEvents(eventRes.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Change project status
  const handleStatusChange = async (projectId: string, newStatus: any) => {
    setProjects(projects.map(p => p.id === projectId ? { ...p, status: newStatus } : p))
    if (activeWorkspaceProject && activeWorkspaceProject.id === projectId) {
      setActiveWorkspaceProject({ ...activeWorkspaceProject, status: newStatus })
    }
    await supabase.from('projects').update({ status: newStatus }).eq('id', projectId)
    showToast('Statut du chantier mis à jour')
  }

  // Update notes with debounce
  const handleNotesChange = (projectId: string, notes: string) => {
    setProjects(projects.map(p => p.id === projectId ? { ...p, notes_blockers: notes } : p))
    if (activeWorkspaceProject && activeWorkspaceProject.id === projectId) {
      setActiveWorkspaceProject({ ...activeWorkspaceProject, notes_blockers: notes })
    }
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(async () => {
      await supabase.from('projects').update({ notes_blockers: notes }).eq('id', projectId)
    }, 1000)
  }

  const handleAddProject = async () => {
    const { data, error } = await supabase.from('projects').insert([{
      priority_order: Number(newProject.priority_order),
      name: newProject.name,
      description: newProject.description,
      status: newProject.status,
      notes_blockers: newProject.notes_blockers
    }]).select().single()
    
    if (!error && data) {
      setProjects([...projects, data].sort((a, b) => a.priority_order - b.priority_order))
      setIsAddProjectOpen(false)
      setNewProject({ priority_order: projects.length + 2, name: '', description: '', status: 'À FAIRE', notes_blockers: '' })
      showToast(`Chantier "${data.name}" créé !`)
    }
  }

  const openEditProject = (project: Project) => {
    setEditingProject(project)
    setEditProjectForm({
      priority_order: project.priority_order,
      name: project.name,
      description: project.description || '',
      status: project.status,
      notes_blockers: project.notes_blockers || ''
    })
    setIsEditProjectOpen(true)
  }

  const handleUpdateProject = async () => {
    if (!editingProject) return
    const { data, error } = await supabase
      .from('projects')
      .update({
        priority_order: Number(editProjectForm.priority_order),
        name: editProjectForm.name,
        description: editProjectForm.description || null,
        status: editProjectForm.status,
        notes_blockers: editProjectForm.notes_blockers || null
      })
      .eq('id', editingProject.id)
      .select()
      .single()

    if (!error && data) {
      setProjects(projects.map(p => p.id === data.id ? data : p).sort((a, b) => a.priority_order - b.priority_order))
      if (activeWorkspaceProject && activeWorkspaceProject.id === data.id) {
        setActiveWorkspaceProject(data)
      }
      setIsEditProjectOpen(false)
      showToast('Chantier mis à jour !')
    }
  }

  const handleDeleteProject = async (projectId: string, name: string) => {
    if (!window.confirm(`Supprimer définitivement le chantier "${name}" ?`)) return
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    if (!error) {
      setProjects(projects.filter(p => p.id !== projectId))
      if (activeWorkspaceProject?.id === projectId) setActiveWorkspaceProject(null)
      showToast('Chantier supprimé')
    }
  }

  // Open Project Workspace Modal
  const openWorkspace = (project: Project) => {
    setActiveWorkspaceProject(project)
    setWorkspaceTab('tasks')
    setNewTaskTitle('')
    setNewTaskDesc('')
    setNewEventTitle(`Étape : ${project.name.slice(0, 30)}`)
    setNewEventDate(new Date().toISOString().split('T')[0])
  }

  // Tasks associated with active project
  const projectTasks = useMemo(() => {
    if (!activeWorkspaceProject) return []
    const pId = activeWorkspaceProject.id
    const pNameLow = activeWorkspaceProject.name.toLowerCase()
    const pShort = pNameLow.slice(0, 15)
    
    return tasks.filter(t => {
      const desc = (t.description || '').toLowerCase()
      const title = (t.title || '').toLowerCase()
      if (desc.includes(`[chantier_id:${pId}]`)) return true
      if (desc.includes(`chantier #${activeWorkspaceProject.priority_order}`)) return true
      if (title.includes(`chantier #${activeWorkspaceProject.priority_order}`)) return true
      if (t.category === 'Cahier des charges' && (desc.includes(pShort) || title.includes(pShort))) return true
      return false
    })
  }, [tasks, activeWorkspaceProject])

  // Events associated with active project
  const projectEvents = useMemo(() => {
    if (!activeWorkspaceProject) return []
    const pId = activeWorkspaceProject.id
    const pShort = activeWorkspaceProject.name.toLowerCase().slice(0, 15)
    return events.filter(e => {
      const desc = (e.description || '').toLowerCase()
      const title = (e.title || '').toLowerCase()
      return desc.includes(`[chantier_id:${pId}]`) || desc.includes(pShort) || title.includes(pShort)
    })
  }, [events, activeWorkspaceProject])

  // Quick toggle task status
  const handleToggleTaskStatus = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'fait' ? 'à faire' : 'fait'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t))
    await supabase.from('tasks').update({ status: nextStatus }).eq('id', task.id)
    showToast(nextStatus === 'fait' ? 'Tâche marquée comme terminée !' : 'Tâche réactivée')
  }

  // Add Task to this project
  const handleCreateProjectTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspaceProject || !newTaskTitle.trim()) return

    const tag = `[chantier_id:${activeWorkspaceProject.id}]`
    const fullDesc = newTaskDesc.trim() ? `${newTaskDesc.trim()} ${tag}` : tag

    const { data, error } = await supabase.from('tasks').insert([{
      title: newTaskTitle.trim(),
      description: fullDesc,
      category: 'Cahier des charges',
      priority: newTaskPriority,
      status: 'à faire'
    }]).select().single()

    if (!error && data) {
      setTasks(prev => [data, ...prev])
      setNewTaskTitle('')
      setNewTaskDesc('')
      showToast('Nouvelle tâche rattachée au chantier !')
    }
  }

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Supprimer cette tâche ?')) return
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    showToast('Tâche supprimée')
  }

  // Link an existing task to this project
  const handleLinkExistingTask = async () => {
    if (!activeWorkspaceProject || !taskToLink) return
    const taskObj = tasks.find(t => t.id === taskToLink)
    if (!taskObj) return

    const updatedDesc = formatTaskDescriptionWithProject(taskObj.description, activeWorkspaceProject.id)
    const { error } = await supabase
      .from('tasks')
      .update({ description: updatedDesc })
      .eq('id', taskToLink)

    if (!error) {
      setTasks(prev => prev.map(t => t.id === taskToLink ? { ...t, description: updatedDesc } : t))
      setTaskToLink(null)
      showToast('Tâche rattachée au chantier avec succès !')
    } else {
      showToast('Erreur lors du rattachement de la tâche')
    }
  }

  // Detach a task from this project (remove project tag)
  const handleDetachTaskFromProject = async (task: Task) => {
    const updatedDesc = formatTaskDescriptionWithProject(task.description, null)
    const { error } = await supabase
      .from('tasks')
      .update({ description: updatedDesc })
      .eq('id', task.id)

    if (!error) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: updatedDesc } : t))
      showToast('Tâche détachée du chantier')
    } else {
      showToast('Erreur lors du détachement de la tâche')
    }
  }

  // Add Event / Milestone to Calendar
  const handleCreateProjectEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspaceProject || !newEventTitle.trim() || !newEventDate) return

    const tag = `[chantier_id:${activeWorkspaceProject.id}]`
    const { data, error } = await supabase.from('events').insert([{
      title: newEventTitle.trim(),
      description: `Planifié pour le chantier "${activeWorkspaceProject.name}". ${tag}`,
      event_date: newEventDate,
      event_type: newEventType,
      status: 'à venir'
    }]).select().single()

    if (!error && data) {
      setEvents(prev => [...prev, data])
      setNewEventTitle(`Étape : ${activeWorkspaceProject.name.slice(0, 30)}`)
      showToast('Étape planifiée au calendrier !')
    }
  }

  // Project Progress stats
  const inProgressCount = projects.filter(p => p.status === 'EN COURS').length
  const todoCount = projects.filter(p => p.status === 'À FAIRE').length
  const completedCount = projects.filter(p => p.status === 'TERMINÉ').length
  const totalCount = projects.length
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)

  // Specific project completion calculation
  const getProjectCompletion = (project: Project) => {
    const pId = project.id
    const pShort = project.name.toLowerCase().slice(0, 15)
    const linked = tasks.filter(t => {
      const desc = (t.description || '').toLowerCase()
      const title = (t.title || '').toLowerCase()
      return desc.includes(`[chantier_id:${pId}]`) || 
             desc.includes(`chantier #${project.priority_order}`) || 
             (t.category === 'Cahier des charges' && (desc.includes(pShort) || title.includes(pShort)))
    })

    if (linked.length === 0) {
      return project.status === 'TERMINÉ' ? 100 : project.status === 'EN COURS' ? 50 : 0
    }
    const done = linked.filter(t => t.status === 'fait').length
    return Math.round((done / linked.length) * 100)
  }

  const displayedProjects = statusFilter === 'TOUS' 
    ? projects 
    : projects.filter(p => p.status === statusFilter)

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Chargement des chantiers...</div>

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FolderKanban className="w-8 h-8 text-blue-600" />
            Chantiers IT & Cahier des charges
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cliquez sur un chantier pour accéder à son espace de gestion de projet, ses tâches dédiées et ses jalons.
          </p>
        </div>
        <Button onClick={() => setIsAddProjectOpen(true)} className="cursor-pointer bg-blue-600 hover:bg-blue-700 shadow-xs">
          <Plus className="w-4 h-4 mr-2" /> Nouveau chantier
        </Button>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Global Progress Bar */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex justify-between items-center mb-2.5">
          <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            Progression globale des chantiers
          </span>
          <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-full">
            {completedCount} / {totalCount} terminés ({progressPercent}%)
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200/60">
          <div 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setStatusFilter('TOUS')}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer",
            statusFilter === 'TOUS' ? "bg-slate-900 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          Tous les chantiers ({totalCount})
        </button>
        <button
          onClick={() => setStatusFilter('EN COURS')}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
            statusFilter === 'EN COURS' 
              ? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-300" 
              : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          En cours ({inProgressCount})
        </button>
        <button
          onClick={() => setStatusFilter('À FAIRE')}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer",
            statusFilter === 'À FAIRE' ? "bg-slate-900 text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          À faire ({todoCount})
        </button>
        <button
          onClick={() => setStatusFilter('TERMINÉ')}
          className={cn(
            "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer",
            statusFilter === 'TERMINÉ' ? "bg-emerald-600 text-white shadow-xs" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          )}
        >
          Terminés ({completedCount})
        </button>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {displayedProjects.length === 0 ? (
          <div className="text-center text-slate-500 py-12 border rounded-xl bg-slate-50">
            Aucun chantier ne correspond à ce filtre.
          </div>
        ) : (
          displayedProjects.map(project => {
            const completion = getProjectCompletion(project)
            return (
              <Card 
                key={project.id} 
                onClick={() => openWorkspace(project)}
                className={cn(
                  "overflow-hidden transition-all duration-200 cursor-pointer border-slate-200 hover:border-blue-400 hover:shadow-lg group relative",
                  project.status === 'EN COURS' && "border-blue-500 shadow-sm ring-1 ring-blue-500/50 bg-blue-50/10"
                )}
              >
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Priority Indicator */}
                    <div className={cn(
                      "p-5 flex flex-col items-center justify-center border-r md:w-24 shrink-0 transition-colors",
                      project.status === 'TERMINÉ' ? "bg-emerald-50/50" : project.status === 'EN COURS' ? "bg-blue-50/50" : "bg-slate-50"
                    )}>
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-xs transition-transform group-hover:scale-105",
                        project.status === 'EN COURS' ? "bg-blue-600 text-white" : 
                        project.status === 'TERMINÉ' ? "bg-emerald-600 text-white" : 
                        "bg-white border-2 border-slate-300 text-slate-700"
                      )}>
                        {project.priority_order}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">Chantier</span>
                    </div>
                    
                    {/* Content */}
                    <div className="p-5 flex-1 space-y-3">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {project.name}
                            </h2>
                            <Badge className={cn("text-[11px] font-bold border", PROJECT_STATUS_COLORS[project.status])}>
                              {project.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {project.description || 'Aucune description renseignée.'}
                          </p>
                        </div>

                        {/* Top Actions */}
                        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                          <div className="w-36">
                            <Select 
                              value={project.status} 
                              onChange={(e) => handleStatusChange(project.id, e.target.value)}
                            >
                              <option value="À FAIRE">À FAIRE</option>
                              <option value="EN COURS">EN COURS</option>
                              <option value="EN ATTENTE">EN ATTENTE</option>
                              <option value="TERMINÉ">TERMINÉ</option>
                            </Select>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Modifier ce chantier"
                            onClick={() => openEditProject(project)}
                            className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Supprimer ce chantier"
                            onClick={() => handleDeleteProject(project.id, project.name)}
                            className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Project Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-slate-500">
                          <span className="font-semibold flex items-center gap-1.5">
                            <ListTodo className="w-3.5 h-3.5 text-blue-600" />
                            Avancement du chantier
                          </span>
                          <span className="font-bold font-mono text-slate-700">{completion}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-300",
                              completion === 100 ? "bg-emerald-500" : "bg-blue-600"
                            )}
                            style={{ width: `${completion}%` }}
                          />
                        </div>
                      </div>

                      {/* Footer Info & Call to Action */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div className="text-slate-500 truncate max-w-md">
                          {project.notes_blockers ? (
                            <span className="text-slate-600 line-clamp-1">
                              <strong>Notes :</strong> {project.notes_blockers}
                            </span>
                          ) : (
                            <span className="italic text-slate-400">Aucune note pour le moment.</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 font-bold text-blue-600 group-hover:translate-x-1 transition-transform">
                          <span>Gérer le projet & les tâches</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* ========================================================= */}
      {/* Interactive Project Workspace Modal (Drill-down Full Hub) */}
      {/* ========================================================= */}
      <Dialog 
        open={!!activeWorkspaceProject} 
        onClose={() => setActiveWorkspaceProject(null)}
        className="max-w-4xl p-0 overflow-hidden"
        hideCloseButton
      >
        {activeWorkspaceProject && (
          <div className="flex flex-col h-[85vh] max-h-[750px]">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                  {activeWorkspaceProject.priority_order}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold truncate">{activeWorkspaceProject.name}</h2>
                    <Badge className={cn("text-xs font-bold border", PROJECT_STATUS_COLORS[activeWorkspaceProject.status])}>
                      {activeWorkspaceProject.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                    {activeWorkspaceProject.description || 'Chantier prioritaire du cahier des charges IT.'}
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setActiveWorkspaceProject(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Subheader: Progress & Fast Status Changer */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 flex-1 min-w-[240px]">
                <div className="w-full max-w-xs space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Avancement des tâches</span>
                    <span className="font-mono text-blue-600">{getProjectCompletion(activeWorkspaceProject)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all"
                      style={{ width: `${getProjectCompletion(activeWorkspaceProject)}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  ({projectTasks.filter(t => t.status === 'fait').length} / {projectTasks.length} tâches terminées)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Statut :</span>
                <select
                  value={activeWorkspaceProject.status}
                  onChange={e => handleStatusChange(activeWorkspaceProject.id, e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold shadow-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="À FAIRE">À FAIRE</option>
                  <option value="EN COURS">EN COURS</option>
                  <option value="EN ATTENTE">EN ATTENTE</option>
                  <option value="TERMINÉ">TERMINÉ</option>
                </select>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-6 shrink-0">
              <button
                onClick={() => setWorkspaceTab('tasks')}
                className={cn(
                  "py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer",
                  workspaceTab === 'tasks' 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                <ListTodo className="w-4 h-4" />
                Tâches associées ({projectTasks.length})
              </button>

              <button
                onClick={() => setWorkspaceTab('calendar')}
                className={cn(
                  "py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer",
                  workspaceTab === 'calendar' 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                <Calendar className="w-4 h-4" />
                Échéances & Calendrier ({projectEvents.length})
              </button>

              <button
                onClick={() => setWorkspaceTab('notes')}
                className={cn(
                  "py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer",
                  workspaceTab === 'notes' 
                    ? "border-blue-600 text-blue-600" 
                    : "border-transparent text-slate-500 hover:text-slate-800"
                )}
              >
                <AlertTriangle className="w-4 h-4" />
                Notes & Points bloquants
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
              {/* TAB 1: TASKS */}
              {workspaceTab === 'tasks' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  {/* Mode Selector: Create or Link Existing */}
                  <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setTaskAttachMode('create')}
                      className={cn(
                        "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        taskAttachMode === 'create'
                          ? "bg-white text-blue-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Créer une nouvelle tâche
                    </button>
                    <button
                      type="button"
                      onClick={() => setTaskAttachMode('link')}
                      className={cn(
                        "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                        taskAttachMode === 'link'
                          ? "bg-white text-blue-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Rattacher une tâche existante
                    </button>
                  </div>

                  {/* Mode 1: Quick Add Task Form */}
                  {taskAttachMode === 'create' && (
                    <form onSubmit={handleCreateProjectTask} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                      <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-blue-600" />
                        Ajouter une tâche spécifique à ce chantier
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Intitulé de la tâche..."
                          value={newTaskTitle}
                          onChange={e => setNewTaskTitle(e.target.value)}
                          className="text-xs flex-1"
                          required
                        />
                        <select
                          value={newTaskPriority}
                          onChange={e => setNewTaskPriority(e.target.value as TaskPriority)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs shadow-xs text-slate-700"
                        >
                          <option value="haute">🚨 Haute</option>
                          <option value="moyenne">⚡ Moyenne</option>
                          <option value="basse">☕ Basse</option>
                        </select>
                        <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs shrink-0 cursor-pointer">
                          Ajouter
                        </Button>
                      </div>
                    </form>
                  )}

                  {/* Mode 2: Link Existing Task */}
                  {taskAttachMode === 'link' && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                      <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-blue-600" />
                        Choisir une tâche existante à intégrer à ce chantier
                      </div>
                      <TaskSelector
                        tasks={tasks.filter(t => !isTaskInProject(t, activeWorkspaceProject!))}
                        value={taskToLink}
                        onChange={setTaskToLink}
                        placeholder="Rechercher une tâche non liée au chantier..."
                      />
                      <div className="flex justify-end pt-1">
                        <Button
                          type="button"
                          size="sm"
                          disabled={!taskToLink}
                          onClick={handleLinkExistingTask}
                          className="bg-blue-600 hover:bg-blue-700 text-xs gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          Rattacher au chantier
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Tasks List */}
                  <div className="space-y-2">
                    {projectTasks.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-white text-slate-500 text-xs">
                        <ListTodo className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        Aucune tâche enregistrée pour ce chantier. Utilisez le formulaire ci-dessus pour en ajouter ou en rattacher une !
                      </div>
                    ) : (
                      projectTasks.map(task => {
                        const isDone = task.status === 'fait'
                        const cleanDesc = cleanTaskDescriptionProject(task.description)
                        return (
                          <div 
                            key={task.id}
                            className={cn(
                              "p-3.5 rounded-xl border bg-white shadow-xs flex items-center justify-between gap-3 transition-all",
                              isDone ? "opacity-60 bg-slate-50 border-slate-200" : "border-slate-200 hover:border-blue-300"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleToggleTaskStatus(task)}
                                className="cursor-pointer text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                              >
                                {isDone ? (
                                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                                ) : (
                                  <Square className="w-5 h-5" />
                                )}
                              </button>

                              <div className="min-w-0">
                                <span className={cn("text-xs font-bold text-slate-900 block truncate", isDone && "line-through text-slate-400")}>
                                  {task.title}
                                </span>
                                {cleanDesc && (
                                  <span className="text-[11px] text-slate-500 block truncate">
                                    {cleanDesc}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className={cn("text-[10px] font-bold border", PRIORITY_COLORS[task.priority])}>
                                {task.priority}
                              </Badge>
                              <Badge className={cn("text-[10px] font-semibold border", STATUS_COLORS[task.status])}>
                                {task.status}
                              </Badge>
                              <button
                                type="button"
                                onClick={() => handleDetachTaskFromProject(task)}
                                className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                title="Détacher du chantier (la tâche reste disponible dans Tâches)"
                              >
                                <FolderMinus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task.id)}
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                title="Supprimer définitivement la tâche"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: CALENDAR / EVENTS */}
              {workspaceTab === 'calendar' && (
                <div className="space-y-6 max-w-3xl mx-auto">
                  {/* Fast Schedule Form */}
                  <form onSubmit={handleCreateProjectEvent} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-600" />
                      Planifier une étape ou échéance au calendrier
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <Input
                          placeholder="Intitulé de l'étape ou réunion..."
                          value={newEventTitle}
                          onChange={e => setNewEventTitle(e.target.value)}
                          className="text-xs"
                          required
                        />
                      </div>
                      <div>
                        <CustomDatePicker
                          value={newEventDate}
                          onChange={setNewEventDate}
                          placeholder="Date de l'étape"
                          className="text-xs h-9"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <select
                        value={newEventType}
                        onChange={e => setNewEventType(e.target.value as any)}
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs shadow-xs text-slate-700"
                      >
                        <option value="étape chantier">🚩 Étape chantier</option>
                        <option value="échéance">⏱️ Échéance clé</option>
                        <option value="rdv">👥 Point d'avancement / Réunion</option>
                      </select>
                      <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-xs cursor-pointer">
                        Ajouter au calendrier
                      </Button>
                    </div>
                  </form>

                  {/* Planned Events */}
                  <div className="space-y-2">
                    {projectEvents.length === 0 ? (
                      <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-white text-slate-500 text-xs">
                        <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        Aucune échéance planifiée pour ce chantier.
                      </div>
                    ) : (
                      projectEvents.map(ev => {
                        const isClosed = ev.status === 'clos'
                        return (
                          <div 
                            key={ev.id} 
                            className={cn(
                              "p-3.5 rounded-xl border bg-white shadow-xs flex items-center justify-between",
                              isClosed ? "border-l-4 border-l-emerald-500 border-slate-200 bg-slate-50/50" : "border-slate-200"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <Calendar className={cn("w-4 h-4 shrink-0", isClosed ? "text-emerald-600" : "text-blue-600")} />
                              <div className="min-w-0">
                                <div className={cn("text-xs font-bold truncate", isClosed ? "text-slate-500 line-through" : "text-slate-900")}>
                                  {ev.title}
                                </div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  Date : {new Date(ev.event_date).toLocaleDateString('fr-FR')}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isClosed && (
                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold">
                                  ✓ Clos
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[10px] bg-slate-50">
                                {ev.event_type}
                              </Badge>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: NOTES & BLOCKERS */}
              {workspaceTab === 'notes' && (
                <div className="space-y-4 max-w-3xl mx-auto">
                  <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Consignez ici les arbitrages, points bloquants ou prérequis techniques. La sauvegarde s'effectue automatiquement.</span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700">Journal de bord & Points bloquants :</Label>
                    <Textarea
                      rows={10}
                      value={activeWorkspaceProject.notes_blockers || ''}
                      onChange={e => handleNotesChange(activeWorkspaceProject.id, e.target.value)}
                      placeholder="Décrivez les avancées, les besoins en prestataire, les blocages ou décisions..."
                      className="text-xs font-mono bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end shrink-0">
              <Button onClick={() => setActiveWorkspaceProject(null)} className="text-xs bg-slate-900 hover:bg-slate-800 cursor-pointer">
                Fermer l'espace projet
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Dialog: Ajouter un chantier */}
      <Dialog open={isAddProjectOpen} onClose={() => setIsAddProjectOpen(false)}>
        <DialogHeader>
          <DialogTitle>Ajouter un chantier</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ordre de priorité</Label>
              <Input type="number" value={newProject.priority_order} onChange={e => setNewProject({...newProject, priority_order: parseInt(e.target.value) || 1})} />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={newProject.status} onChange={e => setNewProject({...newProject, status: e.target.value})}>
                <option value="À FAIRE">À FAIRE</option>
                <option value="EN COURS">EN COURS</option>
                <option value="EN ATTENTE">EN ATTENTE</option>
                <option value="TERMINÉ">TERMINÉ</option>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nom du chantier</Label>
            <Input value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Notes & points bloquants</Label>
            <Textarea value={newProject.notes_blockers} onChange={e => setNewProject({...newProject, notes_blockers: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddProjectOpen(false)}>Annuler</Button>
          <Button onClick={handleAddProject} disabled={!newProject.name}>Enregistrer</Button>
        </DialogFooter>
      </Dialog>

      {/* Dialog: Modifier un chantier */}
      <Dialog open={isEditProjectOpen} onClose={() => setIsEditProjectOpen(false)}>
        <DialogHeader>
          <DialogTitle>Modifier le chantier</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ordre de priorité</Label>
              <Input 
                type="number" 
                value={editProjectForm.priority_order} 
                onChange={e => setEditProjectForm({...editProjectForm, priority_order: parseInt(e.target.value) || 1})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select 
                value={editProjectForm.status} 
                onChange={e => setEditProjectForm({...editProjectForm, status: e.target.value as ProjectStatus})}
              >
                <option value="À FAIRE">À FAIRE</option>
                <option value="EN COURS">EN COURS</option>
                <option value="EN ATTENTE">EN ATTENTE</option>
                <option value="TERMINÉ">TERMINÉ</option>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nom du chantier</Label>
            <Input 
              value={editProjectForm.name} 
              onChange={e => setEditProjectForm({...editProjectForm, name: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              value={editProjectForm.description} 
              onChange={e => setEditProjectForm({...editProjectForm, description: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Notes & points bloquants</Label>
            <Textarea 
              value={editProjectForm.notes_blockers} 
              onChange={e => setEditProjectForm({...editProjectForm, notes_blockers: e.target.value})} 
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsEditProjectOpen(false)}>Annuler</Button>
          <Button onClick={handleUpdateProject} disabled={!editProjectForm.name}>Enregistrer les modifications</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

export default function ChantiersPage() {
  return (
    <Suspense fallback={<div className="p-8 max-w-4xl mx-auto text-slate-500">Chargement des chantiers...</div>}>
      <ChantiersContent />
    </Suspense>
  )
}
