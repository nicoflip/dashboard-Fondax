'use client'

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Project, ProjectStatus, Task, TaskPriority, CalendarEvent } from '@/lib/types'
import { formatTaskDescriptionWithProject } from '@/lib/projects'
import { FolderKanban, Plus, CheckCircle2 } from 'lucide-react'

// Components
import { useChantiers } from '@/components/projects/useChantiers'
import { ProjectFilters } from '@/components/projects/ProjectFilters'
import { ProjectProgressBar } from '@/components/projects/ProjectProgressBar'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ProjectFormDialog } from '@/components/projects/ProjectFormDialog'
import { ProjectWorkspace } from '@/components/projects/ProjectWorkspace'

function ChantiersContent() {
  const searchParams = useSearchParams()
  const urlStatus = searchParams.get('status')
  const {
    projects, setProjects, tasks, setTasks, events, setEvents, loading,
    statusFilter, setStatusFilter, supabase, saveTimeoutRef,
    toastMsg, showToast, handleStatusChange, handleDeleteProject, getProjectCompletion
  } = useChantiers(urlStatus)

  // Modals state
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false)
  const [newProject, setNewProject] = useState({ priority_order: 1, name: '', description: '', status: 'À FAIRE' as ProjectStatus, notes_blockers: '' })
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editProjectForm, setEditProjectForm] = useState({ priority_order: 1, name: '', description: '', status: 'À FAIRE' as ProjectStatus, notes_blockers: '' })

  // Workspace state
  const [activeWorkspaceProject, setActiveWorkspaceProject] = useState<Project | null>(null)
  const [workspaceTab, setWorkspaceTab] = useState<'tasks' | 'milestones' | 'calendar' | 'notes'>('tasks')
  const [taskAttachMode, setTaskAttachMode] = useState<'create' | 'link'>('create')
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('moyenne')
  const [taskToLink, setTaskToLink] = useState<string | null>(null)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDate, setNewEventDate] = useState('')
  const [newEventType, setNewEventType] = useState<'étape chantier' | 'échéance' | 'rdv'>('étape chantier')

  // Helpers bound to page logic
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
      priority_order: Number(newProject.priority_order), name: newProject.name,
      description: newProject.description, status: newProject.status, notes_blockers: newProject.notes_blockers
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
      priority_order: project.priority_order, name: project.name, description: project.description || '',
      status: project.status, notes_blockers: project.notes_blockers || ''
    })
    setIsEditProjectOpen(true)
  }

  const handleUpdateProject = async () => {
    if (!editingProject) return
    const { data, error } = await supabase.from('projects').update({
      priority_order: Number(editProjectForm.priority_order), name: editProjectForm.name,
      description: editProjectForm.description || null, status: editProjectForm.status, notes_blockers: editProjectForm.notes_blockers || null
    }).eq('id', editingProject.id).select().single()

    if (!error && data) {
      setProjects(projects.map(p => p.id === data.id ? data : p).sort((a, b) => a.priority_order - b.priority_order))
      if (activeWorkspaceProject?.id === data.id) setActiveWorkspaceProject(data)
      setIsEditProjectOpen(false)
      showToast('Chantier mis à jour !')
    }
  }

  const openWorkspace = (project: Project) => {
    setActiveWorkspaceProject(project)
    setWorkspaceTab('tasks')
    setNewTaskTitle('')
    setNewTaskDesc('')
    setNewEventTitle(`Étape : ${project.name.slice(0, 30)}`)
    setNewEventDate(new Date().toISOString().split('T')[0])
  }

  const projectTasks = useMemo(() => {
    if (!activeWorkspaceProject) return []
    const pId = activeWorkspaceProject.id
    const pShort = activeWorkspaceProject.name.toLowerCase().slice(0, 15)
    return tasks.filter(t => {
      const desc = (t.description || '').toLowerCase()
      const title = (t.title || '').toLowerCase()
      if (desc.includes(`[chantier_id:${pId}]`) || desc.includes(`chantier #${activeWorkspaceProject.priority_order}`) || title.includes(`chantier #${activeWorkspaceProject.priority_order}`)) return true
      if (t.category === 'Cahier des charges' && (desc.includes(pShort) || title.includes(pShort))) return true
      return false
    })
  }, [tasks, activeWorkspaceProject])

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

  const handleToggleTaskStatus = async (task: Task) => {
    const nextStatus = task.status === 'fait' ? 'à faire' : 'fait'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t))
    await supabase.from('tasks').update({ status: nextStatus }).eq('id', task.id)
    showToast(nextStatus === 'fait' ? 'Tâche marquée comme terminée !' : 'Tâche réactivée')
  }

  const handleCreateProjectTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspaceProject || !newTaskTitle.trim()) return
    const tag = `[chantier_id:${activeWorkspaceProject.id}]`
    const fullDesc = newTaskDesc.trim() ? `${newTaskDesc.trim()} ${tag}` : tag
    const { data, error } = await supabase.from('tasks').insert([{
      title: newTaskTitle.trim(), description: fullDesc, category: 'Cahier des charges', priority: newTaskPriority, status: 'à faire'
    }]).select().single()
    if (!error && data) {
      setTasks(prev => [data, ...prev])
      setNewTaskTitle('')
      setNewTaskDesc('')
      showToast('Nouvelle tâche rattachée au chantier !')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Supprimer cette tâche ?')) return
    await supabase.from('tasks').delete().eq('id', taskId)
    setTasks(prev => prev.filter(t => t.id !== taskId))
    showToast('Tâche supprimée')
  }

  const handleLinkExistingTask = async () => {
    if (!activeWorkspaceProject || !taskToLink) return
    const taskObj = tasks.find(t => t.id === taskToLink)
    if (!taskObj) return
    const updatedDesc = formatTaskDescriptionWithProject(taskObj.description, activeWorkspaceProject.id)
    const { error } = await supabase.from('tasks').update({ description: updatedDesc }).eq('id', taskToLink)
    if (!error) {
      setTasks(prev => prev.map(t => t.id === taskToLink ? { ...t, description: updatedDesc } : t))
      setTaskToLink(null)
      showToast('Tâche rattachée au chantier avec succès !')
    } else showToast('Erreur lors du rattachement de la tâche')
  }

  const handleDetachTaskFromProject = async (task: Task) => {
    const updatedDesc = formatTaskDescriptionWithProject(task.description, null)
    const { error } = await supabase.from('tasks').update({ description: updatedDesc }).eq('id', task.id)
    if (!error) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: updatedDesc } : t))
      showToast('Tâche détachée du chantier')
    }
  }

  const handleCreateProjectEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeWorkspaceProject || !newEventTitle.trim() || !newEventDate) return
    const { data, error } = await supabase.from('events').insert([{
      title: newEventTitle.trim(), description: `Planifié pour le chantier "${activeWorkspaceProject.name}". [chantier_id:${activeWorkspaceProject.id}]`,
      event_date: newEventDate, event_type: newEventType, status: 'à venir'
    }]).select().single()
    if (!error && data) {
      setEvents(prev => [...prev, data])
      setNewEventTitle(`Étape : ${activeWorkspaceProject.name.slice(0, 30)}`)
      showToast('Étape planifiée au calendrier !')
    }
  }

  const inProgressCount = projects.filter(p => p.status === 'EN COURS').length
  const todoCount = projects.filter(p => p.status === 'À FAIRE').length
  const completedCount = projects.filter(p => p.status === 'TERMINÉ').length
  const progressPercent = projects.length === 0 ? 0 : Math.round((completedCount / projects.length) * 100)
  const displayedProjects = statusFilter === 'TOUS' ? projects : projects.filter(p => p.status === statusFilter)

  if (loading) return <div className="p-8 text-center text-slate-500 font-medium">Chargement des chantiers...</div>

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FolderKanban className="w-8 h-8 text-blue-600" /> Chantiers IT & Cahier des charges
          </h1>
          <p className="text-sm text-slate-500 mt-1">Cliquez sur un chantier pour accéder à son espace de gestion de projet, ses tâches dédiées et ses jalons.</p>
        </div>
        <Button onClick={() => setIsAddProjectOpen(true)} className="cursor-pointer bg-blue-600 hover:bg-blue-700 shadow-xs">
          <Plus className="w-4 h-4 mr-2" /> Nouveau chantier
        </Button>
      </div>

      {toastMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> <span className="font-semibold">{toastMsg}</span>
        </div>
      )}

      <ProjectProgressBar completedCount={completedCount} totalCount={projects.length} progressPercent={progressPercent} />
      <ProjectFilters statusFilter={statusFilter} setStatusFilter={setStatusFilter} totalCount={projects.length} inProgressCount={inProgressCount} todoCount={todoCount} completedCount={completedCount} />

      <div className="space-y-4">
        {displayedProjects.length === 0 ? (
          <div className="text-center text-slate-500 py-12 border rounded-xl bg-slate-50">Aucun chantier ne correspond à ce filtre.</div>
        ) : (
          displayedProjects.map(project => (
            <ProjectCard key={project.id} project={project} completion={getProjectCompletion(project)} openWorkspace={openWorkspace} handleStatusChange={(id, st) => handleStatusChange(id, st, activeWorkspaceProject, setActiveWorkspaceProject)} openEditProject={openEditProject} handleDeleteProject={(id, name) => handleDeleteProject(id, name, activeWorkspaceProject, setActiveWorkspaceProject)} />
          ))
        )}
      </div>

      <ProjectWorkspace
        activeWorkspaceProject={activeWorkspaceProject} setActiveWorkspaceProject={setActiveWorkspaceProject}
        workspaceTab={workspaceTab} setWorkspaceTab={setWorkspaceTab}
        projectTasks={projectTasks} projectEvents={projectEvents} tasks={tasks}
        getProjectCompletion={getProjectCompletion} handleStatusChange={(id, st) => handleStatusChange(id, st, activeWorkspaceProject, setActiveWorkspaceProject)}
        taskAttachMode={taskAttachMode} setTaskAttachMode={setTaskAttachMode}
        newTaskTitle={newTaskTitle} setNewTaskTitle={setNewTaskTitle} newTaskDesc={newTaskDesc} setNewTaskDesc={setNewTaskDesc}
        newTaskPriority={newTaskPriority} setNewTaskPriority={setNewTaskPriority} taskToLink={taskToLink} setTaskToLink={setTaskToLink}
        handleCreateProjectTask={handleCreateProjectTask} handleLinkExistingTask={handleLinkExistingTask}
        handleToggleTaskStatus={handleToggleTaskStatus} handleDetachTaskFromProject={handleDetachTaskFromProject} handleDeleteTask={handleDeleteTask}
        newEventTitle={newEventTitle} setNewEventTitle={setNewEventTitle} newEventDate={newEventDate} setNewEventDate={setNewEventDate}
        newEventType={newEventType} setNewEventType={setNewEventType} handleCreateProjectEvent={handleCreateProjectEvent}
        handleNotesChange={handleNotesChange}
      />
      <ProjectFormDialog isOpen={isAddProjectOpen} onClose={() => setIsAddProjectOpen(false)} title="Ajouter un chantier" formState={newProject} setFormState={setNewProject} onSave={handleAddProject} submitLabel="Enregistrer" />
      <ProjectFormDialog isOpen={isEditProjectOpen} onClose={() => setIsEditProjectOpen(false)} title="Modifier le chantier" formState={editProjectForm} setFormState={setEditProjectForm} onSave={handleUpdateProject} submitLabel="Enregistrer les modifications" />
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
