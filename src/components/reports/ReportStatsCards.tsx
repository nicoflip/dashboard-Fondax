'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, AlertTriangle, FolderKanban, TrendingUp } from 'lucide-react'

interface KPIProps {
  totalDone: number
  highPriorityDone: number
  activeProjects: number
  finishedProjects: number
  globalCompletionRate: number
  closedEventsCount: number
}

export function ReportStatsCards({ kpis }: { kpis: KPIProps }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 print:grid-cols-5">
      <Card className="border-l-4 border-l-green-500 bg-white shadow-xs">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tâches terminées
            </span>
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {kpis.totalDone}
            </span>
            <span className="text-xs text-slate-500 font-medium">sur la période</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-emerald-500 bg-white shadow-xs">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              Événements clos
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">
              {kpis.closedEventsCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">réglés/archivés</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-red-500 bg-white shadow-xs">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Priorités hautes
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {kpis.highPriorityDone}
            </span>
            <span className="text-xs text-slate-500 font-medium">urgentes</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500 bg-white shadow-xs">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Chantiers en cours
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {kpis.activeProjects}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({kpis.finishedProjects} terminés)
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-indigo-500 bg-white shadow-xs">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Avancement global
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {kpis.globalCompletionRate}%
            </span>
            <span className="text-xs text-slate-500 font-medium">toutes tâches</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
