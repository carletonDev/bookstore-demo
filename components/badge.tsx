import type React from "react";

type BadgeColor =
  | "zinc"
  | "green"
  | "amber"
  | "red"
  | "blue"
  | "purple"
  | "pink";

type BadgeProps = {
  color?: BadgeColor;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>;

const colorStyles: Record<BadgeColor, string> = {
  zinc: "bg-zinc-50 text-zinc-700 ring-zinc-600/20 dark:bg-zinc-400/10 dark:text-zinc-400 dark:ring-zinc-400/20",
  green:
    "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-400 dark:ring-amber-400/20",
  red: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-400/10 dark:text-red-400 dark:ring-red-400/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/20",
  purple:
    "bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-400/10 dark:text-purple-400 dark:ring-purple-400/20",
  pink: "bg-pink-50 text-pink-700 ring-pink-600/20 dark:bg-pink-400/10 dark:text-pink-400 dark:ring-pink-400/20",
};

/**
 * Catalyst Badge component.
 * Renders an inline pill with a colored background and ring border.
 * Matches the official Catalyst UI kit API: <Badge color="green">.
 */
export function Badge({
  color = "zinc",
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${colorStyles[color]} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
}
