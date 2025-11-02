import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../utils";
import { AppSettings, loadSettings, saveSettings } from "../lib/store";

const settingsSchema = {
  googleBooksApiKey: {
    label: "Google Books API Key",
    type: "text",
    placeholder: "Enter API key",
    helpText: "Stored locally on your device.",
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
        // fall back to empty defaults per field
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
        "bg-black/40 backdrop-blur-sm",
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
          "bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10",
          "shadow-xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-black/10 dark:border-white/10">
          <h2
            id="settings-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {description}
            </p>
          ) : null}
        </div>

        <div className="p-5 space-y-4">
          {entries.map(([key, def], idx) => {
            const type = def.type ?? "text";
            const id = `settings-${key}`;
            const commonInputClasses = cn(
              "w-full rounded-lg border",
              "bg-white dark:bg-zinc-800",
              "border-zinc-300 dark:border-zinc-700",
              "px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100",
              "placeholder:text-zinc-400",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500",
            );

            return (
              <div key={key} className="space-y-2">
                <label
                  htmlFor={id}
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
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
                    className={cn(commonInputClasses, "min-h-24")}
                  />
                ) : type === "checkbox" ? (
                  <div className="flex items-center gap-2">
                    <input
                      id={id}
                      ref={idx === 0 ? (firstInputRef as any) : undefined}
                      type="checkbox"
                      checked={Boolean(values[key])}
                      onChange={(e) => setField(key, e.target.checked)}
                      className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                    />
                    {def.placeholder ? (
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {def.placeholder}
                      </span>
                    ) : null}
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

        <div className="p-5 pt-0">
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className={cn(
                "inline-flex h-9 items-center justify-center rounded-md px-3",
                "text-sm text-zinc-700 dark:text-zinc-300",
                "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                "transition-colors",
              )}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={cn(
                "inline-flex h-9 items-center justify-center rounded-md px-3",
                "text-sm text-white bg-blue-600 hover:bg-blue-700",
                "shadow-sm transition-colors",
              )}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
