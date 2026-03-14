import "./App.css";
import { useEffect, useState, useRef } from "react";
import { KeypressListener } from "./components/KeypressListener";
import { BookGrid, GroupedBooks } from "./components/BookGrid";
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
  Layers,
} from "lucide-react";
import { SettingsDialog } from "./components/SettingsDialog";
import { Toaster, toast } from "sonner";
import { AddBookDialog, AddBookPayload } from "./components/AddBookDialog";
import { invoke } from "@tauri-apps/api/core";
import { DetailsDialog } from "./components/DetailsDialog";
import { cn, getColorForGroup, isISBN, isEAN13, isOnlyDigits } from "./utils";
import { loadSettings } from "./lib/store";
import { BookNumberDialog } from "./components/BookNumberDialog";
import { emit, listen } from "@tauri-apps/api/event";
import { readFile } from "@tauri-apps/plugin-fs";
import { Book } from "./types";
import { GroupingDialog } from "./components/GroupingDialog";
import { GroupDetailsDialog } from "./components/GroupDetailsDialog";
import { SearchBox } from "./components/SearchBox";
import { IdentifierBox } from "./components/IdentifierBox";

type Theme = "light" | "dark" | "system";

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [manualIdentifier, setManualIdentifier] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [bookWithoutNumber, setBookWithoutNumber] = useState<Book | undefined>(
    undefined,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [groupingOpen, setGroupingOpen] = useState(false);
  const [groups, setGroups] = useState<string[]>([]);
  const [knownGroups, setKnownGroups] = useState<string[]>([]);
  const [knownCustomFields, setKnownCustomFields] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addOpenWithIdentifier, setAddOpenWithIdentifier] = useState("");
  const [addOpenWithSeries, setAddOpenWithSeries] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme");
    return (saved as Theme) || "system";
  });
  const [groupByTitle, setGroupByTitle] = useState(() => {
    const saved = localStorage.getItem("groupByTitle");
    return saved === "true";
  });
  const [selectedGroup, setSelectedGroup] = useState<GroupedBooks | null>(null);
  const [groupDetailsOpen, setGroupDetailsOpen] = useState(false);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const result = await invoke<Book[]>("get_all_books");
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
            console.error(`Failed to load image for ${item.volume_id}`, err);
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

  const reloadBooks = async () => {
    const scrollTop = scrollRef.current?.scrollTop ?? 0;
    try {
      const result = await invoke<Book[]>("get_all_books");
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
            console.error(`Failed to load image for ${item.volume_id}`, err);
          }
          return item;
        }),
      );
      setBooks(books);
      setError(null);
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollTop;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
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

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBooks();
    loadGroups();
    loadCustomFields();
    const un1 = listen("book-added", () => {
      reloadBooks();
    });
    const un2 = listen("book-updated", () => {
      reloadBooks();
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

  const handleSelect = (b: Book) => {
    setSelectedBook(b);
    setSelectedGroup(null);
    setDetailsOpen(true);
  };

  const handleSelectGroup = (g: GroupedBooks) => {
    setSelectedGroup(g);
    setSelectedBook(null);
    setGroupDetailsOpen(true);
  };

  const handleSelectBookFromGroup = (book: Book) => {
    setSelectedBook(book);
    setGroupDetailsOpen(false);
    setDetailsOpen(true);
  };

  useEffect(() => {
    localStorage.setItem("groupByTitle", String(groupByTitle));
  }, [groupByTitle]);

  const handleBookSaved = async (book: Book) => {
    const result = await invoke<string>("set_book_groups", {
      volumeId: book.volume_id,
      groups: groups,
    });
    console.log(result);

    console.log("Success:", book.volume_id);
    const settings = await loadSettings();
    if (settings.successSound) {
      new Audio("/success.mp3").play();
    }
    emit("book-updated");
    toast.success(`Added ${book.title}`);
  };

  const handleNewEAN = async (ean: string) => {
    setAddOpenWithIdentifier(ean);
    setAddOpen(true);
  };

  const handleExistingSeries = async (series: string) => {
    setAddOpenWithSeries(series);
    setAddOpen(true);
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
          setAddOpenWithIdentifier(identifier);
          setAddOpen(true);
        },
      },
      cancel: {
        label: "Ignore",
        onClick: () => console.log("Cancel!"),
      },
    });
  };

  const handleManualIdentifier = async (text: string) => {
    await handleScan(text);
  };

  const handleScan = async (text: string) => {
    const digits = text.replace(/\D/g, "");

    const isISBNFormat =
      isISBN(text) &&
      (digits.length === 10 ||
        digits.startsWith("978") ||
        digits.startsWith("979"));

    if (isISBNFormat) {
      try {
        const exists = await invoke<boolean>("isbn_exists", {
          isbn: text,
        });
        if (exists) return;

        const book = await invoke<Book>("fetch_isbn", {
          isbn: text,
        });
        await handleBookSaved(book);
      } catch (error) {
        console.log(error);
        handleClipboardError(text, String(error));
      }
    } else if (isEAN13(text)) {
      const book = await invoke<Book | null>("find_comic_by_ean", {
        ean: text,
      });

      if (book && book.series) {
        await handleExistingSeries(book.series);
      } else if (book) {
        await handleExistingEAN(book);
      } else {
        await handleNewEAN(text);
      }
    } else if (isOnlyDigits(text)) {
      toast.error("Unknown barcode format");
    }
  };

  const openAddDialog = () => {
    setAddOpen(!addOpen);
  };

  const handleAddBook = async (payload: AddBookPayload) => {
    await invoke<string>("add_book", {
      ...payload,
      groups,
    });
  };

  const handleSetBookNumber = async (volumeId: string, numbers: number[]) => {
    // Clone the book for each number in the range
    for (const num of numbers) {
      await invoke("clone_book_with_number", {
        volumeId,
        number: num,
      });
    }
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
      id: "group-by-title",
      icon: (
        <Layers size={18} className={groupByTitle ? "text-blue-500" : ""} />
      ),
      ariaLabel: groupByTitle ? "Ungroup books" : "Group books by title",
      onClick: () => setGroupByTitle(!groupByTitle),
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
    const customValues = Object.values(book.custom_fields);
    const matchesSearch =
      !query ||
      book.title.toLowerCase().includes(query) ||
      book.series?.toLowerCase().includes(query) ||
      book.authors.some((author) => author.toLowerCase().includes(query)) ||
      book.publisher?.toLowerCase().includes(query) ||
      customValues.some((v) => v.toLowerCase().includes(query)) ||
      book.groups.some((group) => group.toLowerCase().includes(query));

    // Then filter by selected groups if any
    const matchesGroup =
      groups.length === 0 ||
      book.groups.some((group) => groups.includes(group));

    return matchesSearch && matchesGroup;
  });

  return (
    <div className="h-screen w-screen flex flex-col">
      <Toaster richColors />
      <KeypressListener onScan={handleScan} />

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
                <IdentifierBox
                  value={manualIdentifier}
                  onChange={setManualIdentifier}
                  onSubmit={async (value) => {
                    await handleManualIdentifier(value);
                    setManualIdentifier("");
                  }}
                  placeholder="ISBN / ISSN"
                />
                <span
                  className="text-md
                  pointer-events-none inline-flex items-center gap-1.5 rounded-full bg-blue-400/40 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 dark:bg-blue-500/30 transition-all duration-300"
                >
                  {filteredBooks.length}{" "}
                  {filteredBooks.length === 1 ? "book" : "books"}
                </span>
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

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pt-24 bg-white dark:bg-zinc-900 transition-colors"
      >
        <BookGrid
          books={filteredBooks}
          loading={loading}
          error={error}
          onSelect={handleSelect}
          onSelectGroup={handleSelectGroup}
          groupByTitle={groupByTitle}
        />
      </div>

      <AddBookDialog
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setAddOpenWithIdentifier("");
        }}
        onSubmit={handleAddBook}
        initialIdentifier={addOpenWithIdentifier}
        initialSeries={addOpenWithSeries}
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
          onDelete={async () => {
            if (!selectedBook) return;
            try {
              await invoke("delete_book", {
                volumeId: selectedBook.volume_id,
              });
              setDetailsOpen(false);
              reloadBooks();
              loadGroups();
              loadCustomFields();
            } catch (err) {
              toast.error(err instanceof Error ? err.message : String(err));
            }
          }}
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
      <GroupDetailsDialog
        open={groupDetailsOpen}
        onClose={() => setGroupDetailsOpen(false)}
        group={selectedGroup}
        onSelectBook={handleSelectBookFromGroup}
      />
    </div>
  );
}

export default App;
