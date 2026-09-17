'use client'

import React from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { NetworkCanvas } from '@/components/network/NetworkCanvas'

export default function ReseauPage() {
  return (
    <ReactFlowProvider>
      <NetworkCanvas />
    </ReactFlowProvider>
  )
}
