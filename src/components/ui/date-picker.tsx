'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value?: string // format YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  label?: string
}

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

export function CustomDatePicker({
  value,
  onChange,
  placeholder = 'Sélectionner une date',
  className,
  disabled = false,
  label
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Parse current selected date
  const parsedDate = value ? new Date(value + 'T00:00:00') : null
  const isValidDate = parsedDate && !isNaN(parsedDate.getTime())

  // Navigation state (viewing year/month)
  const initialYear = isValidDate ? parsedDate.getFullYear() : new Date().getFullYear()
  const initialMonth = isValidDate ? parsedDate.getMonth() : new Date().getMonth()

  const [viewYear, setViewYear] = useState(initialYear)
  const [viewMonth, setViewMonth] = useState(initialMonth)

  // Keep view aligned if value changes externally
  useEffect(() => {
    if (isValidDate) {
      setViewYear(parsedDate.getFullYear())
      setViewMonth(parsedDate.getMonth())
    }
  }, [value])

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as HTMLElement)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

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

  // Format date helper: YYYY-MM-DD
  const formatYMD = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    return `${year}-${mm}-${dd}`
  }

  const handleSelectDay = (year: number, month: number, day: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const ymd = formatYMD(year, month, day)
    onChange(ymd)
    setIsOpen(false)
  }

  // Quick preset dates
  const handlePreset = (preset: 'today' | 'tomorrow' | 'next_monday' | 'clear', e: React.MouseEvent) => {
    e.stopPropagation()
    const now = new Date()
    if (preset === 'clear') {
      onChange('')
      setIsOpen(false)
      return
    }
    if (preset === 'today') {
      onChange(formatYMD(now.getFullYear(), now.getMonth(), now.getDate()))
      setIsOpen(false)
      return
    }
    if (preset === 'tomorrow') {
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      onChange(formatYMD(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate()))
      setIsOpen(false)
      return
    }
    if (preset === 'next_monday') {
      const day = now.getDay()
      const daysUntilMon = day === 0 ? 1 : 8 - day
      const nextMon = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilMon)
      onChange(formatYMD(nextMon.getFullYear(), nextMon.getMonth(), nextMon.getDate()))
      setIsOpen(false)
      return
    }
  }

  // Format label for the button
  const formattedDisplay = isValidDate
    ? parsedDate.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : placeholder

  // Calendar Grid Calculation
  // First day of current month (0 = Sun, 1 = Mon, ...)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1)
  let startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Sun
  // Convert to Mon=0, Tue=1, ... Sun=6
  startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1

  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  const today = new Date()
  const isCurrentMonthToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth
  const todayDateNum = today.getDate()

  const selectedDateNum = isValidDate && parsedDate.getFullYear() === viewYear && parsedDate.getMonth() === viewMonth
    ? parsedDate.getDate()
    : null

  // Build grid days
  const calendarCells: Array<{
    day: number
    month: number
    year: number
    isCurrentMonth: boolean
    isSelected: boolean
    isToday: boolean
  }> = []

  // 1. Previous month trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const m = viewMonth === 0 ? 11 : viewMonth - 1
    const y = viewMonth === 0 ? viewYear - 1 : viewYear
    calendarCells.push({
      day: d,
      month: m,
      year: y,
      isCurrentMonth: false,
      isSelected: false,
      isToday: false
    })
  }

  // 2. Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    calendarCells.push({
      day: d,
      month: viewMonth,
      year: viewYear,
      isCurrentMonth: true,
      isSelected: selectedDateNum === d,
      isToday: isCurrentMonthToday && todayDateNum === d
    })
  }

  // 3. Next month leading days to complete 35 or 42 grid cells
  const remainingCells = 42 - calendarCells.length
  if (remainingCells < 7 || calendarCells.length <= 35) {
    const fillCount = calendarCells.length <= 35 ? 35 - calendarCells.length : 42 - calendarCells.length
    for (let d = 1; d <= fillCount; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1
      const y = viewMonth === 11 ? viewYear + 1 : viewYear
      calendarCells.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isSelected: false,
        isToday: false
      })
    }
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {label && <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>}

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
          "w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg border transition-all text-left cursor-pointer bg-white",
          isOpen ? "border-blue-600 ring-2 ring-blue-100 shadow-xs" : "border-slate-300 hover:border-slate-400",
          isValidDate ? "text-slate-900 font-medium" : "text-slate-400",
          disabled && "opacity-50 cursor-not-allowed bg-slate-100",
          className
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className={cn("w-4 h-4 shrink-0", isValidDate ? "text-blue-600" : "text-slate-400")} />
          <span className="truncate">{formattedDisplay}</span>
        </div>

        {isValidDate && !disabled ? (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onChange('')
            }}
            title="Effacer la date"
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </span>
        ) : (
          <span className="text-xs text-slate-400">▼</span>
        )}
      </button>

      {/* In-App Popover Calendar (No Chrome native controls, purely Tailwind) */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-[100] mt-1.5 w-72 sm:w-80 bg-white rounded-xl border border-slate-200 shadow-xl p-3 animate-in fade-in-50 zoom-in-95 duration-100"
          style={{ minWidth: '280px' }}
        >
          {/* Header with Month / Year navigation */}
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              title="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>{MONTH_NAMES[viewMonth]}</span>
              <span className="text-slate-500 font-normal">{viewYear}</span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              title="Mois suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_SHORT.map((d, i) => (
              <div key={d} className={cn("text-[11px] font-semibold py-1", i >= 5 ? "text-amber-600" : "text-slate-500")}>
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
                    "h-8 w-8 mx-auto rounded-lg text-xs font-medium flex items-center justify-center transition-all cursor-pointer relative",
                    cell.isSelected
                      ? "bg-blue-600 text-white font-bold shadow-xs hover:bg-blue-700"
                      : cell.isToday
                      ? "bg-blue-50 text-blue-700 font-bold border border-blue-300 hover:bg-blue-100"
                      : cell.isCurrentMonth
                      ? "text-slate-800 hover:bg-slate-100"
                      : "text-slate-300 hover:bg-slate-50",
                  )}
                >
                  {cell.day}
                  {cell.isToday && !cell.isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 bg-blue-600 rounded-full" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Quick presets footer */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1 text-xs">
            <button
              type="button"
              onClick={(e) => handlePreset('today', e)}
              className="px-2 py-1 rounded text-slate-700 hover:bg-slate-100 font-medium cursor-pointer transition-colors"
            >
              Aujourd'hui
            </button>
            <button
              type="button"
              onClick={(e) => handlePreset('tomorrow', e)}
              className="px-2 py-1 rounded text-slate-700 hover:bg-slate-100 font-medium cursor-pointer transition-colors"
            >
              Demain
            </button>
            <button
              type="button"
              onClick={(e) => handlePreset('next_monday', e)}
              className="px-2 py-1 rounded text-slate-700 hover:bg-slate-100 font-medium cursor-pointer transition-colors"
            >
              Lundi prochain
            </button>
            {value && (
              <button
                type="button"
                onClick={(e) => handlePreset('clear', e)}
                className="px-2 py-1 rounded text-red-600 hover:bg-red-50 font-medium cursor-pointer transition-colors"
              >
                Effacer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
