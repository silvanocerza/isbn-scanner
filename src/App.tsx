import "./App.css";
import { useState } from "react";
import { ClipboardListener } from "./components/ClipboardListener";
import { BookGrid } from "./components/BookGrid";
import { PillNav } from "./components/PillNav";
import { Cog, Pencil, Plus, Download } from "lucide-react";
import { SettingsDialog } from "./components/SettingsDialog";

function App() {
  const [editMode, setEditMode] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openSettingsDialog = async () => {
    setSettingsOpen(true);
  };

  const handleClipboardSuccess = (message: string) => {
    console.log("Success:", message);
  };

  const handleClipboardError = (error: string) => {
    console.error("Error:", error);
  };

  const openAddDialog = () => {
    console.log("Add clicked");
  };

  const toggleEditMode = () => {
    setEditMode((v) => !v);
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
    <main className="flex flex-col items-center gap-6 py-2">
      <ClipboardListener
        onSuccess={handleClipboardSuccess}
        onError={handleClipboardError}
      />

      <div className="w-full flex justify-center">
        <PillNav items={items} />
      </div>

      <BookGrid />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Settings"
        description="Configure your API key."
      />
    </main>
  );
}

export default App;
