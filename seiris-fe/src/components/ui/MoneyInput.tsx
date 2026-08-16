import { useRef, useCallback, type ChangeEvent } from "react";
import { formatThousand } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface MoneyInputProps {
  value: string;
  onChange: (rawDigits: string) => void;
  placeholder?: string;
  min?: number;
  className?: string;
  id?: string;
  autoFocus?: boolean;
}

/**
 * Input uang dengan formatting ribuan otomatis (id-ID: titik sebagai pemisah).
 * State mentah = digit saja ("150000"). Display = formatted ("150.000").
 * Caret dipertahankan posisinya relatif terhadap digit.
 */
export default function MoneyInput({ value, onChange, placeholder, min, className, id, autoFocus }: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    // hitung posisi caret relatif terhadap digit
    const caretPos = e.target.selectionStart ?? 0;
    const digitsBeforeCaret = e.target.value.slice(0, caretPos).replace(/\D/g, "").length;

    onChange(raw);

    // restore caret setelah re-render (via microtask supaya state sudah update)
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      const formatted = input.value;
      let digitCount = 0;
      let newPos = 0;
      for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) digitCount++;
        if (digitCount >= digitsBeforeCaret) { newPos = i + 1; break; }
      }
      input.setSelectionRange(newPos, newPos);
    });
  }, [onChange]);

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      inputMode="numeric"
      value={formatThousand(value)}
      onChange={handleChange}
      min={min}
      placeholder={placeholder}
      autoFocus={autoFocus}
      className={cn(
        "w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent",
        className
      )}
    />
  );
}
