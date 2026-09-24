"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";

export interface FilterDropdownOption {
  label: string;
  href: string;
  active: boolean;
}

interface FilterDropdownProps {
  label: string;
  /** Selected option label, shown in the trigger when a filter is applied. */
  value?: string;
  options: FilterDropdownOption[];
}

/** Compact filter menu of plain links, so every filtered view stays a shareable URL. */
export function FilterDropdown({ label, value, options }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={menuId}
        className={`chip h-9 gap-1 pr-2.5 text-sm ${value ? "chip-active" : ""}`}
      >
        <span>{value ? `${label}: ${value}` : label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          className="popover animate-fade-in absolute left-0 top-full z-40 mt-2 max-h-80 w-56 overflow-y-auto p-1.5"
        >
          <ul>
            {options.map((opt) => (
              <li key={opt.href}>
                <Link
                  href={opt.href}
                  scroll={false}
                  onClick={() => setOpen(false)}
                  aria-current={opt.active ? "true" : undefined}
                  className={`flex items-center justify-between rounded px-3 py-2 text-sm transition-colors hover:bg-white/10 ${
                    opt.active ? "font-semibold text-white" : "text-fg-muted hover:text-white"
                  }`}
                >
                  {opt.label}
                  {opt.active && <Check className="h-4 w-4" aria-hidden="true" />}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
