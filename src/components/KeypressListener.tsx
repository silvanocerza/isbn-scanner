import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { isISBN, isISSN, isOnlyDigits } from "../utils";
import { toast } from "sonner";

interface KeypressListenerProps {
  onSuccess?: (message: string) => void;
  onError?: (isbn: string, message: string) => void;
}

export function KeypressListener({
  onSuccess,
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
          if (!isISBN(text) && !isISSN(text)) {
            if (isOnlyDigits(text)) {
              toast.error("Unknown barcode format");
            }
            return;
          }

          try {
            const exists = await invoke<boolean>("isbn_exists", { isbn: text });
            if (exists) {
              return;
            }

            const result = await invoke<string>("fetch_isbn", { isbn: text });
            // TODO: There are some comic books that have ISBNs too, so Google
            // Books returns some data for them, though it doesn't return the
            // number of the book.
            //
            // We should change fetch_isbn logic to check if the fetched book
            // title already exists in the DB, if it does we must show the user
            // the dialog to set the number of the comic book.
            onSuccess?.(result);
          } catch (error) {
            // We check if it's an ISSN here, cause if Google Books
            // managed to recognize it we're good, if it doesn't we
            // fallback to a workaround
            if (isISSN(text)) {
              // Split ISSN
              // Check if first part is in DB
              //
              // If first part exists get comic data
              // Parse second part to guess number
              // Open dialog to add book prepopulated with data
              //
              // If first part doesn't exist
              // Parse second part to guess number
              // Open dialog to add book prepopulated with number only
            } else {
              onError?.(text, String(error));
            }
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
  }, [onSuccess, onError]);

  return null;
}
