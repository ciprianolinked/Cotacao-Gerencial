"use client";

import { useEffect, useState } from "react";
import { formatDecimalInput, parseDecimalBR } from "@/lib/calculations";

interface CurrencyInputProps {
  value: number | null;
  onChange: (val: number | null) => void;
  highlightBest?: boolean;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export function CurrencyInput({
  value,
  onChange,
  highlightBest = false,
  placeholder = "0,00",
  disabled = false,
  ariaLabel,
}: CurrencyInputProps) {
  const [text, setText] = useState<string>(() => formatDecimalInput(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatDecimalInput(value));
    }
  }, [value, focused]);

  return (
    <div className="relative w-full">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[8px] font-bold uppercase text-slate-400"
      >
        R$
      </span>
      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        aria-label={ariaLabel}
        value={text}
        placeholder={placeholder}
        title={text || placeholder}
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
        }}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          onChange(parseDecimalBR(next));
        }}
        onBlur={() => {
          setFocused(false);
          const parsed = parseDecimalBR(text);
          onChange(parsed);
          setText(formatDecimalInput(parsed));
        }}
        className={`field !h-8 w-full min-w-0 pl-5 pr-1 !py-1 text-right text-[11px] font-semibold tabular-nums ${
          highlightBest
            ? "!border-success/50 !bg-success-soft font-bold text-success"
            : ""
        }`}
      />
    </div>
  );
}
