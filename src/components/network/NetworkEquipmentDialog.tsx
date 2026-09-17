'use client'

import React from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Cable } from 'lucide-react'
import { NetworkEquipment } from '@/lib/types'
import { equipmentTypes } from './NetworkUtils'

interface NetworkEquipmentDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  newEquip: Partial<NetworkEquipment> & { autoConnectId?: string; connType?: string }
  setNewEquip: (equip: Partial<NetworkEquipment> & { autoConnectId?: string; connType?: string }) => void
  handleAddEquipment: () => void
  equipments: NetworkEquipment[]
}

export function NetworkEquipmentDialog({
  isOpen,
  onOpenChange,
  newEquip,
  setNewEquip,
  handleAddEquipment,
  equipments
}: NetworkEquipmentDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleAddEquipment} disabled={!newEquip.name}>Ajouter et placer sur la topologie</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
