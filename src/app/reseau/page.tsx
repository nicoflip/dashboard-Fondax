'use client'

import React, { useEffect, useState, useCallback, useMemo, createContext, useContext } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  type Node, 
  type Edge, 
  Panel,
  Handle,
  Position,
  Connection,
  MarkerType,
  NodeResizer,
  ReactFlowProvider,
  useReactFlow
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, Router, Shield, Server, HardDrive, Phone, Wifi, Monitor, Printer, Box, Trash2,
  X, Layers, Filter, CheckCircle2, ArrowRight, ArrowLeft, ArrowLeftRight, Ban, Activity,
  Pencil, Copy, Check, Search, Wand2, Maximize2, Eye, EyeOff, Cable, Network as NetworkIcon,
  Sparkles, Lock, Unlock, AlertTriangle
} from 'lucide-react'
import { NetworkEquipment, NetworkConnection, Network, LanDevice } from '@/lib/types'
import { cn } from '@/lib/utils'

const equipmentTypes = [
  'Modem/ONT', 'Firewall', 'Switch', 'NAS', 'VoIP', 'Point d\'accès', 'Serveur', 'PC', 'Imprimante', 'Autre'
]

const getIconForType = (type: string | null) => {
  switch (type) {
    case 'Modem/ONT': return <Router className="w-5 h-5 text-amber-500" />
    case 'Firewall': return <Shield className="w-5 h-5 text-red-500" />
    case 'Switch': return <Server className="w-5 h-5 text-blue-500" />
    case 'NAS': return <HardDrive className="w-5 h-5 text-green-500" />
    case 'VoIP': return <Phone className="w-5 h-5 text-purple-500" />
    case 'Point d\'accès': return <Wifi className="w-5 h-5 text-cyan-500" />
    case 'Serveur': return <Server className="w-5 h-5 text-indigo-500" />
    case 'PC': return <Monitor className="w-5 h-5 text-slate-500" />
    case 'Imprimante': return <Printer className="w-5 h-5 text-slate-500" />
    default: return <Box className="w-5 h-5 text-slate-500" />
  }
}

// Data models for connection edges
interface EdgeMetadata {
  type: 'ethernet' | 'fibre' | 'wifi' | 'vpn' | 'inconnu'
  flowStatus: 'active' | 'blocked'
  direction: 'both' | 'forward' | 'reverse' | 'none'
  description: string
}

function parseEdgeNotes(notes?: unknown, label?: unknown): EdgeMetadata {
  const strNotes = String(notes || '')
  const strLabel = String(label || '')
  const combined = `${strLabel} ${strNotes}`.toLowerCase()

  // Type
  let type: 'ethernet' | 'fibre' | 'wifi' | 'vpn' | 'inconnu' = 'ethernet'
  const typeMatch = strNotes.match(/\[type:([a-z]+)\]/i)
  if (typeMatch) {
    type = typeMatch[1].toLowerCase() as any
  } else if (combined.includes('fibre') || combined.includes('fiber') || combined.includes('ont')) {
    type = 'fibre'
  } else if (combined.includes('wifi') || combined.includes('wi-fi') || combined.includes('mesh') || combined.includes('ap')) {
    type = 'wifi'
  } else if (combined.includes('vpn') || combined.includes('tunnel')) {
    type = 'vpn'
  }

  // Flow status (active vs blocked)
  let flowStatus: 'active' | 'blocked' = 'active'
  const flowMatch = strNotes.match(/\[status:(active|blocked)\]/i)
  if (flowMatch) {
    flowStatus = flowMatch[1].toLowerCase() as any
  } else if (combined.includes('bloqué') || combined.includes('bloque') || combined.includes('inactif') || combined.includes('hors-service') || combined.includes('coupe')) {
    flowStatus = 'blocked'
  }

  // Direction (both, forward, reverse, none)
  let direction: 'both' | 'forward' | 'reverse' | 'none' = 'both'
  const dirMatch = strNotes.match(/\[flow:(both|forward|reverse|none)\]/i)
  if (dirMatch) {
    direction = dirMatch[1].toLowerCase() as any
  } else if (combined.includes('unidirectionnel') || combined.includes('uni-directionnel')) {
    direction = 'forward'
  } else if (combined.includes('aucun flux') || combined.includes('sans flux')) {
    direction = 'none'
  }

  // Clean description (strips [tag:...])
  const description = strNotes.replace(/\[[a-z]+:[^\]]+\]/gi, '').trim()

  return { type, flowStatus, direction, description }
}

function formatEdgeNotes(meta: EdgeMetadata): string {
  const parts: string[] = []
  if (meta.type !== 'ethernet') parts.push(`[type:${meta.type}]`)
  if (meta.flowStatus !== 'active') parts.push(`[status:${meta.flowStatus}]`)
  if (meta.direction !== 'both') parts.push(`[flow:${meta.direction}]`)
  if (meta.description) parts.push(meta.description)
  return parts.join(' ').trim()
}

function buildEdgeVisualAndMarkers(meta: EdgeMetadata, isHighlighted?: boolean, isDimmed?: boolean) {
  let stroke = '#3b82f6'
  let strokeDasharray: string | undefined = undefined

  if (meta.type === 'fibre') stroke = '#f59e0b'
  else if (meta.type === 'wifi') {
    stroke = '#06b6d4'
    strokeDasharray = '5 5'
  } else if (meta.type === 'vpn') {
    stroke = '#8b5cf6'
    strokeDasharray = '6 3'
  }

  // If data flow is blocked
  if (meta.flowStatus === 'blocked') {
    stroke = '#ef4444'
    strokeDasharray = '6 4'
  }

  const style = {
    stroke,
    strokeWidth: isHighlighted ? 3.5 : (meta.flowStatus === 'blocked' ? 2.5 : 2),
    strokeDasharray,
    opacity: isDimmed ? 0.2 : 0.95,
  }

  let markerStart: any = undefined
  let markerEnd: any = undefined

  if (meta.flowStatus === 'active') {
    if (meta.direction === 'both') {
      markerStart = { type: MarkerType.ArrowClosed, color: stroke, width: 14, height: 14 }
      markerEnd = { type: MarkerType.ArrowClosed, color: stroke, width: 14, height: 14 }
    } else if (meta.direction === 'forward') {
      markerEnd = { type: MarkerType.ArrowClosed, color: stroke, width: 16, height: 16 }
    } else if (meta.direction === 'reverse') {
      markerStart = { type: MarkerType.ArrowClosed, color: stroke, width: 16, height: 16 }
    }
  }

  return {
    style,
    markerStart,
    markerEnd,
    animated: meta.flowStatus === 'active' && meta.direction !== 'none',
  }
}

// React Context for Network Canvas Actions (Locking & Adding Equipment)
interface NetworkCanvasContextType {
  lockedNetworkIds: Set<string>
  toggleLockNetwork: (networkNodeId: string) => void
  openAddEquipmentForNetwork: (netData: Network) => void
}

const NetworkCanvasContext = createContext<NetworkCanvasContextType>({
  lockedNetworkIds: new Set(),
  toggleLockNetwork: () => {},
  openAddEquipmentForNetwork: () => {},
})

// Custom Equipment Node with modern design & 4 handles
const EquipmentNode = React.memo(({ data, selected }: { data: any; selected?: boolean }) => {
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
        "min-w-[210px] min-h-[105px]",
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

      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-slate-400 hover:!bg-blue-600 transition-colors" />
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 !bg-slate-400 hover:!bg-blue-600 transition-colors" />

      {/* Header */}
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

      {/* Body info */}
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

      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-slate-400 hover:!bg-blue-600 transition-colors" />
      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 !bg-slate-400 hover:!bg-blue-600 transition-colors" />
    </div>
  )
})
EquipmentNode.displayName = 'EquipmentNode'

// Custom Translucent & Lockable Network Subnet Node with '+' equipment button
const NetworkNode = React.memo(({ id, data, selected }: { id: string; data: any; selected?: boolean }) => {
  const { lockedNetworkIds, toggleLockNetwork, openAddEquipmentForNetwork } = useContext(NetworkCanvasContext)
  const isLocked = lockedNetworkIds.has(id) || data.isLocked || false
  const isDimmed = data.isDimmed
  const isHighlighted = data.isHighlighted

  const ssidLow = (data.ssid || '').toLowerCase()
  const notesLow = (data.notes || '').toLowerCase()
  const roleLow = (data.role_status || '').toLowerCase()

  let theme = {
    border: 'border-purple-300/90 hover:border-purple-500 bg-purple-50/30 backdrop-blur-md text-purple-950',
    badge: 'bg-purple-100/90 text-purple-800 border-purple-200',
    headerBg: 'bg-purple-100/50',
    tag: 'Réseau',
    icon: <Wifi className="w-4 h-4 text-purple-700" />
  }

  if (ssidLow.includes('sfr') || ssidLow.includes('fibre') || notesLow.includes('sfr')) {
    theme = {
      border: 'border-amber-400/90 hover:border-amber-600 bg-amber-50/30 backdrop-blur-md text-amber-950',
      badge: 'bg-amber-100/90 text-amber-900 border-amber-300',
      headerBg: 'bg-amber-100/50',
      tag: '⚠️ Box SFR (Parasite)',
      icon: <Router className="w-4 h-4 text-amber-700" />
    }
  } else if (ssidLow.includes('client') || roleLow.includes('invité') || notesLow.includes('vlan')) {
    theme = {
      border: 'border-indigo-400/90 hover:border-indigo-600 bg-indigo-50/30 backdrop-blur-md text-indigo-950',
      badge: 'bg-indigo-100/90 text-indigo-900 border-indigo-300',
      headerBg: 'bg-indigo-100/50',
      tag: '🛡️ VLAN Invité Isolé',
      icon: <Shield className="w-4 h-4 text-indigo-700" />
    }
  } else if (ssidLow.includes('fondax') || roleLow.includes('prod') || roleLow.includes('interne')) {
    theme = {
      border: 'border-emerald-400/90 hover:border-emerald-600 bg-emerald-50/30 backdrop-blur-md text-emerald-950',
      badge: 'bg-emerald-100/90 text-emerald-900 border-emerald-300',
      headerBg: 'bg-emerald-100/50',
      tag: '🏢 LAN Prod & Wi-Fi',
      icon: <Server className="w-4 h-4 text-emerald-700" />
    }
  } else if (ssidLow.includes('bureau') || notesLow.includes('deco') || notesLow.includes('mesh')) {
    theme = {
      border: 'border-violet-400/90 hover:border-violet-600 bg-violet-50/30 backdrop-blur-md text-violet-950',
      badge: 'bg-violet-100/90 text-violet-900 border-violet-300',
      headerBg: 'bg-violet-100/50',
      tag: '⚠️ Mesh Deco (Double NAT)',
      icon: <Wifi className="w-4 h-4 text-violet-700" />
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-dashed p-3.5 flex flex-col transition-all duration-200 relative select-none shadow-sm min-w-[270px] max-w-[300px]",
        theme.border,
        isLocked && "ring-2 ring-amber-400/80 border-amber-500 shadow-md",
        selected && "ring-3 ring-blue-500 border-blue-500 shadow-md",
        isHighlighted && "ring-3 ring-purple-600 shadow-xl scale-105 z-30",
        isDimmed && "opacity-25 grayscale scale-95 pointer-events-none"
      )}
    >
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-purple-500 border-2 !border-white" />
      <Handle type="target" position={Position.Left} className="w-2.5 h-2.5 !bg-purple-500 border-2 !border-white" />

      {/* Header with Title, Lock button and Add Equipment '+' button */}
      <div className={cn("p-2 rounded-xl mb-2 flex items-center justify-between gap-1.5 border border-inherit/40", theme.headerBg)}>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="p-1 rounded-md bg-white/90 shadow-2xs shrink-0">
            {theme.icon}
          </div>
          <span className="font-bold text-xs truncate text-slate-900" title={data.ssid}>
            {data.ssid}
          </span>
        </div>

        {/* Action buttons: Lock & Add */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleLockNetwork(id)
            }}
            className={cn(
              "h-6 px-1.5 rounded-md text-[10px] font-semibold flex items-center gap-1 border transition-colors cursor-pointer",
              isLocked 
                ? "bg-amber-600 text-white border-amber-700 shadow-xs" 
                : "bg-white/90 text-slate-700 hover:bg-white border-slate-200"
            )}
            title={isLocked ? "Réseau bloqué/fixe sur le plan (Cliquer pour déverrouiller)" : "Bloquer ce réseau pour qu'il ne bouge plus"}
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
            className="h-6 px-2 rounded-md text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-0.5 shadow-xs cursor-pointer transition-colors"
            title="Ajouter un équipement à ce réseau"
          >
            <Plus className="w-3 h-3" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      {/* Network Tag and Lock Status */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap border", theme.badge)}>
          {theme.tag}
        </span>
        {isLocked ? (
          <span className="text-[9px] font-medium text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Verrouillé
          </span>
        ) : (
          <span className="text-[9px] text-slate-500 flex items-center gap-1">
            <Unlock className="w-2.5 h-2.5" /> Déplaçable
          </span>
        )}
      </div>

      {/* Subnet info */}
      <div className="space-y-1.5 my-1 bg-white/75 backdrop-blur-xs p-2.5 rounded-xl border border-inherit/40 text-xs">
        {data.ip_range && (
          <div className="flex items-center justify-between font-mono">
            <span className="text-slate-500 font-medium text-[11px]">Plage IP :</span>
            <span className="text-slate-900 font-bold text-[11px]">{data.ip_range}</span>
          </div>
        )}
        {data.gateway && (
          <div className="flex items-center justify-between font-mono">
            <span className="text-slate-500 text-[10px]">Passerelle :</span>
            <span className="font-semibold text-slate-800 text-[10px]">{data.gateway}</span>
          </div>
        )}
        {data.manager && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[10px]">Géré par :</span>
            <span className="font-semibold text-slate-700 text-[10px] truncate max-w-[120px]">{data.manager}</span>
          </div>
        )}
      </div>

      {data.role_status && (
        <div className="text-[10px] text-slate-600 line-clamp-2 mt-1 px-1" title={data.role_status}>
          {data.role_status}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-purple-500 border-2 !border-white" />
      <Handle type="source" position={Position.Right} className="w-2.5 h-2.5 !bg-purple-500 border-2 !border-white" />
    </div>
  )
})
NetworkNode.displayName = 'NetworkNode'

// Custom Zone Node
const ZoneNode = React.memo(({ id, data, selected }: { id: string; data: any; selected?: boolean }) => {
  const colorMap: Record<string, string> = {
    blue: 'border-blue-400/80 bg-blue-50/40 text-blue-900',
    slate: 'border-slate-300 bg-slate-50/50 text-slate-900',
    amber: 'border-amber-400/80 bg-amber-50/40 text-amber-900',
    purple: 'border-purple-400/80 bg-purple-50/40 text-purple-900',
    emerald: 'border-emerald-400/80 bg-emerald-50/40 text-emerald-900',
  }
  const colorStyle = colorMap[data.color || 'slate'] || colorMap.slate

  return (
    <div 
      className={cn(
        "rounded-2xl border-2 border-dashed p-4 transition-colors pointer-events-auto h-full w-full relative select-none",
        colorStyle,
        selected && "border-blue-600 ring-2 ring-blue-400/30 shadow-sm"
      )}
    >
      <NodeResizer 
        isVisible={selected} 
        minWidth={220} 
        minHeight={140}
        color="#2563eb"
        lineClassName="!border-blue-500"
        handleClassName="!h-3 !w-3 !bg-white !border-2 !border-blue-600 !rounded-xs shadow-sm"
      />
      <div className="flex items-center justify-between border-b border-inherit pb-2 mb-2">
        <div className="flex items-center gap-2 font-bold text-sm tracking-wide uppercase">
          <Layers className="w-4 h-4 opacity-70" />
          {data.label}
        </div>
        <div className="flex items-center gap-2">
          {data.description && (
            <span className="text-xs opacity-75">{data.description}</span>
          )}
          {data.onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                data.onDelete(id, data.label)
              }}
              className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
              title="Supprimer cette zone"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
ZoneNode.displayName = 'ZoneNode'

const nodeTypes = {
  equipment: EquipmentNode,
  network: NetworkNode,
  zone: ZoneNode,
}

function computeOptimalLayout(
  equipList: NetworkEquipment[],
  networkList: Network[],
  connList: NetworkConnection[],
  showNetworks: boolean,
  lockedNetworkIds?: Set<string>
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // 1. Core devices identification
  const box = equipList.find(e => {
    const n = (e.name || '').toLowerCase()
    return n.includes('box') || n.includes('sfr') || n.includes('ont') || e.type === 'Modem/ONT'
  })

  const firewall = equipList.find(e => {
    const n = (e.name || '').toLowerCase()
    return (n.includes('sophos') || n.includes('firewall') || e.type === 'Firewall') && e.id !== box?.id
  })

  const mainSwitch = equipList.find(e => {
    const n = (e.name || '').toLowerCase()
    return (n.includes('switch') || n.includes('d-link') || e.type === 'Switch') && e.id !== firewall?.id
  })

  const nas = equipList.find(e => {
    const n = (e.name || '').toLowerCase()
    return e.type === 'NAS' || n.includes('synology') || n.includes('nas')
  })

  const voip = equipList.find(e => {
    const n = (e.name || '').toLowerCase()
    return e.type === 'VoIP' || n.includes('voip') || n.includes('yealink')
  })

  const deco1 = equipList.find(e => {
    const n = (e.name || '').toLowerCase()
    return n.includes('deco 1') || (n.includes('deco') && !n.includes('deco 2'))
  })

  const deco2 = equipList.find(e => {
    const n = (e.name || '').toLowerCase()
    return n.includes('deco 2') && e.id !== deco1?.id
  })

  const handledIds = new Set<string>()
  if (box) handledIds.add(box.id)
  if (firewall) handledIds.add(firewall.id)
  if (mainSwitch) handledIds.add(mainSwitch.id)
  if (nas) handledIds.add(nas.id)
  if (voip) handledIds.add(voip.id)
  if (deco1) handledIds.add(deco1.id)
  if (deco2) handledIds.add(deco2.id)

  const otherEquip = equipList.filter(e => !handledIds.has(e.id))

  // 2. Central backbone coordinates (Centered on X = 520)
  const centerX = 520
  const positions: Record<string, { x: number; y: number }> = {}

  if (box) positions[box.id] = { x: centerX, y: 60 }
  if (firewall) positions[firewall.id] = { x: centerX, y: 230 }
  if (mainSwitch) positions[mainSwitch.id] = { x: centerX, y: 400 }

  if (nas) positions[nas.id] = { x: 140, y: 580 }
  if (voip) positions[voip.id] = { x: centerX, y: 580 }
  if (deco1) positions[deco1.id] = { x: 900, y: 580 }
  if (deco2) positions[deco2.id] = { x: 900, y: 760 }

  // Other endpoints (Workstations, Printers, IoT) avoiding Deco 2 at (900, 760)
  const endpointCols = [140, 390, 640]
  otherEquip.forEach((eq, idx) => {
    const row = Math.floor(idx / endpointCols.length)
    const col = idx % endpointCols.length
    const yPos = 760 + row * 170
    positions[eq.id] = { x: endpointCols[col], y: yPos }
  })

  // 3. Add equipment nodes
  equipList.forEach(eq => {
    const pos = positions[eq.id] || { x: eq.position_x || 200, y: eq.position_y || 200 }
    nodes.push({
      id: eq.id,
      type: 'equipment',
      position: pos,
      data: { ...eq, isHighlighted: false, isDimmed: false } as Record<string, unknown>,
      zIndex: 10
    })
  })

  // 4. Add equipment connections with rich directional and flow metadata
  connList.forEach((conn: NetworkConnection) => {
    const meta = parseEdgeNotes(conn.notes, conn.label)
    const visual = buildEdgeVisualAndMarkers(meta)

    let displayLabel = conn.label || undefined
    if (meta.flowStatus === 'blocked') {
      displayLabel = `${conn.label || 'Liaison'} (⛔ Bloqué)`
    } else if (meta.direction === 'none') {
      displayLabel = `${conn.label || 'Liaison'} (✕ Coupé)`
    } else if (meta.direction === 'forward') {
      displayLabel = `${conn.label || 'Liaison'} (➔)`
    } else if (meta.direction === 'reverse') {
      displayLabel = `${conn.label || 'Liaison'} (⬅)`
    }

    edges.push({
      id: conn.id,
      source: conn.source_id,
      target: conn.target_id,
      label: displayLabel,
      type: 'smoothstep',
      animated: visual.animated,
      style: visual.style,
      markerStart: visual.markerStart,
      markerEnd: visual.markerEnd,
      data: { 
        ...conn, 
        notes: conn.notes,
        connection_type: meta.type,
        flowStatus: meta.flowStatus,
        direction: meta.direction,
        description: meta.description
      }
    })
  })

  // 5. Subnet network nodes placed laterally beside their true host (zero overlap)
  if (showNetworks) {
    networkList.forEach((net, idx) => {
      const netNodeId = `net-${net.id}`
      const isLocked = lockedNetworkIds?.has(netNodeId) ?? false
      const ssidLow = (net.ssid || '').toLowerCase()
      const notesLow = (net.notes || '').toLowerCase()
      const roleLow = (net.role_status || '').toLowerCase()

      let netPos = { x: 1240, y: 60 + idx * 170 }
      let targetHostId: string | undefined = undefined
      let edgeLabel = net.ip_range ? `${net.ip_range}` : undefined

      if (ssidLow.includes('sfr') || ssidLow.includes('fibre') || notesLow.includes('sfr')) {
        if (box) {
          netPos = { x: 900, y: 60 }
          targetHostId = box.id
          edgeLabel = 'Wi-Fi Box (192.168.0.0/24)'
        }
      } else if (ssidLow.includes('client') || roleLow.includes('invité') || notesLow.includes('vlan')) {
        if (firewall) {
          netPos = { x: 900, y: 230 }
          targetHostId = firewall.id
          edgeLabel = 'VLAN Invités (10.35.50.0/24)'
        }
      } else if (ssidLow.includes('fondax') || roleLow.includes('prod') || roleLow.includes('interne')) {
        if (mainSwitch) {
          netPos = { x: 140, y: 400 }
          targetHostId = mainSwitch.id
          edgeLabel = 'LAN Prod (192.168.20.0/24)'
        } else if (firewall) {
          netPos = { x: 140, y: 230 }
          targetHostId = firewall.id
          edgeLabel = 'Passerelle LAN (192.168.20.254)'
        }
      } else if (ssidLow.includes('bureau') || roleLow.includes('mesh') || notesLow.includes('deco')) {
        if (deco1) {
          netPos = { x: 1240, y: 580 }
          targetHostId = deco1.id
          edgeLabel = 'Mesh Deco (192.168.68.0/24)'
        }
      } else {
        netPos = { x: 1240, y: 60 + idx * 170 }
        targetHostId = firewall?.id || mainSwitch?.id
      }

      nodes.push({
        id: netNodeId,
        type: 'network',
        position: netPos,
        draggable: !isLocked, // disabled when locked
        data: { 
          ...net, 
          isLocked,
          isHighlighted: false, 
          isDimmed: false 
        } as Record<string, unknown>,
        zIndex: 8
      })

      if (targetHostId) {
        edges.push({
          id: `edge-net-${net.id}`,
          source: targetHostId,
          target: netNodeId,
          label: edgeLabel,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#a855f7', strokeWidth: 2, strokeDasharray: '4 4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
          data: { isNetworkEdge: true }
        })
      }
    })
  }

  return { nodes, edges }
}

function ReseauContent() {
  const supabase = createClient()
  const { fitView } = useReactFlow()
  const [mounted, setMounted] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  
  const [loading, setLoading] = useState(true)
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null)
  
  // Search & visual filters
  const [searchTerm, setSearchTerm] = useState('')
  const [showNetworksOnMap, setShowNetworksOnMap] = useState(true)
  const [isolatedNetworkId, setIsolatedNetworkId] = useState<string | null>(null)

  // Locked network frames state (persisted to localStorage)
  const [lockedNetworkIds, setLockedNetworkIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fondax_locked_networks')
        if (saved) return new Set(JSON.parse(saved))
      } catch {}
    }
    return new Set()
  })

  // Equipment state & modal
  const [equipments, setEquipments] = useState<NetworkEquipment[]>([])
  const [selectedNodeData, setSelectedNodeData] = useState<NetworkEquipment | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isAddEquipModalOpen, setIsAddEquipModalOpen] = useState(false)
  const [newEquip, setNewEquip] = useState<Partial<NetworkEquipment> & { autoConnectId?: string; connType?: string }>({ 
    type: 'Switch',
    connType: 'ethernet'
  })
  const [quickLinkTargetId, setQuickLinkTargetId] = useState<string>('')

  // Edge / Connection state & modal
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [isEdgeModalOpen, setIsEdgeModalOpen] = useState(false)
  const [edgeLabelInput, setEdgeLabelInput] = useState('')
  const [edgeDescInput, setEdgeDescInput] = useState('')
  const [edgeTypeInput, setEdgeTypeInput] = useState<'ethernet' | 'fibre' | 'wifi' | 'vpn' | 'inconnu'>('ethernet')
  const [edgeFlowStatusInput, setEdgeFlowStatusInput] = useState<'active' | 'blocked'>('active')
  const [edgeDirectionInput, setEdgeDirectionInput] = useState<'both' | 'forward' | 'reverse' | 'none'>('both')

  // Zone modal
  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState(false)
  const [newZone, setNewZone] = useState({ label: '', description: '', color: 'blue', width: 350, height: 250 })

  // Networks and LAN devices state
  const [networks, setNetworks] = useState<Network[]>([])
  const [lanDevices, setLanDevices] = useState<LanDevice[]>([])

  // Network modals state
  const [isAddNetworkModalOpen, setIsAddNetworkModalOpen] = useState(false)
  const [isEditNetworkModalOpen, setIsEditNetworkModalOpen] = useState(false)
  const [networkForm, setNetworkForm] = useState<Partial<Network> & { addToTopology?: boolean; connectToEquipId?: string }>({
    ssid: '', ip_range: '', gateway: '', manager: '', role_status: '', notes: '', is_active: true, addToTopology: true
  })
  const [editingNetworkId, setEditingNetworkId] = useState<string | null>(null)

  // LAN Device modals state
  const [isAddLanModalOpen, setIsAddLanModalOpen] = useState(false)
  const [isEditLanModalOpen, setIsEditLanModalOpen] = useState(false)
  const [lanForm, setLanForm] = useState<Partial<LanDevice> & { addToTopology?: boolean }>({
    hostname: '', ip: '', role: '', network_id: null, addToTopology: false
  })
  const [editingLanId, setEditingLanId] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setNotificationMsg(msg)
    setTimeout(() => setNotificationMsg(null), 4500)
  }

  // Toggle network locking/fixing state
  const toggleLockNetwork = useCallback((nodeId: string) => {
    setLockedNetworkIds(prev => {
      const next = new Set(prev)
      const isNowLocked = !next.has(nodeId)
      if (isNowLocked) {
        next.add(nodeId)
      } else {
        next.delete(nodeId)
      }
      try {
        localStorage.setItem('fondax_locked_networks', JSON.stringify(Array.from(next)))
      } catch {}

      // Update node draggable property in React Flow state immediately
      setNodes(nds => nds.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            draggable: !isNowLocked,
            data: { ...n.data, isLocked: isNowLocked }
          }
        }
        return n
      }))

      showToast(isNowLocked ? '🔒 Réseau verrouillé (position fixe sur le plan)' : '🔓 Réseau déverrouillé (déplaçable)')
      return next
    })
  }, [setNodes])

  // Open add equipment modal pre-filled for a specific network
  const openAddEquipmentForNetwork = useCallback((net: Network) => {
    // Look for parent equipment (gateway, firewall, or switch)
    const targetEquip = equipments.find(e => e.ip === net.gateway) ||
      equipments.find(e => e.type === 'Switch' || e.type === 'Firewall')

    // Suggest IP prefix
    let suggestedIp = ''
    if (net.ip_range) {
      const parts = net.ip_range.split('.')
      if (parts.length >= 3) {
        suggestedIp = `${parts[0]}.${parts[1]}.${parts[2]}.`
      }
    }

    setNewEquip({
      name: '',
      type: 'PC',
      ip: suggestedIp,
      role: `Connecté sur le réseau ${net.ssid}`,
      autoConnectId: targetEquip?.id,
      connType: (net.ssid || '').toLowerCase().includes('wifi') ? 'wifi' : 'ethernet'
    })
    setIsAddEquipModalOpen(true)
    showToast(`➕ Préparation de l'ajout d'un équipement sur "${net.ssid}"`)
  }, [equipments])

  // Delete zone callback
  const handleDeleteZone = useCallback((zoneId: string, zoneLabel?: string) => {
    const msg = zoneLabel 
      ? `Voulez-vous supprimer la zone "${zoneLabel}" ? (Les équipements à l'intérieur ne seront pas supprimés)`
      : 'Voulez-vous supprimer cette zone ?'
    if (!window.confirm(msg)) return
    setNodes(nds => nds.filter(n => n.id !== zoneId))
  }, [setNodes])

  useEffect(() => {
    setMounted(true)
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    
    const [equipRes, connRes, netRes, lanRes] = await Promise.all([
      supabase.from('network_equipment').select('*'),
      supabase.from('network_connections').select('*'),
      supabase.from('networks').select('*').order('created_at', { ascending: false }),
      supabase.from('lan_devices').select('*').order('created_at', { ascending: false })
    ])
    
    const equipData: NetworkEquipment[] = equipRes.data || []
    const connData: NetworkConnection[] = connRes.data || []
    const netData: Network[] = netRes.data || []
    const lanData: LanDevice[] = lanRes.data || []

    setEquipments(equipData)
    setNetworks(netData)
    setLanDevices(lanData)

    // Build clean non-overlapping topology with locked network states
    const { nodes: initialNodes, edges: initialEdges } = computeOptimalLayout(
      equipData, 
      netData, 
      connData, 
      showNetworksOnMap,
      lockedNetworkIds
    )

    setNodes(initialNodes)
    setEdges(initialEdges)
    setLoading(false)

    setTimeout(() => {
      fitView({ duration: 500, padding: 0.15 })
    }, 200)
  }

  // Auto-Layout Algorithm (Triggered by button)
  const handleAutoLayout = async () => {
    if (equipments.length === 0) return

    const { nodes: newNodes, edges: newEdges } = computeOptimalLayout(
      equipments,
      networks,
      edges.filter(e => !e.data?.isNetworkEdge).map(e => ({
        id: e.id,
        source_id: e.source,
        target_id: e.target,
        label: e.label ? String(e.label).replace(/\s*\([^)]*\)/g, '') : null,
        notes: e.data?.notes ? String(e.data.notes) : null,
        created_at: ''
      })),
      showNetworksOnMap,
      lockedNetworkIds
    )

    setNodes(newNodes)
    setEdges(newEdges)

    // Persist new positions to Supabase
    const updatePromises = newNodes
      .filter(n => n.type === 'equipment')
      .map(n => 
        supabase.from('network_equipment').update({ 
          position_x: Math.round(n.position.x), 
          position_y: Math.round(n.position.y) 
        }).eq('id', n.id)
      )

    await Promise.all(updatePromises)

    showToast('✨ Topologie réorganisée avec succès : vue claire et aérée !')
    setTimeout(() => {
      fitView({ duration: 500, padding: 0.15 })
    }, 150)
  }

  // Toggle network isolation
  const toggleNetworkIsolation = (networkId: string) => {
    if (isolatedNetworkId === networkId) {
      setIsolatedNetworkId(null)
    } else {
      setIsolatedNetworkId(networkId)
    }
  }

  const activeIsolatedNetwork = useMemo(() => {
    return networks.find(n => n.id === isolatedNetworkId) || null
  }, [networks, isolatedNetworkId])

  // Compute node highlighting based on search term and isolation
  useEffect(() => {
    const q = searchTerm.trim().toLowerCase()

    setNodes(nds => nds.map(n => {
      if (n.type === 'zone') return n

      let isMatch = true
      let isDim = false

      if (q) {
        const name = ((n.data.name as string) || (n.data.ssid as string) || '').toLowerCase()
        const ip = ((n.data.ip as string) || (n.data.ip_range as string) || '').toLowerCase()
        const role = ((n.data.role as string) || (n.data.location as string) || '').toLowerCase()
        const matchesQuery = name.includes(q) || ip.includes(q) || role.includes(q)
        if (!matchesQuery) {
          isMatch = false
          isDim = true
        }
      }

      if (activeIsolatedNetwork && !isDim) {
        const netSsid = activeIsolatedNetwork.ssid?.toLowerCase() || ''
        const netRange = activeIsolatedNetwork.ip_range || ''
        const subnetPrefix = netRange.split('.').slice(0, 3).join('.')

        const eqIp = (n.data.ip as string) || ''
        const eqName = ((n.data.name as string) || '').toLowerCase()
        const eqRole = ((n.data.role as string) || '').toLowerCase()

        const matchesIp = subnetPrefix && eqIp.startsWith(subnetPrefix)
        const matchesName = netSsid && (eqName.includes(netSsid) || eqRole.includes(netSsid))
        const isRelated = matchesIp || matchesName || n.id === `net-${activeIsolatedNetwork.id}`

        if (!isRelated) {
          isMatch = false
          isDim = true
        }
      }

      return {
        ...n,
        data: {
          ...n.data,
          isHighlighted: isMatch && (!!q || !!activeIsolatedNetwork),
          isDimmed: isDim
        }
      }
    }))
  }, [searchTerm, activeIsolatedNetwork, setNodes])

  // Filtered LAN devices
  const displayedLanDevices = useMemo(() => {
    if (!activeIsolatedNetwork) return lanDevices
    const subnetPrefix = activeIsolatedNetwork.ip_range?.split('.').slice(0, 3).join('.') || ''
    return lanDevices.filter(dev => {
      if (dev.network_id === activeIsolatedNetwork.id) return true
      if (subnetPrefix && dev.ip.startsWith(subnetPrefix)) return true
      return false
    })
  }, [lanDevices, activeIsolatedNetwork])

  // Edge click -> edit dialog with direction and flow status
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    if (edge.data?.isNetworkEdge) return
    setSelectedEdge(edge)
    const meta = parseEdgeNotes(edge.data?.notes, edge.label)
    
    // Clean label (remove suffix indicators)
    const rawLabel = edge.data?.label ? String(edge.data.label) : (edge.label ? String(edge.label) : '')
    const cleanLabel = rawLabel.replace(/\s*\([^)]*\)/g, '').trim()
    
    setEdgeLabelInput(cleanLabel)
    setEdgeDescInput(meta.description)
    setEdgeTypeInput(meta.type)
    setEdgeFlowStatusInput(meta.flowStatus)
    setEdgeDirectionInput(meta.direction)
    setIsEdgeModalOpen(true)
  }, [])

  // Update edge label, description, direction, flow status
  const handleUpdateEdge = async () => {
    if (!selectedEdge) return
    const updatedLabel = edgeLabelInput.trim() || undefined
    const meta: EdgeMetadata = {
      type: edgeTypeInput,
      flowStatus: edgeFlowStatusInput,
      direction: edgeDirectionInput,
      description: edgeDescInput.trim()
    }
    const storedNotes = formatEdgeNotes(meta)
    
    await supabase.from('network_connections').update({
      label: updatedLabel || null,
      notes: storedNotes || null
    }).eq('id', selectedEdge.id)

    const visual = buildEdgeVisualAndMarkers(meta)

    let displayLabel = updatedLabel
    if (meta.flowStatus === 'blocked') {
      displayLabel = `${updatedLabel || 'Liaison'} (⛔ Bloqué)`
    } else if (meta.direction === 'none') {
      displayLabel = `${updatedLabel || 'Liaison'} (✕ Coupé)`
    } else if (meta.direction === 'forward') {
      displayLabel = `${updatedLabel || 'Liaison'} (➔)`
    } else if (meta.direction === 'reverse') {
      displayLabel = `${updatedLabel || 'Liaison'} (⬅)`
    }

    setEdges(eds => eds.map(e => {
      if (e.id === selectedEdge.id) {
        return {
          ...e,
          label: displayLabel,
          style: visual.style,
          animated: visual.animated,
          markerStart: visual.markerStart,
          markerEnd: visual.markerEnd,
          data: { 
            ...e.data, 
            label: updatedLabel,
            notes: storedNotes, 
            connection_type: meta.type,
            flowStatus: meta.flowStatus,
            direction: meta.direction,
            description: meta.description
          }
        }
      }
      return e
    }))
    setIsEdgeModalOpen(false)
    showToast('Liaison mise à jour (flux & sens enregistrés) !')
  }

  // Delete edge
  const handleDeleteEdge = async () => {
    if (!selectedEdge) return
    if (!window.confirm('Voulez-vous supprimer cette connexion réseau ?')) return

    await supabase.from('network_connections').delete().eq('id', selectedEdge.id)
    setEdges(eds => eds.filter(e => e.id !== selectedEdge.id))
    setIsEdgeModalOpen(false)
    showToast('Liaison supprimée !')
  }

  // Node drag stop -> persist position
  const onNodeDragStop = useCallback(async (event: any, node: Node) => {
    if (node.type !== 'equipment') return
    await supabase.from('network_equipment').update({
      position_x: Math.round(node.position.x),
      position_y: Math.round(node.position.y)
    }).eq('id', node.id)
  }, [supabase])

  // Node click -> open equipment panel
  const onNodeClick = (event: any, node: Node) => {
    if (node.type === 'zone') return
    if (node.type === 'network') {
      const netId = node.id.replace('net-', '')
      toggleNetworkIsolation(netId)
      return
    }
    const foundEq = equipments.find(e => e.id === node.id)
    setSelectedNodeData(foundEq || (node.data as unknown as NetworkEquipment))
    setIsPanelOpen(true)
  }

  // Add edge on manual handle connect
  const onConnect = useCallback(async (params: Connection) => {
    if (!params.source || !params.target || params.source === params.target) return
    if (params.source.startsWith('net-') || params.target.startsWith('net-')) return

    const tempId = `conn-${Date.now()}`
    const defaultMeta: EdgeMetadata = {
      type: 'ethernet',
      flowStatus: 'active',
      direction: 'both',
      description: ''
    }
    const visual = buildEdgeVisualAndMarkers(defaultMeta)
    const defaultLabel = 'Liaison Ethernet'

    const newEdge: Edge = { 
      ...params, 
      id: tempId, 
      type: 'smoothstep',
      animated: visual.animated, 
      style: visual.style,
      markerStart: visual.markerStart,
      markerEnd: visual.markerEnd,
      label: defaultLabel,
      data: {
        source_id: params.source,
        target_id: params.target,
        label: defaultLabel,
        notes: '',
        connection_type: defaultMeta.type,
        flowStatus: defaultMeta.flowStatus,
        direction: defaultMeta.direction,
        description: ''
      }
    }
    setEdges((eds) => addEdge(newEdge, eds))
    
    const { data } = await supabase.from('network_connections').insert({
      source_id: params.source,
      target_id: params.target,
      label: defaultLabel,
      notes: null
    }).select().single()

    if (data) {
      setEdges(eds => eds.map(e => e.id === tempId ? { 
        ...e, 
        id: data.id, 
        label: data.label,
        data: { ...e.data, id: data.id } 
      } : e))
      showToast('Nouvelle liaison créée ! Cliquez dessus pour configurer le sens et le flux.')
    }
  }, [supabase, setEdges])

  // Update equipment
  const handleUpdateEquipment = async () => {
    if (!selectedNodeData) return
    const { id, created_at, ...updateData } = selectedNodeData
    
    await supabase.from('network_equipment').update(updateData).eq('id', id)
    
    setEquipments(prev => prev.map(e => e.id === id ? { ...selectedNodeData } : e))
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...selectedNodeData } as Record<string, unknown> } : n))
    setIsPanelOpen(false)
    showToast(`Équipement "${selectedNodeData.name}" mis à jour !`)
  }

  // Delete equipment
  const handleDeleteEquipment = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet équipement et toutes ses connexions ?')) return
    await supabase.from('network_equipment').delete().eq('id', id)
    setEquipments(prev => prev.filter(e => e.id !== id))
    setNodes(nds => nds.filter(n => n.id !== id))
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id))
    setIsPanelOpen(false)
    showToast('Équipement supprimé !')
  }

  // Add equipment (with auto-placement & auto-connection)
  const handleAddEquipment = async () => {
    if (!newEquip.name) return

    let posX = 520
    let posY = 760

    if (newEquip.autoConnectId) {
      const parentNode = nodes.find(n => n.id === newEquip.autoConnectId)
      if (parentNode) {
        const siblingCount = edges.filter(e => e.source === newEquip.autoConnectId || e.target === newEquip.autoConnectId).length
        const offset = (siblingCount % 2 === 0 ? 1 : -1) * (Math.floor(siblingCount / 2) + 1) * 260
        posX = parentNode.position.x + offset
        posY = parentNode.position.y + 170
      }
    } else {
      const endpointNodes = nodes.filter(n => n.type === 'equipment' && n.position.y >= 760)
      const col = endpointNodes.length % 3
      const row = Math.floor(endpointNodes.length / 3)
      posX = 140 + col * 250
      posY = 760 + row * 170
    }

    const { data, error } = await supabase.from('network_equipment').insert({
      name: newEquip.name,
      type: newEquip.type || 'Switch',
      location: newEquip.location || null,
      ip: newEquip.ip || null,
      role: newEquip.role || null,
      notes: newEquip.notes || null,
      position_x: Math.round(posX),
      position_y: Math.round(posY)
    }).select().single()

    if (!error && data) {
      setEquipments(prev => [...prev, data])

      const newNode: Node = {
        id: data.id,
        type: 'equipment',
        position: { x: data.position_x, y: data.position_y },
        data: { ...data } as Record<string, unknown>,
        zIndex: 10
      }
      setNodes(nds => [...nds, newNode])

      // Auto-connect edge if requested
      if (newEquip.autoConnectId) {
        const cType = (newEquip.connType || 'ethernet') as any
        const label = `Liaison ${cType === 'fibre' ? 'Fibre' : cType === 'wifi' ? 'Wi-Fi' : 'RJ45'}`
        const meta: EdgeMetadata = {
          type: cType,
          flowStatus: 'active',
          direction: 'both',
          description: ''
        }
        const notes = formatEdgeNotes(meta)

        const { data: conn } = await supabase.from('network_connections').insert({
          source_id: newEquip.autoConnectId,
          target_id: data.id,
          label,
          notes: notes || null
        }).select().single()

        if (conn) {
          const visual = buildEdgeVisualAndMarkers(meta)
          setEdges(eds => [...eds, {
            id: conn.id,
            source: conn.source_id,
            target: conn.target_id,
            label: conn.label || undefined,
            type: 'smoothstep',
            animated: visual.animated,
            style: visual.style,
            markerStart: visual.markerStart,
            markerEnd: visual.markerEnd,
            data: { ...conn, connection_type: cType, flowStatus: 'active', direction: 'both' }
          }])
        }
      }

      setIsAddEquipModalOpen(false)
      setNewEquip({ type: 'Switch', connType: 'ethernet' })
      showToast(`Équipement "${data.name}" ajouté et placé sur le plan réseau !`)
    }
  }

  // Quick direct link creation from inspector
  const handleCreateQuickLink = async () => {
    if (!selectedNodeData || !quickLinkTargetId) return

    const defaultMeta: EdgeMetadata = {
      type: 'ethernet',
      flowStatus: 'active',
      direction: 'both',
      description: ''
    }
    const visual = buildEdgeVisualAndMarkers(defaultMeta)
    const label = 'Liaison Ethernet'

    const { data: conn } = await supabase.from('network_connections').insert({
      source_id: selectedNodeData.id,
      target_id: quickLinkTargetId,
      label,
      notes: null
    }).select().single()

    if (conn) {
      setEdges(eds => [...eds, {
        id: conn.id,
        source: conn.source_id,
        target: conn.target_id,
        label,
        type: 'smoothstep',
        animated: visual.animated,
        style: visual.style,
        markerStart: visual.markerStart,
        markerEnd: visual.markerEnd,
        data: { ...conn, connection_type: 'ethernet', flowStatus: 'active', direction: 'both' }
      }])
      setQuickLinkTargetId('')
      showToast('Liaison créée avec succès !')
    }
  }

  // Add Zone
  const handleAddZone = () => {
    if (!newZone.label) return
    const zoneId = `zone-${Date.now()}`
    const zoneNode: Node = {
      id: zoneId,
      type: 'zone',
      position: { x: 100, y: 100 },
      style: { width: Number(newZone.width) || 350, height: Number(newZone.height) || 250 },
      zIndex: -1,
      data: {
        label: newZone.label,
        description: newZone.description,
        color: newZone.color,
        onDelete: handleDeleteZone
      }
    }
    setNodes(nds => [zoneNode, ...nds])
    setIsAddZoneModalOpen(false)
    setNewZone({ label: '', description: '', color: 'blue', width: 350, height: 250 })
    showToast(`Zone "${newZone.label}" créée !`)
  }

  // Add Network (automatically represented on topology)
  const handleAddNetwork = async () => {
    if (!networkForm.ssid) return
    const { data, error } = await supabase.from('networks').insert([{
      ssid: networkForm.ssid,
      ip_range: networkForm.ip_range || null,
      gateway: networkForm.gateway || null,
      manager: networkForm.manager || null,
      role_status: networkForm.role_status || null,
      notes: networkForm.notes || null,
      is_active: networkForm.is_active ?? true
    }]).select().single()

    if (!error && data) {
      setNetworks(prev => [data, ...prev])

      // Auto add network bubble on topology if checked
      if (networkForm.addToTopology !== false) {
        const netNodeId = `net-${data.id}`
        const targetEquip = networkForm.connectToEquipId 
          ? equipments.find(e => e.id === networkForm.connectToEquipId)
          : equipments.find(e => e.ip === data.gateway) ||
            equipments.find(e => e.type === 'Firewall' || e.name.toLowerCase().includes('sophos'))

        const posX = targetEquip ? (targetEquip.position_x || 520) + 380 : 1240
        const posY = targetEquip ? (targetEquip.position_y || 230) : 60 + networks.length * 170

        const isLocked = lockedNetworkIds.has(netNodeId)
        const netNode: Node = {
          id: netNodeId,
          type: 'network',
          position: { x: posX, y: posY },
          draggable: !isLocked,
          data: { ...data, isLocked, isHighlighted: false, isDimmed: false } as Record<string, unknown>,
          zIndex: 8
        }
        setNodes(nds => [...nds, netNode])

        if (targetEquip) {
          const netEdge: Edge = {
            id: `edge-net-${data.id}`,
            source: targetEquip.id,
            target: netNodeId,
            label: data.ip_range ? `${data.ip_range}` : undefined,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#a855f7', strokeWidth: 2, strokeDasharray: '4 4' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
            data: { isNetworkEdge: true }
          }
          setEdges(eds => [...eds, netEdge])
        }
      }

      setIsAddNetworkModalOpen(false)
      setNetworkForm({ ssid: '', ip_range: '', gateway: '', manager: '', role_status: '', notes: '', is_active: true, addToTopology: true })
      showToast(`Réseau "${data.ssid}" ajouté et placé sur la topologie !`)
    }
  }

  // Edit Network
  const openEditNetwork = (net: Network) => {
    setEditingNetworkId(net.id)
    setNetworkForm({
      ssid: net.ssid,
      ip_range: net.ip_range,
      gateway: net.gateway,
      manager: net.manager,
      role_status: net.role_status,
      notes: net.notes,
      is_active: net.is_active
    })
    setIsEditNetworkModalOpen(true)
  }

  const handleUpdateNetwork = async () => {
    if (!editingNetworkId || !networkForm.ssid) return
    const { data, error } = await supabase.from('networks').update({
      ssid: networkForm.ssid,
      ip_range: networkForm.ip_range || null,
      gateway: networkForm.gateway || null,
      manager: networkForm.manager || null,
      role_status: networkForm.role_status || null,
      notes: networkForm.notes || null,
      is_active: networkForm.is_active ?? true
    }).eq('id', editingNetworkId).select().single()

    if (!error && data) {
      setNetworks(prev => prev.map(n => n.id === editingNetworkId ? data : n))
      setNodes(nds => nds.map(n => {
        if (n.id === `net-${editingNetworkId}`) {
          return { ...n, data: { ...n.data, ...data } }
        }
        return n
      }))
      setIsEditNetworkModalOpen(false)
      showToast(`Réseau "${data.ssid}" mis à jour !`)
    }
  }

  // Delete Network
  const handleDeleteNetwork = async (id: string, ssid?: string | null) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer le réseau "${ssid || 'sélectionné'}" ?`)) return
    await supabase.from('networks').delete().eq('id', id)
    setNetworks(prev => prev.filter(n => n.id !== id))
    setNodes(nds => nds.filter(n => n.id !== `net-${id}`))
    setEdges(eds => eds.filter(e => e.id !== `edge-net-${id}`))
    showToast(`Réseau "${ssid || ''}" supprimé !`)
  }

  // Add LAN Device
  const handleAddLanDevice = async () => {
    if (!lanForm.ip) return
    const { data, error } = await supabase.from('lan_devices').insert([{
      hostname: lanForm.hostname || null,
      ip: lanForm.ip,
      role: lanForm.role || null,
      network_id: lanForm.network_id || null
    }]).select().single()

    if (!error && data) {
      setLanDevices(prev => [data, ...prev])

      if (lanForm.addToTopology) {
        await placeLanDeviceOnTopology(data)
      }

      setIsAddLanModalOpen(false)
      setLanForm({ hostname: '', ip: '', role: '', network_id: null, addToTopology: false })
      showToast(`Appareil LAN "${data.hostname || data.ip}" ajouté !`)
    }
  }

  // Place LAN Device on Topology as an equipment node
  const placeLanDeviceOnTopology = async (dev: LanDevice) => {
    const defaultType = dev.hostname?.toLowerCase().includes('imprimante') || dev.role?.toLowerCase().includes('imprimante')
      ? 'Imprimante'
      : dev.hostname?.toLowerCase().includes('nas') || dev.role?.toLowerCase().includes('nas')
      ? 'NAS'
      : dev.role?.toLowerCase().includes('iot') || dev.hostname?.toLowerCase().includes('espressif')
      ? 'Autre'
      : 'PC'

    const endpointNodes = nodes.filter(n => n.type === 'equipment' && n.position.y >= 760)
    const col = endpointNodes.length % 3
    const row = Math.floor(endpointNodes.length / 3)
    const posX = 140 + col * 250
    const posY = 760 + row * 170

    const { data, error } = await supabase.from('network_equipment').insert({
      name: dev.hostname || `Appareil ${dev.ip}`,
      type: defaultType,
      ip: dev.ip,
      role: dev.role || 'Appareil LAN',
      location: 'Atelier / Bureaux',
      position_x: Math.round(posX),
      position_y: Math.round(posY)
    }).select().single()

    if (!error && data) {
      setEquipments(prev => [...prev, data])

      const newNode: Node = {
        id: data.id,
        type: 'equipment',
        position: { x: data.position_x, y: data.position_y },
        data: { ...data } as Record<string, unknown>,
        zIndex: 10
      }
      setNodes(nds => [...nds, newNode])

      // Auto-connect to main switch if present
      const mainSwitch = equipments.find(e => e.type === 'Switch' || e.name.toLowerCase().includes('switch'))
      if (mainSwitch) {
        const { data: conn } = await supabase.from('network_connections').insert({
          source_id: mainSwitch.id,
          target_id: data.id,
          label: 'Liaison RJ45'
        }).select().single()

        if (conn) {
          const defaultMeta: EdgeMetadata = { type: 'ethernet', flowStatus: 'active', direction: 'both', description: '' }
          const visual = buildEdgeVisualAndMarkers(defaultMeta)
          setEdges(eds => [...eds, {
            id: conn.id,
            source: conn.source_id,
            target: conn.target_id,
            label: conn.label || undefined,
            type: 'smoothstep',
            animated: visual.animated,
            style: visual.style,
            markerStart: visual.markerStart,
            markerEnd: visual.markerEnd,
            data: { ...conn, connection_type: 'ethernet', flowStatus: 'active', direction: 'both' }
          }])
        }
      }

      showToast(`"${data.name}" a été placé sur le plan réseau et raccordé !`)
    }
  }

  // Edit LAN Device
  const openEditLanDevice = (dev: LanDevice) => {
    setEditingLanId(dev.id)
    setLanForm({
      hostname: dev.hostname || '',
      ip: dev.ip,
      role: dev.role || '',
      network_id: dev.network_id || null
    })
    setIsEditLanModalOpen(true)
  }

  const handleUpdateLanDevice = async () => {
    if (!editingLanId || !lanForm.ip) return
    const { data, error } = await supabase.from('lan_devices').update({
      hostname: lanForm.hostname || null,
      ip: lanForm.ip,
      role: lanForm.role || null,
      network_id: lanForm.network_id || null
    }).eq('id', editingLanId).select().single()

    if (!error && data) {
      setLanDevices(prev => prev.map(d => d.id === editingLanId ? data : d))
      setIsEditLanModalOpen(false)
      showToast(`Appareil "${data.hostname || data.ip}" mis à jour !`)
    }
  }

  // Delete LAN Device
  const handleDeleteLanDevice = async (id: string, name?: string | null) => {
    if (!window.confirm(`Voulez-vous supprimer cet appareil LAN (${name || id}) ?`)) return
    await supabase.from('lan_devices').delete().eq('id', id)
    setLanDevices(prev => prev.filter(d => d.id !== id))
    showToast('Appareil LAN supprimé !')
  }

  // Selected edge source and target names for the edge modal
  const selectedEdgeSource = useMemo(() => {
    if (!selectedEdge) return null
    return equipments.find(e => e.id === selectedEdge.source) || null
  }, [selectedEdge, equipments])

  const selectedEdgeTarget = useMemo(() => {
    if (!selectedEdge) return null
    return equipments.find(e => e.id === selectedEdge.target) || null
  }, [selectedEdge, equipments])

  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-slate-500 font-medium">Chargement du plan réseau interactif...</p>
      </div>
    )
  }

  return (
    <NetworkCanvasContext.Provider value={{ lockedNetworkIds, toggleLockNetwork, openAddEquipmentForNetwork }}>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
              <NetworkIcon className="w-8 h-8 text-blue-600" />
              Plan Réseau Interactif
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Topologie en temps réel : cadres de réseaux verrouillables, liaisons orientées et flux de données en direct.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsAddZoneModalOpen(true)} className="gap-2 shadow-xs cursor-pointer">
              <Layers className="w-4 h-4 text-blue-600" />
              Créer une zone
            </Button>
            <Button onClick={() => setIsAddEquipModalOpen(true)} className="gap-2 shadow-xs cursor-pointer bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Ajouter un équipement
            </Button>
          </div>
        </div>

        {/* Toast Notification Banner */}
        {notificationMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm p-3.5 rounded-xl flex items-center gap-2.5 shadow-sm animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{notificationMsg}</span>
          </div>
        )}

        {/* Network Isolation Bar */}
        <div className="rounded-2xl border bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Filter className="w-4 h-4 text-blue-600" />
              Filtrer / Isoler un sous-réseau :
            </div>
            {activeIsolatedNetwork && (
              <button
                onClick={() => setIsolatedNetworkId(null)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Réinitialiser la vue (Afficher tout)
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsolatedNetworkId(null)}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer",
                !isolatedNetworkId 
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs" 
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
              )}
            >
              Vue Globale (Tout)
            </button>
            {networks.map(net => {
              const isSelected = isolatedNetworkId === net.id
              return (
                <button
                  key={net.id}
                  onClick={() => toggleNetworkIsolation(net.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5 cursor-pointer",
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
                  )}
                >
                  <Wifi className="w-3.5 h-3.5 opacity-75" />
                  <span className="font-semibold">{net.ssid}</span>
                  <span className={cn("text-[10px] px-1.5 py-0.2 rounded font-mono", isSelected ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600")}>
                    {net.ip_range}
                  </span>
                </button>
              )
            })}
          </div>

          {activeIsolatedNetwork && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  <strong>Mode isolation actif :</strong> Seuls les flux et équipements relatifs à <strong>{activeIsolatedNetwork.ssid}</strong> ({activeIsolatedNetwork.ip_range}) sont mis en lumière.
                </span>
              </div>
              <Badge variant="outline" className="bg-white border-blue-300 text-blue-800 font-mono">
                GW : {activeIsolatedNetwork.gateway}
              </Badge>
            </div>
          )}
        </div>

        {/* React Flow Interactive Canvas */}
        <div className="h-[720px] border-2 border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-md relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
            elevateNodesOnSelect={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#cbd5e1" gap={18} size={1.2} />
            <Controls className="!bg-white !border !border-slate-200 !shadow-sm !rounded-xl" />
            <MiniMap 
              className="!bg-white/95 !border !border-slate-300 !rounded-xl !shadow-sm" 
              nodeColor={(n) => {
                if (n.type === 'zone') return '#e2e8f0'
                if (n.type === 'network') return '#c084fc'
                return '#3b82f6'
              }}
            />

            {/* Canvas Top Toolbar */}
            <Panel position="top-left" className="flex flex-wrap items-center gap-2 bg-white/95 backdrop-blur-md p-2 rounded-xl border border-slate-200 shadow-sm">
              {/* Search Input */}
              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Rechercher équipement, IP..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Auto-Layout button */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleAutoLayout}
                className="h-8 gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50/50 hover:bg-purple-100 border-purple-200 shadow-2xs cursor-pointer"
                title="Organiser automatiquement tous les équipements de façon logique et hiérarchique"
              >
                <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                <span>🪄 Réorganiser</span>
              </Button>

              {/* Fit View button */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => fitView({ duration: 400, padding: 0.15 })}
                className="h-8 gap-1.5 text-xs text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
                title="Recentrer et cadrer la topologie"
              >
                <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Recentrer</span>
              </Button>

              {/* Toggle Networks button */}
              <button
                type="button"
                onClick={() => setShowNetworksOnMap(prev => !prev)}
                className={cn(
                  "h-8 flex items-center gap-1.5 px-2.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer",
                  showNetworksOnMap ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                )}
                title="Afficher ou masquer les cadres de sous-réseaux"
              >
                {showNetworksOnMap ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>Sous-réseaux</span>
              </button>
            </Panel>

            {/* Helper instructions panel */}
            <Panel position="top-right" className="bg-white/95 backdrop-blur-md p-3 rounded-xl border border-slate-200 shadow-xs text-[11px] text-slate-600 space-y-1.5">
              <div className="font-bold text-slate-800 border-b pb-1 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Guide rapide :
              </div>
              <div>🔒 <strong>Bouton Cadenas</strong> : Bloquer un cadre réseau (fixe)</div>
              <div>➕ <strong>Bouton "+" cadre</strong> : Ajouter un équipement au réseau</div>
              <div>🔗 <strong>Clic sur liaison</strong> : Définir sens & flux (actif/bloqué)</div>
              <div>⚡ <strong>Tirer poignée</strong> : Relier 2 équipements</div>
            </Panel>
          </ReactFlow>

          {/* Side Panel for Equipment Details & Fast Connection creation */}
          {isPanelOpen && selectedNodeData && (
            <div className="absolute right-0 top-0 bottom-0 w-96 bg-white border-l p-6 flex flex-col justify-between shadow-2xl z-40 overflow-y-auto animate-in slide-in-from-right duration-200">
              <div className="space-y-5">
                <div className="flex justify-between items-center border-b pb-4">
                  <div className="flex items-center gap-2">
                    {getIconForType(selectedNodeData.type)}
                    <h3 className="font-bold text-lg text-slate-900">Équipement</h3>
                  </div>
                  <button 
                    onClick={() => setIsPanelOpen(false)} 
                    className="text-slate-400 hover:text-slate-600 rounded-full p-1 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Nom</Label>
                    <Input 
                      value={selectedNodeData.name} 
                      onChange={e => setSelectedNodeData({...selectedNodeData, name: e.target.value})} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Type</Label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                        value={selectedNodeData.type || 'Autre'} 
                        onChange={e => setSelectedNodeData({...selectedNodeData, type: e.target.value})}
                      >
                        {equipmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">IP</Label>
                      <Input 
                        value={selectedNodeData.ip || ''} 
                        onChange={e => setSelectedNodeData({...selectedNodeData, ip: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Emplacement</Label>
                    <Input 
                      value={selectedNodeData.location || ''} 
                      onChange={e => setSelectedNodeData({...selectedNodeData, location: e.target.value})} 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Rôle</Label>
                    <Input 
                      value={selectedNodeData.role || ''} 
                      onChange={e => setSelectedNodeData({...selectedNodeData, role: e.target.value})} 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Notes</Label>
                    <Textarea 
                      value={selectedNodeData.notes || ''} 
                      onChange={e => setSelectedNodeData({...selectedNodeData, notes: e.target.value})} 
                      rows={3}
                    />
                  </div>

                  {/* Fast direct link creation from inspector */}
                  <div className="pt-3 border-t space-y-2">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Cable className="w-3.5 h-3.5 text-blue-600" />
                      Raccorder rapidement à un équipement :
                    </Label>
                    <div className="flex gap-2">
                      <select
                        className="flex-1 h-8 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                        value={quickLinkTargetId}
                        onChange={e => setQuickLinkTargetId(e.target.value)}
                      >
                        <option value="">Sélectionner un équipement...</option>
                        {equipments
                          .filter(e => e.id !== selectedNodeData.id)
                          .map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                          ))
                        }
                      </select>
                      <Button 
                        size="sm" 
                        className="h-8 text-xs shrink-0 cursor-pointer" 
                        disabled={!quickLinkTargetId} 
                        onClick={handleCreateQuickLink}
                      >
                        Relier
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t mt-6 flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleDeleteEquipment(selectedNodeData.id)}
                  className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" /> Supprimer
                </Button>
                <Button onClick={handleUpdateEquipment} className="flex-1 cursor-pointer">
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Networks and LAN Devices Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Identified Networks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Wifi className="w-5 h-5 text-purple-600" />
                  Réseaux & Cadres identifiés
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">Représentés par des cadres translucides verrouillables sur le plan</p>
              </div>
              <Button 
                size="sm" 
                onClick={() => {
                  setNetworkForm({ ssid: '', ip_range: '', gateway: '', manager: '', role_status: '', notes: '', is_active: true, addToTopology: true })
                  setIsAddNetworkModalOpen(true)
                }} 
                className="gap-1 text-xs cursor-pointer bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                Nouveau réseau
              </Button>
            </CardHeader>
            <CardContent>
              <div className="divide-y border rounded-xl overflow-hidden max-h-[460px] overflow-y-auto">
                {networks.map(net => {
                  const isSelected = isolatedNetworkId === net.id
                  const isLocked = lockedNetworkIds.has(`net-${net.id}`)
                  return (
                    <div 
                      key={net.id} 
                      onClick={() => toggleNetworkIsolation(net.id)}
                      className={cn(
                        "p-4 cursor-pointer transition-colors flex items-start justify-between gap-4",
                        isSelected ? "bg-blue-50/80 border-l-4 border-l-blue-600" : "hover:bg-slate-50"
                      )}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">{net.ssid}</span>
                          {isLocked && (
                            <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Fixe
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-[10px] bg-blue-600 text-white font-semibold px-2 py-0.5 rounded-full">
                              Isolé
                            </span>
                          )}
                          <Badge variant="outline" className="text-[10px] font-mono border-purple-200 text-purple-800 bg-purple-50">
                            {net.ip_range}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 flex gap-3 font-mono">
                          <span>Passerelle : {net.gateway || 'Non définie'}</span>
                          <span>Gestionnaire : {net.manager || 'N/A'}</span>
                        </div>
                        {net.role_status && <p className="text-xs text-slate-600 line-clamp-1">{net.role_status}</p>}
                        {net.notes && <p className="text-xs text-amber-700 font-medium line-clamp-1">{net.notes}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Modifier ce réseau"
                          onClick={() => openEditNetwork(net)}
                          className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Supprimer ce réseau"
                          onClick={() => handleDeleteNetwork(net.id, net.ssid)}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* LAN Devices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-blue-600" />
                  Appareils LAN identifiés
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  {activeIsolatedNetwork ? `Filtré sur ${activeIsolatedNetwork.ssid}` : 'Inventaire des équipements sur le réseau'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{displayedLanDevices.length} appareil(s)</Badge>
                <Button 
                  size="sm" 
                  onClick={() => {
                    setLanForm({ hostname: '', ip: '', role: '', network_id: isolatedNetworkId || null, addToTopology: false })
                    setIsAddLanModalOpen(true)
                  }} 
                  className="gap-1 text-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="divide-y border rounded-xl overflow-hidden max-h-[460px] overflow-y-auto">
                {displayedLanDevices.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">
                    Aucun appareil LAN trouvé pour ce réseau.
                  </div>
                ) : (
                  displayedLanDevices.map(dev => {
                    const isAlreadyOnMap = equipments.some(e => e.ip === dev.ip || (dev.hostname && e.name.toLowerCase() === dev.hostname.toLowerCase()))
                    return (
                      <div key={dev.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 text-sm gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 truncate">{dev.hostname || 'Sans nom'}</div>
                          <div className="text-xs text-slate-500 truncate">{dev.role || 'Aucun rôle spécifié'}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="font-mono text-xs">{dev.ip}</Badge>
                          {isAlreadyOnMap ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              ✓ Sur la carte
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => placeLanDeviceOnTopology(dev)}
                              className="h-7 text-[11px] gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
                              title="Ajouter cet appareil sur le plan réseau interactif"
                            >
                              <Plus className="w-3 h-3" /> Placer sur le plan
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Modifier cet appareil"
                            onClick={() => openEditLanDevice(dev)}
                            className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Supprimer cet appareil"
                            onClick={() => handleDeleteLanDevice(dev.id, dev.hostname)}
                            className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dialog: Edit Connection / Edge (Rich Direction, Flow Status, Description) */}
        <Dialog open={isEdgeModalOpen} onOpenChange={setIsEdgeModalOpen}>
          <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Cable className="w-5 h-5 text-blue-600" />
                Configuration de la liaison réseau
              </DialogTitle>
              {selectedEdgeSource && selectedEdgeTarget && (
                <div className="bg-slate-100/80 rounded-xl p-2.5 mt-2 text-xs flex items-center justify-between font-mono">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <span>{selectedEdgeSource.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({selectedEdgeSource.type})</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-600 font-bold">
                    {edgeDirectionInput === 'both' ? '⇄ Échange bidirectionnel' :
                     edgeDirectionInput === 'forward' ? '➔ Aller simple' :
                     edgeDirectionInput === 'reverse' ? '⬅ Retour simple' : '✕ Aucun échange'}
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <span>{selectedEdgeTarget.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">({selectedEdgeTarget.type})</span>
                  </div>
                </div>
              )}
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Libellé */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Nom / Libellé de la liaison</Label>
                <Input 
                  placeholder="ex: Fibre WAN SFR, Trunk Switch Baie, Câble Atelier..."
                  value={edgeLabelInput} 
                  onChange={e => setEdgeLabelInput(e.target.value)} 
                />
              </div>

              {/* Sens de circulation (Direction) */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
                  Sens de circulation des données :
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEdgeDirectionInput('both')}
                    className={cn(
                      "p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer",
                      edgeDirectionInput === 'both'
                        ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <ArrowLeftRight className="w-4 h-4 text-blue-600" /> Les deux sens
                      </span>
                      {edgeDirectionInput === 'both' && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <span className="text-[11px] text-slate-500">Bidirectionnel (aller-retour standard)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEdgeDirectionInput('forward')}
                    className={cn(
                      "p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer",
                      edgeDirectionInput === 'forward'
                        ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <ArrowRight className="w-4 h-4 text-blue-600" /> Sens unique ➔
                      </span>
                      {edgeDirectionInput === 'forward' && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <span className="text-[11px] text-slate-500">Unidirectionnel (Source vers Cible)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEdgeDirectionInput('reverse')}
                    className={cn(
                      "p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer",
                      edgeDirectionInput === 'reverse'
                        ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <ArrowLeft className="w-4 h-4 text-blue-600" /> Sens inverse ⬅
                      </span>
                      {edgeDirectionInput === 'reverse' && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                    <span className="text-[11px] text-slate-500">Unidirectionnel (Cible vers Source)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEdgeDirectionInput('none')}
                    className={cn(
                      "p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer",
                      edgeDirectionInput === 'none'
                        ? "bg-red-50 border-red-500 ring-2 ring-red-500/20 shadow-xs"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-red-900 flex items-center gap-1.5">
                        <Ban className="w-4 h-4 text-red-600" /> Aucun sens (✕)
                      </span>
                      {edgeDirectionInput === 'none' && <Check className="w-4 h-4 text-red-600" />}
                    </div>
                    <span className="text-[11px] text-slate-500">Liaison sans flux / désactivée</span>
                  </button>
                </div>
              </div>

              {/* État du flux (Les données passent-elles ?) */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  État du flux (Les données passent-elles ?) :
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEdgeFlowStatusInput('active')}
                    className={cn(
                      "p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer",
                      edgeFlowStatusInput === 'active'
                        ? "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        🟢 Oui — Données actives
                      </span>
                      {edgeFlowStatusInput === 'active' && <Check className="w-4 h-4 text-emerald-600" />}
                    </div>
                    <span className="text-[11px] text-emerald-800/80">Le trafic circule (animation active sur le schéma)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEdgeFlowStatusInput('blocked')}
                    className={cn(
                      "p-3 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer",
                      edgeFlowStatusInput === 'blocked'
                        ? "bg-red-50 border-red-500 ring-2 ring-red-500/20 shadow-xs"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-red-950 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        🔴 Non — Données bloquées
                      </span>
                      {edgeFlowStatusInput === 'blocked' && <Check className="w-4 h-4 text-red-600" />}
                    </div>
                    <span className="text-[11px] text-red-800/80">Incident, câble déconnecté ou port désactivé (rouge pointillé)</span>
                  </button>
                </div>
              </div>

              {/* Type de liaison physique */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Type de média physique</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                  value={edgeTypeInput}
                  onChange={e => setEdgeTypeInput(e.target.value as any)}
                >
                  <option value="ethernet">Câble Ethernet RJ45 (Cat6 / Cat6a)</option>
                  <option value="fibre">Fibre Optique (Monomode / Multimode)</option>
                  <option value="wifi">Liaison Sans Fil (Wi-Fi / Pont Mesh)</option>
                  <option value="vpn">Tunnel VPN / Chiffré</option>
                  <option value="inconnu">Autre / Non spécifié</option>
                </select>
              </div>

              {/* Description détaillée & notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700">Description détaillée & Informations</Label>
                <Textarea 
                  placeholder="ex: Câble blindé reliant le switch baie au switch atelier. Débit gigabit vérifié, pas de coupure constatée..."
                  value={edgeDescInput} 
                  onChange={e => setEdgeDescInput(e.target.value)} 
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="flex justify-between items-center sm:justify-between pt-2 border-t">
              <Button variant="outline" onClick={handleDeleteEdge} className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200 cursor-pointer">
                <Trash2 className="w-4 h-4 mr-2" /> Supprimer le lien
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEdgeModalOpen(false)}>Annuler</Button>
                <Button onClick={handleUpdateEdge} className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
                  Enregistrer la liaison
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Add Equipment (with Auto-Connect to parent) */}
        <Dialog open={isAddEquipModalOpen} onOpenChange={setIsAddEquipModalOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter un équipement réseau</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom de l'équipement <span className="text-red-500">*</span></Label>
                <Input 
                  placeholder="ex: Switch Atelier, Borne Wi-Fi, PC Maintenance..."
                  value={newEquip.name || ''} 
                  onChange={e => setNewEquip({...newEquip, name: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type d'équipement</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                    value={newEquip.type || ''} 
                    onChange={e => setNewEquip({...newEquip, type: e.target.value})}
                  >
                    {equipmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Adresse IP (optionnelle)</Label>
                  <Input 
                    placeholder="ex: 192.168.20.50"
                    value={newEquip.ip || ''} 
                    onChange={e => setNewEquip({...newEquip, ip: e.target.value})} 
                  />
                </div>
              </div>

              {/* Smart Auto-Connection to topology */}
              <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-3.5 space-y-3">
                <div className="font-semibold text-xs text-blue-950 flex items-center gap-1.5">
                  <Cable className="w-4 h-4 text-blue-600" />
                  Raccordement automatique sur la topologie
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-700">Connecter directement à :</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs"
                      value={newEquip.autoConnectId || ''}
                      onChange={e => setNewEquip({...newEquip, autoConnectId: e.target.value || undefined})}
                    >
                      <option value="">-- Aucun raccordement direct --</option>
                      {equipments.map(eq => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name} ({eq.type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-slate-700">Type de liaison :</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs"
                      value={newEquip.connType || 'ethernet'}
                      onChange={e => setNewEquip({...newEquip, connType: e.target.value})}
                    >
                      <option value="ethernet">Ethernet RJ45</option>
                      <option value="fibre">Fibre optique</option>
                      <option value="wifi">Wi-Fi / Mesh</option>
                      <option value="vpn">VPN</option>
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-blue-700">
                  💡 En sélectionnant un équipement parent, la liaison et le positionnement seront calculés automatiquement sans encombrer la carte !
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Emplacement</Label>
                  <Input 
                    placeholder="ex: Baie réseau, Atelier..."
                    value={newEquip.location || ''} 
                    onChange={e => setNewEquip({...newEquip, location: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <Input 
                    placeholder="ex: Distribution postes prod"
                    value={newEquip.role || ''} 
                    onChange={e => setNewEquip({...newEquip, role: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes & Caractéristiques</Label>
                <Textarea 
                  placeholder="Modèle exact, ports, identifiants..."
                  value={newEquip.notes || ''} 
                  onChange={e => setNewEquip({...newEquip, notes: e.target.value})} 
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddEquipModalOpen(false)}>Annuler</Button>
              <Button onClick={handleAddEquipment} disabled={!newEquip.name}>Ajouter et placer sur la topologie</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Add Zone */}
        <Dialog open={isAddZoneModalOpen} onOpenChange={setIsAddZoneModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer une zone visuelle (Zone Node)</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom de la zone <span className="text-red-500">*</span></Label>
                <Input 
                  placeholder="ex: Baie Serveurs, Zone Bureaux..."
                  value={newZone.label} 
                  onChange={e => setNewZone({...newZone, label: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Description / Sous-titre</Label>
                <Input 
                  placeholder="ex: Local sécurisé, Switchs et box"
                  value={newZone.description} 
                  onChange={e => setNewZone({...newZone, description: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Thème de couleur</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                  value={newZone.color} 
                  onChange={e => setNewZone({...newZone, color: e.target.value})}
                >
                  <option value="blue">Bleu (Technique / Baie)</option>
                  <option value="amber">Ambre (Bureaux / Direction)</option>
                  <option value="purple">Pourpre (Atelier / Production)</option>
                  <option value="emerald">Émeraude (Périphériques)</option>
                  <option value="slate">Ardoise (Neutre)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Largeur (px)</Label>
                  <Input 
                    type="number"
                    value={newZone.width} 
                    onChange={e => setNewZone({...newZone, width: Number(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hauteur (px)</Label>
                  <Input 
                    type="number"
                    value={newZone.height} 
                    onChange={e => setNewZone({...newZone, height: Number(e.target.value)})} 
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddZoneModalOpen(false)}>Annuler</Button>
              <Button onClick={handleAddZone} disabled={!newZone.label}>Créer la zone</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Add Network (with auto-add to topology) */}
        <Dialog open={isAddNetworkModalOpen} onOpenChange={setIsAddNetworkModalOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter un réseau / SSID</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom du réseau / SSID <span className="text-red-500">*</span></Label>
                <Input 
                  placeholder="ex: fondax wifi, VLAN Atelier, Wi-Fi Invité..."
                  value={networkForm.ssid || ''} 
                  onChange={e => setNetworkForm({...networkForm, ssid: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plage IP / Sous-réseau</Label>
                  <Input 
                    placeholder="ex: 192.168.20.0/24"
                    value={networkForm.ip_range || ''} 
                    onChange={e => setNetworkForm({...networkForm, ip_range: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Passerelle par défaut</Label>
                  <Input 
                    placeholder="ex: 192.168.20.254"
                    value={networkForm.gateway || ''} 
                    onChange={e => setNetworkForm({...networkForm, gateway: e.target.value})} 
                  />
                </div>
              </div>

              {/* Auto add to topology checkbox */}
              <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3.5 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={networkForm.addToTopology !== false}
                    onChange={e => setNetworkForm({...networkForm, addToTopology: e.target.checked})}
                    className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <span className="text-xs font-bold text-purple-950">
                    Afficher automatiquement ce sous-réseau sur le schéma topologique
                  </span>
                </label>

                {networkForm.addToTopology !== false && (
                  <div className="space-y-1.5 pt-1 border-t border-purple-200">
                    <Label className="text-xs text-purple-900 font-medium">Raccorder visuellement à l'équipement :</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-purple-200 bg-white px-2.5 py-1 text-xs"
                      value={networkForm.connectToEquipId || ''}
                      onChange={e => setNetworkForm({...networkForm, connectToEquipId: e.target.value || undefined})}
                    >
                      <option value="">-- Sélection automatique selon la passerelle --</option>
                      {equipments.map(eq => (
                        <option key={eq.id} value={eq.id}>
                          {eq.name} ({eq.type}) {eq.ip ? `- ${eq.ip}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Responsable / Gestionnaire</Label>
                  <Input 
                    placeholder="ex: Sophos, Borne Wi-Fi, Box SFR..."
                    value={networkForm.manager || ''} 
                    onChange={e => setNetworkForm({...networkForm, manager: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rôle & Statut</Label>
                  <Input 
                    placeholder="ex: Wi-Fi interne de prod - Actif"
                    value={networkForm.role_status || ''} 
                    onChange={e => setNetworkForm({...networkForm, role_status: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes & Remarques</Label>
                <Textarea 
                  placeholder="Spécificités, isolation, actions à mener..."
                  value={networkForm.notes || ''} 
                  onChange={e => setNetworkForm({...networkForm, notes: e.target.value})} 
                  rows={2} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddNetworkModalOpen(false)}>Annuler</Button>
              <Button onClick={handleAddNetwork} disabled={!networkForm.ssid} className="bg-purple-600 hover:bg-purple-700 text-white cursor-pointer">
                Ajouter le réseau
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Edit Network */}
        <Dialog open={isEditNetworkModalOpen} onOpenChange={setIsEditNetworkModalOpen}>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le réseau</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nom du réseau / SSID <span className="text-red-500">*</span></Label>
                <Input 
                  value={networkForm.ssid || ''} 
                  onChange={e => setNetworkForm({...networkForm, ssid: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plage IP / Sous-réseau</Label>
                  <Input 
                    value={networkForm.ip_range || ''} 
                    onChange={e => setNetworkForm({...networkForm, ip_range: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Passerelle par défaut</Label>
                  <Input 
                    value={networkForm.gateway || ''} 
                    onChange={e => setNetworkForm({...networkForm, gateway: e.target.value})} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Responsable / Gestionnaire</Label>
                  <Input 
                    value={networkForm.manager || ''} 
                    onChange={e => setNetworkForm({...networkForm, manager: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rôle & Statut</Label>
                  <Input 
                    value={networkForm.role_status || ''} 
                    onChange={e => setNetworkForm({...networkForm, role_status: e.target.value})} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes & Remarques</Label>
                <Textarea 
                  value={networkForm.notes || ''} 
                  onChange={e => setNetworkForm({...networkForm, notes: e.target.value})} 
                  rows={3} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditNetworkModalOpen(false)}>Annuler</Button>
              <Button onClick={handleUpdateNetwork} disabled={!networkForm.ssid}>Enregistrer les modifications</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Add LAN Device (with option to place on topology) */}
        <Dialog open={isAddLanModalOpen} onOpenChange={setIsAddLanModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un appareil LAN</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Adresse IP <span className="text-red-500">*</span></Label>
                  <Input 
                    placeholder="ex: 192.168.20.155"
                    value={lanForm.ip || ''} 
                    onChange={e => setLanForm({...lanForm, ip: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nom d'hôte (Hostname)</Label>
                  <Input 
                    placeholder="ex: PC-ATELIER-1"
                    value={lanForm.hostname || ''} 
                    onChange={e => setLanForm({...lanForm, hostname: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rôle / Description</Label>
                <Input 
                  placeholder="ex: Tablette Altior Expédition"
                  value={lanForm.role || ''} 
                  onChange={e => setLanForm({...lanForm, role: e.target.value})} 
                />
              </div>

              <div className="space-y-2">
                <Label>Réseau rattaché</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                  value={lanForm.network_id || ''}
                  onChange={e => setLanForm({...lanForm, network_id: e.target.value || null})}
                >
                  <option value="">-- Réseau par défaut / non spécifié --</option>
                  {networks.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.ssid} ({n.ip_range})
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 p-2.5 rounded-lg border border-blue-200 bg-blue-50/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lanForm.addToTopology || false}
                  onChange={e => setLanForm({...lanForm, addToTopology: e.target.checked})}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="text-xs font-semibold text-blue-900">
                  Placer également comme nœud sur la topologie interactive
                </span>
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddLanModalOpen(false)}>Annuler</Button>
              <Button onClick={handleAddLanDevice} disabled={!lanForm.ip}>Ajouter l'appareil</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Edit LAN Device */}
        <Dialog open={isEditLanModalOpen} onOpenChange={setIsEditLanModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier l'appareil LAN</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Adresse IP <span className="text-red-500">*</span></Label>
                  <Input 
                    value={lanForm.ip || ''} 
                    onChange={e => setLanForm({...lanForm, ip: e.target.value})} 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nom d'hôte (Hostname)</Label>
                  <Input 
                    value={lanForm.hostname || ''} 
                    onChange={e => setLanForm({...lanForm, hostname: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rôle / Description</Label>
                <Input 
                  value={lanForm.role || ''} 
                  onChange={e => setLanForm({...lanForm, role: e.target.value})} 
                />
              </div>

              <div className="space-y-2">
                <Label>Réseau rattaché</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                  value={lanForm.network_id || ''}
                  onChange={e => setLanForm({...lanForm, network_id: e.target.value || null})}
                >
                  <option value="">-- Réseau par défaut / non spécifié --</option>
                  {networks.map(n => (
                    <option key={n.id} value={n.id}>
                      {n.ssid} ({n.ip_range})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditLanModalOpen(false)}>Annuler</Button>
              <Button onClick={handleUpdateLanDevice} disabled={!lanForm.ip}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </NetworkCanvasContext.Provider>
  )
}

export default function ReseauPage() {
  return (
    <ReactFlowProvider>
      <ReseauContent />
    </ReactFlowProvider>
  )
}
