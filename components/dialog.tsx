'use client'

import React, { useEffect, useRef } from 'react'

type DialogProps = {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
}

type DialogPanelProps = {
  children: React.ReactNode
  className?: string
}

type DialogTitleProps = {
  children: React.ReactNode
  className?: string
}

/**
 * Catalyst-style Dialog implemented as a slide-over panel.
 *
 * Opens from the right edge of the viewport with a backdrop overlay.
 * Matches the Catalyst design language: zinc palette, ring borders, dark mode.
 */
export function Dialog({ open, onClose, children, className = '' }: DialogProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={`fixed inset-0 z-50 ${className}`.trim()} role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 bg-black/30 transition-opacity dark:bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        {children}
      </div>
    </div>
  )
}

/**
 * Panel content area for the Dialog slide-over.
 */
export function DialogPanel({ children, className = '' }: DialogPanelProps) {
  return (
    <div
      className={`w-screen max-w-md transform bg-white shadow-xl transition-transform dark:bg-zinc-900 ${className}`.trim()}
    >
      <div className="flex h-full flex-col overflow-y-auto px-6 py-6">
        {children}
      </div>
    </div>
  )
}

/**
 * Title element for the Dialog.
 */
export function DialogTitle({ children, className = '' }: DialogTitleProps) {
  return (
    <h2
      className={`text-lg/7 font-semibold text-zinc-950 dark:text-white ${className}`.trim()}
    >
      {children}
    </h2>
  )
}
