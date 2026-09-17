'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task, Project, CalendarEvent } from '@/lib/types'
import { parseEventClosureComment } from '@/lib/closure-comments'

// Helper to format ISO date to YYYY-MM-DD
function toYMD(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useReportData() {
  const supabase = createClient()

  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return toYMD(new Date(d.getFullYear(), d.getMonth(), 1))
  })
  const [endDate, setEndDate] = useState(() => {
    return toYMD(new Date())
  })

  const [selectedCategory, setSelectedCategory] = useState<string>('TOUS')
  const [activePreset, setActivePreset] = useState<string>('ce_mois')

  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const [tasksRes, projectsRes, eventsRes] = await Promise.all([
      supabase.from('tasks').select('*').order('updated_at', { ascending: false }),
      supabase.from('projects').select('*').order('priority_order', { ascending: true }),
      supabase.from('events').select('*').order('event_date', { ascending: true })
    ])

    if (tasksRes.data) setTasks(tasksRes.data)
    if (projectsRes.data) setProjects(projectsRes.data)
    if (eventsRes.data) setEvents(eventsRes.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handlePreset = (preset: string) => {
    setActivePreset(preset)
    const now = new Date()

    if (preset === 'aujourd_hui') {
      const today = toYMD(now)
      setStartDate(today)
      setEndDate(today)
    } else if (preset === 'cette_semaine') {
      const day = now.getDay()
      const diffToMonday = day === 0 ? 6 : day - 1
      const monday = new Date(now)
      monday.setDate(now.getDate() - diffToMonday)
      setStartDate(toYMD(monday))
      setEndDate(toYMD(now))
    } else if (preset === 'ce_mois') {
      setStartDate(toYMD(new Date(now.getFullYear(), now.getMonth(), 1)))
      setEndDate(toYMD(now))
    } else if (preset === '30_jours') {
      const past30 = new Date(now)
      past30.setDate(now.getDate() - 30)
      setStartDate(toYMD(past30))
      setEndDate(toYMD(now))
    } else if (preset === 'ce_trimestre') {
      const currentQuarter = Math.floor(now.getMonth() / 3)
      setStartDate(toYMD(new Date(now.getFullYear(), currentQuarter * 3, 1)))
      setEndDate(toYMD(now))
    } else if (preset === 'cette_annee') {
      setStartDate(toYMD(new Date(now.getFullYear(), 0, 1)))
      setEndDate(toYMD(now))
    } else if (preset === 'tout') {
      setStartDate('')
      setEndDate('')
    }
  }

  const isDateInRange = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return false

    if (startDate) {
      const s = new Date(startDate + 'T00:00:00')
      if (d < s) return false
    }
    if (endDate) {
      const e = new Date(endDate + 'T23:59:59.999')
      if (d > e) return false
    }
    return true
  }

  const getProjectForTask = (task: Task): Project | undefined => {
    const desc = (task.description || '').toLowerCase()
    const title = (task.title || '').toLowerCase()

    return projects.find(p => {
      if (desc.includes(`[chantier_id:${p.id}]`)) return true
      if (desc.includes(`chantier #${p.priority_order}`)) return true
      if (title.includes(`chantier #${p.priority_order}`)) return true
      const pShort = p.name.toLowerCase().slice(0, 15)
      if (task.category === 'Cahier des charges' && (desc.includes(pShort) || title.includes(pShort))) return true
      return false
    })
  }

  const isChantierEvent = (event: CalendarEvent, p: Project): boolean => {
    const desc = (event.description || '').toLowerCase()
    const title = (event.title || '').toLowerCase()
    const pShort = p.name.toLowerCase().slice(0, 15)
    return desc.includes(`[chantier_id:${p.id}]`) || desc.includes(pShort) || title.includes(pShort)
  }

  const getProjectForEvent = (event: CalendarEvent): Project | undefined => {
    const desc = (event.description || '').toLowerCase()
    const title = (event.title || '').toLowerCase()

    return projects.find(p => {
      if (desc.includes(`[chantier_id:${p.id}]`)) return true
      if (desc.includes(`chantier #${p.priority_order}`)) return true
      if (title.includes(`chantier #${p.priority_order}`)) return true
      const pShort = p.name.toLowerCase().slice(0, 15)
      if (desc.includes(pShort) || title.includes(pShort)) return true
      return false
    })
  }

  const completedTasksInPeriod = useMemo(() => {
    return tasks.filter(t => {
      if (t.status !== 'fait') return false
      const effectiveDate = t.updated_at || t.created_at
      if (!isDateInRange(effectiveDate)) return false
      if (selectedCategory !== 'TOUS' && t.category !== selectedCategory) return false
      return true
    })
  }, [tasks, startDate, endDate, selectedCategory])

  const closedEventsInPeriod = useMemo(() => {
    return events.filter(e => {
      if (e.status !== 'clos') return false
      return isDateInRange(e.event_date)
    })
  }, [events, startDate, endDate])

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    completedTasksInPeriod.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1
    })
    return counts
  }, [completedTasksInPeriod])

  const chantiersReport = useMemo(() => {
    return projects.map(p => {
      const pId = p.id
      const pShort = p.name.toLowerCase().slice(0, 15)

      const pTasks = tasks.filter(t => {
        const desc = (t.description || '').toLowerCase()
        const title = (t.title || '').toLowerCase()
        if (desc.includes(`[chantier_id:${pId}]`)) return true
        if (desc.includes(`chantier #${p.priority_order}`)) return true
        if (title.includes(`chantier #${p.priority_order}`)) return true
        if (t.category === 'Cahier des charges' && (desc.includes(pShort) || title.includes(pShort))) return true
        return false
      })

      const totalTasks = pTasks.length
      const doneTasks = pTasks.filter(t => t.status === 'fait').length
      
      let progressPercent = 0
      if (totalTasks > 0) {
        progressPercent = Math.round((doneTasks / totalTasks) * 100)
      } else if (p.status === 'TERMINÉ') {
        progressPercent = 100
      } else if (p.status === 'EN COURS') {
        progressPercent = 50
      }

      const tasksCompletedInPeriod = pTasks.filter(t => {
        if (t.status !== 'fait') return false
        const effectiveDate = t.updated_at || t.created_at
        return isDateInRange(effectiveDate)
      })

      const projectEventsInPeriod = events.filter(e => {
        return isChantierEvent(e, p) && isDateInRange(e.event_date)
      })

      return {
        project: p,
        totalTasks,
        doneTasks,
        progressPercent,
        tasksCompletedInPeriod,
        projectEventsInPeriod
      }
    })
  }, [projects, tasks, events, startDate, endDate])

  const kpis = useMemo(() => {
    const totalDone = completedTasksInPeriod.length
    const highPriorityDone = completedTasksInPeriod.filter(t => t.priority === 'haute').length
    const activeProjects = projects.filter(p => p.status === 'EN COURS').length
    const finishedProjects = projects.filter(p => p.status === 'TERMINÉ').length
    const totalAllTasks = tasks.length
    const totalAllDoneTasks = tasks.filter(t => t.status === 'fait').length
    const globalCompletionRate = totalAllTasks > 0 ? Math.round((totalAllDoneTasks / totalAllTasks) * 100) : 0
    const closedEventsCount = closedEventsInPeriod.length

    return {
      totalDone,
      highPriorityDone,
      activeProjects,
      finishedProjects,
      globalCompletionRate,
      closedEventsCount
    }
  }, [completedTasksInPeriod, projects, tasks, closedEventsInPeriod])

  const formatTaskDesc = (desc: string | null) => {
    if (!desc) return null
    return desc
      .replace(/\[chantier_id:[^\]]+\]/g, '')
      .replace(/\[Période flexible\s*:\s*[^\]]+\]/g, '')
      .replace(/\[(?:CLOTURE|CLÔTURE|RESOLUTION|RÉSOLUTION)\s*:\s*[^\]]+\]/gi, '')
      .trim()
  }

  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedCategory,
    setSelectedCategory,
    activePreset,
    loading,
    fetchData,
    handlePreset,
    completedTasksInPeriod,
    closedEventsInPeriod,
    categoryCounts,
    chantiersReport,
    kpis,
    getProjectForTask,
    getProjectForEvent,
    formatTaskDesc
  }
}
