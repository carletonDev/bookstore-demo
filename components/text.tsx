import type React from 'react'

type TextProps = {
  className?: string
  children: React.ReactNode
} & React.HTMLAttributes<HTMLParagraphElement>

/**
 * Catalyst Text component.
 * Renders a <p> with Catalyst's muted zinc body typography.
 * Matches the official Catalyst UI kit API: <Text>.
 */
export function Text({ className = '', children, ...props }: TextProps) {
  return (
    <p
      className={`text-base/6 text-zinc-500 sm:text-sm/6 dark:text-zinc-400 ${className}`.trim()}
      {...props}
    >
      {children}
    </p>
  )
}
