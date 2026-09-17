import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Project } from '@/lib/types'
import { PROJECT_STATUS_COLORS, cn } from '@/lib/utils'
import { Pencil, Trash2, ListTodo, ArrowRight } from 'lucide-react'

interface ProjectCardProps {
  project: Project
  completion: number
  openWorkspace: (project: Project) => void
  handleStatusChange: (projectId: string, newStatus: string) => void
  openEditProject: (project: Project) => void
  handleDeleteProject: (projectId: string, name: string) => void
}

export function ProjectCard({ project, completion, openWorkspace, handleStatusChange, openEditProject, handleDeleteProject }: ProjectCardProps) {
  return (
    <Card 
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
}
