import { invoke } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { BookIcon } from "lucide-react";

export interface Book {
  volume_id: string;
  title: string;
  publisher?: string;
  published_date?: string | null;
  description?: string | null;
  page_count?: number | null;
  language?: string | null;
  print_type?: string | null;
  maturity_rating?: string | null;
  preview_link?: string | null;
  info_link?: string | null;
  canonical_link?: string | null;
  country?: string | null;
  saleability?: string | null;
  is_ebook?: boolean | null;
  viewability?: string | null;
  embeddable?: boolean | null;
  public_domain?: boolean | null;
  text_to_speech_permission?: string | null;
  epub_available?: boolean | null;
  pdf_available?: boolean | null;
  web_reader_link?: string | null;
  access_view_status?: string | null;
  quote_sharing_allowed?: boolean | null;
}

export interface BookWithThumbnail {
  book: Book;
  authors: { name: string }[];
  thumbnail_path: string;
}

export function BookGrid({
  onSelect,
}: {
  onSelect: (b: BookWithThumbnail) => void;
}) {
  const [books, setBooks] = useState<BookWithThumbnail[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const result = await invoke<BookWithThumbnail[]>("get_all_books");
      setBooks(result);
      const imageMap: Record<string, string> = {};
      for (const item of result) {
        try {
          const data = await readFile(item.thumbnail_path);
          const blob = new Blob([data], { type: "image/jpeg" });
          imageMap[item.book.volume_id] = URL.createObjectURL(blob);
        } catch (err) {
          console.error(`Failed to load image for ${item.book.volume_id}`, err);
        }
      }
      setImages(imageMap);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
    const un1 = listen("book-added", loadBooks);
    const un2 = listen("book-updated", loadBooks);
    return () => {
      un1.then((f) => f());
      un2.then((f) => f());
    };
  }, []);

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
            onClick={() =>
              onSelect({ ...item, thumbnail_path: images[item.book.volume_id] })
            }
          >
            <div className="group rounded-xl overflow-hidden bg-white dark:bg-zinc-800 shadow-sm hover:shadow-xl dark:hover:shadow-xl dark:shadow-black/50 transition">
              <div className="relative w-full aspect-2/3 bg-gray-100 dark:bg-zinc-700">
                {images[item.book.volume_id] ? (
                  <img
                    src={images[item.book.volume_id]}
                    alt={item.book.title}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-blue-300 dark:bg-blue-900">
                    <BookIcon
                      size={32}
                      className="text-white/80 dark:text-white/60"
                    />
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
