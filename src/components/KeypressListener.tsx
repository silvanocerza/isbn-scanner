import { useEffect, useRef } from "react";
import { isEAN13, isISBN, isOnlyDigits } from "../utils";

interface KeypressListenerProps {
  onScan?: (text: string) => Promise<void>;
}

export function KeypressListener({
  onScan,
}: KeypressListenerProps) {
  // Buffer for the current scan
  const bufferRef = useRef<string>("");
  // Timestamp of last key, used to decide whether we're in a "burst"
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
          const digits = text.replace(/\D/g, "");

          // Check if it's an ISBN (10 or 13 digits starting with 978/979)
          const isISBNFormat =
            isISBN(text) &&
            (digits.length === 10 ||
              digits.startsWith("978") ||
              digits.startsWith("979"));

          if (isISBNFormat || isEAN13(text) || isOnlyDigits(text)) {
            await onScan?.(text);
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
      }
    };

    window.addEventListener("keydown", handleKeydown, { capture: true });
    return () =>
      window.removeEventListener("keydown", handleKeydown, { capture: true });
  }, [onScan]);

  return null;
}
