'use client'

import React from 'react'
import { Calendar as CalendarIcon, Clock, Hourglass, AlertCircle, CheckCircle2 } from 'lucide-react'

interface CalendarKPIBarProps {
  todayCount: number
  thisWeekCount: number
  flexibleCount: number
  pendingCount: number
  closedCount: number
}

export function CalendarKPIBar({
  todayCount,
  thisWeekCount,
  flexibleCount,
  pendingCount,
  closedCount
}: CalendarKPIBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Aujourd'hui</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{todayCount}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
          <CalendarIcon className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Cette semaine</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{thisWeekCount}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
          <Clock className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dates flexibles</p>
          <p className="text-2xl font-bold text-purple-700 mt-0.5">{flexibleCount}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
          <Hourglass className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">En attente</p>
          <p className="text-2xl font-bold text-amber-700 mt-0.5">{pendingCount}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
          <AlertCircle className="w-5 h-5" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Clos / Réglés</p>
          <p className="text-2xl font-bold text-emerald-700 mt-0.5">{closedCount}</p>
        </div>
        <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
