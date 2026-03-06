import type React from 'react'

type AlertVariant = 'destructive' | 'warning' | 'info'

type AlertProps = {
  /**
   * Visual variant.
   * - `destructive` — red, for auth failures and errors (default)
   * - `warning`     — amber, for non-critical cautions
   * - `info`        — blue, for neutral informational messages
   */
  variant?: AlertVariant
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>

const variantStyles: Record<AlertVariant, string> = {
  destructive:
    'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/30 dark:text-red-400 dark:ring-red-500/20',
  warning:
    'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-500/20',
  info: 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/30 dark:text-blue-400 dark:ring-blue-500/20',
}

/**
 * Catalyst-style Alert component.
 *
 * Catalyst UI does not ship an Alert component; this follows Catalyst's
 * design language precisely — zinc palette base, ring-1 borders, rounded-lg,
 * dark mode variants — so it integrates without visual breaks.
 *
 * Usage:
 *   <Alert variant="destructive">Something went wrong.</Alert>
 */
export function Alert({ variant = 'destructive', className = '', children, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={`rounded-lg px-4 py-3 text-sm ring-1 ${variantStyles[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}
