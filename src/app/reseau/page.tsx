'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
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
  NodeResizer
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
  X, Layers, Filter, CheckCircle2, ArrowRight
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

// Custom Equipment Node with NodeResizer
const EquipmentNode = React.memo(({ data, selected }: { data: any; selected?: boolean }) => {
  const isDimmed = data.isDimmed
  const isHighlighted = data.isHighlighted

  return (
    <div 
      className={cn(
        "bg-white rounded-lg border shadow-sm p-3 flex flex-col transition-all duration-150 relative h-full w-full select-none",
        "min-w-[190px] min-h-[90px]",
        selected && "ring-2 ring-blue-500 border-blue-500 shadow-md",
        isHighlighted && "ring-2 ring-blue-500 shadow-md border-blue-400 scale-105 z-20",
        isDimmed && "opacity-20 grayscale scale-95 pointer-events-none"
      )}
    >
      <NodeResizer 
        isVisible={selected} 
        minWidth={170} 
        minHeight={80}
        color="#2563eb"
        lineClassName="!border-blue-500"
        handleClassName="!h-2.5 !w-2.5 !bg-white !border-2 !border-blue-600 !rounded-xs shadow-xs"
      />
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 !bg-slate-400" />
      <div className="flex items-center gap-2 mb-2">
        {getIconForType(data.type)}
        <span className="font-bold text-sm text-slate-800 truncate" title={data.name}>{data.name}</span>
      </div>
      {data.type && (
        <div className="mb-1.5">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
            {data.type}
          </span>
        </div>
      )}
      {data.ip && (
        <div className="text-xs text-slate-600 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 mb-1 w-fit">
          {data.ip}
        </div>
      )}
      {data.role && <div className="text-xs text-slate-500 truncate" title={data.role}>{data.role}</div>}
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 !bg-slate-400" />
    </div>
  )
})
EquipmentNode.displayName = 'EquipmentNode'

// Custom Zone Node with NodeResizer (allows stretching / extending boxes)
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
              className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
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
  zone: ZoneNode,
}

// Default initial zones with inline style dimensions for smooth NodeResizer control
const DEFAULT_ZONES: Node[] = [
  {
    id: 'zone-baie',
    type: 'zone',
    position: { x: 80, y: 0 },
    style: { width: 750, height: 480 },
    zIndex: -1,
    data: {
      label: 'Baie Réseau (Local Technique)',
      description: 'Cœur de réseau & stockage',
      color: 'blue',
    }
  },
  {
    id: 'zone-bureau',
    type: 'zone',
    position: { x: 80, y: 520 },
    style: { width: 750, height: 260 },
    zIndex: -1,
    data: {
      label: 'Bureaux Administratifs & Études',
      description: 'Postes encadrants & Wi-Fi Mesh',
      color: 'amber',
    }
  }
]

export default function ReseauPage() {
  const supabase = createClient()
  const [mounted, setMounted] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  
  const [loading, setLoading] = useState(true)
  
  // Equipment state & modal
  const [selectedNodeData, setSelectedNodeData] = useState<NetworkEquipment | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isAddEquipModalOpen, setIsAddEquipModalOpen] = useState(false)
  const [newEquip, setNewEquip] = useState<Partial<NetworkEquipment>>({ type: 'Switch' })

  // Edge / Connection state & modal
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [isEdgeModalOpen, setIsEdgeModalOpen] = useState(false)
  const [edgeLabelInput, setEdgeLabelInput] = useState('')
  const [edgeNotesInput, setEdgeNotesInput] = useState('')
  const [edgeTypeInput, setEdgeTypeInput] = useState<'ethernet' | 'fibre' | 'wifi' | 'vpn' | 'inconnu'>('ethernet')

  // Zone modal
  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState(false)
  const [newZone, setNewZone] = useState({ label: '', description: '', color: 'blue', width: 350, height: 250 })

  // Network and LAN state
  const [networks, setNetworks] = useState<Network[]>([])
  const [lanDevices, setLanDevices] = useState<LanDevice[]>([])

  // Network isolation mode
  const [isolatedNetworkId, setIsolatedNetworkId] = useState<string | null>(null)

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
    
    // Fetch equipment
    const { data: equipData } = await supabase.from('network_equipment').select('*')
    // Fetch connections
    const { data: connData } = await supabase.from('network_connections').select('*')
    // Fetch Networks
    const { data: netData } = await supabase.from('networks').select('*').order('created_at', { ascending: false })
    // Fetch LAN devices
    const { data: lanData } = await supabase.from('lan_devices').select('*').order('created_at', { ascending: false })
    
    if (netData) setNetworks(netData)
    if (lanData) setLanDevices(lanData)

    const initialNodes: Node[] = DEFAULT_ZONES.map(z => ({
      ...z,
      data: {
        ...z.data,
        onDelete: handleDeleteZone
      }
    }))

    if (equipData) {
      equipData.forEach((eq: NetworkEquipment, idx) => {
        initialNodes.push({
          id: eq.id,
          type: 'equipment',
          position: { x: eq.position_x || 150 + (idx % 3) * 220, y: eq.position_y || 80 + Math.floor(idx / 3) * 140 },
          data: { ...eq, isHighlighted: false, isDimmed: false } as Record<string, unknown>,
          zIndex: 10
        })
      })
    }
    setNodes(initialNodes)

    if (connData) {
      const initialEdges: Edge[] = connData.map((conn: NetworkConnection) => ({
        id: conn.id,
        source: conn.source_id,
        target: conn.target_id,
        label: conn.label || undefined,
        animated: true,
        style: { strokeWidth: 2, stroke: '#64748b' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
        data: { ...conn }
      }))
      setEdges(initialEdges)
    }

    setLoading(false)
  }

  // Handle network isolation toggle
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

  // Compute node and edge highlighting based on network isolation
  useEffect(() => {
    if (!activeIsolatedNetwork) {
      setNodes(nds => nds.map(n => {
        if (n.type === 'zone') return n
        return {
          ...n,
          data: { ...n.data, isHighlighted: false, isDimmed: false }
        }
      }))
      setEdges(eds => eds.map(e => ({
        ...e,
        style: { ...e.style, stroke: '#64748b', opacity: 1 },
        animated: true
      })))
      return
    }

    const netSsid = activeIsolatedNetwork.ssid?.toLowerCase() || ''
    const netRange = activeIsolatedNetwork.ip_range || ''
    const subnetPrefix = netRange.split('.').slice(0, 3).join('.') // e.g. 192.168.20

    setNodes(nds => nds.map(n => {
      if (n.type === 'zone') return n
      const eqIp = (n.data.ip as string) || ''
      const eqName = ((n.data.name as string) || '').toLowerCase()
      const eqRole = ((n.data.role as string) || '').toLowerCase()

      // Match IP subnet or network name reference
      const matchesIp = subnetPrefix && eqIp.startsWith(subnetPrefix)
      const matchesName = netSsid && (eqName.includes(netSsid) || eqRole.includes(netSsid))
      const isRelated = matchesIp || matchesName || (netSsid.includes('bureau') && eqName.includes('deco')) || (netSsid.includes('fibre') && eqName.includes('sfr'))

      return {
        ...n,
        data: {
          ...n.data,
          isHighlighted: isRelated,
          isDimmed: !isRelated
        }
      }
    }))

    setEdges(eds => eds.map(e => {
      // Check if source and target match
      return {
        ...e,
        style: { ...e.style, opacity: 0.8 },
      }
    }))
  }, [activeIsolatedNetwork, setNodes, setEdges])

  // Filter LAN devices when network isolation is active
  const displayedLanDevices = useMemo(() => {
    if (!activeIsolatedNetwork) return lanDevices
    const subnetPrefix = activeIsolatedNetwork.ip_range?.split('.').slice(0, 3).join('.') || ''
    return lanDevices.filter(dev => {
      if (dev.network_id === activeIsolatedNetwork.id) return true
      if (subnetPrefix && dev.ip.startsWith(subnetPrefix)) return true
      return false
    })
  }, [lanDevices, activeIsolatedNetwork])

  // Edge click handler -> open edit dialog
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge)
    setEdgeLabelInput(edge.label ? String(edge.label) : '')
    setEdgeNotesInput(edge.data?.notes ? String(edge.data.notes) : '')
    setEdgeTypeInput((edge.data?.connection_type as any) || 'ethernet')
    setIsEdgeModalOpen(true)
  }, [])

  // Update edge label / notes
  const handleUpdateEdge = async () => {
    if (!selectedEdge) return
    const updatedLabel = edgeLabelInput.trim() || undefined
    
    await supabase.from('network_connections').update({
      label: updatedLabel || null,
      notes: edgeNotesInput.trim() || null,
      connection_type: edgeTypeInput
    }).eq('id', selectedEdge.id)

    setEdges(eds => eds.map(e => {
      if (e.id === selectedEdge.id) {
        return {
          ...e,
          label: updatedLabel,
          data: { ...e.data, notes: edgeNotesInput, connection_type: edgeTypeInput }
        }
      }
      return e
    }))
    setIsEdgeModalOpen(false)
  }

  // Delete edge
  const handleDeleteEdge = async () => {
    if (!selectedEdge) return
    if (!window.confirm('Voulez-vous supprimer cette connexion réseau ?')) return

    await supabase.from('network_connections').delete().eq('id', selectedEdge.id)
    setEdges(eds => eds.filter(e => e.id !== selectedEdge.id))
    setIsEdgeModalOpen(false)
  }

  // Node drag stop -> persist position
  const onNodeDragStop = useCallback(async (event: any, node: Node) => {
    if (node.type === 'zone') return // zones are layout containers
    await supabase.from('network_equipment').update({
      position_x: Math.round(node.position.x),
      position_y: Math.round(node.position.y)
    }).eq('id', node.id)
  }, [supabase])

  // Node click -> open equipment panel
  const onNodeClick = (event: any, node: Node) => {
    if (node.type === 'zone') return
    setSelectedNodeData(node.data as unknown as NetworkEquipment)
    setIsPanelOpen(true)
  }

  // Add edge on connect
  const onConnect = useCallback(async (params: Connection) => {
    if (params.source === params.target) return
    const tempId = `conn-${Date.now()}`
    const newEdge: Edge = { 
      ...params, 
      id: tempId, 
      animated: true, 
      style: { strokeWidth: 2, stroke: '#64748b' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
    }
    setEdges((eds) => addEdge(newEdge, eds))
    
    const { data } = await supabase.from('network_connections').insert({
      source_id: params.source,
      target_id: params.target,
      label: 'Liaison réseau'
    }).select().single()

    if (data) {
      setEdges(eds => eds.map(e => e.id === tempId ? { ...e, id: data.id, label: data.label } : e))
    }
  }, [supabase, setEdges])

  // Update equipment
  const handleUpdateEquipment = async () => {
    if (!selectedNodeData) return
    const { id, created_at, ...updateData } = selectedNodeData
    
    await supabase.from('network_equipment').update(updateData).eq('id', id)
    
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...selectedNodeData } as Record<string, unknown> } : n))
    setIsPanelOpen(false)
  }

  // Delete equipment
  const handleDeleteEquipment = async (id: string) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet équipement et toutes ses connexions ?')) return
    await supabase.from('network_equipment').delete().eq('id', id)
    setNodes(nds => nds.filter(n => n.id !== id))
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id))
    setIsPanelOpen(false)
  }

  // Add equipment
  const handleAddEquipment = async () => {
    const { data } = await supabase.from('network_equipment').insert({
      name: newEquip.name,
      type: newEquip.type,
      location: newEquip.location,
      ip: newEquip.ip,
      role: newEquip.role,
      notes: newEquip.notes,
      position_x: 250,
      position_y: 200
    }).select().single()

    if (data) {
      setNodes(nds => [...nds, {
        id: data.id,
        type: 'equipment',
        position: { x: data.position_x, y: data.position_y },
        data: { ...data } as Record<string, unknown>,
        zIndex: 10
      }])
    }
    setIsAddEquipModalOpen(false)
    setNewEquip({ type: 'Switch' })
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
  }

  if (loading) return <div className="p-8 text-center text-slate-500">Chargement du plan réseau...</div>

  if (!mounted) {
    return <div className="p-6 text-slate-500">Chargement du plan réseau...</div>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Plan réseau interactif</h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualisation des flux, topologies, équipements et sous-réseaux de Fondax.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setIsAddZoneModalOpen(true)} className="gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Créer une zone
          </Button>
          <Button onClick={() => setIsAddEquipModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Ajouter un équipement
          </Button>
        </div>
      </div>

      {/* Network Isolation Bar */}
      <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Filter className="w-4 h-4 text-blue-600" />
            Isolation visuelle par réseau :
          </div>
          {activeIsolatedNetwork && (
            <button
              onClick={() => setIsolatedNetworkId(null)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
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
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
              !isolatedNetworkId 
                ? "bg-slate-900 text-white border-slate-900" 
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
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5",
                  isSelected
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
                )}
              >
                <Wifi className="w-3.5 h-3.5 opacity-75" />
                <span>{net.ssid}</span>
                <span className={cn("text-[10px] px-1 rounded font-mono", isSelected ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-500")}>
                  {net.ip_range}
                </span>
              </button>
            )
          })}
        </div>

        {activeIsolatedNetwork && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Mode isolation actif :</strong> Seuls les flux et équipements relatifs à <strong>{activeIsolatedNetwork.ssid}</strong> ({activeIsolatedNetwork.ip_range}) sont mis en lumière.
              </span>
            </div>
            <Badge variant="outline" className="bg-white border-blue-300 text-blue-800">
              Passerelle : {activeIsolatedNetwork.gateway}
            </Badge>
          </div>
        )}
      </div>

      {/* React Flow Canvas */}
      <div className="flex gap-4 h-[650px] border rounded-2xl overflow-hidden bg-slate-50/50 shadow-sm relative">
        <div className="flex-1">
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
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            elevateNodesOnSelect={false}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#cbd5e1" gap={16} />
            <Controls />
            <MiniMap />
            <Panel position="top-right" className="bg-white/90 backdrop-blur-xs p-2 rounded-lg border shadow-xs text-xs text-slate-500 space-y-1">
              <div>💡 <strong>Clic sur équipement</strong> : Modifier / Supprimer</div>
              <div>🔗 <strong>Clic sur lien</strong> : Nommer / Supprimer la liaison</div>
              <div>⚡ <strong>Tirer un lien</strong> : Connecter 2 équipements</div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Side Panel for Equipment Details */}
        {isPanelOpen && selectedNodeData && (
          <div className="w-96 bg-white border-l p-6 flex flex-col justify-between shadow-xl z-30 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <div className="flex items-center gap-2">
                  {getIconForType(selectedNodeData.type)}
                  <h3 className="font-bold text-lg text-slate-900">Équipement</h3>
                </div>
                <button 
                  onClick={() => setIsPanelOpen(false)} 
                  className="text-slate-400 hover:text-slate-600 rounded-full p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input 
                    value={selectedNodeData.name} 
                    onChange={e => setSelectedNodeData({...selectedNodeData, name: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
                    value={selectedNodeData.type || ''} 
                    onChange={e => setSelectedNodeData({...selectedNodeData, type: e.target.value})}
                  >
                    {equipmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Adresse IP</Label>
                  <Input 
                    value={selectedNodeData.ip || ''} 
                    onChange={e => setSelectedNodeData({...selectedNodeData, ip: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Emplacement</Label>
                  <Input 
                    value={selectedNodeData.location || ''} 
                    onChange={e => setSelectedNodeData({...selectedNodeData, location: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rôle</Label>
                  <Input 
                    value={selectedNodeData.role || ''} 
                    onChange={e => setSelectedNodeData({...selectedNodeData, role: e.target.value})} 
                  />
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea 
                    value={selectedNodeData.notes || ''} 
                    onChange={e => setSelectedNodeData({...selectedNodeData, notes: e.target.value})} 
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t mt-6 flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => handleDeleteEquipment(selectedNodeData.id)}
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Supprimer
              </Button>
              <Button onClick={handleUpdateEquipment} className="flex-1">
                Enregistrer
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Network & LAN Sections Below Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Identified Networks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl">Réseaux identifiés</CardTitle>
              <p className="text-xs text-slate-500 mt-1">Cliquez sur un réseau pour l'isoler sur le schéma</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y border rounded-xl overflow-hidden">
              {networks.map(net => {
                const isSelected = isolatedNetworkId === net.id
                return (
                  <div 
                    key={net.id} 
                    onClick={() => toggleNetworkIsolation(net.id)}
                    className={cn(
                      "p-4 cursor-pointer transition-colors flex items-start justify-between gap-4",
                      isSelected ? "bg-blue-50/80 border-l-4 border-l-blue-600" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{net.ssid}</span>
                        {isSelected && (
                          <span className="text-[10px] bg-blue-600 text-white font-semibold px-2 py-0.5 rounded-full">
                            Actuellement isolé
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex gap-3 font-mono">
                        <span>Plage : {net.ip_range}</span>
                        <span>Passerelle : {net.gateway}</span>
                      </div>
                      <p className="text-xs text-slate-600">{net.role_status}</p>
                      {net.notes && <p className="text-xs text-amber-700 font-medium">{net.notes}</p>}
                    </div>
                    <Badge variant="outline" className="shrink-0">{net.manager}</Badge>
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
              <CardTitle className="text-xl">Appareils LAN identifiés</CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                {activeIsolatedNetwork ? `Filtré sur ${activeIsolatedNetwork.ssid}` : 'Inventaire complet du réseau'}
              </p>
            </div>
            <Badge variant="secondary">{displayedLanDevices.length} appareil(s)</Badge>
          </CardHeader>
          <CardContent>
            <div className="divide-y border rounded-xl overflow-hidden max-h-[420px] overflow-y-auto">
              {displayedLanDevices.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  Aucun appareil LAN trouvé pour ce réseau.
                </div>
              ) : (
                displayedLanDevices.map(dev => (
                  <div key={dev.id} className="p-3 flex items-center justify-between hover:bg-slate-50 text-sm">
                    <div>
                      <div className="font-semibold text-slate-800">{dev.hostname}</div>
                      <div className="text-xs text-slate-500">{dev.role}</div>
                    </div>
                    <Badge variant="secondary" className="font-mono text-xs">{dev.ip}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog: Edit Connection / Edge */}
      <Dialog open={isEdgeModalOpen} onClose={() => setIsEdgeModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>Modifier la connexion réseau</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nom / Libellé du lien</Label>
            <Input 
              placeholder="ex: Fibre SFR WAN, Lien Switch principal, Trunk VLAN..."
              value={edgeLabelInput} 
              onChange={e => setEdgeLabelInput(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <Label>Type de liaison</Label>
            <select
              className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
              value={edgeTypeInput}
              onChange={e => setEdgeTypeInput(e.target.value as any)}
            >
              <option value="ethernet">Câble Ethernet RJ45 (Cat6)</option>
              <option value="fibre">Fibre Optique</option>
              <option value="wifi">Wi-Fi / Mesh</option>
              <option value="vpn">Tunnel VPN</option>
              <option value="inconnu">Autre / Inconnu</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Notes complémentaires</Label>
            <Textarea 
              placeholder="Spécifications de débit, port de switch, etc."
              value={edgeNotesInput} 
              onChange={e => setEdgeNotesInput(e.target.value)} 
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="flex justify-between items-center sm:justify-between">
          <Button variant="outline" onClick={handleDeleteEdge} className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200">
            <Trash2 className="w-4 h-4 mr-2" /> Supprimer le lien
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEdgeModalOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdateEdge}>Enregistrer</Button>
          </div>
        </DialogFooter>
      </Dialog>

      {/* Dialog: Add Equipment */}
      <Dialog open={isAddEquipModalOpen} onClose={() => setIsAddEquipModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>Ajouter un équipement réseau</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nom de l'équipement</Label>
            <Input 
              placeholder="ex: Switch Atelier, Borne Wi-Fi..."
              value={newEquip.name || ''} 
              onChange={e => setNewEquip({...newEquip, name: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
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
          <div className="space-y-2">
            <Label>Emplacement</Label>
            <Input 
              placeholder="ex: Baie réseau, Atelier, Bureau direction"
              value={newEquip.location || ''} 
              onChange={e => setNewEquip({...newEquip, location: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Rôle</Label>
            <Input 
              placeholder="ex: Distribution postes de production"
              value={newEquip.role || ''} 
              onChange={e => setNewEquip({...newEquip, role: e.target.value})} 
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddEquipModalOpen(false)}>Annuler</Button>
          <Button onClick={handleAddEquipment} disabled={!newEquip.name}>Ajouter</Button>
        </DialogFooter>
      </Dialog>

      {/* Dialog: Add Zone */}
      <Dialog open={isAddZoneModalOpen} onClose={() => setIsAddZoneModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>Créer une zone visuelle (Zone Node)</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nom de la zone</Label>
            <Input 
              placeholder="ex: Baie Serveurs, Zone Bureaux, Zone Atelier..."
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
      </Dialog>
    </div>
  )
}
