'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  ReactFlow, Background, Controls, MiniMap, 
  useNodesState, useEdgesState, addEdge, 
  type Node, type Edge, Panel, Connection, MarkerType, useReactFlow
} from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  Search, Wand2, Maximize2, Eye, EyeOff, Sparkles, X, 
  CheckCircle2, Filter, Network as NetworkIcon, Cable, Trash2
} from 'lucide-react'
import { NetworkEquipment, NetworkConnection, Network, LanDevice } from '@/lib/types'
import { cn } from '@/lib/utils'

import { 
  EdgeMetadata, parseEdgeNotes, formatEdgeNotes, 
  buildEdgeVisualAndMarkers, computeOptimalLayout,
  getIconForType, equipmentTypes
} from './NetworkUtils'
import { NetworkCanvasContext } from './NetworkContext'
import { EquipmentNode } from './NetworkEquipmentNode'
import { NetworkNode } from './NetworkFrameNode'
import { ZoneNode } from './NetworkZoneNode'
import { NetworkLanPanel } from './NetworkLanPanel'
import { NetworkEquipmentDialog } from './NetworkEquipmentDialog'
import { NetworkConnectionDialog } from './NetworkConnectionDialog'
import { NetworkAddZoneDialog, NetworkFormDialog, LanDeviceFormDialog } from './NetworkDialogs'
import { useConfirm } from '@/components/ui/confirm-dialog'

const nodeTypes = {
  equipment: EquipmentNode,
  network: NetworkNode,
  zone: ZoneNode,
}

export function NetworkCanvas() {
  const supabase = createClient()
  const confirm = useConfirm()
  const { fitView } = useReactFlow()
  const [mounted, setMounted] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  
  const [loading, setLoading] = useState(true)
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [showNetworksOnMap, setShowNetworksOnMap] = useState(true)
  const [isolatedNetworkId, setIsolatedNetworkId] = useState<string | null>(null)

  const [lockedNetworkIds, setLockedNetworkIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fondax_locked_networks')
        if (saved) return new Set(JSON.parse(saved))
      } catch {}
    }
    return new Set()
  })

  const [equipments, setEquipments] = useState<NetworkEquipment[]>([])
  const [selectedNodeData, setSelectedNodeData] = useState<NetworkEquipment | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isAddEquipModalOpen, setIsAddEquipModalOpen] = useState(false)
  const [newEquip, setNewEquip] = useState<Partial<NetworkEquipment> & { autoConnectId?: string; connType?: string }>({ 
    type: 'Switch', connType: 'ethernet'
  })
  const [quickLinkTargetId, setQuickLinkTargetId] = useState<string>('')

  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [isEdgeModalOpen, setIsEdgeModalOpen] = useState(false)
  const [edgeLabelInput, setEdgeLabelInput] = useState('')
  const [edgeDescInput, setEdgeDescInput] = useState('')
  const [edgeTypeInput, setEdgeTypeInput] = useState<'ethernet' | 'fibre' | 'wifi' | 'vpn' | 'inconnu'>('ethernet')
  const [edgeFlowStatusInput, setEdgeFlowStatusInput] = useState<'active' | 'blocked'>('active')
  const [edgeDirectionInput, setEdgeDirectionInput] = useState<'both' | 'forward' | 'reverse' | 'none'>('both')

  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState(false)
  const [newZone, setNewZone] = useState({ label: '', description: '', color: 'blue', width: 350, height: 250 })

  const [networks, setNetworks] = useState<Network[]>([])
  const [lanDevices, setLanDevices] = useState<LanDevice[]>([])

  const [isAddNetworkModalOpen, setIsAddNetworkModalOpen] = useState(false)
  const [isEditNetworkModalOpen, setIsEditNetworkModalOpen] = useState(false)
  const [networkForm, setNetworkForm] = useState<Partial<Network> & { addToTopology?: boolean; connectToEquipId?: string }>({
    ssid: '', ip_range: '', gateway: '', manager: '', role_status: '', notes: '', is_active: true, addToTopology: true
  })
  const [editingNetworkId, setEditingNetworkId] = useState<string | null>(null)

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

  const toggleLockNetwork = useCallback((nodeId: string) => {
    setLockedNetworkIds(prev => {
      const next = new Set(prev)
      const isNowLocked = !next.has(nodeId)
      if (isNowLocked) next.add(nodeId)
      else next.delete(nodeId)
      try { localStorage.setItem('fondax_locked_networks', JSON.stringify(Array.from(next))) } catch {}

      setNodes(nds => nds.map(n => {
        if (n.id === nodeId) {
          return { ...n, draggable: !isNowLocked, data: { ...n.data, isLocked: isNowLocked } }
        }
        return n
      }))
      showToast(isNowLocked ? '🔒 Réseau verrouillé (position fixe sur le plan)' : '🔓 Réseau déverrouillé (déplaçable)')
      return next
    })
  }, [setNodes])

  const openAddEquipmentForNetwork = useCallback((net: Network) => {
    const targetEquip = equipments.find(e => e.ip === net.gateway) ||
      equipments.find(e => e.type === 'Switch' || e.type === 'Firewall')

    let suggestedIp = ''
    if (net.ip_range) {
      const parts = net.ip_range.split('.')
      if (parts.length >= 3) {
        suggestedIp = `${parts[0]}.${parts[1]}.${parts[2]}.`
      }
    }
    setNewEquip({
      name: '', type: 'PC', ip: suggestedIp, role: `Connecté sur le réseau ${net.ssid}`,
      autoConnectId: targetEquip?.id, connType: (net.ssid || '').toLowerCase().includes('wifi') ? 'wifi' : 'ethernet'
    })
    setIsAddEquipModalOpen(true)
    showToast(`➕ Préparation de l'ajout d'un équipement sur "${net.ssid}"`)
  }, [equipments])

  const handleDeleteZone = useCallback(async (zoneId: string, zoneLabel?: string) => {
    const ok = await confirm({
      title: 'Supprimer la zone',
      itemTitle: zoneLabel,
      message: zoneLabel 
        ? `Voulez-vous supprimer la zone "${zoneLabel}" ? Les équipements à l'intérieur ne seront pas supprimés.`
        : 'Voulez-vous supprimer cette zone ? Les équipements à l\'intérieur ne seront pas supprimés.',
      confirmText: 'Supprimer la zone',
      variant: 'danger',
    })
    if (!ok) return
    setNodes(nds => nds.filter(n => n.id !== zoneId))
  }, [confirm, setNodes])

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

    const { nodes: initialNodes, edges: initialEdges } = computeOptimalLayout(
      equipData, netData, connData, showNetworksOnMap, lockedNetworkIds
    )

    setNodes(initialNodes)
    setEdges(initialEdges)
    setLoading(false)

    setTimeout(() => { fitView({ duration: 500, padding: 0.15 }) }, 200)
  }

  const handleAutoLayout = async () => {
    if (equipments.length === 0) return
    const { nodes: newNodes, edges: newEdges } = computeOptimalLayout(
      equipments, networks,
      edges.filter(e => !e.data?.isNetworkEdge).map(e => ({
        id: e.id, source_id: e.source, target_id: e.target,
        label: e.label ? String(e.label).replace(/\s*\([^)]*\)/g, '') : null,
        notes: e.data?.notes ? String(e.data.notes) : null,
        created_at: ''
      })),
      showNetworksOnMap, lockedNetworkIds
    )
    setNodes(newNodes)
    setEdges(newEdges)

    const updatePromises = newNodes
      .filter(n => n.type === 'equipment')
      .map(n => supabase.from('network_equipment').update({ 
          position_x: Math.round(n.position.x), position_y: Math.round(n.position.y) 
        }).eq('id', n.id))

    await Promise.all(updatePromises)
    showToast('✨ Topologie réorganisée avec succès : vue claire et aérée !')
    setTimeout(() => { fitView({ duration: 500, padding: 0.15 }) }, 150)
  }

  const toggleNetworkIsolation = (networkId: string) => {
    setIsolatedNetworkId(prev => prev === networkId ? null : networkId)
  }

  const activeIsolatedNetwork = useMemo(() => {
    return networks.find(n => n.id === isolatedNetworkId) || null
  }, [networks, isolatedNetworkId])

  useEffect(() => {
    const q = searchTerm.trim().toLowerCase()
    setNodes(nds => nds.map(n => {
      if (n.type === 'zone') return n
      let isMatch = true, isDim = false

      if (q) {
        const name = ((n.data.name as string) || (n.data.ssid as string) || '').toLowerCase()
        const ip = ((n.data.ip as string) || (n.data.ip_range as string) || '').toLowerCase()
        const role = ((n.data.role as string) || (n.data.location as string) || '').toLowerCase()
        if (!(name.includes(q) || ip.includes(q) || role.includes(q))) {
          isMatch = false; isDim = true
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
          isMatch = false; isDim = true
        }
      }

      return {
        ...n,
        data: { ...n.data, isHighlighted: isMatch && (!!q || !!activeIsolatedNetwork), isDimmed: isDim }
      }
    }))
  }, [searchTerm, activeIsolatedNetwork, setNodes])

  const displayedLanDevices = useMemo(() => {
    if (!activeIsolatedNetwork) return lanDevices
    const subnetPrefix = activeIsolatedNetwork.ip_range?.split('.').slice(0, 3).join('.') || ''
    return lanDevices.filter(dev => dev.network_id === activeIsolatedNetwork.id || (subnetPrefix && dev.ip.startsWith(subnetPrefix)))
  }, [lanDevices, activeIsolatedNetwork])

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    if (edge.data?.isNetworkEdge) return
    setSelectedEdge(edge)
    const meta = parseEdgeNotes(edge.data?.notes, edge.label)
    const rawLabel = edge.data?.label ? String(edge.data.label) : (edge.label ? String(edge.label) : '')
    const cleanLabel = rawLabel.replace(/\s*\([^)]*\)/g, '').trim()
    setEdgeLabelInput(cleanLabel)
    setEdgeDescInput(meta.description)
    setEdgeTypeInput(meta.type)
    setEdgeFlowStatusInput(meta.flowStatus)
    setEdgeDirectionInput(meta.direction)
    setIsEdgeModalOpen(true)
  }, [])

  const handleUpdateEdge = async () => {
    if (!selectedEdge) return
    const updatedLabel = edgeLabelInput.trim() || undefined
    const meta: EdgeMetadata = {
      type: edgeTypeInput, flowStatus: edgeFlowStatusInput, direction: edgeDirectionInput, description: edgeDescInput.trim()
    }
    const storedNotes = formatEdgeNotes(meta)
    
    await supabase.from('network_connections').update({
      label: updatedLabel || null, notes: storedNotes || null
    }).eq('id', selectedEdge.id)

    const visual = buildEdgeVisualAndMarkers(meta)
    let displayLabel = updatedLabel
    if (meta.flowStatus === 'blocked') displayLabel = `${updatedLabel || 'Liaison'} (⛔ Bloqué)`
    else if (meta.direction === 'none') displayLabel = `${updatedLabel || 'Liaison'} (✕ Coupé)`
    else if (meta.direction === 'forward') displayLabel = `${updatedLabel || 'Liaison'} (➔)`
    else if (meta.direction === 'reverse') displayLabel = `${updatedLabel || 'Liaison'} (⬅)`

    setEdges(eds => eds.map(e => e.id === selectedEdge.id ? {
        ...e, label: displayLabel, style: visual.style, animated: visual.animated, markerStart: visual.markerStart, markerEnd: visual.markerEnd,
        data: { ...e.data, label: updatedLabel, notes: storedNotes, connection_type: meta.type, flowStatus: meta.flowStatus, direction: meta.direction, description: meta.description }
      } : e))
    setIsEdgeModalOpen(false)
    showToast('Liaison mise à jour (flux & sens enregistrés) !')
  }

  const handleDeleteEdge = async () => {
    if (!selectedEdge) return
    const ok = await confirm({
      title: 'Supprimer la connexion réseau',
      message: 'Voulez-vous supprimer cette liaison réseau ?',
      confirmText: 'Supprimer la liaison',
      variant: 'danger',
    })
    if (!ok) return
    await supabase.from('network_connections').delete().eq('id', selectedEdge.id)
    setEdges(eds => eds.filter(e => e.id !== selectedEdge.id))
    setIsEdgeModalOpen(false)
    showToast('Liaison supprimée !')
  }

  const onNodeDragStop = useCallback(async (event: any, node: Node) => {
    if (node.type !== 'equipment') return
    await supabase.from('network_equipment').update({
      position_x: Math.round(node.position.x), position_y: Math.round(node.position.y)
    }).eq('id', node.id)
  }, [supabase])

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

  const onConnect = useCallback(async (params: Connection) => {
    if (!params.source || !params.target || params.source === params.target) return
    if (params.source.startsWith('net-') || params.target.startsWith('net-')) return

    const tempId = `conn-${Date.now()}`
    const defaultMeta: EdgeMetadata = { type: 'ethernet', flowStatus: 'active', direction: 'both', description: '' }
    const visual = buildEdgeVisualAndMarkers(defaultMeta)
    const defaultLabel = 'Liaison Ethernet'

    const newEdge: Edge = { 
      ...params, id: tempId, type: 'smoothstep', animated: visual.animated, style: visual.style, markerStart: visual.markerStart, markerEnd: visual.markerEnd, label: defaultLabel,
      data: { source_id: params.source, target_id: params.target, label: defaultLabel, notes: '', connection_type: defaultMeta.type, flowStatus: defaultMeta.flowStatus, direction: defaultMeta.direction, description: '' }
    }
    setEdges(eds => addEdge(newEdge, eds))
    
    const { data } = await supabase.from('network_connections').insert({
      source_id: params.source, target_id: params.target, label: defaultLabel, notes: null
    }).select().single()

    if (data) {
      setEdges(eds => eds.map(e => e.id === tempId ? { ...e, id: data.id, label: data.label, data: { ...e.data, id: data.id } } : e))
      showToast('Nouvelle liaison créée ! Cliquez dessus pour configurer le sens et le flux.')
    }
  }, [supabase, setEdges])

  const handleUpdateEquipment = async () => {
    if (!selectedNodeData) return
    const { id, created_at, ...updateData } = selectedNodeData
    await supabase.from('network_equipment').update(updateData).eq('id', id)
    setEquipments(prev => prev.map(e => e.id === id ? { ...selectedNodeData } : e))
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...selectedNodeData } as Record<string, unknown> } : n))
    setIsPanelOpen(false)
    showToast(`Équipement "${selectedNodeData.name}" mis à jour !`)
  }

  const handleDeleteEquipment = async (id: string) => {
    const eq = equipments.find(e => e.id === id)
    const ok = await confirm({
      title: "Supprimer l'équipement",
      itemTitle: eq?.name,
      message: "Voulez-vous vraiment supprimer cet équipement et toutes ses connexions ? Cette action est irréversible.",
      confirmText: 'Supprimer définitivement',
      variant: 'danger',
    })
    if (!ok) return
    await supabase.from('network_equipment').delete().eq('id', id)
    setEquipments(prev => prev.filter(e => e.id !== id))
    setNodes(nds => nds.filter(n => n.id !== id))
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id))
    setIsPanelOpen(false)
    showToast('Équipement supprimé !')
  }

  const handleAddEquipment = async () => {
    if (!newEquip.name?.trim()) { showToast('⚠️ Veuillez renseigner le nom de l\'équipement.'); return }
    let posX = 520, posY = 760
    if (newEquip.autoConnectId) {
      const parentNode = nodes.find(n => n.id === newEquip.autoConnectId)
      if (parentNode) {
        const siblingCount = edges.filter(e => e.source === newEquip.autoConnectId || e.target === newEquip.autoConnectId).length
        const offset = (siblingCount % 2 === 0 ? 1 : -1) * (Math.floor(siblingCount / 2) + 1) * 260
        posX = parentNode.position.x + offset; posY = parentNode.position.y + 170
      }
    } else {
      const endpointNodes = nodes.filter(n => n.type === 'equipment' && n.position.y >= 760)
      const col = endpointNodes.length % 3; const row = Math.floor(endpointNodes.length / 3)
      posX = 140 + col * 250; posY = 760 + row * 170
    }

    try {
      const { data, error } = await supabase.from('network_equipment').insert({
        name: newEquip.name.trim(), type: newEquip.type || 'Switch', location: newEquip.location || null, ip: newEquip.ip || null, role: newEquip.role || null, notes: newEquip.notes || null, position_x: Math.round(posX), position_y: Math.round(posY)
      }).select().single()

      if (error || !data) throw new Error('Insertion failed')

      setEquipments(prev => [...prev, data])
      setNodes(nds => [...nds, { id: data.id, type: 'equipment', position: { x: data.position_x, y: data.position_y }, data: { ...data } as Record<string, unknown>, zIndex: 10 }])

      if (newEquip.autoConnectId && equipments.some(e => e.id === newEquip.autoConnectId)) {
        const cType = (newEquip.connType || 'ethernet') as any
        const meta: EdgeMetadata = { type: cType, flowStatus: 'active', direction: 'both', description: '' }
        const { data: conn } = await supabase.from('network_connections').insert({
          source_id: newEquip.autoConnectId, target_id: data.id, label: `Liaison ${cType}`, notes: formatEdgeNotes(meta) || null
        }).select().single()
        if (conn) {
          const visual = buildEdgeVisualAndMarkers(meta)
          setEdges(eds => [...eds, { id: conn.id, source: conn.source_id, target: conn.target_id, label: conn.label || undefined, type: 'smoothstep', animated: visual.animated, style: visual.style, markerStart: visual.markerStart, markerEnd: visual.markerEnd, data: { ...conn, connection_type: cType, flowStatus: 'active', direction: 'both' } }])
        }
      }
      setIsAddEquipModalOpen(false)
      setNewEquip({ type: 'Switch', connType: 'ethernet' })
      showToast(`Équipement "${data.name}" ajouté !`)
    } catch (err: any) {
      showToast(`Erreur : ${err?.message}`)
    }
  }

  const handleCreateQuickLink = async () => {
    if (!selectedNodeData || !quickLinkTargetId) return
    const { data: conn } = await supabase.from('network_connections').insert({
      source_id: selectedNodeData.id, target_id: quickLinkTargetId, label: 'Liaison Ethernet', notes: null
    }).select().single()

    if (conn) {
      const visual = buildEdgeVisualAndMarkers({ type: 'ethernet', flowStatus: 'active', direction: 'both', description: '' })
      setEdges(eds => [...eds, { id: conn.id, source: conn.source_id, target: conn.target_id, label: 'Liaison Ethernet', type: 'smoothstep', animated: visual.animated, style: visual.style, markerStart: visual.markerStart, markerEnd: visual.markerEnd, data: { ...conn, connection_type: 'ethernet', flowStatus: 'active', direction: 'both' } }])
      setQuickLinkTargetId('')
      showToast('Liaison créée avec succès !')
    }
  }

  const handleAddZone = () => {
    if (!newZone.label) return
    const zoneId = `zone-${Date.now()}`
    setNodes(nds => [{ id: zoneId, type: 'zone', position: { x: 100, y: 100 }, style: { width: Number(newZone.width) || 350, height: Number(newZone.height) || 250 }, zIndex: -1, data: { label: newZone.label, description: newZone.description, color: newZone.color, onDelete: handleDeleteZone } }, ...nds])
    setIsAddZoneModalOpen(false)
    setNewZone({ label: '', description: '', color: 'blue', width: 350, height: 250 })
    showToast(`Zone "${newZone.label}" créée !`)
  }

  const handleAddNetwork = async () => {
    if (!networkForm.ssid) return
    const { data } = await supabase.from('networks').insert([{
      ssid: networkForm.ssid, ip_range: networkForm.ip_range || null, gateway: networkForm.gateway || null, manager: networkForm.manager || null, role_status: networkForm.role_status || null, notes: networkForm.notes || null, is_active: networkForm.is_active ?? true
    }]).select().single()

    if (data) {
      setNetworks(prev => [data, ...prev])
      if (networkForm.addToTopology !== false) {
        const netNodeId = `net-${data.id}`
        const targetEquip = networkForm.connectToEquipId ? equipments.find(e => e.id === networkForm.connectToEquipId) : equipments.find(e => e.ip === data.gateway) || equipments.find(e => e.type === 'Firewall')
        const posX = targetEquip ? (targetEquip.position_x || 520) + 380 : 1240; const posY = targetEquip ? (targetEquip.position_y || 230) : 60 + networks.length * 170
        setNodes(nds => [...nds, { id: netNodeId, type: 'network', position: { x: posX, y: posY }, draggable: !lockedNetworkIds.has(netNodeId), data: { ...data, isLocked: lockedNetworkIds.has(netNodeId), isHighlighted: false, isDimmed: false } as Record<string, unknown>, zIndex: 8 }])
        if (targetEquip) {
          setEdges(eds => [...eds, { id: `edge-net-${data.id}`, source: targetEquip.id, target: netNodeId, label: data.ip_range ? `${data.ip_range}` : undefined, type: 'smoothstep', animated: true, style: { stroke: '#a855f7', strokeWidth: 2, strokeDasharray: '4 4' }, markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' }, data: { isNetworkEdge: true } }])
        }
      }
      setIsAddNetworkModalOpen(false)
      setNetworkForm({ ssid: '', ip_range: '', gateway: '', manager: '', role_status: '', notes: '', is_active: true, addToTopology: true })
      showToast(`Réseau "${data.ssid}" ajouté !`)
    }
  }

  const handleUpdateNetwork = async () => {
    if (!editingNetworkId || !networkForm.ssid) return
    const { data } = await supabase.from('networks').update({
      ssid: networkForm.ssid, ip_range: networkForm.ip_range || null, gateway: networkForm.gateway || null, manager: networkForm.manager || null, role_status: networkForm.role_status || null, notes: networkForm.notes || null, is_active: networkForm.is_active ?? true
    }).eq('id', editingNetworkId).select().single()

    if (data) {
      setNetworks(prev => prev.map(n => n.id === editingNetworkId ? data : n))
      setNodes(nds => nds.map(n => n.id === `net-${editingNetworkId}` ? { ...n, data: { ...n.data, ...data } } : n))
      setIsEditNetworkModalOpen(false)
      showToast(`Réseau "${data.ssid}" mis à jour !`)
    }
  }

  const handleDeleteNetwork = async (id: string, ssid?: string | null) => {
    const ok = await confirm({
      title: 'Supprimer le réseau',
      itemTitle: ssid || undefined,
      message: `Voulez-vous vraiment supprimer le réseau "${ssid || 'sélectionné'}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer définitivement',
      variant: 'danger',
    })
    if (!ok) return
    await supabase.from('networks').delete().eq('id', id)
    setNetworks(prev => prev.filter(n => n.id !== id))
    setNodes(nds => nds.filter(n => n.id !== `net-${id}`))
    setEdges(eds => eds.filter(e => e.id !== `edge-net-${id}`))
    showToast(`Réseau "${ssid || ''}" supprimé !`)
  }

  const handleAddLanDevice = async () => {
    if (!lanForm.ip) return
    const { data } = await supabase.from('lan_devices').insert([{
      hostname: lanForm.hostname || null, ip: lanForm.ip, role: lanForm.role || null, network_id: lanForm.network_id || null
    }]).select().single()

    if (data) {
      setLanDevices(prev => [data, ...prev])
      if (lanForm.addToTopology) await placeLanDeviceOnTopology(data)
      setIsAddLanModalOpen(false)
      setLanForm({ hostname: '', ip: '', role: '', network_id: null, addToTopology: false })
      showToast(`Appareil LAN "${data.hostname || data.ip}" ajouté !`)
    }
  }

  const placeLanDeviceOnTopology = async (dev: LanDevice) => {
    const defaultType = dev.hostname?.toLowerCase().includes('imprimante') ? 'Imprimante' : dev.hostname?.toLowerCase().includes('nas') ? 'NAS' : 'PC'
    const endpointNodes = nodes.filter(n => n.type === 'equipment' && n.position.y >= 760)
    const col = endpointNodes.length % 3; const row = Math.floor(endpointNodes.length / 3)
    const posX = 140 + col * 250; const posY = 760 + row * 170

    const { data } = await supabase.from('network_equipment').insert({
      name: dev.hostname || `Appareil ${dev.ip}`, type: defaultType, ip: dev.ip, role: dev.role || 'Appareil LAN', location: 'Atelier / Bureaux', position_x: Math.round(posX), position_y: Math.round(posY)
    }).select().single()

    if (data) {
      setEquipments(prev => [...prev, data])
      setNodes(nds => [...nds, { id: data.id, type: 'equipment', position: { x: data.position_x, y: data.position_y }, data: { ...data } as Record<string, unknown>, zIndex: 10 }])
      const mainSwitch = equipments.find(e => e.type === 'Switch' || e.name.toLowerCase().includes('switch'))
      if (mainSwitch) {
        const { data: conn } = await supabase.from('network_connections').insert({ source_id: mainSwitch.id, target_id: data.id, label: 'Liaison RJ45' }).select().single()
        if (conn) {
          const visual = buildEdgeVisualAndMarkers({ type: 'ethernet', flowStatus: 'active', direction: 'both', description: '' })
          setEdges(eds => [...eds, { id: conn.id, source: conn.source_id, target: conn.target_id, label: conn.label || undefined, type: 'smoothstep', animated: visual.animated, style: visual.style, markerStart: visual.markerStart, markerEnd: visual.markerEnd, data: { ...conn, connection_type: 'ethernet', flowStatus: 'active', direction: 'both' } }])
        }
      }
      showToast(`"${data.name}" a été placé sur le plan réseau !`)
    }
  }

  const handleUpdateLanDevice = async () => {
    if (!editingLanId || !lanForm.ip) return
    const { data } = await supabase.from('lan_devices').update({
      hostname: lanForm.hostname || null, ip: lanForm.ip, role: lanForm.role || null, network_id: lanForm.network_id || null
    }).eq('id', editingLanId).select().single()

    if (data) {
      setLanDevices(prev => prev.map(d => d.id === editingLanId ? data : d))
      setIsEditLanModalOpen(false)
      showToast(`Appareil "${data.hostname || data.ip}" mis à jour !`)
    }
  }

  const handleDeleteLanDevice = async (id: string, name?: string | null) => {
    const ok = await confirm({
      title: "Supprimer l'appareil LAN",
      itemTitle: name || id,
      message: `Voulez-vous supprimer cet appareil LAN (${name || id}) ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      variant: 'danger',
    })
    if (!ok) return
    await supabase.from('lan_devices').delete().eq('id', id)
    setLanDevices(prev => prev.filter(d => d.id !== id))
    showToast('Appareil LAN supprimé !')
  }

  const selectedEdgeSource = useMemo(() => selectedEdge ? equipments.find(e => e.id === selectedEdge.source) || null : null, [selectedEdge, equipments])
  const selectedEdgeTarget = useMemo(() => selectedEdge ? equipments.find(e => e.id === selectedEdge.target) || null : null, [selectedEdge, equipments])

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
              <Sparkles className="w-4 h-4 text-blue-600" /> Créer une zone
            </Button>
            <Button onClick={() => setIsAddEquipModalOpen(true)} className="gap-2 shadow-xs cursor-pointer bg-blue-600 hover:bg-blue-700">
              <Wand2 className="w-4 h-4" /> Ajouter un équipement
            </Button>
          </div>
        </div>

        {notificationMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm p-3.5 rounded-xl flex items-center gap-2.5 shadow-sm animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{notificationMsg}</span>
          </div>
        )}

        <div className="rounded-2xl border bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Filter className="w-4 h-4 text-blue-600" /> Filtrer / Isoler un sous-réseau :
            </div>
            {activeIsolatedNetwork && (
              <button onClick={() => setIsolatedNetworkId(null)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer">
                <X className="w-3.5 h-3.5" /> Réinitialiser la vue (Afficher tout)
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setIsolatedNetworkId(null)} className={cn("px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer", !isolatedNetworkId ? "bg-slate-900 text-white border-slate-900 shadow-xs" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200")}>
              Vue Globale (Tout)
            </button>
            {networks.map(net => {
              const isSelected = isolatedNetworkId === net.id
              return (
                <button key={net.id} onClick={() => toggleNetworkIsolation(net.id)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5 cursor-pointer", isSelected ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200")}>
                  <NetworkIcon className="w-3.5 h-3.5 opacity-75" /> <span className="font-semibold">{net.ssid}</span>
                  <span className={cn("text-[10px] px-1.5 py-0.2 rounded font-mono", isSelected ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-600")}>{net.ip_range}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="h-[720px] border-2 border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-md relative">
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={onNodeClick} onEdgeClick={onEdgeClick} onNodeDragStop={onNodeDragStop} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.15, maxZoom: 1 }} elevateNodesOnSelect={false} proOptions={{ hideAttribution: true }}>
            <Background color="#cbd5e1" gap={18} size={1.2} />
            <Controls className="!bg-white !border !border-slate-200 !shadow-sm !rounded-xl" />
            <MiniMap className="!bg-white/95 !border !border-slate-300 !rounded-xl !shadow-sm" nodeColor={(n) => n.type === 'zone' ? '#e2e8f0' : n.type === 'network' ? '#c084fc' : '#3b82f6'} />
            
            <Panel position="top-left" className="flex flex-wrap items-center gap-2 bg-white/95 backdrop-blur-md p-2 rounded-xl border border-slate-200 shadow-sm">
              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input placeholder="Rechercher équipement, IP..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs bg-slate-50 border-slate-200" />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-3.5 h-3.5" /></button>}
              </div>
              <Button size="sm" variant="outline" onClick={handleAutoLayout} className="h-8 gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50/50 hover:bg-purple-100 border-purple-200 shadow-2xs cursor-pointer">
                <Wand2 className="w-3.5 h-3.5 text-purple-600" /> <span>🪄 Réorganiser</span>
              </Button>
              <Button size="sm" variant="outline" onClick={() => fitView({ duration: 400, padding: 0.15 })} className="h-8 gap-1.5 text-xs text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer">
                <Maximize2 className="w-3.5 h-3.5 text-slate-500" /> <span>Recentrer</span>
              </Button>
              <button type="button" onClick={() => setShowNetworksOnMap(prev => !prev)} className={cn("h-8 flex items-center gap-1.5 px-2.5 rounded-md text-xs font-semibold border transition-colors cursor-pointer", showNetworksOnMap ? "bg-purple-600 text-white border-purple-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50")}>
                {showNetworksOnMap ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />} <span>Sous-réseaux</span>
              </button>
            </Panel>
          </ReactFlow>

          {isPanelOpen && selectedNodeData && (
            <div className="absolute right-0 top-0 bottom-0 w-96 bg-white border-l p-6 flex flex-col justify-between shadow-2xl z-40 overflow-y-auto animate-in slide-in-from-right duration-200">
              <div className="space-y-5">
                <div className="flex justify-between items-center border-b pb-4">
                  <div className="flex items-center gap-2">
                    {getIconForType(selectedNodeData.type)}
                    <h3 className="font-bold text-lg text-slate-900">Équipement</h3>
                  </div>
                  <button onClick={() => setIsPanelOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-full p-1 cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Nom</Label>
                    <Input value={selectedNodeData.name} onChange={e => setSelectedNodeData({...selectedNodeData, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Type</Label>
                      <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950" value={selectedNodeData.type || 'Autre'} onChange={e => setSelectedNodeData({...selectedNodeData, type: e.target.value})}>
                        {equipmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">IP</Label>
                      <Input value={selectedNodeData.ip || ''} onChange={e => setSelectedNodeData({...selectedNodeData, ip: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Emplacement</Label>
                    <Input value={selectedNodeData.location || ''} onChange={e => setSelectedNodeData({...selectedNodeData, location: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Rôle</Label>
                    <Input value={selectedNodeData.role || ''} onChange={e => setSelectedNodeData({...selectedNodeData, role: e.target.value})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500">Notes</Label>
                    <Textarea value={selectedNodeData.notes || ''} onChange={e => setSelectedNodeData({...selectedNodeData, notes: e.target.value})} rows={3} />
                  </div>

                  <div className="pt-3 border-t space-y-2">
                    <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Cable className="w-3.5 h-3.5 text-blue-600" /> Raccorder rapidement à un équipement :
                    </Label>
                    <div className="flex gap-2">
                      <select className="flex-1 h-8 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs" value={quickLinkTargetId} onChange={e => setQuickLinkTargetId(e.target.value)}>
                        <option value="">Sélectionner un équipement...</option>
                        {equipments.filter(e => e.id !== selectedNodeData.id).map(e => (
                          <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                        ))}
                      </select>
                      <Button size="sm" className="h-8 text-xs shrink-0 cursor-pointer" disabled={!quickLinkTargetId} onClick={handleCreateQuickLink}>Relier</Button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t mt-6 flex gap-2">
                <Button variant="outline" onClick={() => handleDeleteEquipment(selectedNodeData.id)} className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 cursor-pointer">
                  <Trash2 className="w-4 h-4 mr-1.5" /> Supprimer
                </Button>
                <Button onClick={handleUpdateEquipment} className="flex-1 cursor-pointer">Enregistrer</Button>
              </div>
            </div>
          )}
        </div>

        <NetworkLanPanel
          networks={networks}
          lanDevices={lanDevices}
          displayedLanDevices={displayedLanDevices}
          equipments={equipments}
          isolatedNetworkId={isolatedNetworkId}
          lockedNetworkIds={lockedNetworkIds}
          activeIsolatedNetwork={activeIsolatedNetwork}
          toggleNetworkIsolation={toggleNetworkIsolation}
          onAddNetwork={() => {
            setNetworkForm({ ssid: '', ip_range: '', gateway: '', manager: '', role_status: '', notes: '', is_active: true, addToTopology: true })
            setIsAddNetworkModalOpen(true)
          }}
          onEditNetwork={(net) => {
            setEditingNetworkId(net.id); setNetworkForm({ ...net }); setIsEditNetworkModalOpen(true)
          }}
          onDeleteNetwork={handleDeleteNetwork}
          onAddLanDevice={() => {
            setLanForm({ hostname: '', ip: '', role: '', network_id: isolatedNetworkId || null, addToTopology: false })
            setIsAddLanModalOpen(true)
          }}
          onEditLanDevice={(dev) => {
            setEditingLanId(dev.id); setLanForm({ ...dev }); setIsEditLanModalOpen(true)
          }}
          onDeleteLanDevice={handleDeleteLanDevice}
          placeLanDeviceOnTopology={placeLanDeviceOnTopology}
        />

        <NetworkEquipmentDialog
          isOpen={isAddEquipModalOpen} onOpenChange={setIsAddEquipModalOpen} newEquip={newEquip} setNewEquip={setNewEquip}
          handleAddEquipment={handleAddEquipment} equipments={equipments}
        />

        <NetworkConnectionDialog
          isOpen={isEdgeModalOpen} onOpenChange={setIsEdgeModalOpen} selectedEdgeSource={selectedEdgeSource} selectedEdgeTarget={selectedEdgeTarget}
          edgeLabelInput={edgeLabelInput} setEdgeLabelInput={setEdgeLabelInput} edgeDirectionInput={edgeDirectionInput} setEdgeDirectionInput={setEdgeDirectionInput}
          edgeFlowStatusInput={edgeFlowStatusInput} setEdgeFlowStatusInput={setEdgeFlowStatusInput} edgeTypeInput={edgeTypeInput} setEdgeTypeInput={setEdgeTypeInput}
          edgeDescInput={edgeDescInput} setEdgeDescInput={setEdgeDescInput} handleUpdateEdge={handleUpdateEdge} handleDeleteEdge={handleDeleteEdge}
        />

        <NetworkAddZoneDialog
          isOpen={isAddZoneModalOpen} onOpenChange={setIsAddZoneModalOpen} newZone={newZone} setNewZone={setNewZone} handleAddZone={handleAddZone}
        />

        <NetworkFormDialog
          isOpen={isAddNetworkModalOpen} onOpenChange={setIsAddNetworkModalOpen} networkForm={networkForm} setNetworkForm={setNetworkForm}
          onSave={handleAddNetwork} isEdit={false} equipments={equipments}
        />

        <NetworkFormDialog
          isOpen={isEditNetworkModalOpen} onOpenChange={setIsEditNetworkModalOpen} networkForm={networkForm} setNetworkForm={setNetworkForm}
          onSave={handleUpdateNetwork} isEdit={true} equipments={equipments}
        />

        <LanDeviceFormDialog
          isOpen={isAddLanModalOpen} onOpenChange={setIsAddLanModalOpen} lanForm={lanForm} setLanForm={setLanForm} onSave={handleAddLanDevice} isEdit={false} networks={networks}
        />

        <LanDeviceFormDialog
          isOpen={isEditLanModalOpen} onOpenChange={setIsEditLanModalOpen} lanForm={lanForm} setLanForm={setLanForm} onSave={handleUpdateLanDevice} isEdit={true} networks={networks}
        />
      </div>
    </NetworkCanvasContext.Provider>
  )
}
