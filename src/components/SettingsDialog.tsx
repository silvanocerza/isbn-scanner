import { useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { cn } from "../utils";
import { AppSettings, loadSettings, saveSettings } from "../lib/store";

const settingsSchema = {
  googleBooksApiKey: {
    label: "Google Books API Key",
    type: "password",
    placeholder: "Enter API key",
    helpText: "Stored locally on your device.",
  },
  successSound: {
    label: "Enable success sound",
    type: "checkbox",
    placeholder: "Success sound",
    helpText: "Enables the sound played when a book is successfully scanned",
  },
  errorSound: {
    label: "Enable error sound",
    placeholder: "Error sound",
    type: "checkbox",
    helpText: "Enables the sound played when a book is not found",
  },
};

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  className?: string;
  title?: string;
  description?: string;
}

export function SettingsDialog({
  open,
  onClose,
  className,
  title = "Settings",
  description = "Configure your preferences.",
}: SettingsDialogProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [showPassword, setShowPassword] = useState(false);
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(
    null,
  );

  const entries = useMemo(
    () => Object.entries(settingsSchema),
    [settingsSchema],
  );

  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const loaded = await loadSettings<AppSettings>();
        const next: Record<string, unknown> = {};
        for (const [key, def] of entries) {
          const t = def.type ?? "text";
          const fallback =
            t === "checkbox" ? false : t === "number" ? undefined : "";
          next[key] = (loaded as Record<string, unknown>)[key] ?? fallback;
        }
        setValues(next);
        setTimeout(() => firstInputRef.current?.focus(), 0);
      } catch (e) {
        console.error("Failed to load settings:", e);
        const next: Record<string, unknown> = {};
        for (const [key, def] of entries) {
          const t = def.type ?? "text";
          next[key] =
            t === "checkbox" ? false : t === "number" ? undefined : "";
        }
        setValues(next);
        setTimeout(() => firstInputRef.current?.focus(), 0);
      }
    })();
  }, [open, entries]);

  if (!open) {
    return null;
  }

  const setField = (key: string, val: unknown) => {
    setValues((v) => ({ ...v, [key]: val }));
  };

  const handleSave = async () => {
    try {
      await saveSettings(values);
    } catch (e) {
      console.error("Failed to save settings:", e);
    } finally {
      onClose();
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-black/50 backdrop-blur-sm",
        className,
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
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
            ) : null}
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
          {entries.map(([key, def], idx) => {
            const type = def.type ?? "text";
            const id = `settings-${key}`;
            const commonInputClasses = cn(
              "w-full rounded-lg border border-zinc-300 dark:border-zinc-600",
              "bg-white dark:bg-zinc-700",
              "px-4 py-2.5 text-sm text-zinc-900 dark:text-white",
              "placeholder:text-zinc-400 dark:placeholder:text-zinc-500",
              "transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-transparent",
            );

            return (
              <div key={key} className="space-y-2.5">
                <label
                  htmlFor={id}
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-200"
                >
                  {def.label}
                </label>

                {type === "textarea" ? (
                  <textarea
                    id={id}
                    ref={idx === 0 ? (firstInputRef as any) : undefined}
                    value={(values[key] as string) ?? ""}
                    onChange={(e) => setField(key, e.target.value)}
                    placeholder={def.placeholder}
                    className={cn(commonInputClasses, "min-h-24 resize-none")}
                  />
                ) : type === "checkbox" ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-700/50">
                    <input
                      id={id}
                      ref={idx === 0 ? (firstInputRef as any) : undefined}
                      type="checkbox"
                      checked={Boolean(values[key])}
                      onChange={(e) => setField(key, e.target.checked)}
                      className={cn(
                        "h-5 w-5 rounded cursor-pointer",
                        "border-zinc-300 dark:border-zinc-600",
                        "text-blue-600 dark:text-blue-500",
                        "focus:ring-2 focus:ring-blue-500/60",
                      )}
                    />
                    {def.placeholder ? (
                      <label
                        htmlFor={id}
                        className="text-sm font-medium text-zinc-700 dark:text-zinc-200 cursor-pointer"
                      >
                        {def.placeholder}
                      </label>
                    ) : null}
                  </div>
                ) : type === "password" ? (
                  <div className="relative group">
                    <input
                      id={id}
                      ref={idx === 0 ? (firstInputRef as any) : undefined}
                      type={showPassword ? "text" : "password"}
                      value={(values[key] as string | undefined) ?? ""}
                      onChange={(e) => setField(key, e.target.value)}
                      placeholder={def.placeholder}
                      className={cn(commonInputClasses, "pr-11")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={cn(
                        "absolute right-3.5 top-1/2 -translate-y-1/2",
                        "text-zinc-400 dark:text-zinc-500",
                        "hover:text-zinc-600 dark:hover:text-zinc-400",
                        "transition-colors",
                      )}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                ) : (
                  <input
                    id={id}
                    ref={idx === 0 ? (firstInputRef as any) : undefined}
                    type={type === "number" ? "number" : type}
                    value={
                      type === "number"
                        ? ((values[key] as number | string | undefined) ?? "")
                        : ((values[key] as string | undefined) ?? "")
                    }
                    onChange={(e) =>
                      setField(
                        key,
                        type === "number"
                          ? e.target.value === ""
                            ? undefined
                            : Number(e.target.value)
                          : e.target.value,
                      )
                    }
                    placeholder={def.placeholder}
                    className={commonInputClasses}
                  />
                )}

                {def.helpText ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {def.helpText}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50">
          <button
            onClick={onClose}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-lg px-4",
              "text-sm font-medium text-zinc-700 dark:text-zinc-300",
              "hover:bg-zinc-200 dark:hover:bg-zinc-700",
              "transition-colors",
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-lg px-4",
              "text-sm font-semibold text-white",
              "bg-blue-600 hover:bg-blue-700",
              "shadow-md hover:shadow-lg transition-all",
            )}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
