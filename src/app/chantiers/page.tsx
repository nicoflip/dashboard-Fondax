'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PROJECT_STATUS_COLORS, cn } from '@/lib/utils'
import { Project, ProjectStatus } from '@/lib/types'
import { Plus, Pencil, Trash2, FolderKanban, CheckCircle2, Clock } from 'lucide-react'

function ChantiersContent() {
  const searchParams = useSearchParams()
  const urlStatus = searchParams.get('status')

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'TOUS' | 'EN COURS' | 'À FAIRE' | 'TERMINÉ'>('TOUS')
  const supabase = createClient()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  useEffect(() => {
    if (urlStatus === 'EN_COURS' || urlStatus === 'EN COURS') {
      setStatusFilter('EN COURS')
    }
  }, [urlStatus])

  const fetchProjects = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('projects').select('*').order('priority_order', { ascending: true })
    if (data) setProjects(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const handleStatusChange = async (projectId: string, newStatus: any) => {
    setProjects(projects.map(p => p.id === projectId ? { ...p, status: newStatus } : p))
    await supabase.from('projects').update({ status: newStatus }).eq('id', projectId)
  }

  const handleNotesChange = (projectId: string, notes: string) => {
    setProjects(projects.map(p => p.id === projectId ? { ...p, notes_blockers: notes } : p))
    
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
      setIsEditProjectOpen(false)
    }
  }

  const handleDeleteProject = async (projectId: string, name: string) => {
    if (!window.confirm(`Supprimer définitivement le chantier "${name}" ?`)) return
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    if (!error) {
      setProjects(projects.filter(p => p.id !== projectId))
    }
  }

  const inProgressCount = projects.filter(p => p.status === 'EN COURS').length
  const todoCount = projects.filter(p => p.status === 'À FAIRE').length
  const completedCount = projects.filter(p => p.status === 'TERMINÉ').length
  const totalCount = projects.length
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)

  const displayedProjects = statusFilter === 'TOUS' 
    ? projects 
    : projects.filter(p => p.status === statusFilter)

  if (loading) return <div className="p-8">Chargement...</div>

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Chantiers IT</h1>
          <p className="text-sm text-slate-500">Cahier des charges & projets prioritaires Fondax</p>
        </div>
        <Button onClick={() => setIsAddProjectOpen(true)} className="cursor-pointer">
          <Plus className="w-4 h-4 mr-2" /> Ajouter un chantier
        </Button>
      </div>

      <div className="bg-slate-100 rounded-xl p-4 border border-slate-200/80">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-slate-700">Progression globale</span>
          <span className="text-sm text-slate-500 font-medium">{completedCount} / {totalCount} terminés ({progressPercent}%)</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5">
          <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      {/* Onglets de filtrage par statut */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setStatusFilter('TOUS')}
          className={cn(
            "px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
            statusFilter === 'TOUS' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          Tous les chantiers <span className="opacity-75">({totalCount})</span>
        </button>
        <button
          onClick={() => setStatusFilter('EN COURS')}
          className={cn(
            "px-3.5 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs",
            statusFilter === 'EN COURS' 
              ? "bg-blue-600 text-white ring-2 ring-blue-300" 
              : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          En cours uniquement <span className={cn("px-1.5 py-0.2 rounded-full text-xs font-black", statusFilter === 'EN COURS' ? "bg-blue-800 text-white" : "bg-blue-200 text-blue-900")}>{inProgressCount}</span>
        </button>
        <button
          onClick={() => setStatusFilter('À FAIRE')}
          className={cn(
            "px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
            statusFilter === 'À FAIRE' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          À faire <span className="opacity-75">({todoCount})</span>
        </button>
        <button
          onClick={() => setStatusFilter('TERMINÉ')}
          className={cn(
            "px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
            statusFilter === 'TERMINÉ' ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          )}
        >
          Terminés <span className="opacity-75">({completedCount})</span>
        </button>
      </div>

      <div className="space-y-4">
        {displayedProjects.length === 0 ? (
          <div className="text-center text-slate-500 py-12 border rounded-xl bg-slate-50">
            Aucun chantier ne correspond à ce filtre.
          </div>
        ) : (
          displayedProjects.map(project => (
            <Card key={project.id} className={`overflow-hidden transition-all ${project.status === 'EN COURS' ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : ''}`}>
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Priority Indicator */}
                  <div className={`p-4 flex items-center justify-center border-r md:w-20 ${project.status === 'TERMINÉ' ? 'bg-slate-100' : 'bg-slate-50'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg 
                      ${project.status === 'EN COURS' ? 'bg-blue-600 text-white' : 
                        project.status === 'TERMINÉ' ? 'bg-green-100 text-green-700' : 
                        'bg-slate-200 text-slate-700'}`}>
                      {project.priority_order}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6 flex-1 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h2 className="text-xl font-bold text-slate-800">{project.name}</h2>
                          {project.status === 'EN COURS' && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">En cours</Badge>
                          )}
                        </div>
                        <p className="text-slate-600">{project.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
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
                    
                    <div className="pt-2">
                      <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Notes & Points bloquants</Label>
                      <Textarea 
                        className="min-h-[100px] text-sm bg-slate-50"
                        placeholder="Ajouter des notes, prochaines étapes ou points bloquants..."
                        value={project.notes_blockers || ''}
                        onChange={(e) => handleNotesChange(project.id, e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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
