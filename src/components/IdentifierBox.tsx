import { ScanBarcode, X } from "lucide-react";
import { cn } from "../utils";
import { useState, useRef } from "react";

interface IdentifierBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function IdentifierBox({
  value,
  onChange,
  onSubmit,
  placeholder = "ISBN / ISSN",
  className,
}: IdentifierBoxProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isExpanded = isFocused || value;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && value) {
      onSubmit?.(value);
      inputRef.current?.blur();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    onChange(digitsOnly);
  };

  const handleClear = () => {
    onChange("");
    inputRef.current?.blur();
  };

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className={cn(
        "relative flex items-center h-11 rounded-full cursor-text",
        "text-zinc-600 dark:text-zinc-300",
        "border border-black/5 dark:border-white/5",
        "bg-white/70 dark:bg-zinc-800/70",
        "hover:bg-white/90 dark:hover:bg-zinc-700/80",
        "shadow-md hover:shadow-lg",
        "transition-all duration-200 ease-out",
        isExpanded ? "w-60" : "w-11",
        className,
      )}
    >
      {/* Icon - always at left, expands to fill when collapsed */}
      <div
        className={cn(
          "absolute left-0 top-0 flex items-center justify-center h-full pointer-events-none",
          "transition-all duration-200 ease-out",
          isExpanded ? "w-11" : "w-full",
        )}
      >
        <ScanBarcode
          size={18}
          className="text-zinc-600 dark:text-zinc-400"
          aria-hidden="true"
        />
      </div>

      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={isExpanded ? placeholder : ""}
        className={cn(
          "h-full bg-transparent text-sm text-zinc-900 dark:text-white",
          "placeholder-zinc-500 dark:placeholder-zinc-400",
          "focus:outline-none",
          "transition-opacity duration-200",
          isExpanded ? "w-full pl-11 pr-11 opacity-100" : "w-0 px-0 opacity-0",
        )}
      />

      {value && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClear();
          }}
          className={cn(
            "absolute right-0 flex items-center justify-center w-11 h-11",
            "text-zinc-600 dark:text-zinc-400",
            "hover:text-zinc-900 dark:hover:text-white",
          )}
          aria-label="Clear input"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
