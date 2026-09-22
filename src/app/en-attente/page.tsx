'use client'

import React, { useEffect, useState, useMemo, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Task, CalendarEvent, WaitingReturn, WaitingReturnStatus } from '@/lib/types'
import { 
  fetchWaitingReturns, 
  createWaitingReturn, 
  updateWaitingReturn, 
  deleteWaitingReturn, 
  getWaitingReturnMetrics,
  extractWaitingReturnId 
} from '@/lib/waiting-returns'
import { checkTaskBlocked } from '@/lib/blockers'
import { cn } from '@/lib/utils'
import { CustomDatePicker } from '@/components/ui/date-picker'
import { CalendarSyncOptions } from '@/components/calendar/CalendarSyncOptions'
import { formatFlexibleEventDescription } from '@/lib/flexible-events'
import { FollowUpReturnDialog } from '@/components/waiting/FollowUpReturnDialog'
import { WaitingResponseReceivedDialog } from '@/components/waiting/WaitingResponseReceivedDialog'
import { 
  Hourglass, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Lock, 
  Unlock, 
  Flame, 
  Pencil, 
  Trash2, 
  Send, 
  User, 
  Check,
  Building2,
  HelpCircle,
  CalendarPlus
} from 'lucide-react'

type WaitingFilterTab = 'all' | 'due' | 'dragging' | 'blocking' | 'resolved'

function EnAttenteContent() {
  const supabase = createClient()

  const [waitingReturns, setWaitingReturns] = useState<WaitingReturn[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<WaitingFilterTab>('all')
  const [targetFilter, setTargetFilter] = useState<string>('ALL')

  // Modals
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
  const [editingReturn, setEditingReturn] = useState<WaitingReturn | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formWaitingOn, setFormWaitingOn] = useState('')
  const [formTargetType, setFormTargetType] = useState('Prestataire')
  const [formFollowUpDate, setFormFollowUpDate] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formAddToCalendar, setFormAddToCalendar] = useState(false)
  const [formCalIsFlexible, setFormCalIsFlexible] = useState(false)
  const [formCalDate, setFormCalDate] = useState('')
  const [formCalEndDate, setFormCalEndDate] = useState('')
  const [formCalFlexLabel, setFormCalFlexLabel] = useState('Dans les 2 prochaines semaines')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modal de relance interactive
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false)
  const [followUpModalItem, setFollowUpModalItem] = useState<WaitingReturn | null>(null)

  const [notificationMsg, setNotificationMsg] = useState<string | null>(null)

  // Fetch data
  const loadData = async () => {
    setLoading(true)
    const [returnsData, tasksRes, eventsRes] = await Promise.all([
      fetchWaitingReturns(supabase),
      supabase.from('tasks').select('*').order('created_at', { ascending: false }),
      supabase.from('events').select('*').order('event_date', { ascending: true })
    ])
    setWaitingReturns(returnsData)
    if (tasksRes.data) setTasks(tasksRes.data)
    if (eventsRes.data) setEvents(eventsRes.data as CalendarEvent[])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const showNotification = (msg: string) => {
    setNotificationMsg(msg)
    setTimeout(() => setNotificationMsg(null), 4500)
  }

  // Active returns (en attente)
  const activeReturns = useMemo(() => {
    return waitingReturns.filter(r => r.status === 'en attente')
  }, [waitingReturns])

  // Resolved returns
  const resolvedReturns = useMemo(() => {
    return waitingReturns.filter(r => r.status === 'reçu')
  }, [waitingReturns])

  // Map: for each WaitingReturn, which tasks in the company are waiting for it?
  const tasksAwaitingReturnMap = useMemo(() => {
    const map = new Map<string, Task[]>()

    tasks.forEach(t => {
      // 1. Tâche marquée en attente avec ce retour
      const returnId = extractWaitingReturnId(t.description)
      if (returnId) {
        const list = map.get(returnId) || []
        list.push(t)
        map.set(returnId, list)
        return
      }

      // 2. Condition de blocage par ce retour
      const blocked = checkTaskBlocked(t, tasks, events, waitingReturns)
      if (blocked.blocker.type === 'waiting' && (blocked.blocker.prereqReturnId || blocked.blocker.prereqTaskId)) {
        const targetId = blocked.blocker.prereqReturnId || blocked.blocker.prereqTaskId!
        const list = map.get(targetId) || []
        if (!list.some(item => item.id === t.id)) {
          list.push(t)
          map.set(targetId, list)
        }
      }
    })

    return map
  }, [tasks, events, waitingReturns])

  // KPIs
  const totalWaitingCount = activeReturns.length
  const draggingReturns = useMemo(() => {
    return activeReturns.filter(r => getWaitingReturnMetrics(r).isDragging)
  }, [activeReturns])
  const dueReturns = useMemo(() => {
    return activeReturns.filter(r => {
      const m = getWaitingReturnMetrics(r)
      return m.followUpStatus === 'overdue' || m.followUpStatus === 'today'
    })
  }, [activeReturns])

  const blockingReturns = useMemo(() => {
    return activeReturns.filter(r => (tasksAwaitingReturnMap.get(r.id) || []).length > 0)
  }, [activeReturns, tasksAwaitingReturnMap])

  const totalBlockedTasksCount = useMemo(() => {
    const taskIds = new Set<string>()
    activeReturns.forEach(r => {
      const list = tasksAwaitingReturnMap.get(r.id) || []
      list.forEach(t => {
        if (t.status !== 'fait') taskIds.add(t.id)
      })
    })
    return taskIds.size
  }, [activeReturns, tasksAwaitingReturnMap])

  // Interlocuteur filters
  const uniqueTargets = useMemo(() => {
    const set = new Set<string>()
    activeReturns.forEach(r => {
      if (r.waiting_on) set.add(r.waiting_on.trim())
    })
    return Array.from(set)
  }, [activeReturns])

  // Filtered returns to display
  const displayedReturns = useMemo(() => {
    let list = activeTab === 'resolved' ? resolvedReturns : activeReturns

    if (activeTab === 'due') {
      list = list.filter(r => {
        const m = getWaitingReturnMetrics(r)
        return m.followUpStatus === 'overdue' || m.followUpStatus === 'today'
      })
    } else if (activeTab === 'dragging') {
      list = list.filter(r => getWaitingReturnMetrics(r).isDragging)
    } else if (activeTab === 'blocking') {
      list = list.filter(r => (tasksAwaitingReturnMap.get(r.id) || []).length > 0)
    }

    if (targetFilter !== 'ALL') {
      list = list.filter(r => r.waiting_on.toLowerCase().includes(targetFilter.toLowerCase()))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(r => {
        return (
          r.title.toLowerCase().includes(q) ||
          r.waiting_on.toLowerCase().includes(q) ||
          (r.description || '').toLowerCase().includes(q)
        )
      })
    }

    // Sort: overdue first, dragging first, then days waiting descending
    return [...list].sort((a, b) => {
      const mA = getWaitingReturnMetrics(a)
      const mB = getWaitingReturnMetrics(b)

      const overdueA = mA.followUpStatus === 'overdue' ? 1 : 0
      const overdueB = mB.followUpStatus === 'overdue' ? 1 : 0
      if (overdueA !== overdueB) return overdueB - overdueA

      const dragA = mA.isDragging ? 1 : 0
      const dragB = mB.isDragging ? 1 : 0
      if (dragA !== dragB) return dragB - dragA

      return mB.daysWaiting - mA.daysWaiting
    })
  }, [activeReturns, resolvedReturns, activeTab, targetFilter, searchQuery, tasksAwaitingReturnMap])

  // ACTION 1: Open modal for new return
  const handleOpenNewReturn = () => {
    setEditingReturn(null)
    setFormTitle('')
    setFormWaitingOn('')
    setFormTargetType('Prestataire')
    setFormFollowUpDate('')
    setFormDescription('')
    setFormAddToCalendar(false)
    setFormCalIsFlexible(false)
    setFormCalDate('')
    setFormCalEndDate('')
    setFormCalFlexLabel('Dans les 2 prochaines semaines')
    setIsReturnModalOpen(true)
  }

  // ACTION 2: Open modal for edit
  const handleOpenEditReturn = (item: WaitingReturn) => {
    setEditingReturn(item)
    setFormTitle(item.title)
    setFormWaitingOn(item.waiting_on)
    setFormTargetType(item.target_type || 'Prestataire')
    setFormFollowUpDate(item.follow_up_date || '')
    setFormDescription(item.description || '')
    setFormAddToCalendar(false)
    setFormCalIsFlexible(false)
    setFormCalDate(item.follow_up_date || '')
    setFormCalEndDate('')
    setFormCalFlexLabel('Dans les 2 prochaines semaines')
    setIsReturnModalOpen(true)
  }

  // ACTION 3: Save return (create or update)
  const handleSaveReturn = async () => {
    if (!formTitle.trim() || !formWaitingOn.trim()) return
    setIsSubmitting(true)
    try {
      if (editingReturn) {
        await updateWaitingReturn(supabase, editingReturn.id, {
          title: formTitle.trim(),
          waiting_on: formWaitingOn.trim(),
          target_type: formTargetType,
          follow_up_date: formFollowUpDate || null,
          description: formDescription.trim() || null
        })

        if (formAddToCalendar) {
          const finalEventDate = formCalDate || formFollowUpDate || new Date().toISOString().split('T')[0]
          let finalEndDate = formCalEndDate || null
          if (formCalIsFlexible && !finalEndDate) {
            const d = new Date(finalEventDate + 'T00:00:00')
            d.setDate(d.getDate() + 14)
            finalEndDate = d.toISOString().split('T')[0]
          }
          const baseDesc = `Retour attendu auprès de ${formWaitingOn.trim()}.${formDescription ? ' ' + formDescription.trim() : ''}`
          const finalDesc = formCalIsFlexible
            ? formatFlexibleEventDescription(baseDesc, formCalFlexLabel || 'Dans les 2 prochaines semaines')
            : baseDesc

          await supabase.from('events').insert([{
            title: `Relance : ${formTitle.trim()} (${formWaitingOn.trim()})`,
            description: finalDesc,
            event_date: finalEventDate,
            end_date: formCalIsFlexible ? finalEndDate : null,
            event_type: 'échéance',
            status: 'à venir',
            task_id: null,
            vendor_id: null
          }])
        }

        showNotification('Retour attendu mis à jour avec succès' + (formAddToCalendar ? ' et retranscrit au calendrier !' : '.'))
      } else {
        const created = await createWaitingReturn(supabase, {
          title: formTitle.trim(),
          waiting_on: formWaitingOn.trim(),
          target_type: formTargetType,
          follow_up_date: formFollowUpDate || null,
          description: formDescription.trim() || null,
          status: 'en attente'
        })

        if (created && formAddToCalendar) {
          const finalEventDate = formCalDate || formFollowUpDate || new Date().toISOString().split('T')[0]
          let finalEndDate = formCalEndDate || null
          if (formCalIsFlexible && !finalEndDate) {
            const d = new Date(finalEventDate + 'T00:00:00')
            d.setDate(d.getDate() + 14)
            finalEndDate = d.toISOString().split('T')[0]
          }
          const baseDesc = `Retour attendu auprès de ${formWaitingOn.trim()}.${formDescription ? ' ' + formDescription.trim() : ''}`
          const finalDesc = formCalIsFlexible
            ? formatFlexibleEventDescription(baseDesc, formCalFlexLabel || 'Dans les 2 prochaines semaines')
            : baseDesc

          await supabase.from('events').insert([{
            title: `Retour attendu : ${formTitle.trim()} (${formWaitingOn.trim()})`,
            description: finalDesc,
            event_date: finalEventDate,
            end_date: formCalIsFlexible ? finalEndDate : null,
            event_type: 'échéance',
            status: 'à venir',
            task_id: null,
            vendor_id: null
          }])
        }

        showNotification('Nouveau retour attendu enregistré' + (formAddToCalendar ? ' et retranscrit au calendrier !' : '.'))
      }
      setIsReturnModalOpen(false)
      const reloaded = await fetchWaitingReturns(supabase)
      setWaitingReturns(reloaded)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Modal de réponse reçue et suites logiques
  const [responseReceivedItem, setResponseReceivedItem] = useState<WaitingReturn | null>(null)
  const [isResponseReceivedOpen, setIsResponseReceivedOpen] = useState(false)

  // ACTION 4: Mark return as received (✓ Réponse reçue) -> Open follow-up dialog!
  const handleMarkReceived = (returnItem: WaitingReturn) => {
    setResponseReceivedItem(returnItem)
    setIsResponseReceivedOpen(true)
  }

  // ACTION 5: Open interactive follow-up modal
  const handleOpenFollowUpModal = (returnItem: WaitingReturn) => {
    setFollowUpModalItem(returnItem)
    setIsFollowUpModalOpen(true)
  }

  // Confirmer la relance et son prochain délai
  const handleConfirmFollowUp = async (
    newFollowUpDate: string | null,
    calendarOptions: {
      addToCalendar: boolean
      isFlexible?: boolean
      calDate?: string
      calEndDate?: string
      calFlexLabel?: string
    } | boolean
  ) => {
    if (!followUpModalItem) return

    const opts = typeof calendarOptions === 'boolean'
      ? { addToCalendar: calendarOptions }
      : calendarOptions

    const newCount = (followUpModalItem.follow_up_count || 0) + 1

    await updateWaitingReturn(supabase, followUpModalItem.id, {
      follow_up_date: newFollowUpDate,
      follow_up_count: newCount
    })

    if (opts.addToCalendar) {
      const finalEventDate = opts.calDate || newFollowUpDate || new Date().toISOString().split('T')[0]
      let finalEndDate = opts.calEndDate || null
      if (opts.isFlexible && !finalEndDate) {
        const d = new Date(finalEventDate + 'T00:00:00')
        d.setDate(d.getDate() + 14)
        finalEndDate = d.toISOString().split('T')[0]
      }
      const baseDesc = `Relance effectuée auprès de ${followUpModalItem.waiting_on}. Objet: ${followUpModalItem.title}.`
      const finalDesc = opts.isFlexible
        ? formatFlexibleEventDescription(baseDesc, opts.calFlexLabel || 'Dans les 2 prochaines semaines')
        : baseDesc

      await supabase.from('events').insert([{
        title: `Relance n°${newCount} : ${followUpModalItem.title} (${followUpModalItem.waiting_on})`,
        description: finalDesc,
        event_date: finalEventDate,
        end_date: opts.isFlexible ? finalEndDate : null,
        event_type: 'échéance',
        status: 'à venir',
        task_id: null,
        vendor_id: null
      }])
    }

    const reloaded = await fetchWaitingReturns(supabase)
    setWaitingReturns(reloaded)

    if (newFollowUpDate) {
      showNotification(`✓ Relance n°${newCount} consignée pour « ${followUpModalItem.title} » ! Prochaine relance le ${newFollowUpDate}${opts.addToCalendar ? ' (inscrite au calendrier)' : ''}.`)
    } else {
      showNotification(`✓ Relance n°${newCount} consignée pour « ${followUpModalItem.title} ». Aucune prochaine relance programmée.`)
    }

    setIsFollowUpModalOpen(false)
    setFollowUpModalItem(null)
  }

  // ACTION 6: Delete return
  const handleDeleteReturn = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce retour attendu ?')) return
    await deleteWaitingReturn(supabase, id)
    const reloaded = await fetchWaitingReturns(supabase)
    setWaitingReturns(reloaded)
    showNotification('Retour attendu supprimé.')
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Chargement de vos retours attendus...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500 text-white shadow-xs">
            <Hourglass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">En attente & Retours attendus</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Gérez les retours que vous attendez auprès de tiers et visualisez les tâches internes bloquées par ces réponses.
            </p>
          </div>
        </div>

        <Button 
          onClick={handleOpenNewReturn} 
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Nouveau retour attendu
        </Button>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-3.5 rounded-xl flex items-center gap-2.5 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{notificationMsg}</span>
        </div>
      )}

      {/* 4 Indicateurs KPI */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total retours attendus */}
        <Card 
          onClick={() => setActiveTab('all')}
          className={cn(
            "border transition-all cursor-pointer hover:shadow-md",
            activeTab === 'all' ? "ring-2 ring-amber-500 border-amber-400 bg-amber-50/30" : "hover:border-amber-300"
          )}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 shrink-0">
              <Hourglass className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Retours attendus</p>
              <h2 className="text-2xl font-bold text-slate-900">{totalWaitingCount}</h2>
            </div>
          </CardContent>
        </Card>

        {/* Qui traîne (>7j) */}
        <Card 
          onClick={() => setActiveTab('dragging')}
          className={cn(
            "border transition-all cursor-pointer hover:shadow-md",
            draggingReturns.length > 0 ? "border-red-200 bg-red-50/20" : "",
            activeTab === 'dragging' ? "ring-2 ring-red-500 border-red-400" : "hover:border-red-300"
          )}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-red-600">Qui traîne (&gt; 7j)</p>
              <h2 className="text-2xl font-bold text-red-700">{draggingReturns.length}</h2>
            </div>
          </CardContent>
        </Card>

        {/* Relances urgentes / dues */}
        <Card 
          onClick={() => setActiveTab('due')}
          className={cn(
            "border transition-all cursor-pointer hover:shadow-md",
            dueReturns.length > 0 ? "border-amber-300 bg-amber-50/40" : "",
            activeTab === 'due' ? "ring-2 ring-amber-600 border-amber-500" : "hover:border-amber-300"
          )}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500 text-white shrink-0">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-amber-900">À relancer</p>
                {dueReturns.length > 0 && (
                  <span className="text-[9px] font-black bg-red-600 text-white px-1 py-0.2 rounded uppercase animate-pulse">
                    Urgent
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-amber-950">{dueReturns.length}</h2>
            </div>
          </CardContent>
        </Card>

        {/* Tâches internes bloquées */}
        <Card 
          onClick={() => setActiveTab('blocking')}
          className={cn(
            "border transition-all cursor-pointer hover:shadow-md",
            totalBlockedTasksCount > 0 ? "border-indigo-300 bg-indigo-50/30" : "",
            activeTab === 'blocking' ? "ring-2 ring-indigo-500 border-indigo-400" : "hover:border-indigo-300"
          )}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-900">Tâches bloquées</p>
              <h2 className="text-2xl font-bold text-indigo-950">{totalBlockedTasksCount}</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barre d'onglets de filtrage */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5",
              activeTab === 'all' ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            <span>Tous</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-200">{totalWaitingCount}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('due')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5",
              activeTab === 'due' ? "bg-amber-600 text-white" : "bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200"
            )}
          >
            <span>🔔 À relancer</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full",
              activeTab === 'due' ? "bg-amber-800 text-white" : "bg-amber-200 text-amber-900"
            )}>
              {dueReturns.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dragging')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5",
              activeTab === 'dragging' ? "bg-red-600 text-white" : "bg-red-50 text-red-900 hover:bg-red-100 border border-red-200"
            )}
          >
            <span>⚠️ Traîne (&gt; 7j)</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full",
              activeTab === 'dragging' ? "bg-red-800 text-white" : "bg-red-200 text-red-900"
            )}>
              {draggingReturns.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('blocking')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5",
              activeTab === 'blocking' ? "bg-indigo-700 text-white" : "bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200"
            )}
          >
            <span>🔒 Bloquent des tâches</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full",
              activeTab === 'blocking' ? "bg-indigo-900 text-white" : "bg-indigo-200 text-indigo-950"
            )}>
              {blockingReturns.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('resolved')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5",
              activeTab === 'resolved' ? "bg-emerald-700 text-white" : "bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200"
            )}
          >
            <span>✓ Retours reçus</span>
            <span className={cn(
              "text-[10px] px-1.5 py-0.2 rounded-full",
              activeTab === 'resolved' ? "bg-emerald-900 text-white" : "bg-emerald-200 text-emerald-950"
            )}>
              {resolvedReturns.length}
            </span>
          </button>
        </div>

        {/* Search bar */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Rechercher par objet, tiers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Filtres rapides par interlocuteur */}
      {uniqueTargets.length > 0 && activeTab !== 'resolved' && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
            <User className="w-3.5 h-3.5" /> Interlocuteur :
          </span>
          <button
            type="button"
            onClick={() => setTargetFilter('ALL')}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
              targetFilter === 'ALL' ? "bg-slate-800 text-white font-bold" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            Tous
          </button>
          {uniqueTargets.map(target => (
            <button
              key={target}
              type="button"
              onClick={() => setTargetFilter(targetFilter === target ? 'ALL' : target)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer border",
                targetFilter === target 
                  ? "bg-amber-600 text-white border-amber-600 font-bold shadow-2xs" 
                  : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300"
              )}
            >
              {target}
            </button>
          ))}
        </div>
      )}

      {/* Liste des retours attendus */}
      {displayedReturns.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-slate-500 border-dashed text-center">
          <Hourglass className="w-10 h-10 text-slate-300 mb-2" />
          <p className="font-medium text-slate-600">Aucun retour attendu correspondant aux critères.</p>
          <p className="text-xs text-slate-400 mt-1">
            {activeTab === 'all' && "Vous n'attendez aucun retour pour le moment. Cliquez sur « + Nouveau retour attendu » pour en créer un."}
            {activeTab === 'due' && "Toutes vos relances sont à jour !"}
            {activeTab === 'dragging' && "Aucun retour ne traîne depuis plus de 7 jours."}
            {activeTab === 'blocking' && "Aucun retour attendu ne bloque de tâches internes."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {displayedReturns.map(returnItem => {
            const metrics = getWaitingReturnMetrics(returnItem)
            const awaitingTasks = tasksAwaitingReturnMap.get(returnItem.id) || []
            const isResolved = returnItem.status === 'reçu'

            return (
              <Card 
                key={returnItem.id}
                className={cn(
                  "flex flex-col transition-all overflow-hidden border shadow-xs",
                  isResolved
                    ? "border-slate-200 bg-slate-50/70 opacity-85"
                    : metrics.isDragging
                    ? "border-l-[6px] border-l-red-600 border-red-200 bg-gradient-to-br from-red-50/40 via-white to-amber-50/20 ring-1 ring-red-300/60"
                    : metrics.isWarning
                    ? "border-l-[5px] border-l-amber-600 border-amber-200 bg-amber-50/30"
                    : "border-l-[5px] border-l-amber-500 border-slate-200 bg-white"
                )}
              >
                {/* En-tête : Tiers / Interlocuteur */}
                <div className={cn(
                  "p-3.5 pb-2 border-b flex items-start justify-between gap-2",
                  metrics.isDragging ? "bg-red-100/50 border-red-200" : "bg-amber-50/60 border-amber-100"
                )}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                        {returnItem.target_type || 'Interlocuteur'}
                      </span>
                      <span className="text-sm font-bold text-amber-950 truncate">
                        {returnItem.waiting_on}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Modifier ce retour"
                      onClick={() => handleOpenEditReturn(returnItem)}
                      className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Supprimer ce retour"
                      onClick={() => handleDeleteReturn(returnItem.id)}
                      className="h-7 w-7 text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Corps */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 
                      onClick={() => handleOpenEditReturn(returnItem)}
                      className="font-bold text-base text-slate-900 hover:text-blue-600 cursor-pointer line-clamp-2"
                      title={returnItem.title}
                    >
                      {returnItem.title}
                    </h3>

                    {returnItem.description && (
                      <p className="text-xs text-slate-600 line-clamp-2 italic">
                        {returnItem.description}
                      </p>
                    )}
                  </div>

                  {/* Section Métriques d'attente & Relance */}
                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/80 p-2.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Attente :</span>
                      </span>
                      <span className="font-bold text-slate-900">
                        {metrics.daysWaiting} jour{metrics.daysWaiting > 1 ? 's' : ''} (depuis le {metrics.formattedSinceDate})
                      </span>
                    </div>

                    {metrics.isDragging && !isResolved && (
                      <div className="bg-red-100 text-red-800 px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        <span>⚠️ Ce dossier traîne (&gt; 7 jours) sans réponse !</span>
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[11px]">
                      <div>
                        {metrics.followUpStatus === 'overdue' && !isResolved && (
                          <span className="font-bold text-red-700 flex items-center gap-1">
                            🚨 Relance en retard ({Math.abs(metrics.daysDiffFollowUp || 0)}j)
                          </span>
                        )}
                        {metrics.followUpStatus === 'today' && !isResolved && (
                          <span className="font-bold text-amber-800 flex items-center gap-1">
                            🔔 À relancer aujourd&apos;hui !
                          </span>
                        )}
                        {metrics.followUpStatus === 'upcoming' && !isResolved && (
                          <span className="text-slate-600">
                            Prochaine relance : <strong>{metrics.formattedFollowUpDate}</strong>
                          </span>
                        )}
                        {(metrics.followUpStatus === 'none' || isResolved) && (
                          <span className="text-slate-400 italic">
                            {isResolved ? "Retour reçu" : "Pas de relance fixée"}
                          </span>
                        )}
                      </div>

                      <span className="text-slate-500 font-medium">
                        {returnItem.follow_up_count} relance{returnItem.follow_up_count > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* TÂCHES INTERNES QUI ATTENDENT CE RETOUR */}
                  <div className="pt-1">
                    {awaitingTasks.length > 0 ? (
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-2.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-indigo-950 font-bold text-xs">
                          <Lock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>🔒 {awaitingTasks.length} tâche{awaitingTasks.length > 1 ? 's' : ''} interne{awaitingTasks.length > 1 ? 's' : ''} attende{awaitingTasks.length > 1 ? 'nt' : ''} ce retour :</span>
                        </div>
                        <ul className="space-y-1 pl-1 max-h-24 overflow-y-auto">
                          {awaitingTasks.map(t => (
                            <li key={t.id} className="text-[11px] text-indigo-900 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                              <span className="font-semibold truncate">{t.title}</span>
                              <span className="text-[10px] text-indigo-600 font-normal">({t.category})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic flex items-center gap-1">
                        <Unlock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Aucune tâche interne n&apos;est actuellement liée à ce retour.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="p-3 bg-slate-50/90 border-t border-slate-200 flex items-center justify-between gap-2">
                  {!isResolved ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleMarkReceived(returnItem)}
                        title="La réponse est arrivée : marque le retour comme reçu et débloque les tâches associées"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 cursor-pointer shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5 mr-1 stroke-[3]" />
                        Réponse reçue
                      </Button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenFollowUpModal(returnItem)}
                          title="Consigner que vous venez de relancer votre interlocuteur et choisir la prochaine étape"
                          className="text-[11px] h-8 border-amber-300 text-amber-900 hover:bg-amber-100/70 cursor-pointer font-semibold"
                        >
                          <Send className="w-3 h-3 mr-1 text-amber-600" />
                          Relancé...
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditReturn(returnItem)}
                          className="text-[11px] h-8 text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          Modifier
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full flex items-center justify-between text-xs text-emerald-800 font-semibold">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Retour reçu & tâches débloquées
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => updateWaitingReturn(supabase, returnItem.id, { status: 'en attente' }).then(loadData)}
                        className="text-xs text-slate-500 hover:text-amber-800"
                        title="Repasser ce retour en attente"
                      >
                        Rouvrir l'attente
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Dialogue Création / Modification d'un retour attendu */}
      <Dialog open={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-600">
            <Hourglass className="w-5 h-5" />
            <DialogTitle className="text-lg">
              {editingReturn ? 'Modifier le retour attendu' : 'Nouveau retour attendu'}
            </DialogTitle>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Définissez ce que vous attendez auprès d&apos;un tiers extérieur.
          </p>
        </DialogHeader>

        <div className="space-y-3.5 py-3">
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-800">
              Objet du retour attendu <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="Ex: Devis raccordement fibre, Validation budget..."
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-800">
                Interlocuteur / Tiers <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formWaitingOn}
                onChange={e => setFormWaitingOn(e.target.value)}
                placeholder="Ex: Orange, Direction, Patrick..."
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-800">Type de tiers</Label>
              <select
                value={formTargetType}
                onChange={e => setFormTargetType(e.target.value)}
                className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="Prestataire">Prestataire</option>
                <option value="Fournisseur">Fournisseur</option>
                <option value="Direction">Direction</option>
                <option value="Utilisateur">Utilisateur</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>

          {/* Date de relance (strictement optionnelle) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-800">
                Date de relance prévue <span className="text-slate-400 font-normal">(Optionnel)</span>
              </Label>
              {formFollowUpDate && (
                <button
                  type="button"
                  onClick={() => setFormFollowUpDate('')}
                  className="text-[10px] text-slate-400 hover:text-red-600 cursor-pointer underline"
                >
                  Effacer la relance
                </button>
              )}
            </div>
            <CustomDatePicker
              value={formFollowUpDate}
              onChange={setFormFollowUpDate}
              placeholder="Sélectionner une date de relance (optionnel)"
              className="h-9 text-xs"
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {[
                { label: 'Demain', days: 1 },
                { label: 'Dans 3j', days: 3 },
                { label: 'Dans 1 sem.', days: 7 },
                { label: 'Dans 2 sem.', days: 14 }
              ].map(({ label, days }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    const d = new Date()
                    d.setDate(d.getDate() + days)
                    setFormFollowUpDate(d.toISOString().split('T')[0])
                  }}
                  className="text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-slate-700 hover:bg-amber-50 hover:text-amber-800 cursor-pointer"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Option calendrier avec choix fixe / flexible */}
          <CalendarSyncOptions
            enabled={formAddToCalendar}
            onEnabledChange={setFormAddToCalendar}
            isFlexible={formCalIsFlexible}
            onFlexibleChange={setFormCalIsFlexible}
            date={formCalDate}
            onDateChange={setFormCalDate}
            endDate={formCalEndDate}
            onEndDateChange={setFormCalEndDate}
            flexLabel={formCalFlexLabel}
            onFlexLabelChange={setFormCalFlexLabel}
            defaultSuggestedDate={formFollowUpDate}
            labelTitle="Retranscrire dans le calendrier"
            labelDescription={
              formFollowUpDate
                ? `Planifier un rappel ou une période de relance dans votre agenda IT (suggéré le ${formFollowUpDate})`
                : "Planifier un rappel ou une période de relance dans votre agenda IT"
            }
          />

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-800">Description / Références (optionnel)</Label>
            <Input
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
              placeholder="Ex: Réf dossier #4829, envoyé le 12/09 par mail..."
              className="h-9 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setIsReturnModalOpen(false)} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button 
            onClick={handleSaveReturn} 
            disabled={!formTitle.trim() || !formWaitingOn.trim() || isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSubmitting ? 'Enregistrement...' : editingReturn ? 'Mettre à jour' : 'Créer le retour'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Modal de relance interactive (choix du délai ou ne plus relancer) */}
      <FollowUpReturnDialog
        open={isFollowUpModalOpen}
        returnItem={followUpModalItem}
        onClose={() => {
          setIsFollowUpModalOpen(false)
          setFollowUpModalItem(null)
        }}
        onConfirm={handleConfirmFollowUp}
      />

      {/* Modal de réponse reçue et suites logiques */}
      <WaitingResponseReceivedDialog
        open={isResponseReceivedOpen}
        returnItem={responseReceivedItem}
        linkedTasks={responseReceivedItem ? (tasksAwaitingReturnMap.get(responseReceivedItem.id) || []) : []}
        onClose={() => {
          setIsResponseReceivedOpen(false)
          setResponseReceivedItem(null)
        }}
        onSuccessMessage={(msg) => showNotification(msg)}
        onCompleted={async () => {
          const reloadedReturns = await fetchWaitingReturns(supabase)
          setWaitingReturns(reloadedReturns)
          const { data: updatedTasks } = await supabase.from('tasks').select('*').order('created_at', { ascending: false })
          if (updatedTasks) setTasks(updatedTasks)
        }}
      />
    </div>
  )
}

export default function EnAttentePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Chargement de la rubrique En attente...</div>}>
      <EnAttenteContent />
    </Suspense>
  )
}
