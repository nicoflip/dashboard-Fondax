'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { PROJECT_STATUS_COLORS } from '@/lib/utils'
import { Project, ProjectStatus } from '@/lib/types'
import { Plus } from 'lucide-react'

export default function ChantiersPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false)
  const [newProject, setNewProject] = useState({ priority_order: 1, name: '', description: '', status: 'À FAIRE', notes_blockers: '' })

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

  const completedCount = projects.filter(p => p.status === 'TERMINÉ').length
  const totalCount = projects.length
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)

  if (loading) return <div className="p-8">Chargement...</div>

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Chantiers IT</h1>
        <Button onClick={() => setIsAddProjectOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter un chantier
        </Button>
      </div>

      <div className="bg-slate-100 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-slate-700">Progression globale</span>
          <span className="text-sm text-slate-500">{completedCount} / {totalCount} terminés ({progressPercent}%)</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2.5">
          <div className="bg-blue-600 h-2.5 rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      <div className="space-y-4">
        {projects.length === 0 ? (
          <div className="text-center text-slate-500 py-12">Aucun chantier.</div>
        ) : (
          projects.map(project => (
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
                      <div className="w-40 flex-shrink-0">
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

      <Dialog open={isAddProjectOpen} onClose={() => setIsAddProjectOpen(false)}>
        <DialogHeader>
          <DialogTitle>Ajouter un chantier</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Ordre de priorité</Label>
              <Input type="number" value={newProject.priority_order} onChange={e => setNewProject({...newProject, priority_order: parseInt(e.target.value)})} />
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
          <Button onClick={handleAddProject}>Enregistrer</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
