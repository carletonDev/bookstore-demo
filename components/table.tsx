import type React from "react";

type TableProps = {
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLTableElement>;

/**
 * Catalyst Table component.
 * Renders a responsive, styled HTML table with Catalyst zinc typography.
 */
export function Table({ className = "", children, ...props }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table
        className={`min-w-full text-left text-sm/6 text-zinc-950 dark:text-white ${className}`.trim()}
        {...props}
      >
        {children}
      </table>
    </div>
  );
}

type TableHeadProps = {
  className?: string;
  children: React.ReactNode;
};

export function TableHead({ className = "", children }: TableHeadProps) {
  return (
    <thead className={`text-zinc-500 dark:text-zinc-400 ${className}`.trim()}>
      {children}
    </thead>
  );
}

type TableBodyProps = {
  className?: string;
  children: React.ReactNode;
};

export function TableBody({ className = "", children }: TableBodyProps) {
  return <tbody className={className}>{children}</tbody>;
}

type TableRowProps = {
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLTableRowElement>;

export function TableRow({
  className = "",
  children,
  ...props
}: TableRowProps) {
  return (
    <tr
      className={`border-b border-zinc-950/5 dark:border-white/5 ${className}`.trim()}
      {...props}
    >
      {children}
    </tr>
  );
}

type TableHeaderProps = {
  className?: string;
  children: React.ReactNode;
} & React.ThHTMLAttributes<HTMLTableCellElement>;

export function TableHeader({
  className = "",
  children,
  ...props
}: TableHeaderProps) {
  return (
    <th
      className={`border-b border-zinc-950/10 px-4 py-2 font-medium dark:border-white/10 ${className}`.trim()}
      {...props}
    >
      {children}
    </th>
  );
}

type TableCellProps = {
  className?: string;
  children: React.ReactNode;
} & React.TdHTMLAttributes<HTMLTableCellElement>;

export function TableCell({
  className = "",
  children,
  ...props
}: TableCellProps) {
  return (
    <td className={`px-4 py-2 ${className}`.trim()} {...props}>
      {children}
    </td>
  );
}
