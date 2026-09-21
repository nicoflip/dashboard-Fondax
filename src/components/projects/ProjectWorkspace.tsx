'use client'
import React from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CustomDatePicker } from '@/components/ui/date-picker'
import { TaskSelector } from '@/components/shared/TaskSelector'
import { Project, Task, CalendarEvent, TaskPriority, TaskStatus } from '@/lib/types'
import { PROJECT_STATUS_COLORS, PRIORITY_COLORS, STATUS_COLORS, cn } from '@/lib/utils'
import { isTaskInProject, cleanTaskDescriptionProject } from '@/lib/projects'
import { 
  X, ListTodo, Calendar, AlertTriangle, Plus, Link2, 
  CheckSquare, Square, Trash2, FolderMinus, Pencil 
} from 'lucide-react'

interface ProjectWorkspaceProps {
  activeWorkspaceProject: Project | null
  setActiveWorkspaceProject: (project: Project | null) => void
  workspaceTab: 'tasks' | 'milestones' | 'calendar' | 'notes'
  setWorkspaceTab: (tab: 'tasks' | 'milestones' | 'calendar' | 'notes') => void
  
  projectTasks: Task[]
  projectEvents: CalendarEvent[]
  tasks: Task[]
  getProjectCompletion: (project: Project) => number
  handleStatusChange: (projectId: string, newStatus: string) => void
  
  taskAttachMode: 'create' | 'link'
  setTaskAttachMode: (mode: 'create' | 'link') => void
  newTaskTitle: string
  setNewTaskTitle: (val: string) => void
  newTaskDesc: string
  setNewTaskDesc: (val: string) => void
  newTaskPriority: TaskPriority
  setNewTaskPriority: (val: TaskPriority) => void
  taskToLink: string | null
  setTaskToLink: (val: string | null) => void
  handleCreateProjectTask: (e: React.FormEvent) => void
  handleLinkExistingTask: () => void
  handleToggleTaskStatus: (task: Task) => void
  handleDetachTaskFromProject: (task: Task) => void
  handleDeleteTask: (taskId: string) => void
  onOpenCreateTaskDialog?: () => void
  onEditTask?: (task: Task) => void
  
  newEventTitle: string
  setNewEventTitle: (val: string) => void
  newEventDate: string
  setNewEventDate: (val: string) => void
  newEventType: 'étape chantier' | 'échéance' | 'rdv'
  setNewEventType: (val: 'étape chantier' | 'échéance' | 'rdv') => void
  handleCreateProjectEvent: (e: React.FormEvent) => void
  
  handleNotesChange: (projectId: string, notes: string) => void
}

export function ProjectWorkspace(props: ProjectWorkspaceProps) {
  const {
    activeWorkspaceProject, setActiveWorkspaceProject,
    workspaceTab, setWorkspaceTab,
    projectTasks, projectEvents, tasks,
    getProjectCompletion, handleStatusChange,
    
    taskAttachMode, setTaskAttachMode,
    newTaskTitle, setNewTaskTitle, newTaskPriority, setNewTaskPriority,
    taskToLink, setTaskToLink, handleCreateProjectTask, handleLinkExistingTask,
    handleToggleTaskStatus, handleDetachTaskFromProject, handleDeleteTask,
    onOpenCreateTaskDialog, onEditTask,
    
    newEventTitle, setNewEventTitle, newEventDate, setNewEventDate,
    newEventType, setNewEventType, handleCreateProjectEvent,
    handleNotesChange
  } = props

  if (!activeWorkspaceProject) return null

  return (
    <Dialog 
      open={!!activeWorkspaceProject} 
      onClose={() => setActiveWorkspaceProject(null)}
      className="max-w-4xl p-0 overflow-hidden"
      hideCloseButton
      closeOnClickOutside={false}
    >
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
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setTaskAttachMode('create')}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    taskAttachMode === 'create' ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Plus className="w-3.5 h-3.5" /> Créer une nouvelle tâche
                </button>
                <button
                  type="button"
                  onClick={() => setTaskAttachMode('link')}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    taskAttachMode === 'link' ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Link2 className="w-3.5 h-3.5" /> Rattacher une tâche existante
                </button>
              </div>

              {taskAttachMode === 'create' && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                    <div>
                      <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-blue-600" /> Ajouter une tâche pour ce chantier
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Créez une tâche rattachée avec toutes les options : description, catégorie, dépendances, calendrier...
                      </p>
                    </div>
                    {onOpenCreateTaskDialog && (
                      <Button
                        type="button"
                        onClick={onOpenCreateTaskDialog}
                        className="bg-blue-600 hover:bg-blue-700 text-xs gap-1.5 cursor-pointer shrink-0 font-semibold shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Fiche complète de création
                      </Button>
                    )}
                  </div>

                  <form onSubmit={handleCreateProjectTask} className="flex gap-2">
                    <Input
                      placeholder="Ou saisie rapide : intitulé de la tâche..."
                      value={newTaskTitle}
                      onChange={e => setNewTaskTitle(e.target.value)}
                      className="text-xs flex-1"
                    />
                    <select
                      value={newTaskPriority}
                      onChange={e => setNewTaskPriority(e.target.value as TaskPriority)}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs shadow-xs text-slate-700 focus:outline-none"
                    >
                      <option value="haute">🚨 Haute</option>
                      <option value="moyenne">⚡ Moyenne</option>
                      <option value="basse">☕ Basse</option>
                    </select>
                    <Button type="submit" size="sm" variant="secondary" className="text-xs shrink-0 cursor-pointer">
                      Ajout rapide
                    </Button>
                  </form>
                </div>
              )}

              {taskAttachMode === 'link' && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5 text-blue-600" /> Choisir une tâche existante à intégrer à ce chantier
                  </div>
                  <TaskSelector
                    tasks={tasks.filter(t => !isTaskInProject(t, activeWorkspaceProject))}
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
                      <Link2 className="w-3.5 h-3.5" /> Rattacher au chantier
                    </Button>
                  </div>
                </div>
              )}

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
                            {isDone ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5" />}
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
                          {onEditTask && (
                            <button
                              type="button"
                              onClick={() => onEditTask(task)}
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Modifier la tâche (fiche complète avec toutes les options)"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
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
              <form onSubmit={handleCreateProjectEvent} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" /> Planifier une étape ou échéance au calendrier
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
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs shadow-xs text-slate-700 focus:outline-none"
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
    </Dialog>
  )
}
