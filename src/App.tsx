import "./App.css";
import { useEffect, useState } from "react";
import { KeypressListener } from "./components/KeypressListener";
import { Book, BookGrid, BookWithThumbnail } from "./components/BookGrid";
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
} from "lucide-react";
import { SettingsDialog } from "./components/SettingsDialog";
import { Toaster, toast } from "sonner";
import { AddBookDialog } from "./components/AddBookDialog";
import { invoke } from "@tauri-apps/api/core";
import { DetailsDialog } from "./components/DetailsDialog";
import { cn } from "./utils";
import { loadSettings } from "./lib/store";
import { BookNumberDialog } from "./components/BookNumberDialog";
import { emit, listen } from "@tauri-apps/api/event";

type Theme = "light" | "dark" | "system";

function App() {
  const [editMode, setEditMode] = useState(false);
  const [selectedBook, setSelectedBook] = useState<BookWithThumbnail | null>(
    null,
  );
  const [bookWithoutNumber, setBookWithoutNumber] = useState<Book | undefined>(
    undefined,
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [unknownISBN, setUnknownISBN] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("theme");
    return (saved as Theme) || "system";
  });

  useEffect(() => {
    localStorage.setItem("theme", theme);
    applyTheme(theme);
  }, [theme]);

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

  const handleClipboardSuccess = async (message: string) => {
    console.log("Success:", message);
    const settings = await loadSettings();
    if (settings.successSound) {
      new Audio("/success.mp3").play();
    }
    toast.success(`Added ${message}`);
  };

  const handleClipboardError = async (isbn: string, error: string) => {
    console.error("Error:", error);
    const settings = await loadSettings();
    if (settings.errorSound) {
      new Audio("/error.flac").play();
    }
    toast.error(error, {
      action: {
        label: "Add",
        onClick: () => {
          setUnknownISBN(isbn);
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
    await invoke<string>("add_book", { ...payload, isbn: unknownISBN });
    setUnknownISBN("");
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
      id: "settings",
      icon: <Cog size={18} />,
      ariaLabel: "Settings",
      onClick: openSettingsDialog,
    },
  ];

  return (
    <div className="h-screen w-screen flex flex-col">
      <Toaster richColors />
      <KeypressListener
        onSuccess={handleClipboardSuccess}
        onError={handleClipboardError}
      />

      <div className="fixed top-0 left-0 right-0 z-20 bg-transparent pointer-events-none select-none">
        <div className="w-full flex justify-center">
          <div className="relative">
            <div className="pointer-events-auto">
              <PillNav items={items} />
            </div>
            <span
              className={cn(
                "absolute -right-28 top-1/2 -translate-y-1/2 pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-orange-400/40 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 dark:bg-orange-500/30 transition-all duration-300",
                editMode
                  ? "opacity-100 scale-100"
                  : "opacity-0 scale-95 pointer-events-none",
              )}
            >
              <PencilLine size={14} />
              Edit mode
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pt-12 bg-white dark:bg-zinc-900 transition-colors">
        <BookGrid onSelect={handleSelect} />
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
    </div>
  );
}

export default App;
