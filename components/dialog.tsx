'use client'

import type React from 'react'
import { useEffect, useRef, useCallback } from 'react'

type DialogProps = {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

/**
 * Catalyst Dialog component.
 * Renders a modal dialog with backdrop, centered content, and ESC-to-close.
 * Uses the native <dialog> element for accessibility.
 */
export function Dialog({ open, onClose, children, className = '' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  return (
    <dialog
      ref={ref}
      onClose={handleClose}
      className={`backdrop:bg-zinc-950/25 dark:backdrop:bg-zinc-950/50 rounded-2xl bg-white p-0 shadow-lg ring-1 ring-zinc-950/10 dark:bg-zinc-900 dark:ring-white/10 ${className}`.trim()}
    >
      <div className="p-6">{children}</div>
    </dialog>
  )
}

type DialogTitleProps = {
  children: React.ReactNode
  className?: string
}

export function DialogTitle({ children, className = '' }: DialogTitleProps) {
  return (
    <h3
      className={`text-lg/7 font-semibold text-zinc-950 dark:text-white ${className}`.trim()}
    >
      {children}
    </h3>
  )
}

type DialogBodyProps = {
  children: React.ReactNode
  className?: string
}

export function DialogBody({ children, className = '' }: DialogBodyProps) {
  return <div className={`mt-4 ${className}`.trim()}>{children}</div>
}

type DialogActionsProps = {
  children: React.ReactNode
  className?: string
}

export function DialogActions({ children, className = '' }: DialogActionsProps) {
  return (
    <div className={`mt-6 flex justify-end gap-3 ${className}`.trim()}>
      {children}
    </div>
  )
}
