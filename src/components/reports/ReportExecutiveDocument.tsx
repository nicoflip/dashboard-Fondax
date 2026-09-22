'use client'

import React from 'react'
import { Task, Project, CalendarEvent } from '@/lib/types'
import { formatDate, EVENT_TYPE_LABELS, PRIORITY_COLORS, TASK_CATEGORY_COLORS, PROJECT_STATUS_COLORS } from '@/lib/utils'
import { parseTaskClosureComment, parseEventClosureComment } from '@/lib/closure-comments'
import { CheckCircle2, AlertTriangle, Calendar, Layers, ShieldCheck, FileCheck } from 'lucide-react'

interface ChantierReport {
  project: Project
  totalTasks: number
  doneTasks: number
  progressPercent: number
  tasksCompletedInPeriod: Task[]
  projectEventsInPeriod: CalendarEvent[]
}

interface ReportExecutiveDocumentProps {
  startDate: string
  endDate: string
  startDisplay: string
  endDisplay: string
  kpis: {
    totalDone: number
    highPriorityDone: number
    activeProjects: number
    finishedProjects: number
    globalCompletionRate: number
    closedEventsCount: number
  }
  completedTasksInPeriod: Task[]
  closedEventsInPeriod: CalendarEvent[]
  chantiersReport: ChantierReport[]
  getProjectForTask: (task: Task) => Project | undefined
  getProjectForEvent: (event: CalendarEvent) => Project | undefined
  formatTaskDesc: (desc: string | null) => string | null
}

export function ReportExecutiveDocument({
  startDate,
  endDate,
  startDisplay,
  endDisplay,
  kpis,
  completedTasksInPeriod,
  closedEventsInPeriod,
  chantiersReport,
  getProjectForTask,
  getProjectForEvent,
  formatTaskDesc
}: ReportExecutiveDocumentProps) {
  const nowStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  const nowTime = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div className="report-executive-container">
      {/* Inline styles for perfect print & screen A4 rendering */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            font-size: 10pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .executive-doc {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            max-width: 100% !important;
            margin: 0 !important;
          }
          .page-break-before {
            page-break-before: always;
            break-before: page;
          }
          .doc-section {
            break-inside: auto;
          }
          .doc-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .doc-table-row {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* A4 Sheet Container */}
      <div className="executive-doc max-w-[210mm] mx-auto bg-white shadow-2xl border border-slate-300/80 rounded-2xl p-8 sm:p-12 text-slate-900 font-sans transition-all">
        {/* Top Decorative Industrial Accent Stripe */}
        <div className="h-2 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 -mx-8 sm:-mx-12 -mt-8 sm:-mt-12 mb-8 rounded-t-2xl print:hidden" />

        {/* ----------------- EN-TÊTE OFFICIEL ----------------- */}
        <header className="border-b-2 border-slate-900 pb-6 mb-8 doc-card">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            {/* Left: Fondax Identity */}
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xl tracking-wider shadow-sm">
                  FX
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                    FONDAX SARL
                  </h1>
                  <p className="text-[11px] font-bold text-slate-500 tracking-[0.2em] uppercase">
                    Fonderie de précision & Usinage
                  </p>
                </div>
              </div>
              <p className="text-xs font-semibold text-blue-700 mt-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Direction des Systèmes d'Information & Projets Stratégiques
              </p>
            </div>

            {/* Right: Document Classification & Metadata */}
            <div className="text-left sm:text-right">
              <div className="inline-block bg-slate-900 text-white text-[11px] font-bold px-3 py-1 rounded shadow-xs tracking-wide uppercase mb-2">
                Compte-Rendu d'Activité & Avancement
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <p>
                  <span className="font-semibold text-slate-800">Période couverte : </span>
                  <span className="font-bold text-slate-900">Du {startDisplay} au {endDisplay}</span>
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Édité le : </span>
                  <span>{nowStr} à {nowTime}</span>
                </p>
                <p>
                  <span className="font-semibold text-slate-800">Destinataire : </span>
                  <span className="font-bold text-slate-900">Jean-Baptiste TOUZE (Direction)</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Document de gestion interne — Strictement confidentiel
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* ----------------- 1. SYNTHÈSE EXÉCUTIVE ----------------- */}
        <section className="mb-10 doc-section">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 rounded bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
              1
            </span>
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
              Synthèse Exécutive & Métriques Clés
            </h2>
          </div>

          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Sur la période analysée (du <strong className="text-slate-900">{startDisplay}</strong> au{' '}
            <strong className="text-slate-900">{endDisplay}</strong>), l'activité informatique et la gestion des
            chantiers stratégiques ont permis de finaliser <strong className="text-slate-900">{kpis.totalDone} tâche(s)</strong>,
            dont <strong className="text-slate-900">{kpis.highPriorityDone} prioritaire(s)</strong>, et de clôturer{' '}
            <strong className="text-slate-900">{kpis.closedEventsCount} événement(s) ou jalon(s)</strong>.
            Le taux global de réalisation des actions du schéma directeur s'établit à{' '}
            <strong className="text-slate-900">{kpis.globalCompletionRate}%</strong> avec{' '}
            <strong className="text-slate-900">{kpis.activeProjects} chantier(s)</strong> activement en cours de déploiement.
          </p>

          {/* Metric KPIs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 doc-card">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-slate-900">{kpis.totalDone}</div>
              <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide mt-0.5">
                Tâches Finalisées
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-amber-700">{kpis.highPriorityDone}</div>
              <div className="text-[10px] font-semibold text-amber-900 uppercase tracking-wide mt-0.5">
                Haute Priorité
              </div>
            </div>

            <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-purple-700">{kpis.closedEventsCount}</div>
              <div className="text-[10px] font-semibold text-purple-900 uppercase tracking-wide mt-0.5">
                Jalons Clos
              </div>
            </div>

            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-blue-700">{kpis.activeProjects} / 6</div>
              <div className="text-[10px] font-semibold text-blue-900 uppercase tracking-wide mt-0.5">
                Chantiers Actifs
              </div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
              <div className="text-2xl font-black text-emerald-700">{kpis.globalCompletionRate}%</div>
              <div className="text-[10px] font-semibold text-emerald-900 uppercase tracking-wide mt-0.5">
                Taux de Réalisation
              </div>
            </div>
          </div>
        </section>

        {/* ----------------- 2. TÂCHES ACCOMPLIES & CONCLUSIONS ----------------- */}
        <section className="mb-10 doc-section">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-green-700 text-white font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                Tâches Accomplies & Bilans de Clôture ({completedTasksInPeriod.length})
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Actions clôturées avec conclusions
            </span>
          </div>

          {completedTasksInPeriod.length === 0 ? (
            <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs italic">
              Aucune tâche marquée comme terminée sur la période sélectionnée.
            </div>
          ) : (
            <div className="space-y-3">
              {completedTasksInPeriod.map(task => {
                const project = getProjectForTask(task)
                const cleanDesc = formatTaskDesc(task.description)
                const completionDate = formatDate(task.updated_at || task.created_at)
                const closure = parseTaskClosureComment(task.description)

                return (
                  <div
                    key={task.id}
                    className="doc-card border border-slate-200 rounded-xl p-3.5 bg-white shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      {/* Left: Checkmark + Titles + Badges */}
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-bold text-sm text-slate-900">
                              {task.title}
                            </span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${PRIORITY_COLORS[task.priority] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                              {task.priority.toUpperCase()}
                            </span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {task.category}
                            </span>
                            {project && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                Chantier #{project.priority_order} — {project.name}
                              </span>
                            )}
                          </div>

                          {/* Task Description (if any) */}
                          {cleanDesc && (
                            <p className="text-xs text-slate-600 mb-1.5 leading-relaxed">
                              {cleanDesc}
                            </p>
                          )}

                          {/* CONCLUSION / BILAN DE FIN (Highlight callout) */}
                          {closure.closureComment ? (
                            <div className="mt-2 text-xs bg-emerald-50 border border-emerald-300/80 rounded-lg p-2.5 text-emerald-900 flex items-start gap-2">
                              <FileCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <div className="leading-relaxed">
                                <span className="font-bold text-emerald-950">Bilan de clôture : </span>
                                <span className="font-medium">{closure.closureComment}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">
                              Clôturée sans commentaire spécifique.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right: Date */}
                      <div className="text-[11px] text-slate-500 shrink-0 whitespace-nowrap pl-6 sm:pl-0 pt-0.5 font-medium">
                        Terminée le {completionDate}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ----------------- 3. ÉVÉNEMENTS & JALONS CLOS ----------------- */}
        {closedEventsInPeriod.length > 0 && (
          <section className="mb-10 doc-section">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded bg-purple-700 text-white font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                  Jalons & Événements Clôturés ({closedEventsInPeriod.length})
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                Audits, comités et points d'étape
              </span>
            </div>

            <div className="overflow-x-auto doc-card border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Événement / Jalon</th>
                    <th className="py-2.5 px-3">Contexte</th>
                    <th className="py-2.5 px-3">Motif de Clôture & Résolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {closedEventsInPeriod.map(e => {
                    const project = getProjectForEvent(e)
                    const closure = parseEventClosureComment(e.description)
                    return (
                      <tr key={e.id} className="doc-table-row hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                          {formatDate(e.event_date)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium text-[10px] border border-purple-200">
                            {EVENT_TYPE_LABELS[e.event_type] || e.event_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {e.title}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {project ? `#${project.priority_order} ${project.name}` : 'Transversal'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800">
                          {closure.closureComment ? (
                            <span className="font-medium text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200 block">
                              {closure.closureComment}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Clos sans commentaire</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ----------------- 4. AVANCEMENT DES 6 CHANTIERS STRATÉGIQUES ----------------- */}
        <section className="mb-10 doc-section">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-blue-700 text-white font-bold text-xs flex items-center justify-center">
                {closedEventsInPeriod.length > 0 ? '4' : '3'}
              </span>
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                Avancement des Chantiers Stratégiques
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Suivi des 6 chantiers prioritaires
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {chantiersReport.map(({ project, totalTasks, doneTasks, progressPercent, tasksCompletedInPeriod, projectEventsInPeriod }) => {
              const isActive = project.status === 'EN COURS'

              return (
                <div
                  key={project.id}
                  className={`doc-card border rounded-xl p-4 bg-white shadow-2xs ${
                    isActive ? 'border-blue-300 ring-1 ring-blue-50' : 'border-slate-200'
                  }`}
                >
                  {/* Chantier Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-xs shrink-0">
                        {project.priority_order}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 truncate">
                        {project.name}
                      </h3>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${PROJECT_STATUS_COLORS[project.status] || 'bg-slate-100 text-slate-700'}`}>
                      {project.status}
                    </span>
                  </div>

                  {project.description && (
                    <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}

                  {/* Progress bar */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">Progression</span>
                      <span className="font-bold text-slate-900">
                        {progressPercent}% ({doneTasks}/{totalTasks} tâche{totalTasks > 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                      <div
                        className={`h-full rounded-full transition-all ${
                          progressPercent === 100
                            ? 'bg-green-600'
                            : progressPercent > 0
                            ? 'bg-blue-600'
                            : 'bg-slate-300'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Tasks completed in period for this project */}
                  <div className="pt-2 border-t border-slate-100 text-xs">
                    <div className="font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Actions achevées sur la période :</span>
                      <span className="text-slate-500 font-normal">
                        {tasksCompletedInPeriod.length}
                      </span>
                    </div>

                    {tasksCompletedInPeriod.length === 0 ? (
                      <p className="text-slate-400 italic text-[11px]">
                        Aucune tâche rattachée achevée sur la période.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {tasksCompletedInPeriod.map(t => {
                          const closure = parseTaskClosureComment(t.description)
                          return (
                            <li key={t.id} className="text-slate-800">
                              <div className="flex items-start gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                                <div className="leading-snug">
                                  <span className="font-medium">{t.title}</span>
                                  {closure.closureComment && (
                                    <div className="text-[11px] text-emerald-800 font-medium italic mt-0.5">
                                      ↳ Bilan : {closure.closureComment}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>

                  {/* Blocker alert box if any */}
                  {project.notes_blockers && (
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-50/90 border border-amber-200 text-amber-900 text-xs">
                      <div className="font-bold flex items-center gap-1 mb-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Points d'attention & arbitrages requis :</span>
                      </div>
                      <p className="whitespace-pre-line text-amber-800 text-[11px] leading-relaxed">
                        {project.notes_blockers}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ----------------- 5. CADRE DE VISAS & SIGNATURES ----------------- */}
        <section className="mt-12 pt-6 border-t-2 border-slate-900 doc-card">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs text-slate-800">
            {/* Left signature */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Visa Responsable des Systèmes d'Information</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-6">
                Atteste de la conformité des indicateurs et de l'état d'avancement des actions.
              </p>
              <div className="border-b border-slate-300 pb-1 mb-1 flex justify-between text-slate-600">
                <span>Date & Signature :</span>
                <span className="font-mono text-[10px]">{nowStr}</span>
              </div>
              <div className="h-12" />
            </div>

            {/* Right signature */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-2 font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-slate-800" />
                <span>Visa Direction Générale — Jean-Baptiste TOUZE</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-6">
                Bon pour prise en compte des arbitrages et validation des priorités.
              </p>
              <div className="border-b border-slate-300 pb-1 mb-1 flex justify-between text-slate-600">
                <span>Date & Signature :</span>
                <span className="font-mono text-[10px]">___ / ___ / 2026</span>
              </div>
              <div className="h-12" />
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-8 text-center text-[10px] text-slate-400 uppercase tracking-wider">
            FONDAX SARL • Système de Management de l'Information • Page générée automatiquement le {nowStr}
          </div>
        </section>
      </div>
    </div>
  )
}
