import React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        {
          'border-transparent bg-blue-100 text-blue-800': variant === 'default',
          'border-transparent bg-slate-100 text-slate-800': variant === 'secondary',
          'border-slate-200 text-slate-700': variant === 'outline',
          'border-transparent bg-red-100 text-red-800': variant === 'destructive',
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
export type { BadgeProps }
