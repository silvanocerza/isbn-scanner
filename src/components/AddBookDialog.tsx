import { useEffect, useRef, useState } from "react";
import { cn } from "../utils";

type AddBookPayload = {
  title: string;
  authors?: string[]; // optional, each item is a full name
  publisher?: string;
  year?: string; // store as string; backend will map to published_date
};

interface AddBookDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: AddBookPayload) => Promise<void>;
  className?: string;
}

export function AddBookDialog({
  open,
  onClose,
  onSubmit,
  className,
}: AddBookDialogProps) {
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [publisher, setPublisher] = useState("");
  const [year, setYear] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      // reset or keep last values? Here we reset for clarity
      setTimeout(() => titleRef.current?.focus(), 0);
    } else {
      // reset all fields when closing
      setTitle("");
      setAuthors("");
      setPublisher("");
      setYear("");
    }
    setSubmitting(false);
  }, [open]);

  if (!open) {
    return null;
  }

  const canSubmit = title.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: AddBookPayload = {
        title: title.trim(),
        authors: authors
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        publisher: publisher.trim() || undefined,
        year: year.trim() || undefined,
      };
      await onSubmit(payload);
      onClose();
    } catch (e) {
      console.error("Failed to add book:", e);
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
      onClick={onClose}
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
            Add Book
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Enter book details. Title is required.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Title
            </label>
            <input
              id="title"
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., The Pragmatic Programmer"
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

          <div className="space-y-2">
            <label
              htmlFor="authors"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Author(s)
            </label>
            <input
              id="authors"
              type="text"
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              placeholder="e.g., Andrew Hunt, David Thomas"
              className={cn(
                "w-full rounded-lg border",
                "bg-white dark:bg-zinc-800",
                "border-zinc-300 dark:border-zinc-700",
                "px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100",
                "placeholder:text-zinc-400",
                "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500",
              )}
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Separate multiple authors with commas.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="publisher"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Publisher
            </label>
            <input
              id="publisher"
              type="text"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="e.g., Addison-Wesley"
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

          <div className="space-y-2">
            <label
              htmlFor="year"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Year
            </label>
            <input
              id="year"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g., 1999"
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
