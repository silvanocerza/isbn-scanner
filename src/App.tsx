import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { ClipboardListener } from "./components/ClipboardListener";
import { BookGrid } from "./components/BookGrid";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  const handleClipboardSuccess = (message: string) => {
    // TODO: show success toast
    console.log("Success:", message);
  };

  const handleClipboardError = (error: string) => {
    // TODO: show error toast
    console.error("Error:", error);
  };

  return (
    <main>
      <ClipboardListener
        onSuccess={handleClipboardSuccess}
        onError={handleClipboardError}
      />
      <BookGrid />
    </main>
  );
}

export default App;
