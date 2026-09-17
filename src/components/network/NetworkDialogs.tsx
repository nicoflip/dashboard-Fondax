'use client'

import React from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Network, LanDevice, NetworkEquipment } from '@/lib/types'

// Add Zone Dialog
export function NetworkAddZoneDialog({
  isOpen, onOpenChange, newZone, setNewZone, handleAddZone
}: {
  isOpen: boolean; onOpenChange: (open: boolean) => void;
  newZone: any; setNewZone: (zone: any) => void; handleAddZone: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleAddZone} disabled={!newZone.label}>Créer la zone</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Add/Edit Network Dialog
export function NetworkFormDialog({
  isOpen, onOpenChange, networkForm, setNetworkForm, onSave, isEdit, equipments
}: {
  isOpen: boolean; onOpenChange: (open: boolean) => void;
  networkForm: Partial<Network> & { addToTopology?: boolean; connectToEquipId?: string };
  setNetworkForm: (form: any) => void;
  onSave: () => void; isEdit: boolean; equipments: NetworkEquipment[];
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le réseau' : 'Ajouter un réseau / SSID'}</DialogTitle>
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

          {!isEdit && (
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
          )}

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
              rows={isEdit ? 3 : 2} 
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={onSave} disabled={!networkForm.ssid} className={isEdit ? '' : "bg-purple-600 hover:bg-purple-700 text-white cursor-pointer"}>
            {isEdit ? 'Enregistrer les modifications' : 'Ajouter le réseau'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Add/Edit LAN Device Dialog
export function LanDeviceFormDialog({
  isOpen, onOpenChange, lanForm, setLanForm, onSave, isEdit, networks
}: {
  isOpen: boolean; onOpenChange: (open: boolean) => void;
  lanForm: Partial<LanDevice> & { addToTopology?: boolean };
  setLanForm: (form: any) => void;
  onSave: () => void; isEdit: boolean; networks: Network[];
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'appareil LAN" : "Ajouter un appareil LAN"}</DialogTitle>
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

          {!isEdit && (
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
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={onSave} disabled={!lanForm.ip}>
            {isEdit ? 'Enregistrer' : "Ajouter l'appareil"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
