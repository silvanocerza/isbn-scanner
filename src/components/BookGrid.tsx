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
}

export interface BookWithThumbnail {
  book: Book;
  authors: { name: string }[];
  thumbnail_path: string;
}

export function BookGrid({
  onSelect,
}: {
  onSelect: (b: {
    volume_id: string;
    title: string;
    publisher?: string | null;
    published_date?: string | null;
    description?: string | null;
    page_count?: number | null;
    language?: string | null;
    authors: string[];
    thumbnail_url?: string;
  }) => void;
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
    return <div className="p-4">Loading books...</div>;
  }
  if (error) {
    return <div className="p-4 text-red-600">Error: {error}</div>;
  }
  if (books.length === 0) {
    return <div className="p-4">No books scanned yet</div>;
  }

  return (
    <div className="flex w-full p-8">
      <div className="flex flex-wrap gap-4 justify-start">
        {books.map((item) => (
          <div
            key={item.book.volume_id}
            className="w-[180px]"
            onClick={() =>
              onSelect({
                volume_id: item.book.volume_id,
                title: item.book.title,
                publisher: item.book.publisher ?? null,
                published_date: item.book.published_date ?? null,
                description: item.book.description ?? null,
                page_count: item.book.page_count ?? null,
                language: item.book.language ?? null,
                authors: item.authors.map((a) => a.name),
                thumbnail_url: images[item.book.volume_id],
              })
            }
          >
            <div className="group rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-xl transition">
              <div className="relative w-full aspect-2/3 bg-gray-100">
                {images[item.book.volume_id] ? (
                  <img
                    src={images[item.book.volume_id]}
                    alt={item.book.title}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-blue-300">
                    <BookIcon size={32} className="text-white/80" />
                  </div>
                )}
              </div>
            </div>
            <div className="py-3 px-1">
              <h2
                className="font-semibold text-md text-gray-900"
                title={item.book.title}
              >
                {item.book.title}
              </h2>

              <h4 className="text-sm text-gray-700">
                {item.authors.map((a) => a.name).join(", ")}
              </h4>
              {item.book.publisher && (
                <p className="mt-1 text-[12px] text-gray-600 leading-tight">
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
