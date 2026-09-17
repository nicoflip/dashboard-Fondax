'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Wifi, Monitor, Plus, Lock, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Network, LanDevice, NetworkEquipment } from '@/lib/types'

interface NetworkLanPanelProps {
  networks: Network[]
  lanDevices: LanDevice[]
  displayedLanDevices: LanDevice[]
  equipments: NetworkEquipment[]
  isolatedNetworkId: string | null
  lockedNetworkIds: Set<string>
  activeIsolatedNetwork: Network | null
  toggleNetworkIsolation: (id: string) => void
  onAddNetwork: () => void
  onEditNetwork: (net: Network) => void
  onDeleteNetwork: (id: string, ssid?: string | null) => void
  onAddLanDevice: () => void
  onEditLanDevice: (dev: LanDevice) => void
  onDeleteLanDevice: (id: string, name?: string | null) => void
  placeLanDeviceOnTopology: (dev: LanDevice) => void
}

export function NetworkLanPanel({
  networks,
  displayedLanDevices,
  equipments,
  isolatedNetworkId,
  lockedNetworkIds,
  activeIsolatedNetwork,
  toggleNetworkIsolation,
  onAddNetwork,
  onEditNetwork,
  onDeleteNetwork,
  onAddLanDevice,
  onEditLanDevice,
  onDeleteLanDevice,
  placeLanDeviceOnTopology
}: NetworkLanPanelProps) {
  return (
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
            onClick={onAddNetwork} 
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
                      onClick={() => onEditNetwork(net)}
                      className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Supprimer ce réseau"
                      onClick={() => onDeleteNetwork(net.id, net.ssid)}
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
              onClick={onAddLanDevice} 
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
                        onClick={() => onEditLanDevice(dev)}
                        className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Supprimer cet appareil"
                        onClick={() => onDeleteLanDevice(dev.id, dev.hostname)}
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
  )
}
