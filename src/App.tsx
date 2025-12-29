import "./App.css";
import { useEffect, useState } from "react";
import { KeypressListener } from "./components/KeypressListener";
import { BookGrid } from "./components/BookGrid";
import { PillNav } from "./components/PillNav";
import {
  Cog,
  Pencil,
  Plus,
  Download,
  PencilLine,
  Sun,
  Moon,
  Monitor,
  LibraryBig,
  X,
} from "lucide-react";
import { SettingsDialog } from "./components/SettingsDialog";
import { Toaster, toast } from "sonner";
import { AddBookDialog } from "./components/AddBookDialog";
import { invoke } from "@tauri-apps/api/core";
import { DetailsDialog } from "./components/DetailsDialog";
import { cn, getColorForGroup } from "./utils";
import { loadSettings } from "./lib/store";
import { BookNumberDialog } from "./components/BookNumberDialog";
import { emit, listen } from "@tauri-apps/api/event";
import { readFile } from "@tauri-apps/plugin-fs";
import { Book, BookWithThumbnail } from "./types";
import { GroupingDialog } from "./components/GroupingDialog";
import { SearchBox } from "./components/SearchBox";

type Theme = "light" | "dark" | "system";

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [books, setBooks] = useState<BookWithThumbnail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookWithThumbnail | null>(
    null,
  );
  const [bookWithoutNumber, setBookWithoutNumber] = useState<Book | undefined>(
    undefined,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [groupingOpen, setGroupingOpen] = useState(false);
  const [groups, setGroups] = useState<string[]>([]);
  const [knownGroups, setKnownGroups] = useState<string[]>([]);
  const [knownCustomFields, setKnownCustomFields] = useState<string[]>([]);
  const [unknownIdentifier, setUnknownIdentifier] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme");
    return (saved as Theme) || "system";
  });

  const loadBooks = async () => {
    try {
      setLoading(true);
      const result = await invoke<BookWithThumbnail[]>("get_all_books");
      const books = await Promise.all(
        result.map(async (item) => {
          if (!item.thumbnail) {
            return item;
          }

          try {
            const data = await readFile(item.thumbnail);
            const blob = new Blob([data], { type: "image/jpeg" });
            item.thumbnail = URL.createObjectURL(blob);
          } catch (err) {
            item.thumbnail = undefined;
            console.error(
              `Failed to load image for ${item.book.volume_id}`,
              err,
            );
          }
          return item;
        }),
      );
      setBooks(books);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const result = await invoke<string[]>("get_all_groups");
      setKnownGroups(result);
    } catch (err) {
      console.error("Failed to load groups:", err);
    }
  };

  const loadCustomFields = async () => {
    try {
      const result = await invoke<string[]>("get_all_custom_fields");
      setKnownCustomFields(result);
    } catch (err) {
      console.error("Failed to load custom fields:", err);
    }
  };

  useEffect(() => {
    localStorage.setItem("theme", theme);
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    loadBooks();
    loadGroups();
    loadCustomFields();
    const un1 = listen("book-added", () => {
      loadBooks();
      loadGroups();
      loadCustomFields();
    });
    const un2 = listen("book-updated", () => {
      loadBooks();
      loadGroups();
      loadCustomFields();
    });
    return () => {
      un1.then((f) => f());
      un2.then((f) => f());
    };
  }, []);

  useEffect(() => {
    const unlistener = listen<Book>("possible-comic-found", (event) => {
      setBookWithoutNumber(event.payload);
    });
    return () => {
      unlistener.then((f) => f());
    };
  }, []);

  const applyTheme = (t: Theme) => {
    const html = document.documentElement;
    if (t === "system") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      prefersDark ? html.classList.add("dark") : html.classList.remove("dark");
    } else {
      t === "dark" ? html.classList.add("dark") : html.classList.remove("dark");
    }
  };

  const handleSelect = (b: BookWithThumbnail) => {
    setSelectedBook(b);
    setDetailsOpen(true);
  };

  const handleBookSaved = async (volume_id: string) => {
    const result = await invoke<string>("set_book_groups", {
      volumeId: volume_id,
      groups: groups,
    });
    console.log(result);

    console.log("Success:", volume_id);
    const settings = await loadSettings();
    if (settings.successSound) {
      new Audio("/success.mp3").play();
    }
    emit("book-updated");
    toast.success(`Added ${volume_id}`);
  };

  const handleNewEAN = async (ean: string) => {
    setUnknownIdentifier(ean);
    openAddDialog();
  };

  const handleExistingEAN = async (book: Book) => {
    // Clone the comic first
    const newVolumeId = await invoke<string>("clone_book", {
      volumeId: book.volume_id,
    });
    // Override the volume id with the new one since it's used in the
    // set number dialog
    book.volume_id = newVolumeId;
    // We also unset the number just to make sure it's not reused or something
    book.number = undefined;
    setBookWithoutNumber(book);
  };

  const handleClipboardError = async (identifier: string, error: string) => {
    console.error("Error:", error);
    const settings = await loadSettings();
    if (settings.errorSound) {
      new Audio("/error.flac").play();
    }
    toast.error(error, {
      action: {
        label: "Add",
        onClick: () => {
          setUnknownIdentifier(identifier);
          openAddDialog();
        },
      },
      cancel: {
        label: "Ignore",
        onClick: () => console.log("Cancel!"),
      },
    });
  };

  const openAddDialog = () => {
    setAddOpen(!addOpen);
  };

  const handleAddBook = async (payload: {
    title: string;
    authors?: string[];
    publisher?: string;
    year?: string;
  }) => {
    await invoke<string>("add_book", {
      ...payload,
      groups,
      identifier: unknownIdentifier,
    });
    setUnknownIdentifier("");
  };

  const handleSetBookNumber = async (volumeId: string, bookNumber: number) => {
    await invoke("set_book_number", {
      volumeId,
      number: bookNumber,
    });
    setBookWithoutNumber(undefined);
  };

  const toggleEditMode = () => {
    setEditMode((v) => !v);
  };

  const openSettingsDialog = async () => {
    setSettingsOpen(true);
  };

  const openExportDialog = async () => {
    try {
      const message = await invoke<string>("export_books_csv");
      toast.success(message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const cycleTheme = () => {
    setTheme((prev) => {
      if (prev === "light") {
        return "dark";
      }
      if (prev === "dark") {
        return "system";
      }
      return "light";
    });
  };

  const getThemeIcon = () => {
    if (theme === "light") {
      return <Sun size={18} />;
    }
    if (theme === "dark") {
      return <Moon size={18} />;
    }
    return <Monitor size={18} />;
  };

  const items = [
    {
      id: "export",
      icon: <Download size={18} />,
      ariaLabel: "Export",
      onClick: openExportDialog,
    },
    {
      id: "theme",
      icon: getThemeIcon(),
      ariaLabel: "Theme",
      onClick: cycleTheme,
    },
    {
      id: "add",
      icon: <Plus size={18} />,
      ariaLabel: "Add",
      onClick: openAddDialog,
    },
    {
      id: "edit",
      icon: <Pencil size={18} />,
      ariaLabel: "Edit",
      onClick: toggleEditMode,
    },
    {
      id: "grouping",
      icon: <LibraryBig size={18} />,
      ariaLabel: "Grouping",
      onClick: () => {
        setGroupingOpen(true);
      },
    },
    {
      id: "settings",
      icon: <Cog size={18} />,
      ariaLabel: "Settings",
      onClick: openSettingsDialog,
    },
  ];

  const filteredBooks = books.filter((book) => {
    const query = searchQuery.toLowerCase();

    // First filter by search query if present
    const customValues = Object.values(book.book.custom_fields);
    const matchesSearch =
      !query ||
      book.book.title.toLowerCase().includes(query) ||
      book.authors.some((author) =>
        author.name.toLowerCase().includes(query),
      ) ||
      book.book.publisher?.toLowerCase().includes(query) ||
      customValues.some((v) => v.toLowerCase().includes(query)) ||
      book.book.groups.some((group) => group.toLowerCase().includes(query));

    // Then filter by selected groups if any
    const matchesGroup =
      groups.length === 0 ||
      book.book.groups.some((group) => groups.includes(group));

    return matchesSearch && matchesGroup;
  });

  return (
    <div className="h-screen w-screen flex flex-col">
      <Toaster richColors />
      <KeypressListener
        onBookSaved={handleBookSaved}
        onNewEAN={handleNewEAN}
        onExistingEAN={handleExistingEAN}
        onError={handleClipboardError}
      />

      <div className="fixed top-0 left-0 right-0 z-20 bg-transparent pointer-events-none select-none">
        <div className="flex justify-center">
          <div className="flex flex-col items-center">
            <div className="pointer-events-auto">
              <div className="flex flex-row gap-3 items-center">
                <PillNav items={items} />
                <SearchBox
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search"
                  className="flex-1 max-w-2xl"
                />
              </div>
            </div>
            {(editMode || groups.length > 0) && (
              <div className="flex flex-row flex-wrap justify-center max-w-3xl gap-2 pt-4 px-4">
                {editMode && (
                  <span
                    className={cn(
                      "pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-orange-400/40 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 dark:bg-orange-500/30 transition-all duration-300",
                    )}
                  >
                    <PencilLine size={14} />
                    Edit mode
                  </span>
                )}
                {groups.map((group) => (
                  <span
                    key={group}
                    className={cn(
                      "pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
                      "text-xs font-medium transition-all duration-300",
                      getColorForGroup(group),
                    )}
                  >
                    <button
                      onClick={() => {
                        setGroups(groups.filter((g) => g !== group));
                      }}
                      className={cn(
                        "rounded-full",
                        "hover:bg-black/10 dark:hover:bg-white/10",
                        "transition-colors",
                      )}
                      aria-label={`Remove ${group}`}
                    >
                      <X size={14} />
                    </button>
                    {group}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-24 bg-white dark:bg-zinc-900 transition-colors">
        <BookGrid
          books={filteredBooks}
          loading={loading}
          error={error}
          onSelect={handleSelect}
        />
      </div>

      <AddBookDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddBook}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Settings"
        description="Configure your API key."
      />
      {selectedBook && (
        <DetailsDialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          editMode={editMode}
          initial={selectedBook}
          knownGroups={knownGroups}
          knownCustomFields={knownCustomFields}
          onNext={() => {
            const currentIndex = filteredBooks.indexOf(selectedBook);
            setSelectedBook(filteredBooks[currentIndex + 1]);
          }}
          onPrev={() => {
            const currentIndex = filteredBooks.indexOf(selectedBook);
            setSelectedBook(filteredBooks[currentIndex - 1]);
          }}
          hasNext={
            selectedBook &&
            filteredBooks.indexOf(selectedBook) !== filteredBooks.length - 1
          }
          hasPrev={selectedBook && filteredBooks.indexOf(selectedBook) !== 0}
        />
      )}
      <BookNumberDialog
        open={bookWithoutNumber !== undefined}
        book={bookWithoutNumber}
        onClose={() => {
          setBookWithoutNumber(undefined);
          emit("book-updated");
        }}
        onSubmit={handleSetBookNumber}
      />
      <GroupingDialog
        open={groupingOpen}
        onClose={() => {
          setGroupingOpen(false);
        }}
        onClearAll={() => setGroups([])}
        groups={groups}
        knownGroups={knownGroups}
        onGroupAdd={(group: string) => {
          setGroups([...groups, group]);
        }}
        onGroupRemove={(group: string) => {
          setGroups(groups.filter((g) => g !== group));
        }}
      />
    </div>
  );
}

export default App;
