import { BookWithThumbnail } from "../types";
import { formatNumberRanges } from "../utils";

export interface GroupedBooks {
  title: string;
  books: BookWithThumbnail[];
  // The book with the lowest number, or the first book if no numbers
  representative: BookWithThumbnail;
  numbers: Array<{ start: number; end: number } | number>;
  count: number;
}

export type GridItem =
  | { type: "book"; book: BookWithThumbnail }
  | { type: "group"; group: GroupedBooks };

interface BookGridProps {
  books: BookWithThumbnail[];
  loading: boolean;
  error: string | null;
  onSelect: (b: BookWithThumbnail) => void;
  onSelectGroup?: (group: GroupedBooks) => void;
  groupByTitle?: boolean;
}

function groupBooksByTitle(books: BookWithThumbnail[]): GridItem[] {
  const groups = new Map<string, BookWithThumbnail[]>();

  for (const book of books) {
    const title = book.book.title;
    if (!groups.has(title)) {
      groups.set(title, []);
    }
    groups.get(title)!.push(book);
  }

  return Array.from(groups.entries()).flatMap(([title, bookList]): GridItem[] => {
    // Sort by number, putting books without numbers at the end
    const sorted = bookList.sort((a, b) => {
      const numA = a.book.number ?? Infinity;
      const numB = b.book.number ?? Infinity;
      return numA - numB;
    });

    // If only one book with this title, return as single book
    if (sorted.length === 1) {
      return [{ type: "book" as const, book: sorted[0] }];
    }

    const representative = sorted[0];

    // Build number ranges
    const numbers = sorted
      .map((b) => b.book.number)
      .filter((n): n is number => n !== undefined)
      .sort((a, b) => a - b);

    const numberRanges: Array<{ start: number; end: number } | number> = [];
    let rangeStart: number | null = null;
    let rangeEnd: number | null = null;

    for (const num of numbers) {
      if (rangeStart === null) {
        rangeStart = num;
        rangeEnd = num;
      } else if (num === rangeEnd! + 1) {
        rangeEnd = num;
      } else {
        if (rangeStart === rangeEnd) {
          numberRanges.push(rangeStart);
        } else {
          numberRanges.push({ start: rangeStart, end: rangeEnd! });
        }
        rangeStart = num;
        rangeEnd = num;
      }
    }

    if (rangeStart !== null) {
      if (rangeStart === rangeEnd) {
        numberRanges.push(rangeStart);
      } else {
        numberRanges.push({ start: rangeStart, end: rangeEnd! });
      }
    }

    return [
      {
        type: "group" as const,
        group: {
          title,
          books: sorted,
          representative,
          numbers: numberRanges,
          count: sorted.length,
        },
      },
    ];
  });
}

export function BookGrid({
  books,
  loading,
  error,
  onSelect,
  onSelectGroup,
  groupByTitle = false,
}: BookGridProps) {
  const groupedBooks = groupByTitle ? groupBooksByTitle(books) : null;

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
      <div className="flex flex-wrap gap-4 justify-start w-full">
        {groupByTitle
          ? groupedBooks!.map((item) =>
              item.type === "book" ? (
                <div
                  key={item.book.book.volume_id}
                  className="w-[180px]"
                  onClick={() => {
                    onSelect(item.book);
                  }}
                >
                  <div className="group rounded-xl overflow-hidden bg-white dark:bg-zinc-800 shadow-sm hover:shadow-xl dark:hover:shadow-xl dark:shadow-black/50 transition cursor-pointer">
                    <div className="relative w-full aspect-2/3 bg-gray-100 dark:bg-zinc-700">
                      {item.book.thumbnail ? (
                        <img
                          src={item.book.thumbnail}
                          alt={item.book.book.title}
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
                      title={item.book.book.title}
                    >
                      {item.book.book.title}
                      {item.book.book.number && <> - {item.book.book.number}</>}
                    </h2>

                    <h4 className="text-sm text-gray-700 dark:text-gray-400">
                      {item.book.authors.map((a) => a.name).join(", ")}
                    </h4>
                    {item.book.book.publisher && (
                      <p className="mt-1 text-[12px] text-gray-600 dark:text-gray-500 leading-tight">
                        {item.book.book.publisher}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  key={item.group.title}
                  className="w-[180px]"
                  onClick={() => {
                    if (onSelectGroup) {
                      onSelectGroup(item.group);
                    }
                  }}
                >
                  <div className="group rounded-xl overflow-hidden bg-white dark:bg-zinc-800 shadow-sm hover:shadow-xl dark:hover:shadow-xl dark:shadow-black/50 transition cursor-pointer">
                    <div className="relative w-full aspect-2/3 bg-gray-100 dark:bg-zinc-700">
                      {/* Stack effect - show multiple covers behind */}
                      <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg overflow-hidden opacity-60">
                        {item.group.representative.thumbnail ? (
                          <img
                            src={item.group.representative.thumbnail}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-200 dark:bg-zinc-600" />
                        )}
                      </div>
                      <div className="absolute inset-0 translate-x-2 translate-y-2 rounded-lg overflow-hidden opacity-40">
                        {item.group.representative.thumbnail ? (
                          <img
                            src={item.group.representative.thumbnail}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-200 dark:bg-zinc-600" />
                        )}
                      </div>
                      <div className="absolute inset-0">
                        {item.group.representative.thumbnail ? (
                          <img
                            src={item.group.representative.thumbnail}
                            alt={item.group.title}
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-400 dark:text-gray-500">
                            No cover
                          </div>
                        )}
                      </div>
                      {/* Badge showing count */}
                      <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                        {item.group.count}
                      </div>
                    </div>
                  </div>
                  <div className="py-3 px-1">
                    <h2
                      className="font-semibold text-md text-gray-900 dark:text-white"
                      title={item.group.title}
                    >
                      {item.group.title}
                      {item.group.numbers.length > 0 && (
                        <> - {formatNumberRanges(item.group.numbers)}</>
                      )}
                    </h2>

                    <h4 className="text-sm text-gray-700 dark:text-gray-400">
                      {item.group.representative.authors
                        .map((a) => a.name)
                        .join(", ")}
                    </h4>
                    {item.group.representative.book.publisher && (
                      <p className="mt-1 text-[12px] text-gray-600 dark:text-gray-500 leading-tight">
                        {item.group.representative.book.publisher}
                      </p>
                    )}
                  </div>
                </div>
              ),
            )
          : books.map((item) => (
              <div
                key={item.book.volume_id}
                className="w-[180px]"
                onClick={() => {
                  onSelect(item);
                }}
              >
                <div className="group rounded-xl overflow-hidden bg-white dark:bg-zinc-800 shadow-sm hover:shadow-xl dark:hover:shadow-xl dark:shadow-black/50 transition cursor-pointer">
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
