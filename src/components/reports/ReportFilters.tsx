'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CustomDatePicker } from '@/components/ui/date-picker'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ReportFiltersProps {
  startDate: string
  endDate: string
  setStartDate: (val: string) => void
  setEndDate: (val: string) => void
  activePreset: string
  handlePreset: (preset: string) => void
}

export function ReportFilters({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  activePreset,
  handlePreset
}: ReportFiltersProps) {
  return (
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
                handlePreset('')
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
                handlePreset('')
              }}
              placeholder="Fin de période..."
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
