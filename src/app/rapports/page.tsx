'use client'

import React from 'react'
import { formatDate } from '@/lib/utils'
import { useReportData } from '@/components/reports/useReportData'
import { ReportFilters } from '@/components/reports/ReportFilters'
import { ReportStatsCards } from '@/components/reports/ReportStatsCards'
import { ReportTaskList } from '@/components/reports/ReportTaskList'
import { ReportEventsList } from '@/components/reports/ReportEventsList'
import { ReportProjectsList } from '@/components/reports/ReportProjectsList'
import { ReportExportActions } from '@/components/reports/ReportExportActions'
import { generateMarkdownReport } from '@/components/reports/reportGenerator'

export default function RapportsPage() {
  const data = useReportData()

  const handleGenerateMarkdown = () => {
    return generateMarkdownReport({
      startDate: data.startDate,
      endDate: data.endDate,
      completedTasksInPeriod: data.completedTasksInPeriod,
      closedEventsInPeriod: data.closedEventsInPeriod,
      chantiersReport: data.chantiersReport,
      kpis: data.kpis,
      getProjectForTask: data.getProjectForTask,
      getProjectForEvent: data.getProjectForEvent
    })
  }

  const startDisplay = data.startDate ? formatDate(data.startDate) : 'Début'
  const endDisplay = data.endDate ? formatDate(data.endDate) : "Aujourd'hui"

  return (
    <div className="space-y-8 pb-16">
      {/* Printable Executive Header */}
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

      <ReportExportActions 
        loading={data.loading}
        fetchData={data.fetchData}
        generateMarkdownReport={handleGenerateMarkdown}
        startDate={data.startDate}
        endDate={data.endDate}
      />

      <ReportFilters 
        startDate={data.startDate}
        endDate={data.endDate}
        setStartDate={data.setStartDate}
        setEndDate={data.setEndDate}
        activePreset={data.activePreset}
        handlePreset={data.handlePreset}
      />

      <ReportStatsCards kpis={data.kpis} />

      <ReportTaskList 
        completedTasksInPeriod={data.completedTasksInPeriod}
        startDisplay={startDisplay}
        endDisplay={endDisplay}
        selectedCategory={data.selectedCategory}
        setSelectedCategory={data.setSelectedCategory}
        categoryCounts={data.categoryCounts}
        getProjectForTask={data.getProjectForTask}
        formatTaskDesc={data.formatTaskDesc}
      />

      <ReportEventsList 
        closedEventsInPeriod={data.closedEventsInPeriod}
        getProjectForEvent={data.getProjectForEvent}
      />

      <ReportProjectsList 
        chantiersReport={data.chantiersReport}
        startDisplay={startDisplay}
        endDisplay={endDisplay}
      />

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
