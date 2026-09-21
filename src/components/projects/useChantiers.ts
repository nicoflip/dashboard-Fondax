'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Project, Task, CalendarEvent, ProjectStatus, TaskPriority, TaskStatus, WaitingReturn } from '@/lib/types'
import { isTaskInProject, formatTaskDescriptionWithProject } from '@/lib/projects'
import { fetchWaitingReturns } from '@/lib/waiting-returns'

export function useChantiers(urlStatus: string | null) {
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [waitingReturns, setWaitingReturns] = useState<WaitingReturn[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'TOUS' | 'EN COURS' | 'À FAIRE' | 'TERMINÉ'>('TOUS')
  const supabase = createClient()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
    const [projRes, taskRes, eventRes, returnsRes] = await Promise.all([
      supabase.from('projects').select('*').order('priority_order', { ascending: true }),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('event_date', { ascending: true }),
      fetchWaitingReturns(supabase)
    ])
    if (projRes.data) setProjects(projRes.data)
    if (taskRes.data) setTasks(taskRes.data)
    if (eventRes.data) setEvents(eventRes.data)
    if (returnsRes) setWaitingReturns(returnsRes)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleStatusChange = async (projectId: string, newStatus: any, activeWorkspaceProject: Project | null, setActiveWorkspaceProject: (p: Project | null) => void) => {
    setProjects(projects.map(p => p.id === projectId ? { ...p, status: newStatus } : p))
    if (activeWorkspaceProject && activeWorkspaceProject.id === projectId) {
      setActiveWorkspaceProject({ ...activeWorkspaceProject, status: newStatus })
    }
    await supabase.from('projects').update({ status: newStatus }).eq('id', projectId)
    showToast('Statut du chantier mis à jour')
  }

  const handleDeleteProject = async (projectId: string, name: string, activeWorkspaceProject: Project | null, setActiveWorkspaceProject: (p: Project | null) => void) => {
    if (!window.confirm(`Supprimer définitivement le chantier "${name}" ?`)) return
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    if (!error) {
      setProjects(projects.filter(p => p.id !== projectId))
      if (activeWorkspaceProject?.id === projectId) setActiveWorkspaceProject(null)
      showToast('Chantier supprimé')
    }
  }

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

  return {
    projects, setProjects,
    tasks, setTasks,
    events, setEvents,
    waitingReturns, setWaitingReturns,
    loading,
    statusFilter, setStatusFilter,
    supabase,
    saveTimeoutRef,
    toastMsg, showToast,
    handleStatusChange,
    handleDeleteProject,
    getProjectCompletion,
  }
}
