import { useEffect, useRef } from "react";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { invoke } from "@tauri-apps/api/core";
import { isPossibleIdentifier } from "../utils";

interface ClipboardListenerProps {
  onSuccess?: (message: string) => void;
  onError?: (isbn: string, message: string) => void;
}

export function ClipboardListener({
  onSuccess,
  onError,
}: ClipboardListenerProps) {
  const lastClipboardRef = useRef<string>("");
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        const raw = await readText();
        const text = (raw ?? "").trim();
        if (!isPossibleIdentifier(text)) {
          return;
        }

        if (text && text !== lastClipboardRef.current) {
          lastClipboardRef.current = text;
          try {
            const exists = await invoke<boolean>("isbn_exists", { isbn: text });
            if (exists) {
              return;
            }
            const result = await invoke<string>("fetch_isbn", { isbn: text });
            onSuccess?.(result);
          } catch (error) {
            onError?.(text, String(error));
          }
        }
      } catch (e) {
        console.error("Clipboard read error:", e);
      }
    };

    const id = window.setInterval(checkClipboard, 500);
    return () => clearInterval(id);
  }, [onSuccess, onError]);

  return null;
}
