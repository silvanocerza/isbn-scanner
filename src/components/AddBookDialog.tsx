import { useEffect, useRef, useState } from "react";
import { cn } from "../utils";

export type AddBookPayload = {
  title: string;
  series?: string;
  number?: number;
  numberStart?: number;
  numberEnd?: number;
  authors?: string[];
  publisher?: string;
  year?: string;
  identifier?: string;
};

interface AddBookDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: AddBookPayload) => Promise<void>;
  className?: string;
  initialIdentifier?: string;
  initialSeries?: string;
  knownSeries?: string[];
}

export function AddBookDialog({
  open,
  onClose,
  onSubmit,
  className,
  initialIdentifier = "",
  initialSeries = "",
  knownSeries = [],
}: AddBookDialogProps) {
  const [title, setTitle] = useState("");
  const [series, setSeries] = useState("");
  const [seriesInput, setSeriesInput] = useState("");
  const [seriesSelectedIndex, setSeriesSelectedIndex] = useState(-1);
  const seriesInputRef = useRef<HTMLInputElement>(null);
  const [numberMode, setNumberMode] = useState<"single" | "range">("single");
  const [number, setNumber] = useState("");
  const [numberStart, setNumberStart] = useState("");
  const [numberEnd, setNumberEnd] = useState("");
  const [authors, setAuthors] = useState("");
  const [publisher, setPublisher] = useState("");
  const [year, setYear] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const titleRef = useRef<HTMLInputElement | null>(null);

  const filteredSeriesSuggestions = knownSeries.filter(
    (s) =>
      seriesInput.trim() &&
      s.toLowerCase().includes(seriesInput.toLowerCase()) &&
      s !== series,
  );

  useEffect(() => {
    if (open) {
      setIdentifier(initialIdentifier);
      setSeries(initialSeries);
      setSeriesInput(initialSeries);
      setTimeout(() => titleRef.current?.focus(), 0);
    } else {
      setTitle("");
      setSeries("");
      setSeriesInput("");
      setNumberMode("single");
      setNumber("");
      setNumberStart("");
      setNumberEnd("");
      setAuthors("");
      setPublisher("");
      setYear("");
      setIdentifier("");
    }
    setSubmitting(false);
  }, [open, initialIdentifier, initialSeries]);

  useEffect(() => {
    setSeriesSelectedIndex(-1);
  }, [seriesInput]);

  const handleSeriesKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredSeriesSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSeriesSelectedIndex((prev) =>
          prev < filteredSeriesSuggestions.length - 1 ? prev + 1 : prev,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSeriesSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (seriesSelectedIndex >= 0) {
          setSeries(filteredSeriesSuggestions[seriesSelectedIndex]);
          setSeriesInput(filteredSeriesSuggestions[seriesSelectedIndex]);
        } else if (seriesInput.trim()) {
          setSeries(seriesInput.trim());
        }
        return;
      } else if (e.key === "Escape") {
        setSeriesSelectedIndex(-1);
        return;
      }
    } else if (e.key === "Enter" && seriesInput.trim()) {
      setSeries(seriesInput.trim());
    }
  };

  if (!open) {
    return null;
  }

  const isValidNumber = () => {
    if (numberMode === "single") {
      return number.trim() ? !isNaN(parseInt(number.trim(), 10)) : true;
    } else {
      const start = numberStart.trim()
        ? parseInt(numberStart.trim(), 10)
        : undefined;
      const end = numberEnd.trim() ? parseInt(numberEnd.trim(), 10) : undefined;
      if (start === undefined || end === undefined) return true;
      return start > 0 && end > 0 && start <= end;
    }
  };

  const bookCount = () => {
    if (numberMode === "single") return 1;
    const start = numberStart.trim() ? parseInt(numberStart.trim(), 10) : 0;
    const end = numberEnd.trim() ? parseInt(numberEnd.trim(), 10) : 0;
    if (start > 0 && end > 0 && start <= end) return end - start + 1;
    return 0;
  };

  const canSubmit = title.trim().length > 0 && isValidNumber() && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const payload: AddBookPayload = {
        title: title.trim(),
        series: series.trim() || undefined,
        number:
          numberMode === "single" && number.trim()
            ? parseInt(number.trim(), 10)
            : undefined,
        numberStart:
          numberMode === "range" && numberStart.trim()
            ? parseInt(numberStart.trim(), 10)
            : undefined,
        numberEnd:
          numberMode === "range" && numberEnd.trim()
            ? parseInt(numberEnd.trim(), 10)
            : undefined,
        authors: authors
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        publisher: publisher.trim() || undefined,
        year: year.trim() || undefined,
        identifier: identifier.trim() || undefined,
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
              htmlFor="identifier"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              ISBN / ISSN
            </label>
            <input
              id="identifier"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g., 9780134685991"
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
              htmlFor="series"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Series
            </label>
            <div className="relative">
              <input
                ref={seriesInputRef}
                id="series"
                type="text"
                autoComplete="off"
                autoCorrect="off"
                value={seriesInput}
                onChange={(e) => {
                  setSeriesInput(e.target.value);
                  setSeries(e.target.value);
                }}
                onKeyDown={handleSeriesKeyDown}
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
              {filteredSeriesSuggestions.length > 0 && (
                <div
                  className={cn(
                    "absolute top-full left-0 right-0 mt-1 rounded-lg",
                    "bg-white dark:bg-zinc-700",
                    "border border-zinc-200 dark:border-zinc-600",
                    "shadow-lg z-10",
                  )}
                >
                  {filteredSeriesSuggestions.map((suggestion, index) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setSeries(suggestion);
                        setSeriesInput(suggestion);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2",
                        "text-sm text-zinc-900 dark:text-white",
                        "transition-colors",
                        "first:rounded-t-lg last:rounded-b-lg",
                        seriesSelectedIndex === index
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
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Number
            </label>
            <div className="flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
              <button
                type="button"
                onClick={() => setNumberMode("single")}
                className={cn(
                  "flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors",
                  numberMode === "single"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200",
                )}
              >
                Single
              </button>
              <button
                type="button"
                onClick={() => setNumberMode("range")}
                className={cn(
                  "flex-1 py-1.5 px-3 text-sm font-medium rounded-md transition-colors",
                  numberMode === "range"
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200",
                )}
              >
                Range
              </button>
            </div>

            {numberMode === "single" ? (
              <input
                id="number"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={number}
                onChange={(e) => setNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g., 1"
                className={cn(
                  "w-full rounded-lg border",
                  "bg-white dark:bg-zinc-800",
                  "border-zinc-300 dark:border-zinc-700",
                  "px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100",
                  "placeholder:text-zinc-400",
                  "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500",
                )}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <input
                  id="numberStart"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={numberStart}
                  onChange={(e) =>
                    setNumberStart(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="From"
                  className={cn(
                    "w-full rounded-lg border",
                    "bg-white dark:bg-zinc-800",
                    "border-zinc-300 dark:border-zinc-700",
                    "px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100",
                    "placeholder:text-zinc-400",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500",
                  )}
                />
                <input
                  id="numberEnd"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={numberEnd}
                  onChange={(e) =>
                    setNumberEnd(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="To"
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
            )}
            {numberMode === "range" &&
              numberStart.trim() &&
              numberEnd.trim() && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Will create <strong>{bookCount()}</strong> books (
                  {numberStart} to {numberEnd})
                </p>
              )}
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
              {submitting
                ? "Saving..."
                : bookCount() > 1
                  ? `Add ${bookCount()} Books`
                  : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
