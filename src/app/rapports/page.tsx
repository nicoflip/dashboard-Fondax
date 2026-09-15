'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CustomDatePicker } from '@/components/ui/date-picker'
import { 
  FileBarChart, 
  Printer, 
  Copy, 
  Check, 
  Download, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  FolderKanban, 
  AlertCircle, 
  Sparkles, 
  Filter, 
  ArrowRight, 
  Layers, 
  Shield, 
  TrendingUp, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react'
import { 
  Task, 
  Project, 
  CalendarEvent, 
  TaskCategory 
} from '@/lib/types'
import { 
  cn, 
  formatDate, 
  PRIORITY_COLORS, 
  STATUS_COLORS, 
  PROJECT_STATUS_COLORS, 
  TASK_CATEGORIES,
  TASK_CATEGORY_COLORS 
} from '@/lib/utils'

// Helper to format ISO date to YYYY-MM-DD
function toYMD(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function RapportsPage() {
  const supabase = createClient()

  // Default date range: from the 1st of the current month to today
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return toYMD(new Date(d.getFullYear(), d.getMonth(), 1))
  })
  const [endDate, setEndDate] = useState(() => {
    return toYMD(new Date())
  })

  // Filters inside report
  const [selectedCategory, setSelectedCategory] = useState<string>('TOUS')
  const [activePreset, setActivePreset] = useState<string>('ce_mois')

  // Data
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Feedback states
  const [copied, setCopied] = useState(false)

  // Fetch all required data once
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

  // Presets logic
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

  // Date range verification helper
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

  // Helper to match task to project
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

  // Helper to match events to project
  const isChantierEvent = (event: CalendarEvent, p: Project): boolean => {
    const desc = (event.description || '').toLowerCase()
    const title = (event.title || '').toLowerCase()
    const pShort = p.name.toLowerCase().slice(0, 15)
    return desc.includes(`[chantier_id:${p.id}]`) || desc.includes(pShort) || title.includes(pShort)
  }

  // 1. Completed tasks in selected period
  const completedTasksInPeriod = useMemo(() => {
    return tasks.filter(t => {
      if (t.status !== 'fait') return false
      const effectiveDate = t.updated_at || t.created_at
      if (!isDateInRange(effectiveDate)) return false
      if (selectedCategory !== 'TOUS' && t.category !== selectedCategory) return false
      return true
    })
  }, [tasks, startDate, endDate, selectedCategory])

  // Breakdown by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    completedTasksInPeriod.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1
    })
    return counts
  }, [completedTasksInPeriod])

  // 2. Chantiers stats and progress
  const chantiersReport = useMemo(() => {
    return projects.map(p => {
      const pId = p.id
      const pShort = p.name.toLowerCase().slice(0, 15)

      // All tasks for this project
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

      // Tasks completed during the selected period
      const tasksCompletedInPeriod = pTasks.filter(t => {
        if (t.status !== 'fait') return false
        const effectiveDate = t.updated_at || t.created_at
        return isDateInRange(effectiveDate)
      })

      // Events / Milestones during this period
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

  // Overall KPI statistics
  const kpis = useMemo(() => {
    const totalDone = completedTasksInPeriod.length
    const highPriorityDone = completedTasksInPeriod.filter(t => t.priority === 'haute').length
    const activeProjects = projects.filter(p => p.status === 'EN COURS').length
    const finishedProjects = projects.filter(p => p.status === 'TERMINÉ').length
    const totalAllTasks = tasks.length
    const totalAllDoneTasks = tasks.filter(t => t.status === 'fait').length
    const globalCompletionRate = totalAllTasks > 0 ? Math.round((totalAllDoneTasks / totalAllTasks) * 100) : 0

    return {
      totalDone,
      highPriorityDone,
      activeProjects,
      finishedProjects,
      globalCompletionRate
    }
  }, [completedTasksInPeriod, projects, tasks])

  // Clean description helper for tasks
  const formatTaskDesc = (desc: string | null) => {
    if (!desc) return null
    return desc
      .replace(/\[chantier_id:[^\]]+\]/g, '')
      .replace(/\[Période flexible\s*:\s*[^\]]+\]/g, '')
      .trim()
  }

  // Generate clean Markdown report text
  const generateMarkdownReport = () => {
    const startDisplay = startDate ? formatDate(startDate) : 'Début historique'
    const endDisplay = endDate ? formatDate(endDate) : "Aujourd'hui"
    const nowStr = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    let md = `# RAPPORT D'ACTIVITÉ IT & AVANCEMENT DES CHANTIERS — FONDAX\n\n`
    md += `**Période analysée :** Du ${startDisplay} au ${endDisplay}\n`
    md += `**Date de génération :** ${nowStr}\n`
    md += `**Destinataire :** Jean-Baptiste TOUZE (Gérant) & Direction Fondax\n\n`

    md += `## 1. SYNTHÈSE EXÉCUTIVE\n\n`
    md += `- **Tâches accomplies sur la période :** ${kpis.totalDone}\n`
    md += `- **Tâches critiques / haute priorité traitées :** ${kpis.highPriorityDone}\n`
    md += `- **Chantiers en cours :** ${kpis.activeProjects}\n`
    md += `- **Chantiers terminés :** ${kpis.finishedProjects}\n`
    md += `- **Taux de réalisation global du parc IT/Projets :** ${kpis.globalCompletionRate}%\n\n`

    md += `## 2. TÂCHES ACCOMPLIES SUR LA PÉRIODE (${completedTasksInPeriod.length})\n\n`
    if (completedTasksInPeriod.length === 0) {
      md += `*Aucune tâche enregistrée comme terminée sur cette période.*\n\n`
    } else {
      md += `| Date | Priorité | Catégorie | Tâche | Chantier rattaché |\n`
      md += `| :--- | :--- | :--- | :--- | :--- |\n`
      completedTasksInPeriod.forEach(t => {
        const d = formatDate(t.updated_at || t.created_at)
        const p = getProjectForTask(t)
        const pName = p ? `#${p.priority_order} ${p.name}` : 'Transversal'
        md += `| ${d} | ${t.priority.toUpperCase()} | ${t.category} | ${t.title} | ${pName} |\n`
      })
      md += `\n`
    }

    md += `## 3. AVANCEMENT DES CHANTIERS & CAHIER DES CHARGES\n\n`
    chantiersReport.forEach(({ project, totalTasks, doneTasks, progressPercent, tasksCompletedInPeriod, projectEventsInPeriod }) => {
      md += `### Chantier #${project.priority_order} : ${project.name}\n`
      md += `- **Statut actuel :** ${project.status}\n`
      md += `- **Avancement global :** ${progressPercent}% (${doneTasks}/${totalTasks} tâches terminées)\n`
      if (project.description) {
        md += `- **Objectif :** ${project.description}\n`
      }
      if (project.notes_blockers) {
        md += `- **Notes & Points de blocage :** ${project.notes_blockers}\n`
      }

      if (tasksCompletedInPeriod.length > 0) {
        md += `- **Réalisations sur la période :**\n`
        tasksCompletedInPeriod.forEach(t => {
          md += `  - [x] ${t.title}\n`
        })
      } else {
        md += `- **Réalisations sur la période :** Aucune tâche finalisée dans cet intervalle.\n`
      }

      if (projectEventsInPeriod.length > 0) {
        md += `- **Jalons / Événements de la période :**\n`
        projectEventsInPeriod.forEach(e => {
          md += `  - ${formatDate(e.event_date)} : ${e.title} (${e.event_type})\n`
        })
      }
      md += `\n`
    })

    return md
  }

  // Copy Markdown to clipboard
  const handleCopyMarkdown = async () => {
    const md = generateMarkdownReport()
    try {
      await navigator.clipboard.writeText(md)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.error('Erreur lors de la copie', err)
    }
  }

  // Download report file
  const handleDownloadFile = () => {
    const md = generateMarkdownReport()
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rapport_fondax_${startDate || 'debut'}_au_${endDate || 'fin'}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Print report
  const handlePrint = () => {
    window.print()
  }

  const startDisplay = startDate ? formatDate(startDate) : 'Début'
  const endDisplay = endDate ? formatDate(endDate) : "Aujourd'hui"

  return (
    <div className="space-y-8 pb-16">
      {/* Printable Executive Header (Visible on print & on screen) */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">FONDAX SARL</h1>
            <p className="text-sm font-semibold text-slate-600">Fonderie de précision & Usinage</p>
          </div>
          <div className="text-right">
            <span className="inline-block bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded">
              RAPPORT D'ACTIVITÉ IT & CHANTIERS
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between text-xs text-slate-700">
          <div><strong>Période du rapport :</strong> Du {startDisplay} au {endDisplay}</div>
          <div><strong>Destinataire :</strong> Direction Générale / Jean-Baptiste TOUZE</div>
        </div>
      </div>

      {/* Screen Header (Interactive) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <FileBarChart className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Rapports d'activité & Avancement</h1>
          </div>
          <p className="text-sm text-slate-500">
            Générez des comptes-rendus complets des tâches accomplies et du suivi des chantiers entre deux dates
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchData}
            title="Rafraîchir les données"
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            <span className="hidden sm:inline">Actualiser</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleCopyMarkdown}
            className={cn("flex items-center gap-1.5 transition-all", copied && "border-green-600 text-green-700 bg-green-50")}
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copié !' : 'Copier (Markdown)'}</span>
          </Button>

          <Button
            variant="outline"
            onClick={handleDownloadFile}
            className="flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            <span>Exporter .md</span>
          </Button>

          <Button
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer / PDF</span>
          </Button>
        </div>
      </div>

      {/* Date Interval Selector & Presets (Interactive Bar) */}
      <Card className="print:hidden border-slate-200 bg-white/80 backdrop-blur-xs">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Sélection de la période du rapport</span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'aujourd_hui', label: "Aujourd'hui" },
                { id: 'cette_semaine', label: 'Cette semaine' },
                { id: 'ce_mois', label: 'Ce mois-ci' },
                { id: '30_jours', label: '30 derniers jours' },
                { id: 'ce_trimestre', label: 'Ce trimestre' },
                { id: 'cette_annee', label: 'Cette année' },
                { id: 'tout', label: 'Tout l\'historique' },
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePreset(p.id)}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-full font-medium transition-all cursor-pointer",
                    activePreset === p.id 
                      ? "bg-blue-600 text-white shadow-xs" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Pickers Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <CustomDatePicker
                label="Date de début"
                value={startDate}
                onChange={(val) => {
                  setStartDate(val)
                  setActivePreset('')
                }}
                placeholder="Début de période..."
              />
            </div>
            <div>
              <CustomDatePicker
                label="Date de fin"
                value={endDate}
                onChange={(val) => {
                  setEndDate(val)
                  setActivePreset('')
                }}
                placeholder="Fin de période..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        <Card className="border-l-4 border-l-green-500 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Tâches terminées
              </span>
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                {kpis.totalDone}
              </span>
              <span className="text-xs text-slate-500 font-medium">sur la période</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Priorités hautes
              </span>
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                {kpis.highPriorityDone}
              </span>
              <span className="text-xs text-slate-500 font-medium">tâches urgentes</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Chantiers en cours
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                {kpis.activeProjects}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({kpis.finishedProjects} terminés)
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500 bg-white shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Avancement global
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold text-slate-900">
                {kpis.globalCompletionRate}%
              </span>
              <span className="text-xs text-slate-500 font-medium">toutes tâches</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 1: TÂCHES ACCOMPLIES */}
      <section className="space-y-4 print-break-inside-avoid">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-green-600 text-white flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tâches accomplies sur la période
              </h2>
              <p className="text-xs text-slate-500">
                Du {startDisplay} au {endDisplay} ({completedTasksInPeriod.length} tâche{completedTasksInPeriod.length > 1 ? 's' : ''})
              </p>
            </div>
          </div>

          {/* Interactive Category Filter Pills (Screen only) */}
          <div className="flex flex-wrap items-center gap-1.5 print:hidden">
            <button
              type="button"
              onClick={() => setSelectedCategory('TOUS')}
              className={cn(
                "px-2 py-0.5 text-xs rounded-md font-medium cursor-pointer transition-colors",
                selectedCategory === 'TOUS' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Toutes ({completedTasksInPeriod.length})
            </button>
            {TASK_CATEGORIES.map(cat => {
              const count = categoryCounts[cat] || 0
              if (count === 0) return null
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-2 py-0.5 text-xs rounded-md font-medium cursor-pointer transition-colors",
                    selectedCategory === cat ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {cat} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Tasks List */}
        {completedTasksInPeriod.length === 0 ? (
          <Card className="bg-slate-50/50 border-dashed border-slate-300">
            <CardContent className="p-8 text-center text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">Aucune tâche accomplie sur cette période</p>
              <p className="text-xs mt-1 text-slate-400">
                Élargissez l'intervalle de dates ou sélectionnez "Tout l'historique" pour visualiser les actions précédentes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {completedTasksInPeriod.map(task => {
              const project = getProjectForTask(task)
              const cleanDesc = formatTaskDesc(task.description)
              const completionDate = formatDate(task.updated_at || task.created_at)

              return (
                <div
                  key={task.id}
                  className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-900">
                          {task.title}
                        </span>
                        <Badge variant="outline" className={cn("text-[10px] py-0 px-2", PRIORITY_COLORS[task.priority])}>
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" className={cn("text-[10px] py-0 px-2 font-medium", TASK_CATEGORY_COLORS[task.category] || "bg-slate-100 text-slate-700")}>
                          {task.category}
                        </Badge>
                        {project && (
                          <Badge variant="outline" className="text-[10px] py-0 px-2 bg-blue-50 text-blue-700 border-blue-200">
                            Chantier #{project.priority_order}
                          </Badge>
                        )}
                      </div>

                      {cleanDesc && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                          {cleanDesc}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:self-center shrink-0 text-xs text-slate-500 font-medium pl-8 sm:pl-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Terminée le {completionDate}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: AVANCEMENT DES CHANTIERS */}
      <section className="space-y-4 print-break-inside-avoid">
        <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
          <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Avancement des chantiers & Projets
            </h2>
            <p className="text-xs text-slate-500">
              État d'avancement global et jalons réalisés pour les 6 chantiers prioritaires
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {chantiersReport.map(({ project, totalTasks, doneTasks, progressPercent, tasksCompletedInPeriod, projectEventsInPeriod }) => {
            const isActive = project.status === 'EN COURS'

            return (
              <Card 
                key={project.id} 
                className={cn(
                  "border transition-all print-break-inside-avoid",
                  isActive ? "border-blue-400 shadow-xs ring-1 ring-blue-100" : "border-slate-200"
                )}
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs shrink-0">
                        {project.priority_order}
                      </span>
                      <CardTitle className="text-base font-bold text-slate-900">
                        {project.name}
                      </CardTitle>
                    </div>
                    <Badge className={cn("text-[10px] shrink-0", PROJECT_STATUS_COLORS[project.status])}>
                      {project.status}
                    </Badge>
                  </div>
                  {project.description && (
                    <CardDescription className="text-xs text-slate-500 mt-1">
                      {project.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3">
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Avancement global</span>
                      <span className="font-bold text-slate-900">
                        {progressPercent}% ({doneTasks}/{totalTasks} tâche{totalTasks > 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          progressPercent === 100 ? "bg-green-500" : (progressPercent > 0 ? "bg-blue-600" : "bg-slate-300")
                        )} 
                        style={{ width: `${progressPercent}%` }} 
                      />
                    </div>
                  </div>

                  {/* Tasks completed in the period */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Actions achevées sur la période :</span>
                      <span className="text-slate-500 font-normal">
                        {tasksCompletedInPeriod.length} achevée{tasksCompletedInPeriod.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    {tasksCompletedInPeriod.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        Aucune tâche rattachée achevée entre le {startDisplay} et le {endDisplay}.
                      </p>
                    ) : (
                      <ul className="space-y-1 text-xs text-slate-700">
                        {tasksCompletedInPeriod.map(t => (
                          <li key={t.id} className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                            <span className="line-clamp-1">{t.title}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Milestones / Events in the period */}
                  {projectEventsInPeriod.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-xs font-semibold text-slate-700 mb-1">
                        Jalons & Événements période :
                      </div>
                      <ul className="space-y-1 text-xs text-slate-600">
                        {projectEventsInPeriod.map(e => (
                          <li key={e.id} className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                            <span>{formatDate(e.event_date)} : {e.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Blockers and notes */}
                  {project.notes_blockers && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                        <div className="font-semibold flex items-center gap-1 mb-0.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Points d'attention & blocages :</span>
                        </div>
                        <p className="whitespace-pre-line text-amber-800">
                          {project.notes_blockers}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Signature block for print */}
      <div className="hidden print:block pt-8 mt-12 border-t border-slate-300">
        <div className="flex justify-between text-xs text-slate-600">
          <div>
            <p className="font-bold text-slate-800">Visa Responsable Informatique</p>
            <p className="mt-8">Signature : _____________________</p>
          </div>
          <div>
            <p className="font-bold text-slate-800">Visa Direction (Jean-Baptiste TOUZE)</p>
            <p className="mt-8">Signature : _____________________</p>
          </div>
        </div>
      </div>
    </div>
  )
}
