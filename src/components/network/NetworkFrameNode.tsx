'use client'

import React, { useContext } from 'react'
import { NodeResizer } from '@xyflow/react'
import { Wifi, Router, Shield, Server, Lock, Unlock, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NetworkCanvasContext } from './NetworkContext'

export const NetworkNode = React.memo(({ id, data, selected }: { id: string; data: any; selected?: boolean }) => {
  const { lockedNetworkIds, toggleLockNetwork, openAddEquipmentForNetwork } = useContext(NetworkCanvasContext)
  const isLocked = lockedNetworkIds.has(id) || data.isLocked || false
  const isDimmed = data.isDimmed
  const isHighlighted = data.isHighlighted

  const ssidLow = (data.ssid || '').toLowerCase()
  const notesLow = (data.notes || '').toLowerCase()
  const roleLow = (data.role_status || '').toLowerCase()

  let theme = {
    border: 'border-purple-400/60 hover:border-purple-500/80',
    bg: 'bg-purple-500/10 backdrop-blur-xs',
    headerBg: 'bg-purple-100/80 text-purple-950',
    icon: <Wifi className="w-4 h-4 text-purple-700" />
  }

  if (ssidLow.includes('sfr') || ssidLow.includes('fibre') || notesLow.includes('sfr')) {
    theme = {
      border: 'border-amber-400/60 hover:border-amber-500/80',
      bg: 'bg-amber-500/10 backdrop-blur-xs',
      headerBg: 'bg-amber-100/80 text-amber-950',
      icon: <Router className="w-4 h-4 text-amber-700" />
    }
  } else if (ssidLow.includes('client') || roleLow.includes('invité') || notesLow.includes('vlan')) {
    theme = {
      border: 'border-indigo-400/60 hover:border-indigo-500/80',
      bg: 'bg-indigo-500/10 backdrop-blur-xs',
      headerBg: 'bg-indigo-100/80 text-indigo-950',
      icon: <Shield className="w-4 h-4 text-indigo-700" />
    }
  } else if (ssidLow.includes('fondax') || roleLow.includes('prod') || roleLow.includes('interne')) {
    theme = {
      border: 'border-emerald-400/60 hover:border-emerald-500/80',
      bg: 'bg-emerald-500/10 backdrop-blur-xs',
      headerBg: 'bg-emerald-100/80 text-emerald-950',
      icon: <Server className="w-4 h-4 text-emerald-700" />
    }
  } else if (ssidLow.includes('bureau') || notesLow.includes('deco') || notesLow.includes('mesh')) {
    theme = {
      border: 'border-violet-400/60 hover:border-violet-500/80',
      bg: 'bg-violet-500/10 backdrop-blur-xs',
      headerBg: 'bg-violet-100/80 text-violet-950',
      icon: <Wifi className="w-4 h-4 text-violet-700" />
    }
  }

  return (
    <div
      className={cn(
        "rounded-3xl border-2 border-dashed transition-all duration-200 relative select-none w-full h-full flex flex-col p-3 shadow-xs",
        theme.border,
        theme.bg,
        isLocked && "ring-2 ring-amber-400/70 border-amber-500/80 shadow-md",
        selected && "ring-3 ring-blue-500 border-blue-500 shadow-md",
        isHighlighted && "ring-3 ring-purple-600 shadow-xl scale-[1.01] z-30",
        isDimmed && "opacity-25 grayscale pointer-events-none"
      )}
    >
      <NodeResizer 
        isVisible={selected && !isLocked} 
        minWidth={200} 
        minHeight={100}
        color="#9333ea"
        lineClassName="!border-purple-500"
        handleClassName="!h-2.5 !w-2.5 !bg-white !border-2 !border-purple-600 !rounded-xs shadow-xs"
      />

      <div className={cn("px-3 py-1.5 rounded-2xl flex flex-wrap items-center justify-between gap-2 border border-inherit/40 shadow-2xs", theme.headerBg)}>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 shrink-0">
            <div className="p-1 rounded-md bg-white/90 shadow-2xs">
              {theme.icon}
            </div>
            <span>{data.ssid}</span>
          </div>

          {data.ip_range && (
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-white/90 border border-slate-200/80 text-slate-800 font-semibold shadow-2xs flex items-center gap-1">
              <span className="text-slate-400 font-normal">Réseau :</span>
              <span>{data.ip_range}</span>
            </span>
          )}

          {data.gateway && (
            <span className="font-mono text-[11px] px-2 py-0.5 rounded-full bg-white/90 border border-slate-200/80 text-slate-800 font-medium shadow-2xs flex items-center gap-1">
              <span className="text-slate-400 font-normal">Gateway :</span>
              <span className="font-semibold text-slate-900">{data.gateway}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleLockNetwork(id)
            }}
            className={cn(
              "h-6 px-2 rounded-md text-[10px] font-semibold flex items-center gap-1 border transition-colors cursor-pointer",
              isLocked 
                ? "bg-amber-600 text-white border-amber-700 shadow-xs" 
                : "bg-white/90 text-slate-700 hover:bg-white border-slate-200"
            )}
            title={isLocked ? "Réseau bloqué/fixe sur le plan (Cliquer pour déverrouiller)" : "Bloquer ce cadre pour qu'il ne bouge plus"}
          >
            {isLocked ? <Lock className="w-3 h-3 text-amber-100" /> : <Unlock className="w-3 h-3 text-slate-500" />}
            <span>{isLocked ? 'Fixe' : 'Mobile'}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              openAddEquipmentForNetwork(data)
            }}
            className="h-6 px-2 rounded-md text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
            title="Ajouter un équipement dans ce réseau"
          >
            <Plus className="w-3 h-3" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[30px] pointer-events-none" />
    </div>
  )
})
NetworkNode.displayName = 'NetworkNode'
