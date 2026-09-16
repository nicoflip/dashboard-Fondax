'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  X, 
  Sparkles,
  RotateCcw,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value?: string // format YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  label?: string
  align?: 'left' | 'right'
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const MONTH_NAMES_SHORT = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'
]

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export function CustomDatePicker({
  value,
  onChange,
  placeholder = 'Sélectionner une date',
  className,
  disabled = false,
  label,
  align = 'left'
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [openUpward, setOpenUpward] = useState(false)
  const [selectorMode, setSelectorMode] = useState<'days' | 'months' | 'years'>('days')

  const containerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Parse current selected date
  const parsedDate = useMemo(() => {
    if (!value) return null
    const d = new Date(value + 'T00:00:00')
    return isNaN(d.getTime()) ? null : d
  }, [value])

  const isValidDate = parsedDate !== null

  // Navigation state (viewing year/month)
  const now = new Date()
  const initialYear = parsedDate ? parsedDate.getFullYear() : now.getFullYear()
  const initialMonth = parsedDate ? parsedDate.getMonth() : now.getMonth()

  const [viewYear, setViewYear] = useState(initialYear)
  const [viewMonth, setViewMonth] = useState(initialMonth)

  // Keep view aligned if value changes externally
  useEffect(() => {
    if (parsedDate) {
      setViewYear(parsedDate.getFullYear())
      setViewMonth(parsedDate.getMonth())
    }
  }, [parsedDate])

  // Smart vertical positioning detection (open upward if near bottom of screen/dialog)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      if (spaceBelow < 400 && rect.top > 400) {
        setOpenUpward(true)
      } else {
        setOpenUpward(false)
      }
      setSelectorMode('days')
    }
  }, [isOpen])

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as HTMLElement)
      ) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Format date helper: YYYY-MM-DD
  const formatYMD = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }

  // Navigation handlers
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(y => y - 1)
    } else {
      setViewMonth(m => m - 1)
    }
  }

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(y => y + 1)
    } else {
      setViewMonth(m => m + 1)
    }
  }

  const handleSelectDay = (year: number, month: number, day: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const ymd = formatYMD(year, month, day)
    onChange(ymd)
    setIsOpen(false)
  }

  // Quick presets
  const applyPresetDays = (daysAhead: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const target = new Date()
    target.setDate(target.getDate() + daysAhead)
    onChange(formatYMD(target.getFullYear(), target.getMonth(), target.getDate()))
    setIsOpen(false)
  }

  const applyEndOfMonth = (e: React.MouseEvent) => {
    e.stopPropagation()
    const target = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    onChange(formatYMD(target.getFullYear(), target.getMonth(), target.getDate()))
    setIsOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setIsOpen(false)
  }

  // Format label for trigger button
  const formattedDisplay = useMemo(() => {
    if (!parsedDate) return null
    const text = parsedDate.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
    return text.charAt(0).toUpperCase() + text.slice(1)
  }, [parsedDate])

  // Calendar Grid Calculation
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1)
  let startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Sun
  startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1 // Mon = 0, Sun = 6

  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  const isCurrentMonthToday = now.getFullYear() === viewYear && now.getMonth() === viewMonth
  const todayDateNum = now.getDate()

  const selectedDateNum = parsedDate && parsedDate.getFullYear() === viewYear && parsedDate.getMonth() === viewMonth
    ? parsedDate.getDate()
    : null

  // Build grid days
  const calendarCells = useMemo(() => {
    const cells: Array<{
      day: number
      month: number
      year: number
      isCurrentMonth: boolean
      isSelected: boolean
      isToday: boolean
    }> = []

    // 1. Prev month trailing
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      const m = viewMonth === 0 ? 11 : viewMonth - 1
      const y = viewMonth === 0 ? viewYear - 1 : viewYear
      cells.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isSelected: false,
        isToday: false
      })
    }

    // 2. Current month
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      cells.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        isSelected: selectedDateNum === d,
        isToday: isCurrentMonthToday && todayDateNum === d
      })
    }

    // 3. Next month fill (up to 35 or 42)
    const targetLength = cells.length > 35 ? 42 : 35
    const fillCount = targetLength - cells.length
    for (let d = 1; d <= fillCount; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1
      const y = viewMonth === 11 ? viewYear + 1 : viewYear
      cells.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isSelected: false,
        isToday: false
      })
    }

    return cells
  }, [viewYear, viewMonth, startingDayOfWeek, daysInCurrentMonth, daysInPrevMonth, selectedDateNum, isCurrentMonthToday, todayDateNum])

  // Selectable years
  const selectableYears = useMemo(() => {
    const years: number[] = []
    const start = now.getFullYear() - 3
    for (let y = start; y <= start + 10; y++) {
      years.push(y)
    }
    return years
  }, [now])

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
          <span>{label}</span>
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (!disabled) setIsOpen(o => !o)
        }}
        className={cn(
          "w-full flex items-center justify-between px-3.5 py-2 text-xs sm:text-sm rounded-xl border transition-all text-left cursor-pointer bg-white group",
          isOpen 
            ? "border-blue-600 ring-2 ring-blue-100 shadow-sm" 
            : "border-slate-200 hover:border-slate-300 hover:shadow-2xs",
          isValidDate ? "text-slate-900 font-semibold" : "text-slate-400 font-normal",
          disabled && "opacity-50 cursor-not-allowed bg-slate-50",
          className
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
            isValidDate 
              ? "bg-blue-50 text-blue-600 border border-blue-200/60" 
              : "bg-slate-100 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500"
          )}>
            <CalendarIcon className="w-4 h-4" />
          </div>
          <span className="truncate">
            {formattedDisplay || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {isValidDate && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              title="Effacer cette date"
              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={cn(
            "w-4 h-4 text-slate-400 transition-transform duration-200",
            isOpen && "rotate-180 text-blue-600"
          )} />
        </div>
      </button>

      {/* Popover Calendar (Design Apple / Tailwind UI ultra moderne) */}
      {isOpen && (
        <div
          ref={popoverRef}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "absolute z-[9999] w-[320px] sm:w-[340px] bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-4 animate-in fade-in-50 zoom-in-95 duration-150",
            openUpward ? "bottom-full mb-2" : "top-full mt-2",
            align === 'right' ? "right-0" : "left-0"
          )}
        >
          {/* Quick Presets Bar (Pills modernes) */}
          <div className="pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                Raccourcis rapides
              </span>
              {value && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-red-600 hover:text-red-700 font-medium cursor-pointer transition-colors"
                >
                  Effacer
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Aujourd'hui", days: 0 },
                { label: "Demain", days: 1 },
                { label: "Dans 3j", days: 3 },
                { label: "Dans 1 sem.", days: 7 },
                { label: "Dans 2 sem.", days: 14 }
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={(e) => applyPresetDays(p.days, e)}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all cursor-pointer active:scale-95"
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={applyEndOfMonth}
                className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all cursor-pointer active:scale-95"
              >
                Fin du mois
              </button>
            </div>
          </div>

          {/* Month / Year Header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer active:scale-95"
              title="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Clickable Month / Year toggle */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectorMode(m => m === 'months' ? 'days' : 'months')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  selectorMode === 'months' 
                    ? "bg-blue-100 text-blue-800 ring-1 ring-blue-300" 
                    : "text-slate-900 hover:bg-slate-100"
                )}
              >
                {MONTH_NAMES[viewMonth]}
              </button>

              <button
                type="button"
                onClick={() => setSelectorMode(m => m === 'years' ? 'days' : 'years')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  selectorMode === 'years' 
                    ? "bg-blue-100 text-blue-800 ring-1 ring-blue-300" 
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                {viewYear}
              </button>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer active:scale-95"
              title="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* MODE: SELECTOR MONTHS */}
          {selectorMode === 'months' && (
            <div className="grid grid-cols-3 gap-2 py-2 animate-in fade-in-50 duration-100">
              {MONTH_NAMES_SHORT.map((mShort, idx) => (
                <button
                  key={mShort}
                  type="button"
                  onClick={() => {
                    setViewMonth(idx)
                    setSelectorMode('days')
                  }}
                  className={cn(
                    "py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                    viewMonth === idx 
                      ? "bg-blue-600 text-white font-bold shadow-xs" 
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {MONTH_NAMES[idx]}
                </button>
              ))}
            </div>
          )}

          {/* MODE: SELECTOR YEARS */}
          {selectorMode === 'years' && (
            <div className="grid grid-cols-3 gap-2 py-2 max-h-52 overflow-y-auto pr-1 animate-in fade-in-50 duration-100">
              {selectableYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => {
                    setViewYear(yr)
                    setSelectorMode('days')
                  }}
                  className={cn(
                    "py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                    viewYear === yr 
                      ? "bg-blue-600 text-white font-bold shadow-xs" 
                      : "text-slate-700 hover:bg-slate-100"
                  )}
                >
                  {yr}
                </button>
              ))}
            </div>
          )}

          {/* MODE: DAYS GRID (DEFAULT) */}
          {selectorMode === 'days' && (
            <>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                {DAYS_SHORT.map((d, i) => (
                  <div 
                    key={d} 
                    className={cn(
                      "text-[11px] font-bold py-1 select-none",
                      i >= 5 ? "text-indigo-500" : "text-slate-400"
                    )}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell, idx) => {
                  return (
                    <button
                      key={`${cell.year}-${cell.month}-${cell.day}-${idx}`}
                      type="button"
                      onClick={(e) => handleSelectDay(cell.year, cell.month, cell.day, e)}
                      className={cn(
                        "h-9 w-9 mx-auto rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer relative active:scale-90 select-none",
                        cell.isSelected
                          ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/30 scale-105"
                          : cell.isToday
                          ? "border-2 border-blue-500 text-blue-700 font-black bg-blue-50/70 hover:bg-blue-100"
                          : cell.isCurrentMonth
                          ? "text-slate-800 hover:bg-slate-100 hover:text-slate-900"
                          : "text-slate-300 hover:bg-slate-50/80 hover:text-slate-400 font-normal"
                      )}
                    >
                      <span>{cell.day}</span>
                      {cell.isToday && !cell.isSelected && (
                        <span className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Footer: Date Feedback & Fermer */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 min-w-0">
              {parsedDate ? (
                <span className="truncate font-medium text-slate-700">
                  📅 {parsedDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              ) : (
                <span className="italic text-slate-400">Aucune date sélectionnée</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium transition-colors cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
