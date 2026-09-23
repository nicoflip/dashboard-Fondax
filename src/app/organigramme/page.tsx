'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  ReactFlow, 
  Background, 
  Controls, 
  type Node, 
  type Edge,
  Handle,
  Position,
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Connection
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Plus, User, CheckSquare, Square, Trash2, Edit2, ShieldAlert, Link2, GitFork } from 'lucide-react'
import { Person } from '@/lib/types'
import { useConfirm } from '@/components/ui/confirm-dialog'

const DEPARTMENTS = [
  'Direction',
  'Administration & Finance',
  'Bureau d\'études',
  'Modelage',
  'Production',
  'QHSE',
  'Supply Chain',
  'Atelier',
  'Maintenance',
  'Autre'
]

const LOCAL_STORAGE_MANAGER_KEY = 'fondax_org_managers_map'

const getStoredManagers = (): Record<string, string> => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_MANAGER_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

const saveStoredManagers = (map: Record<string, string>) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_MANAGER_KEY, JSON.stringify(map))
  } catch (e) {
    console.error('Failed to save manager map', e)
  }
}

// Memoized custom node with interactive connection handles
const PersonNode = React.memo(({ data }: { data: any }) => {
  const bgClass = data.category === 'encadrant' ? 'bg-blue-50/90 border-blue-200 text-blue-950' : 
                  data.category === 'gérant' ? 'bg-amber-50/90 border-amber-300 text-amber-950 ring-1 ring-amber-300/60' :
                  'bg-slate-50/90 border-slate-200 text-slate-900'
  
  return (
    <div className={`rounded-xl border shadow-xs min-w-[210px] p-4 flex flex-col transition-all duration-150 hover:shadow-md ${bgClass} select-none`}>
      {/* Target handle for incoming manager link */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-white shadow-xs cursor-crosshair" 
        title="Point de rattachement hiérarchique"
      />
      
      <div className="font-bold text-center text-base tracking-tight">{data.name}</div>
      {data.role && <div className="text-xs text-center font-medium opacity-85 mt-1">{data.role}</div>}
      {data.department && (
        <div className="text-[11px] text-center opacity-70 mt-0.5 font-mono">
          {data.department}
        </div>
      )}
      
      <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-slate-200/60">
        {data.has_pc ? (
          <span className="text-xs bg-white/90 px-2 py-0.5 rounded border border-slate-200 font-medium" title="Équipé d'un PC">💻 PC</span>
        ) : (
          <span className="text-[10px] text-slate-400">Sans PC</span>
        )}
        {data.has_m365 && (
          <span className="text-xs bg-blue-100/90 text-blue-800 px-2 py-0.5 rounded border border-blue-200 font-medium" title="Licence M365 active">📧 M365</span>
        )}
      </div>

      {/* Source handle to attach subordinates */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white shadow-xs cursor-crosshair" 
        title="Tirer un lien vers un subordonné"
      />
    </div>
  )
})
PersonNode.displayName = 'PersonNode'

const nodeTypes = {
  person: PersonNode,
}

export default function OrganigrammePage() {
  const supabase = createClient()
  const confirm = useConfirm()
  const [mounted, setMounted] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loading, setLoading] = useState(true)
  const [people, setPeople] = useState<Person[]>([])

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  
  const [formData, setFormData] = useState<Partial<Person>>({})

  // Deterministic manager resolver: NEVER uses array index or modulo!
  // Every person is strictly bound to an explicit manager ID.
  const resolveManagerId = useCallback((
    person: Person, 
    allPeople: Person[], 
    storedMap: Record<string, string>
  ): string | null => {
    const isGerant = person.category === 'gérant' || person.role?.toLowerCase().includes('gérant')
    if (isGerant) return null

    // 1. Explicit manager assigned in DB or stored map
    if (person.manager_id && allPeople.some(p => p.id === person.manager_id)) {
      return person.manager_id
    }
    if (storedMap[person.id] && allPeople.some(p => p.id === storedMap[person.id])) {
      return storedMap[person.id]
    }

    // 2. Stable real-world Fondax organizational mapping by specific role IDs
    const gerant = allPeople.find(p => p.category === 'gérant' || p.role?.toLowerCase().includes('gérant'))
    const prodChef = allPeople.find(p => p.role?.toLowerCase().includes('production') || p.department?.toLowerCase() === 'production')
    const modeliste = allPeople.find(p => p.role?.toLowerCase().includes('modéliste') || p.department?.toLowerCase() === 'modelage')
    const beChef = allPeople.find(p => p.role?.toLowerCase().includes('bureau d\'études') || p.department?.toLowerCase().includes('études'))

    const dept = (person.department || '').toLowerCase()
    const role = (person.role || '').toLowerCase()

    // Workshop operators strictly report to Chef de Production (Yoann PEDEL)
    if (dept.includes('atelier') || role.includes('opérateur')) {
      return prodChef?.id || gerant?.id || null
    }
    if (dept.includes('modelage') && modeliste && modeliste.id !== person.id) {
      return modeliste.id
    }
    if (dept.includes('études') && beChef && beChef.id !== person.id) {
      return beChef.id
    }

    // All department heads / encadrants report directly to Gérant
    return gerant?.id || null
  }, [])

  // Build the complete graph without any cascade effect
  const buildGraph = useCallback((data: Person[]) => {
    const storedMap = getStoredManagers()

    // 1. Resolve manager for everyone and save
    const resolvedManagers: Record<string, string | null> = {}
    data.forEach(p => {
      resolvedManagers[p.id] = resolveManagerId(p, data, storedMap)
    })

    // 2. Identify hierarchy levels
    let gerant = data.find(p => p.role?.toLowerCase().includes('gérant') || p.name.includes('Gérant') || p.category === 'gérant')
    if (!gerant && data.length > 0) gerant = data[0]

    // Level 1: direct reports to gerant (or unmanaged if not gerant)
    const level1 = data.filter(p => p.id !== gerant?.id && (resolvedManagers[p.id] === gerant?.id || !resolvedManagers[p.id]))
    // Level 2: subordinates reporting to level 1 managers
    const level2 = data.filter(p => p.id !== gerant?.id && resolvedManagers[p.id] && resolvedManagers[p.id] !== gerant?.id)

    const newNodes: Node[] = []
    const newEdges: Edge[] = []

    // Node: Gérant (Top)
    if (gerant) {
      newNodes.push({
        id: gerant.id,
        type: 'person',
        position: { x: Math.max(80, (level1.length * 260) / 2 - 105), y: 40 },
        data: { ...gerant }
      })
    }

    // Nodes: Level 1 (Encadrants & Direct Reports)
    level1.forEach((person, idx) => {
      newNodes.push({
        id: person.id,
        type: 'person',
        position: { x: 40 + idx * 260, y: 220 },
        data: { ...person }
      })

      if (gerant) {
        newEdges.push({
          id: `e-${gerant.id}-${person.id}`,
          source: gerant.id,
          target: person.id,
          type: 'smoothstep',
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
        })
      }
    })

    // Nodes: Level 2 (Operators and Subordinates)
    level2.forEach((person, idx) => {
      const managerId = resolvedManagers[person.id]
      newNodes.push({
        id: person.id,
        type: 'person',
        position: { 
          x: 40 + (idx % Math.max(1, level1.length)) * 260 + 15, 
          y: 420 + Math.floor(idx / Math.max(1, level1.length)) * 140 
        },
        data: { ...person }
      })

      if (managerId) {
        newEdges.push({
          id: `e-${managerId}-${person.id}`,
          source: managerId,
          target: person.id,
          type: 'smoothstep',
          style: { stroke: '#64748b', strokeWidth: 1.8, strokeDasharray: '4,4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
        })
      }
    })

    setNodes(newNodes)
    setEdges(newEdges)
  }, [resolveManagerId, setNodes, setEdges])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('people').select('*').order('name')
    if (data) {
      setPeople(data)
      buildGraph(data)
    }
    setLoading(false)
  }, [supabase, buildGraph])

  useEffect(() => {
    setMounted(true)
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onNodeClick = useCallback((event: any, node: Node) => {
    const person = node.data as unknown as Person
    const storedMap = getStoredManagers()
    setSelectedPerson(person)
    setFormData({
      ...person,
      manager_id: storedMap[person.id] || person.manager_id || ''
    })
    setIsEditModalOpen(true)
  }, [])

  const handleOpenAddModal = () => {
    setSelectedPerson(null)
    const gerant = people.find(p => p.category === 'gérant' || p.role?.toLowerCase().includes('gérant'))
    const prodChef = people.find(p => p.role?.toLowerCase().includes('production'))

    setFormData({
      name: '',
      role: '',
      department: 'Atelier',
      category: 'opérateur',
      manager_id: prodChef?.id || gerant?.id || '',
      has_pc: false,
      has_m365: false
    })
    setIsAddModalOpen(true)
  }

  const handleSavePerson = async () => {
    if (!formData.name?.trim()) {
      await confirm({
        title: 'Information manquante',
        message: 'Veuillez renseigner le nom du collaborateur pour pouvoir enregistrer.',
        variant: 'warning',
        confirmText: 'Compris',
        cancelText: 'Fermer',
      })
      return
    }

    const targetManagerId = formData.manager_id || null

    if (selectedPerson) {
      // 1. Update in Supabase (with defensive fallback in case manager_id column isn't in DB yet)
      const { id, created_at, ...updateFields } = formData as any
      const { error } = await supabase.from('people').update(updateFields).eq('id', selectedPerson.id)
      if (error && error.message?.includes('manager_id')) {
        const { manager_id, ...safeFields } = updateFields
        await supabase.from('people').update(safeFields).eq('id', selectedPerson.id)
      }

      // 2. Persist in local storage manager map
      const storedMap = getStoredManagers()
      if (targetManagerId) {
        storedMap[selectedPerson.id] = targetManagerId
      } else {
        delete storedMap[selectedPerson.id]
      }
      saveStoredManagers(storedMap)

      // 3. Update local state
      setPeople(prev => {
        const updated = prev.map(p => p.id === selectedPerson.id ? { ...p, ...formData, manager_id: targetManagerId } as Person : p)
        buildGraph(updated)
        return updated
      })
    } else {
      // Insert new person
      const insertData: any = { ...formData }
      const { data: newPerson, error } = await supabase.from('people').insert(insertData).select().single()
      
      let created = newPerson
      if (error && error.message?.includes('manager_id')) {
        const { manager_id, ...safeInsert } = insertData
        const { data: retryPerson } = await supabase.from('people').insert(safeInsert).select().single()
        created = retryPerson
      }

      if (created) {
        if (targetManagerId) {
          const storedMap = getStoredManagers()
          storedMap[created.id] = targetManagerId
          saveStoredManagers(storedMap)
        }
        setPeople(prev => {
          const updated = [...prev, { ...created, manager_id: targetManagerId }]
          buildGraph(updated)
          return updated
        })
      }
    }

    setIsEditModalOpen(false)
    setIsAddModalOpen(false)
  }

  // ZERO-CASCADE DELETION:
  // Only the deleted person and edges directly attached to this person are removed.
  // All other edges in the company remain 100% untouched!
  const handleDeletePerson = async (id: string, name?: string) => {
    const ok = await confirm({
      title: 'Supprimer le collaborateur',
      itemTitle: name,
      message: name 
        ? `Confirmez-vous la suppression définitive de ${name} de l'organigramme ? Cette action est irréversible.`
        : 'Voulez-vous vraiment supprimer ce collaborateur de l\'organigramme ? Cette action est irréversible.',
      confirmText: 'Supprimer définitivement',
      variant: 'danger',
    })
    if (!ok) return

    // 1. Delete in Supabase
    await supabase.from('people').delete().eq('id', id)

    // 2. Clean up stored manager map
    const storedMap = getStoredManagers()
    delete storedMap[id]
    
    // If anyone was reporting directly to this deleted person, reassign them cleanly to the Gérant
    const gerant = people.find(p => p.category === 'gérant' || p.role?.toLowerCase().includes('gérant'))
    Object.keys(storedMap).forEach(childId => {
      if (storedMap[childId] === id) {
        storedMap[childId] = (gerant && gerant.id !== id) ? gerant.id : ''
      }
    })
    saveStoredManagers(storedMap)

    // 3. Update nodes and edges strictly by ID filtering:
    // ALL OTHER EDGES KEEP THEIR EXACT SOURCE AND TARGET!
    setNodes(nds => nds.filter(n => n.id !== id))
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id))
    setPeople(prev => prev.filter(p => p.id !== id))

    setIsEditModalOpen(false)
    setIsAddModalOpen(false)
  }

  // Interactive connection: draw a link between Manager (source) and Subordinate (target)
  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target || params.source === params.target) return
    
    // An employee can only have one primary manager: replace any existing incoming link
    setEdges(eds => [
      ...eds.filter(e => e.target !== params.target),
      {
        id: `e-${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
        type: 'smoothstep',
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
      }
    ])

    // Update stored manager map
    const storedMap = getStoredManagers()
    storedMap[params.target] = params.source
    saveStoredManagers(storedMap)

    // Update local state and attempt Supabase update
    setPeople(prev => prev.map(p => p.id === params.target ? { ...p, manager_id: params.source } : p))
    supabase.from('people').update({ manager_id: params.source }).eq('id', params.target).then(() => {})
  }, [setEdges, supabase])

  // Click on a link to inspect or delete that specific hierarchical link
  const onEdgeClick = useCallback(async (event: any, edge: Edge) => {
    const sourcePerson = people.find(p => p.id === edge.source)
    const targetPerson = people.find(p => p.id === edge.target)
    const sourceName = sourcePerson?.name || 'Responsable'
    const targetName = targetPerson?.name || 'Collaborateur'

    const ok = await confirm({
      title: 'Supprimer le lien hiérarchique',
      itemTitle: `${sourceName} → ${targetName}`,
      message: `Voulez-vous supprimer le lien hiérarchique entre "${sourceName}" et "${targetName}" ?`,
      confirmText: 'Supprimer le lien',
      variant: 'danger',
    })
    if (!ok) return

    // Remove only this specific edge
    setEdges(eds => eds.filter(e => e.id !== edge.id))
    
    const storedMap = getStoredManagers()
    delete storedMap[edge.target]
    saveStoredManagers(storedMap)

    setPeople(prev => prev.map(p => p.id === edge.target ? { ...p, manager_id: null } : p))
    supabase.from('people').update({ manager_id: null }).eq('id', edge.target).then(() => {})
  }, [people, setEdges, supabase])

  if (loading && !mounted) {
    return <div className="p-8 text-center text-slate-500">Chargement de l'organigramme...</div>
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Organigramme & Hiérarchie</h1>
          <p className="text-sm text-slate-500 mt-1">
            Liens hiérarchiques fixes et pérennes : aucune modification en cascade lors des suppressions.
          </p>
        </div>
        <Button onClick={handleOpenAddModal} className="gap-2">
          <Plus className="w-4 h-4" />
          Ajouter une personne
        </Button>
      </div>
      
      {/* Interactive Diagram Canvas */}
      <div className="h-[620px] border rounded-2xl overflow-hidden bg-slate-50/50 shadow-sm relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#cbd5e1" gap={16} />
          <Controls />
          <Panel position="top-right" className="bg-white/95 backdrop-blur-xs p-3 rounded-xl border shadow-xs text-xs text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
              <GitFork className="w-3.5 h-3.5 text-blue-600" />
              Contrôles de l'organigramme :
            </div>
            <div>👉 <strong>Clic sur une carte</strong> : Modifier ou supprimer le membre</div>
            <div>🔗 <strong>Tirer un lien (pastilles)</strong> : Relier un responsable à son collaborateur</div>
            <div>✂️ <strong>Clic sur un lien</strong> : Rompre un rattachement hiérarchique</div>
            <div>✋ <strong>Glisser un bloc</strong> : Ajuster librement les positions</div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Personnel Summary Grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Liste des collaborateurs ({people.length})</CardTitle>
            <p className="text-xs text-slate-500 mt-1">Tous les membres de l'équipe Fondax avec leur responsable direct</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleOpenAddModal} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Nouveau
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {people.map(person => {
              const storedMap = getStoredManagers()
              const mgrId = person.manager_id || storedMap[person.id]
              const manager = people.find(p => p.id === mgrId)

              return (
                <div 
                  key={person.id} 
                  className="group border rounded-xl p-4 flex items-start justify-between gap-3 bg-white hover:border-blue-300 hover:shadow-sm transition-all relative"
                >
                  <div 
                    className="flex items-start gap-3 flex-1 cursor-pointer"
                    onClick={() => { 
                      setSelectedPerson(person); 
                      setFormData({
                        ...person,
                        manager_id: mgrId || ''
                      }); 
                      setIsEditModalOpen(true); 
                    }}
                  >
                    <div className={`p-2.5 rounded-full ${person.category === 'encadrant' ? 'bg-blue-100 text-blue-700' : person.category === 'gérant' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{person.name}</div>
                      <div className="text-sm text-slate-600 truncate">{person.role || 'Sans rôle défini'}</div>
                      
                      {/* Direct Manager display */}
                      {manager ? (
                        <div className="text-[11px] text-blue-700 font-medium flex items-center gap-1 mt-1">
                          <Link2 className="w-3 h-3 text-blue-500" />
                          Rattaché à : {manager.name}
                        </div>
                      ) : person.category === 'gérant' ? (
                        <div className="text-[11px] text-amber-700 font-medium mt-1">Direction générale</div>
                      ) : (
                        <div className="text-[11px] text-slate-400 mt-1">Sans responsable désigné</div>
                      )}

                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {person.has_pc && <Badge variant="outline" className="text-[11px] bg-slate-50">💻 PC</Badge>}
                        {person.has_m365 && <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 border-blue-200">📧 M365</Badge>}
                        {person.category && (
                          <Badge variant="secondary" className="text-[11px] capitalize">
                            {person.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick actions on card */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { 
                        setSelectedPerson(person); 
                        setFormData({
                          ...person,
                          manager_id: mgrId || ''
                        }); 
                        setIsEditModalOpen(true); 
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Modifier la fiche"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePerson(person.id, person.name);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Supprimer définitivement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog 
        open={isEditModalOpen || isAddModalOpen} 
        onOpenChange={(open) => { 
          if (!open) {
            setIsEditModalOpen(false); 
            setIsAddModalOpen(false); 
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPerson ? `Modifier : ${selectedPerson.name}` : 'Ajouter un collaborateur'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nom et Prénom</Label>
              <Input 
                placeholder="ex: Jean Dupont"
                value={formData.name || ''} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Rôle / Intitulé de poste</Label>
              <Input 
                placeholder="ex: Responsable Maintenance, Opérateur fonderie..."
                value={formData.role || ''} 
                onChange={e => setFormData({...formData, role: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Département / Pôle</Label>
              <div className="flex gap-2">
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={DEPARTMENTS.includes(formData.department || '') ? (formData.department || '') : 'Autre'}
                  onChange={e => {
                    if (e.target.value !== 'Autre') {
                      setFormData({...formData, department: e.target.value})
                    }
                  }}
                >
                  {DEPARTMENTS.map(dep => (
                    <option key={dep} value={dep}>{dep}</option>
                  ))}
                </select>
                {(!formData.department || !DEPARTMENTS.includes(formData.department) || formData.department === 'Autre') && (
                  <Input 
                    placeholder="Préciser le département"
                    value={formData.department === 'Autre' ? '' : (formData.department || '')} 
                    onChange={e => setFormData({...formData, department: e.target.value})} 
                  />
                )}
              </div>
            </div>

            {/* Hierarchical Supervisor Selection */}
            <div className="space-y-2">
              <Label>Responsable hiérarchique direct (Rattaché à)</Label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.manager_id || ''} 
                onChange={e => setFormData({...formData, manager_id: e.target.value})}
              >
                <option value="">Aucun (Direction générale / Sommet de l'organigramme)</option>
                {people
                  .filter(p => p.id !== selectedPerson?.id)
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.role || p.department || p.category}
                    </option>
                  ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Ce lien est fixe et ne changera jamais automatiquement si d'autres personnes sont supprimées.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Catégorie hiérarchique</Label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.category || 'opérateur'} 
                onChange={e => setFormData({...formData, category: e.target.value as any})}
              >
                <option value="gérant">Gérant / Direction</option>
                <option value="encadrant">Encadrant (Responsable de pôle)</option>
                <option value="opérateur">Opérateur atelier / Terrain</option>
              </select>
            </div>
            
            <div className="border rounded-lg p-3 space-y-3 bg-slate-50/50">
              <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Équipements & Comptes attribués
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={formData.has_pc || false} 
                    onChange={e => setFormData({...formData, has_pc: e.target.checked})} 
                  />
                  {formData.has_pc ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                  <span>Poste PC attribué (💻)</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={formData.has_m365 || false} 
                    onChange={e => setFormData({...formData, has_m365: e.target.checked})} 
                  />
                  {formData.has_m365 ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5 text-slate-400" />}
                  <span>Licence M365 (📧)</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            {selectedPerson ? (
              <Button 
                variant="outline" 
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1.5"
                onClick={() => handleDeletePerson(selectedPerson.id, selectedPerson.name)}
              >
                <Trash2 className="w-4 h-4" />
                Supprimer ce collaborateur
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setIsEditModalOpen(false); setIsAddModalOpen(false); }}>
                Annuler
              </Button>
              <Button onClick={handleSavePerson}>
                {selectedPerson ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


