import { X } from "lucide-react";
import { GroupedBooks } from "./BookGrid";
import { Book } from "../types";
import { formatNumberRanges } from "../utils";

export interface GroupDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  group: GroupedBooks | null;
  onSelectBook?: (book: Book) => void;
}

export function GroupDetailsDialog({
  open,
  onClose,
  group,
  onSelectBook,
}: GroupDetailsDialogProps) {
  if (!open || !group) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl m-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
              aria-label="Close"
            >
              <X size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {group.title}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {group.count} books
                {group.numbers.length > 0 && (
                  <> - {formatNumberRanges(group.numbers)}</>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Books Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-wrap gap-4 justify-start">
            {group.books.map((book) => (
              <div
                key={book.volume_id}
                className="w-[140px]"
                onClick={() => {
                  if (onSelectBook) {
                    onSelectBook(book);
                  }
                }}
              >
                <div className="group rounded-xl overflow-hidden bg-white dark:bg-zinc-800 shadow-sm hover:shadow-xl dark:hover:shadow-xl dark:shadow-black/50 transition cursor-pointer">
                  <div className="relative w-full aspect-2/3 bg-gray-100 dark:bg-zinc-700">
                    {book.thumbnail ? (
                      <img
                        src={book.thumbnail}
                        alt={book.title}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-400 dark:text-gray-500">
                        No cover
                      </div>
                    )}
                  </div>
                </div>
                <div className="py-3 px-1">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                    {book.title}
                    {book.number !== undefined && (
                      <span> - {book.number}</span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {book.authors.join(", ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
