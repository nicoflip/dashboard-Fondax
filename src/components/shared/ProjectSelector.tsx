'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Project, ProjectStatus } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  FolderKanban, 
  Search, 
  X, 
  ChevronDown, 
  Check, 
  Layers,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectSelectorProps {
  projects: Project[]
  value?: string | null // projectId
  onChange: (projectId: string | null) => void
  disabled?: boolean
  label?: string
  placeholder?: string
  className?: string
}

const PROJECT_STATUS_STYLES: Record<ProjectStatus, { bg: string; text: string; border: string }> = {
  'EN COURS': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  'À FAIRE': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'EN ATTENTE': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  'TERMINÉ': { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' }
}

export function ProjectSelector({
  projects,
  value,
  onChange,
  disabled = false,
  label = 'Rattacher à un chantier IT (optionnel)',
  placeholder = 'Sélectionner un chantier...',
  className
}: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const containerRef = useRef<HTMLDivElement>(null)

  const selectedProject = useMemo(() => {
    if (!value) return null
    return projects.find(p => p.id === value) || null
  }, [projects, value])

  // Sorted projects by priority order
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => a.priority_order - b.priority_order)
  }, [projects])

  // Filtered projects
  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase()
    return sortedProjects.filter(p => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        `chantier ${p.priority_order}`.includes(q) ||
        `#${p.priority_order}`.includes(q)
      )
    })
  }, [sortedProjects, search, statusFilter])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as HTMLElement)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className={cn("space-y-1.5 relative w-full", className)} ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <FolderKanban className="w-3.5 h-3.5 text-amber-600" />
          <span>{label}</span>
        </label>
      )}

      {/* 1. If a project is selected and selector is closed: Display beautiful selected card */}
      {selectedProject && !isOpen ? (
        <div className="rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50/90 via-white to-amber-50/40 p-3 shadow-2xs transition-all hover:border-amber-400">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                  <FolderKanban className="w-3 h-3 text-amber-700" />
                  Chantier #{selectedProject.priority_order}
                </span>

                {(() => {
                  const style = PROJECT_STATUS_STYLES[selectedProject.status] || PROJECT_STATUS_STYLES['À FAIRE']
                  return (
                    <Badge variant="outline" className={cn("text-[10px] font-semibold border", style.bg, style.text, style.border)}>
                      {selectedProject.status}
                    </Badge>
                  )
                })()}
              </div>

              <p className="text-sm font-bold text-slate-900 truncate">
                {selectedProject.name}
              </p>

              {selectedProject.description && (
                <p className="text-xs text-slate-500 line-clamp-1">
                  {selectedProject.description}
                </p>
              )}
            </div>

            {!disabled && (
              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer"
                >
                  Changer
                </button>
                <button
                  type="button"
                  onClick={() => onChange(null)}
                  title="Délier la tâche du chantier"
                  className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* 2. Trigger Button (When no project selected or selector is open) */
        <div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen(o => !o)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm rounded-xl border bg-white transition-all text-left cursor-pointer group",
              isOpen 
                ? "border-amber-500 ring-2 ring-amber-100 shadow-xs" 
                : "border-slate-200 hover:border-slate-300",
              disabled && "opacity-50 cursor-not-allowed bg-slate-50"
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center shrink-0">
                <FolderKanban className="w-3.5 h-3.5" />
              </div>
              <span className={cn("truncate", selectedProject ? "font-semibold text-slate-900" : "text-slate-400")}>
                {selectedProject 
                  ? `Chantier #${selectedProject.priority_order} : ${selectedProject.name}` 
                  : placeholder
                }
              </span>
            </div>

            <ChevronDown className={cn(
              "w-4 h-4 text-slate-400 transition-transform duration-200",
              isOpen && "rotate-180 text-amber-600"
            )} />
          </button>

          {/* 3. Popover Card for selecting chantier */}
          {isOpen && (
            <div className="absolute z-[9999] top-full mt-2 w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-3.5 animate-in fade-in-50 zoom-in-95 duration-100">
              {/* Header & Search */}
              <div className="space-y-2 mb-2 pb-2.5 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-amber-600" />
                    Chantiers IT disponibles
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-xs text-slate-400 hover:text-slate-700 font-medium"
                  >
                    Fermer
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Filtrer par nom ou numéro..."
                    className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
                    autoFocus
                  />
                </div>

                {/* Status Pills */}
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {[
                    { key: 'ALL', label: `Tous (${sortedProjects.length})` },
                    { key: 'EN COURS', label: 'En cours' },
                    { key: 'À FAIRE', label: 'À faire' },
                    { key: 'EN ATTENTE', label: 'En attente' }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setStatusFilter(tab.key)}
                      className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all cursor-pointer",
                        statusFilter === tab.key
                          ? "bg-amber-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chantiers List */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
                {/* Option to clear / detach */}
                <div
                  onClick={() => {
                    onChange(null)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "p-2 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all",
                    !value 
                      ? "bg-slate-100 border-slate-300 font-semibold text-slate-800" 
                      : "border-dashed border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    Aucun chantier lié (Tâche indépendante)
                  </span>
                  {!value && <Check className="w-3.5 h-3.5 text-blue-600" />}
                </div>

                {filteredProjects.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center italic">
                    Aucun chantier ne correspond à votre recherche.
                  </p>
                ) : (
                  filteredProjects.map(project => {
                    const isSelected = value === project.id
                    const style = PROJECT_STATUS_STYLES[project.status] || PROJECT_STATUS_STYLES['À FAIRE']

                    return (
                      <div
                        key={project.id}
                        onClick={() => {
                          onChange(project.id)
                          setIsOpen(false)
                        }}
                        className={cn(
                          "p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start justify-between gap-2",
                          isSelected
                            ? "border-amber-400 bg-amber-50/70 shadow-2xs ring-1 ring-amber-300"
                            : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/20"
                        )}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.2 rounded font-mono">
                              #{project.priority_order}
                            </span>
                            <span className="font-bold text-slate-900 truncate block">
                              {project.name}
                            </span>
                          </div>

                          {project.description && (
                            <p className="text-[11px] text-slate-500 truncate">
                              {project.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                          <Badge variant="outline" className={cn("text-[9px] font-semibold", style.bg, style.text, style.border)}>
                            {project.status}
                          </Badge>
                          {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
