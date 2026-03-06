import type React from "react";

type ButtonProps = {
  /** Outline variant — white background, zinc ring border, hover fills lightly. */
  outline?: boolean;
  /** Plain variant — no background or border, text only. */
  plain?: boolean;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Catalyst Button component.
 *
 * Matches the official Catalyst UI kit API:
 *   <Button outline>...</Button>   — bordered, white background
 *   <Button plain>...</Button>     — ghost / text-only
 *   <Button>...</Button>           — solid zinc (default)
 *
 * Icons passed as children automatically receive the correct sizing via the
 * `[&>[data-slot=icon]]:*` selectors that the full Catalyst kit provides.
 * For this scaffold, icons are sized via their own className.
 */
export function Button({
  outline = false,
  plain = false,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-x-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variant = plain
    ? "text-zinc-700 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
    : outline
      ? "bg-white text-zinc-900 ring-1 ring-inset ring-zinc-300 hover:bg-zinc-50 focus-visible:outline-zinc-600 dark:bg-zinc-800 dark:text-white dark:ring-zinc-600 dark:hover:bg-zinc-700"
      : "bg-zinc-900 text-white hover:bg-zinc-700 focus-visible:outline-zinc-900 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100";

  return (
    <button
      type={type}
      className={`${base} ${variant} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
