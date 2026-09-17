import React from 'react'
import { MarkerType, type Node, type Edge } from '@xyflow/react'
import { 
  Router, Shield, Server, HardDrive, Phone, Wifi, Monitor, Printer, Box
} from 'lucide-react'
import { NetworkEquipment, NetworkConnection, Network } from '@/lib/types'

export const equipmentTypes = [
  'Modem/ONT', 'Firewall', 'Switch', 'NAS', 'VoIP', 'Point d\'accès', 'Serveur', 'PC', 'Imprimante', 'Autre'
]

export const getIconForType = (type: string | null) => {
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

export interface EdgeMetadata {
  type: 'ethernet' | 'fibre' | 'wifi' | 'vpn' | 'inconnu'
  flowStatus: 'active' | 'blocked'
  direction: 'both' | 'forward' | 'reverse' | 'none'
  description: string
}

export function parseEdgeNotes(notes?: unknown, label?: unknown): EdgeMetadata {
  const strNotes = String(notes || '')
  const strLabel = String(label || '')
  const combined = `${strLabel} ${strNotes}`.toLowerCase()

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

  let flowStatus: 'active' | 'blocked' = 'active'
  const flowMatch = strNotes.match(/\[status:(active|blocked)\]/i)
  if (flowMatch) {
    flowStatus = flowMatch[1].toLowerCase() as any
  } else if (combined.includes('bloqué') || combined.includes('bloque') || combined.includes('inactif') || combined.includes('hors-service') || combined.includes('coupe')) {
    flowStatus = 'blocked'
  }

  let direction: 'both' | 'forward' | 'reverse' | 'none' = 'both'
  const dirMatch = strNotes.match(/\[flow:(both|forward|reverse|none)\]/i)
  if (dirMatch) {
    direction = dirMatch[1].toLowerCase() as any
  } else if (combined.includes('unidirectionnel') || combined.includes('uni-directionnel')) {
    direction = 'forward'
  } else if (combined.includes('aucun flux') || combined.includes('sans flux')) {
    direction = 'none'
  }

  const description = strNotes.replace(/\[[a-z]+:[^\]]+\]/gi, '').trim()

  return { type, flowStatus, direction, description }
}

export function formatEdgeNotes(meta: EdgeMetadata): string {
  const parts: string[] = []
  if (meta.type !== 'ethernet') parts.push(`[type:${meta.type}]`)
  if (meta.flowStatus !== 'active') parts.push(`[status:${meta.flowStatus}]`)
  if (meta.direction !== 'both') parts.push(`[flow:${meta.direction}]`)
  if (meta.description) parts.push(meta.description)
  return parts.join(' ').trim()
}

export function buildEdgeVisualAndMarkers(meta: EdgeMetadata, isHighlighted?: boolean, isDimmed?: boolean) {
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

export function computeOptimalLayout(
  equipList: NetworkEquipment[],
  networkList: Network[],
  connList: NetworkConnection[],
  showNetworks: boolean,
  lockedNetworkIds?: Set<string>
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

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

  const centerX = 520
  const positions: Record<string, { x: number; y: number }> = {}

  if (box) positions[box.id] = { x: centerX, y: 50 }
  if (firewall) positions[firewall.id] = { x: centerX, y: 230 }
  if (mainSwitch) positions[mainSwitch.id] = { x: centerX, y: 420 }

  const printer = otherEquip.find(e => (e.name || '').toLowerCase().includes('ricoh') || (e.name || '').toLowerCase().includes('imprimante') || e.type === 'Imprimante')
  if (nas) positions[nas.id] = { x: 160, y: 580 }
  if (voip) positions[voip.id] = { x: centerX, y: 580 }
  if (printer) {
    positions[printer.id] = { x: 840, y: 580 }
    handledIds.add(printer.id)
  }

  if (deco1) positions[deco1.id] = { x: 1160, y: 480 }
  if (deco2) positions[deco2.id] = { x: 1160, y: 680 }

  const workstations = equipList.filter(e => !handledIds.has(e.id))
  const endpointCols = [80, 320, 560, 800]
  let maxEndpointY = 750

  workstations.forEach((eq, idx) => {
    const row = Math.floor(idx / endpointCols.length)
    const col = idx % endpointCols.length
    const yPos = 750 + row * 160
    positions[eq.id] = { x: endpointCols[col], y: yPos }
    if (yPos > maxEndpointY) maxEndpointY = yPos
  })

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

  if (showNetworks) {
    const prodLanHeight = Math.max(680, maxEndpointY - 370 + 170)

    networkList.forEach((net, idx) => {
      const netNodeId = `net-${net.id}`
      const isLocked = lockedNetworkIds?.has(netNodeId) ?? false
      const ssidLow = (net.ssid || '').toLowerCase()
      const notesLow = (net.notes || '').toLowerCase()
      const roleLow = (net.role_status || '').toLowerCase()

      let netPos = { x: 1200, y: 60 + idx * 280 }
      let frameStyle: Record<string, any> = { width: 350, height: 250 }

      if (ssidLow.includes('sfr') || ssidLow.includes('fibre') || notesLow.includes('sfr')) {
        netPos = { x: 380, y: 10 }
        frameStyle = { width: 480, height: 160 }
      } else if (ssidLow.includes('client') || roleLow.includes('invité') || notesLow.includes('vlan')) {
        netPos = { x: 860, y: 170 }
        frameStyle = { width: 340, height: 170 }
      } else if (ssidLow.includes('fondax') || roleLow.includes('prod') || roleLow.includes('interne')) {
        netPos = { x: 40, y: 370 }
        frameStyle = { width: 990, height: prodLanHeight }
      } else if (ssidLow.includes('bureau') || roleLow.includes('mesh') || notesLow.includes('deco')) {
        netPos = { x: 1090, y: 410 }
        frameStyle = { width: 330, height: 420 }
      }

      nodes.push({
        id: netNodeId,
        type: 'network',
        position: netPos,
        style: frameStyle,
        draggable: !isLocked,
        data: { 
          ...net, 
          isLocked,
          isHighlighted: false, 
          isDimmed: false 
        } as Record<string, unknown>,
        zIndex: 1
      })
    })
  }

  return { nodes, edges }
}
