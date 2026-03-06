import type React from 'react'

type DescriptionListProps = {
  className?: string
  children: React.ReactNode
}

/**
 * Catalyst DescriptionList component.
 * Renders a styled dl/dt/dd group with Catalyst zinc typography.
 */
export function DescriptionList({ className = '', children }: DescriptionListProps) {
  return (
    <dl className={`divide-y divide-zinc-950/5 dark:divide-white/5 ${className}`.trim()}>
      {children}
    </dl>
  )
}

type DescriptionTermProps = {
  className?: string
  children: React.ReactNode
}

export function DescriptionTerm({ className = '', children }: DescriptionTermProps) {
  return (
    <dt
      className={`pt-4 pb-1 text-sm/6 font-medium text-zinc-500 dark:text-zinc-400 ${className}`.trim()}
    >
      {children}
    </dt>
  )
}

type DescriptionDetailsProps = {
  className?: string
  children: React.ReactNode
}

export function DescriptionDetails({ className = '', children }: DescriptionDetailsProps) {
  return (
    <dd
      className={`pb-4 text-sm/6 text-zinc-950 dark:text-white ${className}`.trim()}
    >
      {children}
    </dd>
  )
}
