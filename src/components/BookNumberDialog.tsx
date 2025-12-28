import { useEffect, useState } from "react";
import { cn } from "../utils";
import { Book } from "../types";

type BookNumberDialogProps = {
  open: boolean;
  book?: Book;
  onClose: () => void;
  onSubmit: (volumeId: string, n: number) => Promise<void>;
  className?: string;
};

export function BookNumberDialog({
  open,
  book,
  onClose,
  onSubmit,
  className,
}: BookNumberDialogProps) {
  const [bookNumber, setBookNumber] = useState<number | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      // reset number when closing
      setBookNumber(undefined);
    }
    setSubmitting(false);
  }, [open]);

  if (!open || !book) {
    return null;
  }

  const canSubmit = bookNumber !== undefined && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(book.volume_id, bookNumber);
      onClose();
    } catch (e) {
      console.error("Failed to set book number:", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center",
        "bg-black/40 backdrop-blur-sm",
        className,
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-book-title"
        className={cn(
          "w-full max-w-md mx-4 rounded-2xl",
          "bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10",
          "shadow-xl",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-black/10 dark:border-white/10">
          <h2
            id="add-book-title"
            className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Add Book number
          </h2>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {book.title}
            </label>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="bookNumber"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Book number
            </label>

            <input
              id="bookNumber"
              type="number"
              step="1"
              value={bookNumber ?? ""}
              onChange={(e) =>
                setBookNumber(parseInt(e.target.value, 10) || undefined)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              className={cn(
                "w-full rounded-lg border",
                "bg-white dark:bg-zinc-800",
                "border-zinc-300 dark:border-zinc-700",
                "px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100",
                "placeholder:text-zinc-400",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500",
              )}
            />
          </div>
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
              disabled={!canSubmit}
              onClick={handleSubmit}
              className={cn(
                "inline-flex h-9 items-center justify-center rounded-md px-3",
                "text-sm text-white bg-blue-600 hover:bg-blue-700",
                "shadow-sm transition-colors",
                !canSubmit && "opacity-60 cursor-not-allowed",
              )}
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
