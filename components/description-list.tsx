import type React from 'react'

type DescriptionListProps = {
  children: React.ReactNode
  className?: string
}

type DescriptionTermProps = {
  children: React.ReactNode
  className?: string
}

type DescriptionDetailsProps = {
  children: React.ReactNode
  className?: string
}

/**
 * Catalyst-style DescriptionList.
 *
 * Renders a `<dl>` with divider lines between term/detail pairs.
 * Zinc palette, dark mode, responsive grid layout.
 */
export function DescriptionList({ children, className = '' }: DescriptionListProps) {
  return (
    <dl
      className={`divide-y divide-zinc-200 dark:divide-zinc-700 ${className}`.trim()}
    >
      {children}
    </dl>
  )
}

/**
 * A single row in the DescriptionList containing a term and its detail(s).
 */
export function DescriptionTerm({ children, className = '' }: DescriptionTermProps) {
  return (
    <dt
      className={`text-sm/6 font-medium text-zinc-500 dark:text-zinc-400 ${className}`.trim()}
    >
      {children}
    </dt>
  )
}

/**
 * The value/detail portion of a DescriptionList row.
 */
export function DescriptionDetails({ children, className = '' }: DescriptionDetailsProps) {
  return (
    <dd
      className={`text-sm/6 text-zinc-950 dark:text-white ${className}`.trim()}
    >
      {children}
    </dd>
  )
}
