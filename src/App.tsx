import "./App.css";
import { useState } from "react";
import { ClipboardListener } from "./components/ClipboardListener";
import { BookGrid } from "./components/BookGrid";
import { PillNav } from "./components/PillNav";
import { Cog, Pencil, Plus, Download } from "lucide-react";
import { SettingsDialog } from "./components/SettingsDialog";
import { Toaster, toast } from "sonner";
import { AddBookDialog } from "./components/AddBookDialog";
import { invoke } from "@tauri-apps/api/core";

function App() {
  const [editMode, setEditMode] = useState(false);
  const [unknownISBN, setUnknownISBN] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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
    <div className="h-screen w-screen flex flex-col">
      <Toaster richColors />
      <ClipboardListener
        onSuccess={handleClipboardSuccess}
        onError={handleClipboardError}
      />

      {/* Fixed header that overlays content */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-transparent pointer-events-none">
        <div className="w-full flex justify-center">
          <div className="pointer-events-auto">
            <PillNav items={items} />
          </div>
        </div>
      </div>

      {/* Scrollable content that goes under the header */}
      <div className="flex-1 overflow-y-auto pt-12">
        <BookGrid />
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
    </div>
  );
}

export default App;
