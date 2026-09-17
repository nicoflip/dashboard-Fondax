'use client'

import React from 'react'
import { CalendarPlus, Calendar, Clock, Sparkles } from 'lucide-react'
import { CustomDatePicker } from '@/components/ui/date-picker'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { EventType } from '@/lib/types'
import { cn } from '@/lib/utils'

function toYMD(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getTodayYMD(): string {
  return toYMD(new Date())
}

function getAddDaysYMD(days: number, baseDateStr?: string): string {
  const base = baseDateStr ? new Date(baseDateStr + 'T00:00:00') : new Date()
  const target = new Date(base)
  target.setDate(target.getDate() + days)
  return toYMD(target)
}

function getEndOfWeekYMD(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 0 : 7 - day
  const sun = new Date(now)
  sun.setDate(now.getDate() + diff)
  return toYMD(sun)
}

function getNextWeekRangeYMD(): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay()
  const diffToNextMon = (day === 0 ? 1 : 8 - day)
  const nextMon = new Date(now)
  nextMon.setDate(now.getDate() + diffToNextMon)
  const nextSun = new Date(nextMon)
  nextSun.setDate(nextMon.getDate() + 6)
  return { start: toYMD(nextMon), end: toYMD(nextSun) }
}

function getEndOfMonthYMD(): string {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return toYMD(lastDay)
}

export interface CalendarSyncOptionsProps {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  isFlexible: boolean
  onFlexibleChange: (isFlexible: boolean) => void
  date: string
  onDateChange: (date: string) => void
  time?: string
  onTimeChange?: (time: string) => void
  endDate?: string
  onEndDateChange?: (endDate: string) => void
  flexLabel: string
  onFlexLabelChange: (flexLabel: string) => void
  eventType?: EventType
  onEventTypeChange?: (type: EventType) => void
  showEventType?: boolean
  labelTitle?: string
  labelDescription?: string
  defaultSuggestedDate?: string
  className?: string
}

export function CalendarSyncOptions({
  enabled,
  onEnabledChange,
  isFlexible,
  onFlexibleChange,
  date,
  onDateChange,
  time = '',
  onTimeChange,
  endDate = '',
  onEndDateChange,
  flexLabel,
  onFlexLabelChange,
  eventType = 'échéance',
  onEventTypeChange,
  showEventType = false,
  labelTitle = 'Ajouter également au calendrier',
  labelDescription = 'Crée un rappel ou une échéance dans votre agenda IT',
  defaultSuggestedDate,
  className
}: CalendarSyncOptionsProps) {

  const handleToggle = (checked: boolean) => {
    onEnabledChange(checked)
    if (checked) {
      if (!date) {
        onDateChange(defaultSuggestedDate || getTodayYMD())
      }
      if (isFlexible) {
        if (!endDate && onEndDateChange) {
          onEndDateChange(getAddDaysYMD(14, date || defaultSuggestedDate))
        }
        if (!flexLabel) {
          onFlexLabelChange('Dans les 2 prochaines semaines')
        }
      }
    }
  }

  const handleSetFlexible = (flexible: boolean) => {
    onFlexibleChange(flexible)
    if (flexible) {
      if (!date) onDateChange(getTodayYMD())
      if (!endDate && onEndDateChange) {
        onEndDateChange(getAddDaysYMD(14, date || getTodayYMD()))
      }
      if (!flexLabel) {
        onFlexLabelChange('Dans les 2 prochaines semaines')
      }
    }
  }

  const applyPreset2Weeks = () => {
    const start = getTodayYMD()
    const end = getAddDaysYMD(14, start)
    onDateChange(start)
    if (onEndDateChange) onEndDateChange(end)
    onFlexLabelChange('Dans les 2 prochaines semaines')
    onFlexibleChange(true)
  }

  const applyPresetThisWeek = () => {
    const start = getTodayYMD()
    const end = getEndOfWeekYMD()
    onDateChange(start)
    if (onEndDateChange) onEndDateChange(end)
    onFlexLabelChange('Cette semaine')
    onFlexibleChange(true)
  }

  const applyPresetNextWeek = () => {
    const { start, end } = getNextWeekRangeYMD()
    onDateChange(start)
    if (onEndDateChange) onEndDateChange(end)
    onFlexLabelChange('Semaine prochaine')
    onFlexibleChange(true)
  }

  const applyPresetThisMonth = () => {
    const start = getTodayYMD()
    const end = getEndOfMonthYMD()
    onDateChange(start)
    if (onEndDateChange) onEndDateChange(end)
    onFlexLabelChange('Ce mois-ci')
    onFlexibleChange(true)
  }

  return (
    <div
      className={cn(
        "rounded-xl border transition-all text-xs",
        enabled
          ? "border-purple-300 bg-purple-50/40 shadow-xs"
          : "border-slate-200 bg-slate-50/70 hover:bg-slate-100/70",
        className
      )}
    >
      {/* Header avec checkbox */}
      <label className="flex items-start gap-3 p-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => handleToggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
        />
        <div className="space-y-0.5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <CalendarPlus className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              {labelTitle}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] py-0",
                enabled
                  ? "bg-purple-100 text-purple-700 border-purple-300"
                  : "bg-white text-slate-500 border-slate-200"
              )}
            >
              Synchro Calendrier
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">
            {labelDescription}
          </p>
        </div>
      </label>

      {/* Options détaillées si activé */}
      {enabled && (
        <div className="p-3 pt-0 space-y-3 border-t border-purple-100 mt-1">
          {/* Choix du mode : Date fixe vs Période flexible */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-700">
                Mode de planification :
              </span>
              <span className="text-[10px] text-purple-700 font-medium">
                {isFlexible ? "⏳ Date approximative / flottante" : "📅 Date précise et fixe"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-lg border border-purple-200">
              <button
                type="button"
                onClick={() => handleSetFlexible(false)}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-semibold text-xs transition-all cursor-pointer",
                  !isFlexible
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-purple-700 hover:bg-purple-50"
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                Date fixe
              </button>
              <button
                type="button"
                onClick={() => handleSetFlexible(true)}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md font-semibold text-xs transition-all cursor-pointer",
                  isFlexible
                    ? "bg-purple-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-purple-700 hover:bg-purple-50"
                )}
              >
                <Clock className="w-3.5 h-3.5" />
                Période flexible
              </button>
            </div>
          </div>

          {/* Configuration selon le mode */}
          {!isFlexible ? (
            /* MODE 1 : DATE FIXE */
            <div className="space-y-2.5 bg-white p-2.5 rounded-lg border border-purple-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-700">
                    Date de l&apos;événement
                  </Label>
                  <CustomDatePicker
                    value={date}
                    onChange={onDateChange}
                    placeholder="Sélectionner la date"
                    className="h-9 text-xs bg-white"
                  />
                </div>

                {onTimeChange && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-600" />
                        Heure (optionnel)
                      </Label>
                      {time && (
                        <button
                          type="button"
                          onClick={() => onTimeChange('')}
                          className="text-[10px] text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          Effacer
                        </button>
                      )}
                    </div>
                    <Input
                      type="time"
                      value={time}
                      onChange={e => onTimeChange(e.target.value)}
                      className="h-9 text-xs bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Raccourcis date fixe */}
              <div className="flex flex-wrap gap-1 pt-1">
                {[
                  { label: "Aujourd'hui", days: 0 },
                  { label: "Demain", days: 1 },
                  { label: "Dans 3j", days: 3 },
                  { label: "Dans 1 sem.", days: 7 },
                  { label: "Dans 2 sem.", days: 14 }
                ].map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onDateChange(getAddDaysYMD(item.days))}
                    className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 hover:bg-purple-100 hover:text-purple-800 hover:border-purple-200 transition-colors cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* MODE 2 : PÉRIODE FLEXIBLE */
            <div className="space-y-2.5 bg-white p-2.5 rounded-lg border border-purple-200">
              <div className="flex items-center gap-1.5 text-purple-800 text-[11px] font-medium bg-purple-50 p-1.5 rounded-md">
                <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span>Pratique quand vous attendez un retour ou une dispo sans jour précis fixé.</span>
              </div>

              {/* Raccourcis de périodes */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Périodes types :
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={applyPreset2Weeks}
                    className="text-[11px] text-left px-2 py-1 rounded border border-purple-200 bg-purple-50/50 hover:bg-purple-100 text-purple-900 font-medium transition-colors cursor-pointer"
                  >
                    ⚡ Dans les 2 semaines
                  </button>
                  <button
                    type="button"
                    onClick={applyPresetThisWeek}
                    className="text-[11px] text-left px-2 py-1 rounded border border-purple-200 bg-purple-50/50 hover:bg-purple-100 text-purple-900 font-medium transition-colors cursor-pointer"
                  >
                    ⚡ Cette semaine
                  </button>
                  <button
                    type="button"
                    onClick={applyPresetNextWeek}
                    className="text-[11px] text-left px-2 py-1 rounded border border-purple-200 bg-purple-50/50 hover:bg-purple-100 text-purple-900 font-medium transition-colors cursor-pointer"
                  >
                    ⚡ Semaine prochaine
                  </button>
                  <button
                    type="button"
                    onClick={applyPresetThisMonth}
                    className="text-[11px] text-left px-2 py-1 rounded border border-purple-200 bg-purple-50/50 hover:bg-purple-100 text-purple-900 font-medium transition-colors cursor-pointer"
                  >
                    ⚡ Ce mois-ci
                  </button>
                </div>
              </div>

              {/* Libellé flexible personnalisé */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">
                  Libellé affiché au calendrier
                </Label>
                <Input
                  value={flexLabel}
                  onChange={e => onFlexLabelChange(e.target.value)}
                  placeholder="Ex: Dans les 2 prochaines semaines, Mi-octobre..."
                  className="h-8 text-xs bg-white"
                />
              </div>

              {/* Plage de dates Début / Fin */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-slate-600">
                    Début estimé
                  </Label>
                  <CustomDatePicker
                    value={date}
                    onChange={onDateChange}
                    placeholder="Début"
                    className="h-8 text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-slate-600">
                    Fin estimée
                  </Label>
                  <CustomDatePicker
                    value={endDate}
                    onChange={d => onEndDateChange && onEndDateChange(d)}
                    placeholder="Fin"
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Type d'événement optionnel */}
          {showEventType && onEventTypeChange && (
            <div className="space-y-1 bg-white p-2.5 rounded-lg border border-purple-100">
              <Label className="text-[11px] font-semibold text-slate-700">
                Type d&apos;événement
              </Label>
              <select
                value={eventType}
                onChange={e => onEventTypeChange(e.target.value as EventType)}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
              >
                <option value="échéance">Échéance</option>
                <option value="rdv">Rendez-vous</option>
                <option value="appel">Appel téléphonique</option>
                <option value="étape chantier">Étape chantier</option>
              </select>
            </div>
          )}

          {/* Récapitulatif clair */}
          <div className="p-2 rounded bg-purple-100/50 text-[11px] text-purple-900 flex items-center gap-1.5">
            <span className="font-semibold">Aperçu :</span>
            {isFlexible ? (
              <span>
                ⏳ Période flexible <strong>« {flexLabel || 'Période flexible'} »</strong> (du {date || '...'} au {endDate || '...'})
              </span>
            ) : (
              <span>
                📅 Événement planifié le <strong>{date || 'date non définie'}</strong>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
