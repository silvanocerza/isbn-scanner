import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isEAN13, isISBN, isOnlyDigits } from "../utils";
import { toast } from "sonner";
import { Book } from "./BookGrid";

interface KeypressListenerProps {
  onBookSaved?: (message: string) => void;
  onNewEAN?: (ean: string) => void;
  onExistingEAN?: (book: Book) => void;
  onError?: (identifier: string, message: string) => void;
}

export function KeypressListener({
  onBookSaved,
  onNewEAN,
  onExistingEAN,
  onError,
}: KeypressListenerProps) {
  // Buffer for the current scan
  const bufferRef = useRef<string>("");
  // Timestamp of last key, used to decide whether we’re in a “burst”
  const lastKeyTimeRef = useRef<number>(0);

  // Tuning parameters
  const maxInterKeyDelayMs = 50; // keys slower than this reset the buffer
  const maxScanLength = 32; // safety limit to avoid runaway buffers

  useEffect(() => {
    const handleKeydown = async (e: KeyboardEvent) => {
      const now = performance.now();

      // If last key was too long ago, start a new buffer
      if (now - lastKeyTimeRef.current > maxInterKeyDelayMs) {
        bufferRef.current = "";
      }
      lastKeyTimeRef.current = now;

      // If Enter is pressed, finalize current buffer as a scan
      if (e.key === "Enter") {
        const text = bufferRef.current.trim();
        bufferRef.current = "";

        if (!text) {
          return;
        }

        try {
          if (!isISBN(text) && !isEAN13(text)) {
            if (isOnlyDigits(text)) {
              toast.error("Unknown barcode format");
            }
            return;
          }
          if (isEAN13(text)) {
            const book = await invoke<Book | null>("find_comic_by_ean", {
              ean: text,
            });
            if (book) {
              onExistingEAN?.(book);
            } else {
              onNewEAN?.(text);
            }
            return;
          }

          try {
            const exists = await invoke<boolean>("isbn_exists", { isbn: text });
            if (exists) return;

            const result = await invoke<string>("fetch_isbn", { isbn: text });
            onBookSaved?.(result);
          } catch (error) {
            onError?.(text, String(error));
          }
        } catch (err) {
          console.error("Scan handling error:", err);
        }

        return;
      }

      // Accept digits, X/x (for ISBN-10), and hyphen removal by scanners
      // Some scanners also send letters; allow them but cap length.
      const key = e.key;
      const isAllowedChar =
        (key.length === 1 && /[0-9xX-]/.test(key)) ||
        // Some scanners send numpad digits as single-char keys already covered
        false;

      if (isAllowedChar) {
        if (bufferRef.current.length < maxScanLength) {
          bufferRef.current += key;
        } else {
          // Safety: if exceeded, reset to avoid accidental long logs
          bufferRef.current = "";
        }
        // Prevent typing into focused inputs if desired:
        // e.preventDefault();
      } else {
        // If it’s any other key during a fast burst, ignore but don’t reset.
        // For normal human typing, the delay will reset the buffer anyway.
      }
    };

    window.addEventListener("keydown", handleKeydown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeydown, { capture: true });
  }, [onBookSaved, onError]);

  return null;
}
