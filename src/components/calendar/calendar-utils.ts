import { Phone, Users, Flag, FolderKanban } from 'lucide-react'

export function toYMD(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getExclusiveEndDate(dateStr: string) {
  const parts = dateStr.split('-').map(Number)
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2] + 1)
    return toYMD(d)
  }
  return dateStr
}

export function getPresetDates(preset: 'two_weeks' | 'this_week' | 'next_week' | 'end_month') {
  const now = new Date()
  const todayStr = toYMD(now)

  if (preset === 'two_weeks') {
    const end = new Date(now)
    end.setDate(now.getDate() + 14)
    return {
      label: 'Dans les 2 prochaines semaines',
      startDate: todayStr,
      endDate: toYMD(end)
    }
  }
  if (preset === 'this_week') {
    const day = now.getDay()
    const diff = day === 0 ? 0 : 7 - day
    const end = new Date(now)
    end.setDate(now.getDate() + diff)
    return {
      label: 'Cette semaine',
      startDate: todayStr,
      endDate: toYMD(end)
    }
  }
  if (preset === 'next_week') {
    const day = now.getDay()
    const daysUntilNextMonday = day === 0 ? 1 : 8 - day
    const nextMonday = new Date(now)
    nextMonday.setDate(now.getDate() + daysUntilNextMonday)
    const nextSunday = new Date(nextMonday)
    nextSunday.setDate(nextMonday.getDate() + 6)
    return {
      label: 'Semaine prochaine',
      startDate: toYMD(nextMonday),
      endDate: toYMD(nextSunday)
    }
  }
  if (preset === 'end_month') {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      label: "D'ici fin du mois",
      startDate: todayStr,
      endDate: toYMD(lastDay)
    }
  }
  return { label: 'Dans les 2 prochaines semaines', startDate: todayStr, endDate: todayStr }
}

export const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: any; colorBg: string; colorText: string; colorBorder: string; hex: string }> = {
  rdv: {
    label: 'Rendez-vous',
    icon: Users,
    colorBg: 'bg-blue-50',
    colorText: 'text-blue-700',
    colorBorder: 'border-blue-200',
    hex: '#2563eb'
  },
  appel: {
    label: 'Appel téléphonique',
    icon: Phone,
    colorBg: 'bg-emerald-50',
    colorText: 'text-emerald-700',
    colorBorder: 'border-emerald-200',
    hex: '#059669'
  },
  'échéance': {
    label: 'Échéance',
    icon: Flag,
    colorBg: 'bg-rose-50',
    colorText: 'text-rose-700',
    colorBorder: 'border-rose-200',
    hex: '#e11d48'
  },
  'étape chantier': {
    label: 'Étape chantier',
    icon: FolderKanban,
    colorBg: 'bg-indigo-50',
    colorText: 'text-indigo-700',
    colorBorder: 'border-indigo-200',
    hex: '#6366f1'
  }
}
