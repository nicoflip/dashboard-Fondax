'use client'

import React from 'react'
import { NodeResizer } from '@xyflow/react'
import { Layers, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export const ZoneNode = React.memo(({ id, data, selected }: { id: string; data: any; selected?: boolean }) => {
  const colorMap: Record<string, string> = {
    blue: 'border-blue-400/80 bg-blue-50/40 text-blue-900',
    slate: 'border-slate-300 bg-slate-50/50 text-slate-900',
    amber: 'border-amber-400/80 bg-amber-50/40 text-amber-900',
    purple: 'border-purple-400/80 bg-purple-50/40 text-purple-900',
    emerald: 'border-emerald-400/80 bg-emerald-50/40 text-emerald-900',
  }
  const colorStyle = colorMap[data.color || 'slate'] || colorMap.slate

  return (
    <div 
      className={cn(
        "rounded-2xl border-2 border-dashed p-4 transition-colors pointer-events-auto h-full w-full relative select-none",
        colorStyle,
        selected && "border-blue-600 ring-2 ring-blue-400/30 shadow-sm"
      )}
    >
      <NodeResizer 
        isVisible={selected} 
        minWidth={220} 
        minHeight={140}
        color="#2563eb"
        lineClassName="!border-blue-500"
        handleClassName="!h-3 !w-3 !bg-white !border-2 !border-blue-600 !rounded-xs shadow-sm"
      />
      <div className="flex items-center justify-between border-b border-inherit pb-2 mb-2">
        <div className="flex items-center gap-2 font-bold text-sm tracking-wide uppercase">
          <Layers className="w-4 h-4 opacity-70" />
          {data.label}
        </div>
        <div className="flex items-center gap-2">
          {data.description && (
            <span className="text-xs opacity-75">{data.description}</span>
          )}
          {data.onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                data.onDelete(id, data.label)
              }}
              className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
              title="Supprimer cette zone"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})
ZoneNode.displayName = 'ZoneNode'
