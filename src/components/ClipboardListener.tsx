import { useEffect } from "react";
import { readText } from "@tauri-apps/plugin-clipboard-manager";
import { Window } from "@tauri-apps/api/window";
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
  useEffect(() => {
    let lastClipboard = "";
    let interval: number | null = null;

    const checkClipboard = async () => {
      try {
        const text = (await readText()).trim();
        if (!isPossibleIdentifier(text)) {
          return;
        }
        if (text !== lastClipboard) {
          lastClipboard = text;
          try {
            const result = await invoke("fetch_isbn", { isbn: text });
            onSuccess?.(result as string);
          } catch (error) {
            onError?.(text, error as string);
          }
        }
      } catch (error) {
        console.error("Clipboard read error:", error);
      }
    };

    const startPolling = () => {
      if (!interval) {
        interval = window.setInterval(checkClipboard, 500);
      }
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const unlistenFocus = Window.getCurrent().onFocusChanged(
      ({ payload: focused }) => {
        if (focused) startPolling();
        else stopPolling();
      },
    );

    startPolling();

    return () => {
      stopPolling();
      unlistenFocus.then((f) => f());
    };
  }, [onSuccess, onError]);

  return null;
}
