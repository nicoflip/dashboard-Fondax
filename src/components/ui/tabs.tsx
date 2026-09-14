'use client'

import React, { useState, createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

// Context-based Tabs (compatible with shadcn/ui API pattern)
interface TabsContextType {
  activeTab: string
  setActiveTab: (value: string) => void
}

const TabsContext = createContext<TabsContextType>({ activeTab: '', setActiveTab: () => {} })

interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  // Also support render-prop pattern
  tabs?: { id: string; label: string }[]
  children: React.ReactNode | ((activeTab: string) => React.ReactNode)
}

function Tabs({ defaultValue = '', value, onValueChange, tabs, children, className, ...props }: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultValue)
  const activeTab = value ?? internalTab
  const setActiveTab = (v: string) => {
    setInternalTab(v)
    onValueChange?.(v)
  }

  // Render-prop pattern (legacy support)
  if (tabs && typeof children === 'function') {
    return (
      <div className={className} {...props}>
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="mt-4">{children(activeTab)}</div>
      </div>
    )
  }

  // Context-based pattern (shadcn/ui compatible)
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className} {...props}>
        {children as React.ReactNode}
      </div>
    </TabsContext.Provider>
  )
}

function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center justify-start rounded-lg bg-slate-100 p-1 gap-1',
        className
      )}
      {...props}
    />
  )
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string
}

function TabsTrigger({ value, className, ...props }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useContext(TabsContext)
  return (
    <button
      onClick={() => setActiveTab(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all',
        activeTab === value
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'
      , className)}
      {...props}
    />
  )
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string
}

function TabsContent({ value, className, ...props }: TabsContentProps) {
  const { activeTab } = useContext(TabsContext)
  if (activeTab !== value) return null
  return <div className={cn('mt-4', className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
