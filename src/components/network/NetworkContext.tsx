'use client'

import React, { createContext } from 'react'
import { Network } from '@/lib/types'

export interface NetworkCanvasContextType {
  lockedNetworkIds: Set<string>
  toggleLockNetwork: (networkNodeId: string) => void
  openAddEquipmentForNetwork: (netData: Network) => void
}

export const NetworkCanvasContext = createContext<NetworkCanvasContextType>({
  lockedNetworkIds: new Set(),
  toggleLockNetwork: () => {},
  openAddEquipmentForNetwork: () => {},
})
