'use client'

import React, { useState } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getIconForType } from './NetworkUtils'

export const EquipmentNode = React.memo(({ data, selected }: { data: any; selected?: boolean }) => {
  const isDimmed = data.isDimmed
  const isHighlighted = data.isHighlighted
  const [copied, setCopied] = useState(false)

  const copyIp = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data.ip) {
      navigator.clipboard.writeText(data.ip)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const typeConfig: Record<string, { border: string; badge: string; headerBg: string; text: string; iconBg: string }> = {
    'Firewall': { 
      border: 'border-red-300 hover:border-red-500', 
      badge: 'bg-red-100 text-red-800 border-red-200', 
      headerBg: 'bg-gradient-to-r from-red-50 to-white', 
      text: 'text-red-900',
      iconBg: 'bg-red-100'
    },
    'Switch': { 
      border: 'border-blue-300 hover:border-blue-500', 
      badge: 'bg-blue-100 text-blue-800 border-blue-200', 
      headerBg: 'bg-gradient-to-r from-blue-50 to-white', 
      text: 'text-blue-900',
      iconBg: 'bg-blue-100'
    },
    'Modem/ONT': { 
      border: 'border-amber-300 hover:border-amber-500', 
      badge: 'bg-amber-100 text-amber-800 border-amber-200', 
      headerBg: 'bg-gradient-to-r from-amber-50 to-white', 
      text: 'text-amber-900',
      iconBg: 'bg-amber-100'
    },
    'NAS': { 
      border: 'border-emerald-300 hover:border-emerald-500', 
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
      headerBg: 'bg-gradient-to-r from-emerald-50 to-white', 
      text: 'text-emerald-900',
      iconBg: 'bg-emerald-100'
    },
    'Point d\'accès': { 
      border: 'border-cyan-300 hover:border-cyan-500', 
      badge: 'bg-cyan-100 text-cyan-800 border-cyan-200', 
      headerBg: 'bg-gradient-to-r from-cyan-50 to-white', 
      text: 'text-cyan-900',
      iconBg: 'bg-cyan-100'
    },
    'VoIP': { 
      border: 'border-purple-300 hover:border-purple-500', 
      badge: 'bg-purple-100 text-purple-800 border-purple-200', 
      headerBg: 'bg-gradient-to-r from-purple-50 to-white', 
      text: 'text-purple-900',
      iconBg: 'bg-purple-100'
    },
    'Serveur': { 
      border: 'border-indigo-300 hover:border-indigo-500', 
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', 
      headerBg: 'bg-gradient-to-r from-indigo-50 to-white', 
      text: 'text-indigo-900',
      iconBg: 'bg-indigo-100'
    },
    'PC': { 
      border: 'border-slate-300 hover:border-slate-400', 
      badge: 'bg-slate-100 text-slate-700 border-slate-200', 
      headerBg: 'bg-gradient-to-r from-slate-50 to-white', 
      text: 'text-slate-800',
      iconBg: 'bg-slate-100'
    },
    'Imprimante': { 
      border: 'border-zinc-300 hover:border-zinc-400', 
      badge: 'bg-zinc-100 text-zinc-700 border-zinc-200', 
      headerBg: 'bg-gradient-to-r from-zinc-50 to-white', 
      text: 'text-zinc-800',
      iconBg: 'bg-zinc-100'
    }
  }

  const cfg = typeConfig[data.type] || {
    border: 'border-slate-200 hover:border-slate-400',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    headerBg: 'bg-white',
    text: 'text-slate-800',
    iconBg: 'bg-slate-100'
  }

  return (
    <div 
      className={cn(
        "bg-white rounded-xl border-2 shadow-sm flex flex-col transition-all duration-200 relative h-full w-full select-none overflow-hidden",
        "min-w-[170px] min-h-[85px]",
        cfg.border,
        selected && "ring-3 ring-blue-500/80 border-blue-500 shadow-xl scale-[1.02] z-30",
        isHighlighted && "ring-3 ring-blue-500 shadow-xl border-blue-500 scale-105 z-30",
        isDimmed && "opacity-25 grayscale scale-95 pointer-events-none"
      )}
    >
      <NodeResizer 
        isVisible={selected} 
        minWidth={190} 
        minHeight={90}
        color="#2563eb"
        lineClassName="!border-blue-500"
        handleClassName="!h-2.5 !w-2.5 !bg-white !border-2 !border-blue-600 !rounded-xs shadow-xs"
      />

      <Handle 
        type="target" 
        position={Position.Top} 
        id="top-target"
        style={{ left: '38%' }}
        className="w-2.5 h-2.5 !bg-slate-400 hover:!bg-blue-600 transition-colors cursor-crosshair" 
        title="Entrée haut (vers cet équipement)"
      />
      <Handle 
        type="source" 
        position={Position.Top} 
        id="top-source"
        style={{ left: '62%' }}
        className="w-2.5 h-2.5 !bg-blue-500 hover:!bg-blue-700 transition-colors cursor-crosshair" 
        title="Faire partir un lien par le haut"
      />

      <Handle 
        type="target" 
        position={Position.Left} 
        id="left-target"
        style={{ top: '38%' }}
        className="w-2.5 h-2.5 !bg-slate-400 hover:!bg-blue-600 transition-colors cursor-crosshair" 
        title="Entrée gauche (vers cet équipement)"
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        id="left-source"
        style={{ top: '62%' }}
        className="w-2.5 h-2.5 !bg-blue-500 hover:!bg-blue-700 transition-colors cursor-crosshair" 
        title="Faire partir un lien par la gauche"
      />

      <div className={cn("p-2.5 border-b flex items-center justify-between gap-2", cfg.headerBg)}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("p-1.5 rounded-lg shrink-0", cfg.iconBg)}>
            {getIconForType(data.type)}
          </div>
          <span className={cn("font-bold text-sm truncate", cfg.text)} title={data.name}>
            {data.name}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="relative flex h-2 w-2" title="Équipement actif">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
      </div>

      <div className="p-2.5 pt-2 space-y-1.5 flex-1 flex flex-col justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {data.type && (
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", cfg.badge)}>
              {data.type}
            </span>
          )}
          {data.location && (
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[120px]" title={data.location}>
              📍 {data.location}
            </span>
          )}
        </div>

        {data.ip && (
          <button
            type="button"
            onClick={copyIp}
            className="flex items-center justify-between text-xs font-mono bg-slate-50 hover:bg-slate-100 text-slate-700 px-2 py-1 rounded border border-slate-200 transition-colors cursor-pointer group w-full text-left"
            title="Cliquer pour copier l'IP"
          >
            <span className="font-semibold">{data.ip}</span>
            <span className="text-[10px] text-slate-400 group-hover:text-blue-600 flex items-center gap-0.5">
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copié' : 'Copier'}</span>
            </span>
          </button>
        )}

        {data.role && (
          <div className="text-[11px] text-slate-500 line-clamp-1" title={data.role}>
            {data.role}
          </div>
        )}
      </div>

      <Handle 
        type="target" 
        position={Position.Right} 
        id="right-target"
        style={{ top: '38%' }}
        className="w-2.5 h-2.5 !bg-slate-400 hover:!bg-blue-600 transition-colors cursor-crosshair" 
        title="Entrée droite (vers cet équipement)"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="right-source"
        style={{ top: '62%' }}
        className="w-2.5 h-2.5 !bg-blue-500 hover:!bg-blue-700 transition-colors cursor-crosshair" 
        title="Faire partir un lien par la droite"
      />

      <Handle 
        type="target" 
        position={Position.Bottom} 
        id="bottom-target"
        style={{ left: '38%' }}
        className="w-2.5 h-2.5 !bg-slate-400 hover:!bg-blue-600 transition-colors cursor-crosshair" 
        title="Entrée bas (vers cet équipement)"
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="bottom-source"
        style={{ left: '62%' }}
        className="w-2.5 h-2.5 !bg-blue-500 hover:!bg-blue-700 transition-colors cursor-crosshair" 
        title="Faire partir un lien par le bas"
      />
    </div>
  )
})
EquipmentNode.displayName = 'EquipmentNode'
