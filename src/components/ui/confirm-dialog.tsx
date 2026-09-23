'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2, AlertTriangle, HelpCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ConfirmVariant = 'danger' | 'warning' | 'info'

export interface ConfirmOptions {
  title?: string
  message?: React.ReactNode
  itemTitle?: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextType | null>(null)

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context.confirm
}

interface ConfirmDialogState extends ConfirmOptions {
  open: boolean
  resolve?: (value: boolean) => void
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialogState, setDialogState] = useState<ConfirmDialogState>({
    open: false,
  })

  const confirm = useCallback((options: ConfirmOptions | string) => {
    return new Promise<boolean>((resolve) => {
      const opts: ConfirmOptions = typeof options === 'string'
        ? { message: options, title: 'Confirmation', variant: 'danger' }
        : options

      setDialogState({
        ...opts,
        open: true,
        resolve,
      })
    })
  }, [])

  const handleClose = useCallback(() => {
    if (dialogState.resolve) {
      dialogState.resolve(false)
    }
    setDialogState((prev) => ({ ...prev, open: false }))
  }, [dialogState])

  const handleConfirm = useCallback(() => {
    if (dialogState.resolve) {
      dialogState.resolve(true)
    }
    setDialogState((prev) => ({ ...prev, open: false }))
  }, [dialogState])

  const variant = dialogState.variant || 'danger'

  const variantConfig = {
    danger: {
      icon: Trash2,
      iconBg: 'bg-red-100 text-red-600',
      iconBorder: 'border-red-200',
      confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
      badgeDot: 'bg-red-500',
      defaultTitle: 'Confirmer la suppression',
      defaultConfirmText: 'Supprimer',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-100 text-amber-700',
      iconBorder: 'border-amber-200',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
      badgeDot: 'bg-amber-500',
      defaultTitle: 'Attention requise',
      defaultConfirmText: 'Continuer',
    },
    info: {
      icon: HelpCircle,
      iconBg: 'bg-blue-100 text-blue-700',
      iconBorder: 'border-blue-200',
      confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
      badgeDot: 'bg-blue-500',
      defaultTitle: 'Confirmation',
      defaultConfirmText: 'Valider',
    },
  }[variant]

  const Icon = variantConfig.icon

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog
        open={dialogState.open}
        onClose={handleClose}
        className="max-w-md p-5 sm:p-6"
      >
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn("p-2.5 rounded-xl shrink-0 border", variantConfig.iconBg, variantConfig.iconBorder)}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {dialogState.title || variantConfig.defaultTitle}
              </DialogTitle>
              {dialogState.itemTitle && (
                <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", variantConfig.badgeDot)} />
                  <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate" title={dialogState.itemTitle}>
                    {dialogState.itemTitle}
                  </span>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
          {dialogState.message || 'Êtes-vous sûr de vouloir continuer ? Cette action est irréversible.'}
        </div>

        <DialogFooter className="gap-2 sm:gap-2 mt-5">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="border-slate-200 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
          >
            {dialogState.cancelText || 'Annuler'}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            className={cn(
              "font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer",
              variantConfig.confirmBtn
            )}
          >
            {variant === 'danger' && <Trash2 className="w-4 h-4" />}
            <span>{dialogState.confirmText || variantConfig.defaultConfirmText}</span>
          </Button>
        </DialogFooter>
      </Dialog>
    </ConfirmContext.Provider>
  )
}

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title?: string
  message?: React.ReactNode
  itemTitle?: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  itemTitle,
  confirmText,
  cancelText,
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const variantConfig = {
    danger: {
      icon: Trash2,
      iconBg: 'bg-red-100 text-red-600',
      iconBorder: 'border-red-200',
      confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
      badgeDot: 'bg-red-500',
      defaultTitle: 'Confirmer la suppression',
      defaultConfirmText: 'Supprimer',
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-100 text-amber-700',
      iconBorder: 'border-amber-200',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
      badgeDot: 'bg-amber-500',
      defaultTitle: 'Attention requise',
      defaultConfirmText: 'Continuer',
    },
    info: {
      icon: HelpCircle,
      iconBg: 'bg-blue-100 text-blue-700',
      iconBorder: 'border-blue-200',
      confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
      badgeDot: 'bg-blue-500',
      defaultTitle: 'Confirmation',
      defaultConfirmText: 'Valider',
    },
  }[variant]

  const Icon = variantConfig.icon

  return (
    <Dialog open={open} onClose={onClose} className="max-w-md p-5 sm:p-6">
      <DialogHeader>
        <div className="flex items-start gap-3">
          <div className={cn("p-2.5 rounded-xl shrink-0 border", variantConfig.iconBg, variantConfig.iconBorder)}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {title || variantConfig.defaultTitle}
            </DialogTitle>
            {itemTitle && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full shrink-0", variantConfig.badgeDot)} />
                <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate" title={itemTitle}>
                  {itemTitle}
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogHeader>

      <div className="py-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
        {message || 'Êtes-vous sûr de vouloir continuer ? Cette action est irréversible.'}
      </div>

      <DialogFooter className="gap-2 sm:gap-2 mt-5">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={loading}
          className="border-slate-200 hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
        >
          {cancelText || 'Annuler'}
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            "font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer",
            variantConfig.confirmBtn
          )}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            variant === 'danger' && <Trash2 className="w-4 h-4" />
          )}
          <span>{confirmText || variantConfig.defaultConfirmText}</span>
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
