import type React from "react";

type HeadingProps = {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLHeadingElement>;

/**
 * Catalyst Heading component.
 * Renders h1–h6 with Catalyst's zinc typography scale.
 * Matches the official Catalyst UI kit API: <Heading level={1}>.
 */
export function Heading({
  level = 1,
  className = "",
  children,
  ...props
}: HeadingProps) {
  const Tag = `h${level}` as keyof React.JSX.IntrinsicElements;

  const styles: Record<number, string> = {
    1: "text-2xl/8 font-semibold text-zinc-950 dark:text-white",
    2: "text-xl/7 font-semibold text-zinc-950 dark:text-white",
    3: "text-base/7 font-semibold text-zinc-950 dark:text-white",
    4: "text-sm/6 font-semibold text-zinc-950 dark:text-white",
    5: "text-sm/6 font-medium text-zinc-950 dark:text-white",
    6: "text-xs/6 font-medium text-zinc-950 dark:text-white",
  };

  return (
    // @ts-expect-error — dynamic tag is safe; constrained to h1-h6 above
    <Tag className={`${styles[level]} ${className}`.trim()} {...props}>
      {children}
    </Tag>
  );
}
