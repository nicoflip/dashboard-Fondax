'use client'

import React, { useState } from 'react'
import { formatDate, cn } from '@/lib/utils'
import { useReportData } from '@/components/reports/useReportData'
import { ReportFilters } from '@/components/reports/ReportFilters'
import { ReportStatsCards } from '@/components/reports/ReportStatsCards'
import { ReportTaskList } from '@/components/reports/ReportTaskList'
import { ReportEventsList } from '@/components/reports/ReportEventsList'
import { ReportProjectsList } from '@/components/reports/ReportProjectsList'
import { ReportExportActions } from '@/components/reports/ReportExportActions'
import { ReportExecutiveDocument } from '@/components/reports/ReportExecutiveDocument'
import { generateMarkdownReport } from '@/components/reports/reportGenerator'

export default function RapportsPage() {
  const data = useReportData()
  const [viewMode, setViewMode] = useState<'interactive' | 'document'>('interactive')

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

  const startDisplay = data.startDate ? formatDate(data.startDate) : 'Début historique'
  const endDisplay = data.endDate ? formatDate(data.endDate) : "Aujourd'hui"

  return (
    <div className="space-y-8 pb-16">
      {/* Top Action & Export Header (hidden on print) */}
      <ReportExportActions 
        loading={data.loading}
        fetchData={data.fetchData}
        generateMarkdownReport={handleGenerateMarkdown}
        startDate={data.startDate}
        endDate={data.endDate}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      {/* Date Filters (hidden on print) */}
      <div className="print:hidden">
        <ReportFilters 
          startDate={data.startDate}
          endDate={data.endDate}
          setStartDate={data.setStartDate}
          setEndDate={data.setEndDate}
          activePreset={data.activePreset}
          handlePreset={data.handlePreset}
        />
      </div>

      {/* 1. INTERACTIVE VIEW (Screen only, active when viewMode === 'interactive') */}
      <div className={cn("space-y-8 print:hidden", viewMode !== 'interactive' && "hidden")}>
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
      </div>

      {/* 2. EXECUTIVE DOCUMENT (A4 Styled Document - Visible on screen when viewMode === 'document', and ALWAYS used for printing) */}
      <div className={cn(viewMode === 'interactive' ? "hidden print:block" : "block")}>
        <ReportExecutiveDocument
          startDate={data.startDate}
          endDate={data.endDate}
          startDisplay={startDisplay}
          endDisplay={endDisplay}
          kpis={data.kpis}
          completedTasksInPeriod={data.completedTasksInPeriod}
          closedEventsInPeriod={data.closedEventsInPeriod}
          chantiersReport={data.chantiersReport}
          getProjectForTask={data.getProjectForTask}
          getProjectForEvent={data.getProjectForEvent}
          formatTaskDesc={data.formatTaskDesc}
        />
      </div>
    </div>
  )
}

