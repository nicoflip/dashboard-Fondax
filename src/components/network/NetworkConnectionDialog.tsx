'use client'

import React from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Cable, ArrowLeftRight, ArrowRight, ArrowLeft, Ban, Activity, CheckCircle2, AlertTriangle, Check, Trash2 } from 'lucide-react'
import { NetworkEquipment } from '@/lib/types'
import { cn } from '@/lib/utils'

interface NetworkConnectionDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedEdgeSource: NetworkEquipment | null
  selectedEdgeTarget: NetworkEquipment | null
  edgeLabelInput: string
  setEdgeLabelInput: (val: string) => void
  edgeDirectionInput: 'both' | 'forward' | 'reverse' | 'none'
  setEdgeDirectionInput: (val: 'both' | 'forward' | 'reverse' | 'none') => void
  edgeFlowStatusInput: 'active' | 'blocked'
  setEdgeFlowStatusInput: (val: 'active' | 'blocked') => void
  edgeTypeInput: 'ethernet' | 'fibre' | 'wifi' | 'vpn' | 'inconnu'
  setEdgeTypeInput: (val: 'ethernet' | 'fibre' | 'wifi' | 'vpn' | 'inconnu') => void
  edgeDescInput: string
  setEdgeDescInput: (val: string) => void
  handleUpdateEdge: () => void
  handleDeleteEdge: () => void
}

export function NetworkConnectionDialog({
  isOpen,
  onOpenChange,
  selectedEdgeSource,
  selectedEdgeTarget,
  edgeLabelInput,
  setEdgeLabelInput,
  edgeDirectionInput,
  setEdgeDirectionInput,
  edgeFlowStatusInput,
  setEdgeFlowStatusInput,
  edgeTypeInput,
  setEdgeTypeInput,
  edgeDescInput,
  setEdgeDescInput,
  handleUpdateEdge,
  handleDeleteEdge
}: NetworkConnectionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Nom / Libellé de la liaison</Label>
            <Input 
              placeholder="ex: Fibre WAN SFR, Trunk Switch Baie, Câble Atelier..."
              value={edgeLabelInput} 
              onChange={e => setEdgeLabelInput(e.target.value)} 
            />
          </div>

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
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={handleUpdateEdge} className="bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
              Enregistrer la liaison
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
