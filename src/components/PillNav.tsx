import { cn } from "../utils";

type NavItem = {
  id: string;
  icon: React.ReactNode;
  onClick?: () => void;
  ariaLabel: string;
};

interface PillNavProps {
  items: NavItem[];
  className?: string;
}

export function PillNav({ items, className }: PillNavProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-full px-3 py-2",
        className,
      )}
      role="toolbar"
      aria-label="Navigation"
    >
      {items.map((item) => (
        <button
          key={item.id}
          aria-label={item.ariaLabel}
          onClick={() => item.onClick?.()}
          className={cn(
            "inline-flex h-11 w-11 items-center justify-center rounded-full",
            // base text
            "text-zinc-600 dark:text-zinc-300",
            // border
            "border border-black/5 dark:border-white/5",
            // bg + hover + active colors
            "bg-white/70 hover:bg-white/90 active:bg-blue-50",
            "dark:bg-zinc-800/70 dark:hover:bg-zinc-700/80 dark:active:bg-zinc-700",
            // text color on hover/active
            "hover:text-zinc-900 active:text-blue-600",
            "dark:hover:text-white dark:active:text-blue-400",
            // shadows and motion
            "shadow-md hover:shadow-lg active:shadow-sm",
            "transition-all duration-200 ease-out",
            // focus ring
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
          )}
        >
          {item.icon}
        </button>
      ))}
    </div>
  );
}
