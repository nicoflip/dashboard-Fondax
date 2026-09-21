'use client'

import React, { useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  onClose?: () => void
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
  hideCloseButton?: boolean
  closeOnClickOutside?: boolean
}

function Dialog({
  open,
  onClose,
  onOpenChange,
  children,
  className,
  hideCloseButton = false,
  closeOnClickOutside = true,
}: DialogProps) {
  const handleClose = useCallback(() => {
    onClose?.()
    onOpenChange?.(false)
  }, [onClose, onOpenChange])
  const overlayRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const isMouseDownOnBackdrop = useRef(false)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    },
    [handleClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) => {
        isMouseDownOnBackdrop.current = (e.target === overlayRef.current || e.target === backdropRef.current)
      }}
      onClick={(e) => {
        if (
          closeOnClickOutside &&
          isMouseDownOnBackdrop.current &&
          (e.target === overlayRef.current || e.target === backdropRef.current)
        ) {
          handleClose()
        }
      }}
    >
      <div ref={backdropRef} className="fixed inset-0 bg-black/50" />
      <div
        className={cn(
          'relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 p-6 mx-4',
          className
        )}
        onMouseDown={(e) => {
          isMouseDownOnBackdrop.current = false
          e.stopPropagation()
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {!hideCloseButton && (
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  )
}

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 mb-4', className)} {...props} />
}

function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold text-slate-900', className)} {...props} />
}

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex justify-end gap-2 mt-6', className)} {...props} />
}

function DialogContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-4', className)} {...props} />
}

export { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter }
