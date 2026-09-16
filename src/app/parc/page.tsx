'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Computer, Equipment } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogContent } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CustomDatePicker } from '@/components/ui/date-picker'
import { Monitor, Server, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { differenceInDays, isPast } from 'date-fns'

export default function ParcPage() {
  const supabase = createClient()
  const [computers, setComputers] = useState<Computer[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  
  // Computer Dialog State
  const [isCompAddOpen, setIsCompAddOpen] = useState(false)
  const [isCompEditOpen, setIsCompEditOpen] = useState(false)
  const [selectedComp, setSelectedComp] = useState<Computer | null>(null)
  
  // Comp Form
  const [compName, setCompName] = useState('')
  const [compUser, setCompUser] = useState('')
  const [compOS, setCompOS] = useState('')
  const [compAV, setCompAV] = useState('')
  const [compWarranty, setCompWarranty] = useState('')
  const [compNotes, setCompNotes] = useState('')

  // Equipment Dialog State
  const [isEqAddOpen, setIsEqAddOpen] = useState(false)
  const [isEqEditOpen, setIsEqEditOpen] = useState(false)
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null)

  // Eq Form
  const [eqName, setEqName] = useState('')
  const [eqType, setEqType] = useState('')
  const [eqModel, setEqModel] = useState('')
  const [eqLocation, setEqLocation] = useState('')
  const [eqCharacteristics, setEqCharacteristics] = useState('')
  const [eqNotes, setEqNotes] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const [compRes, eqRes] = await Promise.all([
      supabase.from('computers').select('*').order('name'),
      supabase.from('equipment').select('*').order('name')
    ])
    if (compRes.data) setComputers(compRes.data as Computer[])
    if (eqRes.data) setEquipment(eqRes.data as Equipment[])
    setLoading(false)
  }

  // --- Computers ---
  const resetCompForm = () => {
    setCompName('')
    setCompUser('')
    setCompOS('')
    setCompAV('')
    setCompWarranty('')
    setCompNotes('')
    setSelectedComp(null)
  }

  const openCompEdit = (comp: Computer) => {
    setSelectedComp(comp)
    setCompName(comp.name)
    setCompUser(comp.user_name || '')
    setCompOS(comp.os || '')
    setCompAV(comp.antivirus_status || '')
    setCompWarranty(comp.warranty_date ? comp.warranty_date.split('T')[0] : '')
    setCompNotes(comp.notes || '')
    setIsCompEditOpen(true)
  }

  const handleCompAdd = async () => {
    const { error } = await supabase.from('computers').insert([{
      name: compName, user_name: compUser || null, os: compOS || null, 
      antivirus_status: compAV || null, warranty_date: compWarranty || null, notes: compNotes || null
    }])
    if (!error) {
      setIsCompAddOpen(false)
      fetchData()
    }
  }

  const handleCompUpdate = async () => {
    if (!selectedComp) return
    const { error } = await supabase.from('computers').update({
      name: compName, user_name: compUser || null, os: compOS || null, 
      antivirus_status: compAV || null, warranty_date: compWarranty || null, notes: compNotes || null
    }).eq('id', selectedComp.id)
    if (!error) {
      setIsCompEditOpen(false)
      fetchData()
    }
  }

  const handleCompDelete = async () => {
    if (!selectedComp) return
    const { error } = await supabase.from('computers').delete().eq('id', selectedComp.id)
    if (!error) {
      setIsCompEditOpen(false)
      fetchData()
    }
  }

  // --- Equipment ---
  const resetEqForm = () => {
    setEqName('')
    setEqType('')
    setEqModel('')
    setEqLocation('')
    setEqCharacteristics('')
    setEqNotes('')
    setSelectedEq(null)
  }

  const openEqEdit = (eq: Equipment) => {
    setSelectedEq(eq)
    setEqName(eq.name)
    setEqType(eq.type || '')
    setEqModel(eq.model || '')
    setEqLocation(eq.location || '')
    setEqCharacteristics(eq.characteristics || '')
    setEqNotes(eq.notes || '')
    setIsEqEditOpen(true)
  }

  const handleEqAdd = async () => {
    const { error } = await supabase.from('equipment').insert([{
      name: eqName, type: eqType || null, model: eqModel || null, 
      location: eqLocation || null, characteristics: eqCharacteristics || null, notes: eqNotes || null
    }])
    if (!error) {
      setIsEqAddOpen(false)
      fetchData()
    }
  }

  const handleEqUpdate = async () => {
    if (!selectedEq) return
    const { error } = await supabase.from('equipment').update({
      name: eqName, type: eqType || null, model: eqModel || null, 
      location: eqLocation || null, characteristics: eqCharacteristics || null, notes: eqNotes || null
    }).eq('id', selectedEq.id)
    if (!error) {
      setIsEqEditOpen(false)
      fetchData()
    }
  }

  const handleEqDelete = async () => {
    if (!selectedEq) return
    const { error } = await supabase.from('equipment').delete().eq('id', selectedEq.id)
    if (!error) {
      setIsEqEditOpen(false)
      fetchData()
    }
  }

  // Utilities
  const getAVBadgeColor = (status: string) => {
    const s = status.toLowerCase()
    if (s.includes('sophos') || s.includes('defender') || s.includes('ok')) return 'bg-green-100 text-green-800'
    if (s.includes('aucun') || s.includes('non') || s.includes('désactivé')) return 'bg-red-100 text-red-800'
    return 'bg-amber-100 text-amber-800'
  }

  const renderWarrantyBadge = (dateStr: string | null) => {
    if (!dateStr) return <Badge variant="secondary" className="bg-slate-100 text-slate-500">Garantie inconnue</Badge>
    const d = new Date(dateStr)
    const days = differenceInDays(d, new Date())
    
    if (isPast(d)) return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Garantie expirée</Badge>
    if (days <= 30) return <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Bientôt expirée</Badge>
    return <Badge variant="outline">Garantie : {formatDate(dateStr)}</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Parc Informatique</h1>
      </div>

      <Tabs defaultValue="postes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="postes" className="flex items-center gap-2"><Monitor className="h-4 w-4" /> Postes informatiques</TabsTrigger>
          <TabsTrigger value="reseau" className="flex items-center gap-2"><Server className="h-4 w-4" /> Équipements réseau</TabsTrigger>
        </TabsList>

        <TabsContent value="postes" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Postes utilisateurs</h2>
            <Button onClick={() => { resetCompForm(); setIsCompAddOpen(true); }} size="sm">
              <Plus className="h-4 w-4 mr-2" /> Ajouter un poste
            </Button>
          </div>

          {loading ? <p>Chargement...</p> : computers.length === 0 ? <p className="text-slate-500">Aucun poste informatique.</p> : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {computers.map(comp => (
                <Card key={comp.id} className="cursor-pointer hover:border-blue-400 transition-colors" onClick={() => openCompEdit(comp)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-center text-lg">
                      {comp.name}
                      <Monitor className="h-4 w-4 text-slate-400" />
                    </CardTitle>
                    <div className="text-sm text-slate-500">{comp.user_name || 'Sans utilisateur'}</div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-2 text-sm">
                    <div className="flex gap-2 flex-wrap">
                      {comp.os && <Badge variant="outline">{comp.os}</Badge>}
                      {comp.antivirus_status && <Badge className={getAVBadgeColor(comp.antivirus_status)}>{comp.antivirus_status}</Badge>}
                    </div>
                    <div>
                      {renderWarrantyBadge(comp.warranty_date)}
                    </div>
                    {comp.notes && <p className="text-slate-600 line-clamp-2 mt-2 bg-slate-50 p-2 rounded text-xs">{comp.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reseau" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Équipements réseau</h2>
            <Button onClick={() => { resetEqForm(); setIsEqAddOpen(true); }} size="sm">
              <Plus className="h-4 w-4 mr-2" /> Ajouter un équipement
            </Button>
          </div>

          {loading ? <p>Chargement...</p> : equipment.length === 0 ? <p className="text-slate-500">Aucun équipement réseau.</p> : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {equipment.map(eq => (
                <Card key={eq.id} className="cursor-pointer hover:border-blue-400 transition-colors" onClick={() => openEqEdit(eq)}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex justify-between items-center text-lg">
                      {eq.name}
                      <Server className="h-4 w-4 text-slate-400" />
                    </CardTitle>
                    <div className="text-sm text-slate-500">{eq.type || 'Type inconnu'} • {eq.location || 'Emplacement inconnu'}</div>
                  </CardHeader>
                  <CardContent className="space-y-2 pb-2 text-sm">
                    {eq.model && <div><span className="font-medium">Modèle :</span> {eq.model}</div>}
                    {eq.characteristics && <div><span className="font-medium">Caractéristiques :</span> {eq.characteristics}</div>}
                    {eq.notes && <p className="text-slate-600 line-clamp-2 mt-2 bg-slate-50 p-2 rounded text-xs">{eq.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* COMP ADD DIALOG */}
      <Dialog open={isCompAddOpen} onOpenChange={setIsCompAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un poste informatique</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nom du poste</Label><Input value={compName} onChange={e => setCompName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Utilisateur</Label><Input value={compUser} onChange={e => setCompUser(e.target.value)} /></div>
            <div className="space-y-2"><Label>Système d'exploitation (OS)</Label><Input value={compOS} onChange={e => setCompOS(e.target.value)} /></div>
            <div className="space-y-2"><Label>Antivirus</Label><Input value={compAV} onChange={e => setCompAV(e.target.value)} placeholder="ex: Sophos, Defender, Aucun..." /></div>
            <div className="space-y-1.5"><Label className="text-xs">Date de fin de garantie</Label><CustomDatePicker value={compWarranty} onChange={setCompWarranty} placeholder="Sélectionner la date de fin de garantie" className="h-9 text-xs" /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={compNotes} onChange={e => setCompNotes(e.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsCompAddOpen(false)}>Annuler</Button><Button onClick={handleCompAdd}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COMP EDIT DIALOG */}
      <Dialog open={isCompEditOpen} onOpenChange={setIsCompEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier un poste informatique</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nom du poste</Label><Input value={compName} onChange={e => setCompName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Utilisateur</Label><Input value={compUser} onChange={e => setCompUser(e.target.value)} /></div>
            <div className="space-y-2"><Label>Système d'exploitation (OS)</Label><Input value={compOS} onChange={e => setCompOS(e.target.value)} /></div>
            <div className="space-y-2"><Label>Antivirus</Label><Input value={compAV} onChange={e => setCompAV(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Date de fin de garantie</Label><CustomDatePicker value={compWarranty} onChange={setCompWarranty} placeholder="Sélectionner la date de fin de garantie" className="h-9 text-xs" /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={compNotes} onChange={e => setCompNotes(e.target.value)} /></div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="destructive" onClick={handleCompDelete}><Trash2 className="h-4 w-4 mr-2"/> Supprimer</Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setIsCompEditOpen(false)}>Annuler</Button>
              <Button onClick={handleCompUpdate}>Enregistrer</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EQ ADD DIALOG */}
      <Dialog open={isEqAddOpen} onOpenChange={setIsEqAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un équipement réseau</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nom</Label><Input value={eqName} onChange={e => setEqName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Type</Label><Input value={eqType} onChange={e => setEqType(e.target.value)} /></div>
            <div className="space-y-2"><Label>Modèle</Label><Input value={eqModel} onChange={e => setEqModel(e.target.value)} /></div>
            <div className="space-y-2"><Label>Emplacement</Label><Input value={eqLocation} onChange={e => setEqLocation(e.target.value)} /></div>
            <div className="space-y-2"><Label>Caractéristiques</Label><Textarea value={eqCharacteristics} onChange={e => setEqCharacteristics(e.target.value)} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={eqNotes} onChange={e => setEqNotes(e.target.value)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsEqAddOpen(false)}>Annuler</Button><Button onClick={handleEqAdd}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EQ EDIT DIALOG */}
      <Dialog open={isEqEditOpen} onOpenChange={setIsEqEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier un équipement réseau</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Nom</Label><Input value={eqName} onChange={e => setEqName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Type</Label><Input value={eqType} onChange={e => setEqType(e.target.value)} /></div>
            <div className="space-y-2"><Label>Modèle</Label><Input value={eqModel} onChange={e => setEqModel(e.target.value)} /></div>
            <div className="space-y-2"><Label>Emplacement</Label><Input value={eqLocation} onChange={e => setEqLocation(e.target.value)} /></div>
            <div className="space-y-2"><Label>Caractéristiques</Label><Textarea value={eqCharacteristics} onChange={e => setEqCharacteristics(e.target.value)} /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={eqNotes} onChange={e => setEqNotes(e.target.value)} /></div>
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button variant="destructive" onClick={handleEqDelete}><Trash2 className="h-4 w-4 mr-2"/> Supprimer</Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setIsEqEditOpen(false)}>Annuler</Button>
              <Button onClick={handleEqUpdate}>Enregistrer</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
