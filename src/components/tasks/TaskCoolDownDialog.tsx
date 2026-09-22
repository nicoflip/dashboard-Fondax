'use client'

import React, { useState, useEffect } from 'react'
import { Task } from '@/lib/types'
import { calculateTaskTemperature, PRIORITY_TARGET_DAYS } from '@/lib/task-temperature'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Snowflake, Flame, ArrowDown, Check, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskCoolDownDialogProps {
  open: boolean
  task: Task | null
  onClose: () => void
  onApply: (taskId: string, targetScore: number) => Promise<void> | void
}

export function TaskCoolDownDialog({
  open,
  task,
  onClose,
  onApply
}: TaskCoolDownDialogProps) {
  const [targetScore, setTargetScore] = useState<number>(20)
  const [loading, setLoading] = useState(false)

  // Current temperature calculation
  const currentTemp = task ? calculateTaskTemperature(task) : null
  const currentScore = currentTemp ? currentTemp.score : 0

  useEffect(() => {
    if (task && currentTemp) {
      // Default suggestion: lower by 30% or reset to 20%
      const suggested = Math.max(0, currentScore - 30)
      setTargetScore(suggested > 0 ? suggested : 0)
    }
  }, [task, open])

  if (!task || !currentTemp) return null

  // Evaluate target label and color
  const getTargetInfo = (score: number) => {
    if (score >= 90) return { label: 'Ébullition', color: 'bg-red-600 text-white border-red-700', text: 'text-red-700' }
    if (score >= 70) return { label: 'Chaud', color: 'bg-orange-500 text-white border-orange-600', text: 'text-orange-700' }
    if (score >= 40) return { label: 'Tiède', color: 'bg-amber-100 text-amber-900 border-amber-300', text: 'text-amber-800' }
    return { label: 'Frais', color: 'bg-blue-100 text-blue-800 border-blue-200', text: 'text-blue-700' }
  }

  const targetInfo = getTargetInfo(targetScore)
  const targetDays = PRIORITY_TARGET_DAYS[task.priority] || 10
  const remainingDaysBeforeHot = Math.max(0, parseFloat((((70 - targetScore) / 100) * targetDays).toFixed(1)))

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await onApply(task.id, targetScore)
      onClose()
    } catch (err) {
      console.error('Erreur lors du réglage thermique:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-slate-900">
          <div className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
            <Snowflake className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <span>Régler la température de la tâche</span>
            <p className="text-xs font-normal text-slate-500 mt-0.5 truncate max-w-md">
              « {task.title} »
            </p>
          </div>
        </DialogTitle>
      </DialogHeader>

      <div className="p-4 space-y-5">
        {/* Current vs New comparison card */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Température Actuelle
            </span>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", currentTemp.color.badge)}>
                {currentScore}% ({currentTemp.label})
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              Sans action depuis {currentTemp.daysInactive}j
            </span>
          </div>

          <div className="border-l border-slate-200 pl-3">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Nouvelle Cible
            </span>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border transition-all", targetInfo.color)}>
                {targetScore}% ({targetInfo.label})
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              {remainingDaysBeforeHot > 0 
                ? `Passe à chaud (≥70%) dans ~${remainingDaysBeforeHot}j` 
                : 'Déjà au palier chaud / surchauffe'}
            </span>
          </div>
        </div>

        {/* Quick Presets Buttons */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Raccourcis rapides :
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setTargetScore(0)}
              className={cn(
                "p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer",
                targetScore === 0
                  ? "bg-sky-50 border-sky-500 text-sky-900 ring-1 ring-sky-300"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <span className="text-base">❄️ 0%</span>
              <span className="text-[10px] font-normal text-slate-500">Remise à zéro</span>
            </button>

            <button
              type="button"
              onClick={() => setTargetScore(20)}
              className={cn(
                "p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer",
                targetScore === 20
                  ? "bg-blue-50 border-blue-500 text-blue-900 ring-1 ring-blue-300"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <span className="text-base">🧊 20%</span>
              <span className="text-[10px] font-normal text-slate-500">Frais</span>
            </button>

            <button
              type="button"
              onClick={() => setTargetScore(45)}
              className={cn(
                "p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer",
                targetScore === 45
                  ? "bg-amber-50 border-amber-500 text-amber-900 ring-1 ring-amber-300"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <span className="text-base">⚡ 45%</span>
              <span className="text-[10px] font-normal text-slate-500">Tiède</span>
            </button>

            <button
              type="button"
              onClick={() => setTargetScore(Math.max(0, currentScore - 30))}
              className={cn(
                "p-2 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer",
                targetScore === Math.max(0, currentScore - 30) && targetScore !== 0 && targetScore !== 20 && targetScore !== 45
                  ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-1 ring-emerald-300"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              <span className="text-base flex items-center gap-0.5">
                <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                -30%
              </span>
              <span className="text-[10px] font-normal text-slate-500">Baisse d'un cran</span>
            </button>
          </div>
        </div>

        {/* Precision Slider */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Ajustement précis par curseur :</span>
            <span className="font-bold text-slate-900 text-sm">{targetScore}%</span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={targetScore}
            onChange={(e) => setTargetScore(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
            <span>0% (Froid)</span>
            <span>40% (Tiède)</span>
            <span>70% (Chaud)</span>
            <span>100% (Ébullition)</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
          💡 <strong>Astuce :</strong> Cette action recalibre la date de référence de la tâche. Elle recommencera à monter en température à son rythme habituel (cible de {targetDays} jours pour priorité {task.priority}).
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          <span>Appliquer ({targetScore}%)</span>
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
