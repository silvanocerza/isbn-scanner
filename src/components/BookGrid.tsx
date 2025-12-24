import { BookWithThumbnail } from "../types";

export function BookGrid({
  books,
  loading,
  error,
  onSelect,
}: {
  books: BookWithThumbnail[];
  loading: boolean;
  error: string | null;
  onSelect: (b: BookWithThumbnail) => void;
}) {
  if (loading) {
    return (
      <div className="p-4 text-gray-700 dark:text-gray-300">
        Loading books...
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 text-red-600 dark:text-red-400">Error: {error}</div>
    );
  }
  if (books.length === 0) {
    return (
      <div className="p-4 text-gray-700 dark:text-gray-300">
        No books scanned yet
      </div>
    );
  }

  return (
    <div className="flex w-full p-8">
      <div className="flex flex-wrap gap-4 justify-start">
        {books.map((item) => (
          <div
            key={item.book.volume_id}
            className="w-[180px]"
            onClick={() => {
              onSelect(item);
            }}
          >
            <div className="group rounded-xl overflow-hidden bg-white dark:bg-zinc-800 shadow-sm hover:shadow-xl dark:hover:shadow-xl dark:shadow-black/50 transition">
              <div className="relative w-full aspect-2/3 bg-gray-100 dark:bg-zinc-700">
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.book.title}
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
              <h2
                className="font-semibold text-md text-gray-900 dark:text-white"
                title={item.book.title}
              >
                {item.book.title}
                {item.book.number && <> - {item.book.number}</>}
              </h2>

              <h4 className="text-sm text-gray-700 dark:text-gray-400">
                {item.authors.map((a) => a.name).join(", ")}
              </h4>
              {item.book.publisher && (
                <p className="mt-1 text-[12px] text-gray-600 dark:text-gray-500 leading-tight">
                  {item.book.publisher}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
