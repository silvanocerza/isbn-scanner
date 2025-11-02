import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { ClipboardListener } from "./components/ClipboardListener";
import { BookGrid } from "./components/BookGrid";
import { PillNav } from "./components/PillNav";
import { Cog, Pencil, Plus, Download } from "lucide-react";

function App() {
  const [editMode, setEditMode] = useState(false);
  const handleClipboardSuccess = (message: string) => {
    // TODO: show success toast
    console.log("Success:", message);
  };

  const handleClipboardError = (error: string) => {
    // TODO: show error toast
    console.error("Error:", error);
  };
  const openAddDialog = () => {};
  const toggleEditMode = () => {
    setEditMode(!editMode);
  };
  const openSettingsDialog = () => {};
  const openExportDialog = () => {};

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
    <main className="flex flex-col items-center gap-6 py-2">
      <ClipboardListener
        onSuccess={handleClipboardSuccess}
        onError={handleClipboardError}
      />

      <div className="w-full flex justify-center">
        <PillNav items={items} />
      </div>

      <BookGrid />
    </main>
  );
}

export default App;
