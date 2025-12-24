import { Search, X } from "lucide-react";
import { cn } from "../utils";

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBox({
  value,
  onChange,
  placeholder = "Search books...",
  className,
}: SearchBoxProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
        <Search
          size={18}
          className="text-zinc-600 dark:text-zinc-400"
          aria-hidden="true"
        />
      </div>
      <input
        type="text"
        value={value}
        autoComplete="off"
        autoCorrect="off"
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full h-11 pl-11 pr-11 rounded-full",
          "text-zinc-900 dark:text-white",
          "text-sm",
          "placeholder-zinc-500 dark:placeholder-zinc-400",
          "border border-black/5 dark:border-white/5",
          "bg-white/70 dark:bg-zinc-800/70",
          "hover:bg-white/90 dark:hover:bg-zinc-700/80",
          "focus:bg-white dark:focus:bg-zinc-800",
          "shadow-md hover:shadow-lg focus:shadow-lg",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/60",
          "transition-all duration-200 ease-out",
        )}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className={cn(
            "absolute inset-y-0 right-0 flex items-center pr-4",
            "text-zinc-600 dark:text-zinc-400",
            "hover:text-zinc-900 dark:hover:text-white",
            "transition-colors duration-200",
          )}
          aria-label="Clear search"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
