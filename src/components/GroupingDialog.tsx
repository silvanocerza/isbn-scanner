import { X } from "lucide-react";
import { cn, getColorForGroup } from "../utils";
import { useState, useEffect, useRef } from "react";

interface GroupingDialogProps {
  open: boolean;
  onClose: () => void;
  onClearAll: () => void;
  groups: string[];
  knownGroups: string[];
  onGroupAdd: (group: string) => void;
  onGroupRemove: (group: string) => void;
}

export function GroupingDialog({
  open,
  onClose,
  onClearAll,
  groups,
  knownGroups,
  onGroupAdd,
  onGroupRemove,
}: GroupingDialogProps) {
  const [input, setInput] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = knownGroups.filter(
    (group) =>
      input.trim() &&
      group.toLowerCase().includes(input.toLowerCase()) &&
      !groups.includes(group),
  );

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else {
      inputRef.current?.blur();
      setInput("");
      setSelectedIndex(-1);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [input]);

  if (!open) {
    return null;
  }

  const handleAdd = (group: string) => {
    if (!groups.includes(group)) {
      // Emit the signal only if the group doesn't already exist
      onGroupAdd(group);
    }
    setInput("");
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleAdd(filteredSuggestions[selectedIndex]);
        } else if (input.trim()) {
          handleAdd(input.trim());
        }
        return;
      }
    } else if (e.key === "Enter" && input.trim()) {
      handleAdd(input.trim());
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-black/50 backdrop-blur-sm",
      )}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className={cn(
          "w-full max-w-md mx-4 rounded-2xl",
          "bg-white dark:bg-zinc-800",
          "shadow-2xl ring-1 ring-black/10 dark:ring-white/10",
          "animate-in fade-in slide-in-from-top-4 duration-200",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-zinc-200 dark:border-zinc-700">
          <div>
            <h2
              id="settings-title"
              className="text-xl font-semibold text-zinc-900 dark:text-white"
            >
              Grouping
            </h2>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "rounded-lg p-1.5",
              "text-zinc-500 dark:text-zinc-400",
              "hover:bg-zinc-100 dark:hover:bg-zinc-700",
              "transition-colors",
            )}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              autoComplete="off"
              autoCorrect="off"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a group..."
              className={cn(
                "w-full px-3 py-2 rounded-lg",
                "bg-zinc-50 dark:bg-zinc-700",
                "border border-zinc-200 dark:border-zinc-600",
                "text-zinc-900 dark:text-white",
                "placeholder-zinc-500 dark:placeholder-zinc-400",
                "focus:outline-none focus:ring-2 focus:ring-blue-500",
                "transition-all",
              )}
            />
            {filteredSuggestions.length > 0 && (
              <div
                className={cn(
                  "absolute top-full left-0 right-0 mt-2 rounded-lg",
                  "bg-white dark:bg-zinc-700",
                  "border border-zinc-200 dark:border-zinc-600",
                  "shadow-lg z-10",
                )}
              >
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    onClick={() => handleAdd(suggestion)}
                    className={cn(
                      "w-full text-left px-3 py-2",
                      "text-sm text-zinc-900 dark:text-white",
                      "transition-colors",
                      "first:rounded-t-lg last:rounded-b-lg",
                      selectedIndex === index
                        ? "bg-blue-500 text-white"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-600",
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <span
                key={group}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
                  "text-xs font-medium transition-all duration-300",
                  getColorForGroup(group),
                )}
              >
                {group}
                <button
                  onClick={() => onGroupRemove(group)}
                  className={cn(
                    "rounded-full p-0.5",
                    "hover:bg-black/10 dark:hover:bg-white/10",
                    "transition-colors",
                  )}
                  aria-label={`Remove ${group}`}
                >
                  <X size={18} />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 p-6 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50">
          <button
            onClick={onClearAll}
            disabled={groups.length === 0}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-lg px-4",
              "text-sm font-medium text-red-600 dark:text-red-400",
              "hover:bg-red-50 dark:hover:bg-red-950/30",
              "transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent",
            )}
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-lg px-4",
              "text-sm font-medium text-zinc-700 dark:text-zinc-300",
              "hover:bg-zinc-200 dark:hover:bg-zinc-700",
              "transition-colors",
            )}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
