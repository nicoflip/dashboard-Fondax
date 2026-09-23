'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { VENDOR_ISSUE_STATUS_COLORS } from '@/lib/utils'
import { Vendor, VendorIssue } from '@/lib/types'
import { Plus, ChevronDown, ChevronUp, Edit2, Trash2, Pencil } from 'lucide-react'
import { useConfirm } from '@/components/ui/confirm-dialog'

export default function PrestatairesPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [issues, setIssues] = useState<VendorIssue[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null)
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null)
  const supabase = createClient()
  const confirm = useConfirm()

  // Add Vendor Dialog
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false)
  const [newVendor, setNewVendor] = useState({ name: '', scope: '', known_access: '', notes: '' })

  // Add Issue Dialog
  const [isAddIssueOpen, setIsAddIssueOpen] = useState(false)
  const [selectedVendorForIssue, setSelectedVendorForIssue] = useState<string | null>(null)
  const [newIssue, setNewIssue] = useState({ title: '', description: '', status: 'en attente' })

  // Edit Issue Dialog
  const [isEditIssueOpen, setIsEditIssueOpen] = useState(false)
  const [editingIssue, setEditingIssue] = useState<VendorIssue | null>(null)
  const [editIssueForm, setEditIssueForm] = useState({ title: '', description: '', status: 'en attente' })

  const fetchData = async () => {
    setLoading(true)
    const [vendorsRes, issuesRes] = await Promise.all([
      supabase.from('vendors').select('*').order('name'),
      supabase.from('vendor_issues').select('*').order('created_at', { ascending: false })
    ])
    
    if (vendorsRes.data) setVendors(vendorsRes.data)
    if (issuesRes.data) setIssues(issuesRes.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAddVendor = async () => {
    const { data, error } = await supabase.from('vendors').insert([newVendor]).select().single()
    if (!error && data) {
      setVendors([...vendors, data])
      setIsAddVendorOpen(false)
      setNewVendor({ name: '', scope: '', known_access: '', notes: '' })
    }
  }

  const handleUpdateVendor = async (vendor: Vendor) => {
    const { error } = await supabase.from('vendors').update({
      name: vendor.name,
      scope: vendor.scope,
      known_access: vendor.known_access,
      notes: vendor.notes
    }).eq('id', vendor.id)
    if (!error) {
      setEditingVendorId(null)
      fetchData()
    }
  }

  const handleDeleteVendor = async (vendorId: string, name: string) => {
    const ok = await confirm({
      title: 'Supprimer le prestataire',
      itemTitle: name,
      message: `Voulez-vous vraiment supprimer le prestataire "${name}" et tous ses tickets associés ? Cette action est irréversible.`,
      confirmText: 'Supprimer définitivement',
      variant: 'danger',
    })
    if (!ok) return
    const { error } = await supabase.from('vendors').delete().eq('id', vendorId)
    if (!error) {
      setVendors(vendors.filter(v => v.id !== vendorId))
      setIssues(issues.filter(i => i.vendor_id !== vendorId))
    }
  }

  const handleAddIssue = async () => {
    if (!selectedVendorForIssue) return
    const { data, error } = await supabase.from('vendor_issues').insert([{
      vendor_id: selectedVendorForIssue,
      title: newIssue.title,
      description: newIssue.description,
      status: newIssue.status
    }]).select().single()
    if (!error && data) {
      setIssues([data, ...issues])
      setIsAddIssueOpen(false)
      setNewIssue({ title: '', description: '', status: 'en attente' })
    }
  }

  const openEditIssue = (issue: VendorIssue) => {
    setEditingIssue(issue)
    setEditIssueForm({
      title: issue.title,
      description: issue.description || '',
      status: issue.status
    })
    setIsEditIssueOpen(true)
  }

  const handleUpdateIssue = async () => {
    if (!editingIssue) return
    const { error } = await supabase.from('vendor_issues').update({
      title: editIssueForm.title,
      description: editIssueForm.description || null,
      status: editIssueForm.status as any
    }).eq('id', editingIssue.id)

    if (!error) {
      setIssues(issues.map(i => i.id === editingIssue.id ? { ...i, ...editIssueForm } as VendorIssue : i))
      setIsEditIssueOpen(false)
    }
  }

  const handleDeleteIssue = async (issueId: string, title: string) => {
    const ok = await confirm({
      title: 'Supprimer le ticket',
      itemTitle: title,
      message: `Êtes-vous sûr de vouloir supprimer ce ticket ? Cette action est irréversible.`,
      confirmText: 'Supprimer définitivement',
      variant: 'danger',
    })
    if (!ok) return
    const { error } = await supabase.from('vendor_issues').delete().eq('id', issueId)
    if (!error) {
      setIssues(issues.filter(i => i.id !== issueId))
    }
  }

  const handleUpdateIssueStatus = async (issueId: string, status: any) => {
    const { error } = await supabase.from('vendor_issues').update({ status }).eq('id', issueId)
    if (!error) {
      setIssues(issues.map(i => i.id === issueId ? { ...i, status } : i))
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedVendorId(expandedVendorId === id ? null : id)
  }

  if (loading) return <div className="p-8">Chargement...</div>

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Prestataires & Contrats</h1>
        <Button onClick={() => setIsAddVendorOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Ajouter un prestataire
        </Button>
      </div>

      {vendors.length === 0 ? (
        <div className="text-center text-slate-500 py-12">Aucun prestataire trouvé.</div>
      ) : (
        <div className="space-y-4">
          {vendors.map(vendor => (
            <Card key={vendor.id} className="overflow-hidden">
              <CardHeader className="bg-slate-50 cursor-pointer" onClick={() => toggleExpand(vendor.id)}>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl">{vendor.name}</CardTitle>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-1">{vendor.scope}</p>
                  </div>
                  {expandedVendorId === vendor.id ? <ChevronUp /> : <ChevronDown />}
                </div>
              </CardHeader>
              
              {expandedVendorId === vendor.id && (
                <CardContent className="p-6">
                  {editingVendorId === vendor.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nom</Label>
                          <Input value={vendor.name} onChange={e => setVendors(vendors.map(v => v.id === vendor.id ? { ...v, name: e.target.value } : v))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Périmètre</Label>
                          <Input value={vendor.scope || ''} onChange={e => setVendors(vendors.map(v => v.id === vendor.id ? { ...v, scope: e.target.value } : v))} />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label>Accès connus</Label>
                          <Textarea value={vendor.known_access || ''} onChange={e => setVendors(vendors.map(v => v.id === vendor.id ? { ...v, known_access: e.target.value } : v))} />
                        </div>
                        <div className="space-y-2 col-span-2">
                          <Label>Notes</Label>
                          <Textarea value={vendor.notes || ''} onChange={e => setVendors(vendors.map(v => v.id === vendor.id ? { ...v, notes: e.target.value } : v))} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => { setEditingVendorId(null); fetchData(); }}>Annuler</Button>
                        <Button onClick={() => handleUpdateVendor(vendor)}>Enregistrer</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingVendorId(vendor.id)}>
                          <Edit2 className="w-4 h-4 mr-2" /> Modifier
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteVendor(vendor.id, vendor.name)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Supprimer
                        </Button>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-sm text-slate-500 mb-1">Périmètre d'intervention</h4>
                          <p className="text-slate-800 whitespace-pre-wrap">{vendor.scope || '-'}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-slate-500 mb-1">Accès connus</h4>
                          <p className="text-slate-800 whitespace-pre-wrap">{vendor.known_access || '-'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <h4 className="font-semibold text-sm text-slate-500 mb-1">Notes</h4>
                          <p className="text-slate-800 whitespace-pre-wrap">{vendor.notes || '-'}</p>
                        </div>
                      </div>

                      <div className="border-t pt-6 mt-6">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold">Tickets & Problèmes</h3>
                          <Button variant="outline" size="sm" onClick={() => { setSelectedVendorForIssue(vendor.id); setIsAddIssueOpen(true); }}>
                            <Plus className="w-4 h-4 mr-2" /> Nouveau ticket
                          </Button>
                        </div>
                        
                        <div className="space-y-3">
                          {issues.filter(i => i.vendor_id === vendor.id).length === 0 ? (
                            <p className="text-sm text-slate-500">Aucun ticket.</p>
                          ) : (
                            issues.filter(i => i.vendor_id === vendor.id).map(issue => (
                              <div key={issue.id} className="flex flex-col md:flex-row md:items-start justify-between bg-white border rounded p-4 gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium">{issue.title}</span>
                                    <Badge className={VENDOR_ISSUE_STATUS_COLORS[issue.status as keyof typeof VENDOR_ISSUE_STATUS_COLORS]}>{issue.status}</Badge>
                                  </div>
                                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{issue.description}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="w-36">
                                    <Select 
                                      value={issue.status} 
                                      onChange={(e) => handleUpdateIssueStatus(issue.id, e.target.value)}
                                      className="w-full text-sm"
                                    >
                                      <option value="en attente">en attente</option>
                                      <option value="résolu">résolu</option>
                                      <option value="non résolu">non résolu</option>
                                    </Select>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Modifier ce ticket"
                                    onClick={() => openEditIssue(issue)}
                                    className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Supprimer ce ticket"
                                    onClick={() => handleDeleteIssue(issue.id, issue.title)}
                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Vendor Dialog */}
      <Dialog open={isAddVendorOpen} onClose={() => setIsAddVendorOpen(false)}>
        <DialogHeader>
          <DialogTitle>Ajouter un prestataire</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nom</Label>
            <Input value={newVendor.name} onChange={e => setNewVendor({...newVendor, name: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Périmètre</Label>
            <Input value={newVendor.scope} onChange={e => setNewVendor({...newVendor, scope: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Accès connus</Label>
            <Textarea value={newVendor.known_access} onChange={e => setNewVendor({...newVendor, known_access: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={newVendor.notes} onChange={e => setNewVendor({...newVendor, notes: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddVendorOpen(false)}>Annuler</Button>
          <Button onClick={handleAddVendor}>Enregistrer</Button>
        </DialogFooter>
      </Dialog>

      {/* Add Issue Dialog */}
      <Dialog open={isAddIssueOpen} onClose={() => setIsAddIssueOpen(false)}>
        <DialogHeader>
          <DialogTitle>Nouveau ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input value={newIssue.title} onChange={e => setNewIssue({...newIssue, title: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={newIssue.description} onChange={e => setNewIssue({...newIssue, description: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={newIssue.status} onChange={e => setNewIssue({...newIssue, status: e.target.value as any})}>
              <option value="en attente">en attente</option>
              <option value="non résolu">non résolu</option>
              <option value="résolu">résolu</option>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsAddIssueOpen(false)}>Annuler</Button>
          <Button onClick={handleAddIssue}>Enregistrer</Button>
        </DialogFooter>
      </Dialog>

      {/* Edit Issue Dialog */}
      <Dialog open={isEditIssueOpen} onClose={() => setIsEditIssueOpen(false)}>
        <DialogHeader>
          <DialogTitle>Modifier le ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Titre du ticket</Label>
            <Input 
              value={editIssueForm.title} 
              onChange={e => setEditIssueForm({...editIssueForm, title: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select 
              value={editIssueForm.status} 
              onChange={e => setEditIssueForm({...editIssueForm, status: e.target.value as any})}
            >
              <option value="en attente">en attente</option>
              <option value="non résolu">non résolu</option>
              <option value="résolu">résolu</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              value={editIssueForm.description} 
              onChange={e => setEditIssueForm({...editIssueForm, description: e.target.value})} 
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsEditIssueOpen(false)}>Annuler</Button>
          <Button onClick={handleUpdateIssue} disabled={!editIssueForm.title}>Enregistrer les modifications</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
