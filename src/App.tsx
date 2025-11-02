import "./App.css";
import { useState } from "react";
import { ClipboardListener } from "./components/ClipboardListener";
import { BookGrid, BookWithThumbnail } from "./components/BookGrid";
import { PillNav } from "./components/PillNav";
import { Cog, Pencil, Plus, Download, PencilLine } from "lucide-react";
import { SettingsDialog } from "./components/SettingsDialog";
import { Toaster, toast } from "sonner";
import { AddBookDialog } from "./components/AddBookDialog";
import { invoke } from "@tauri-apps/api/core";
import { DetailsDialog } from "./components/DetailsDialog";
import { cn } from "./utils";

function App() {
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState<BookWithThumbnail | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [unknownISBN, setUnknownISBN] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handleSelect = (b: BookWithThumbnail) => {
    setSelected(b);
    setDetailsOpen(true);
  };

  const handleClipboardSuccess = (message: string) => {
    console.log("Success:", message);
    toast.success(`Added ${message}`);
  };

  const handleClipboardError = (isbn: string, error: string) => {
    console.error("Error:", error);
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

  const toggleEditMode = () => {
    setEditMode((v) => !v);
  };

  const openSettingsDialog = async () => {
    setSettingsOpen(true);
  };

  const openExportDialog = () => {
    console.log("Export clicked");
  };

  const items = [
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
    {
      id: "export",
      icon: <Download size={18} />,
      ariaLabel: "Export",
      onClick: openExportDialog,
    },
  ];

  return (
    <div className={cn("h-screen w-screen flex flex-col", darkMode && "dark")}>
      <Toaster richColors />
      <ClipboardListener
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
                "absolute -right-28 top-1/2 -translate-y-1/2 pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-orange-400/40 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 dark:bg-orange-400/40 transition-all duration-300",
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

      {/* Scrollable content that goes under the header */}
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
      {selected && (
        <DetailsDialog
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          editMode={editMode}
          initial={selected}
        />
      )}
    </div>
  );
}

export default App;
