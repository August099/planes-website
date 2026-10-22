"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  PROVINCE_LABELS,
  loadLocalities,
  provinceCode,
  searchLocalities,
  type IndexedLocality,
} from "@/lib/localities";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Nombre de la provincia elegida en el formulario. Si se reconoce, solo se sugieren localidades de esa provincia. */
  province?: string | null;
  id?: string;
  name?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
};

const DEFAULT_INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#001F58] focus:ring-2 focus:ring-[#001F58]/15 disabled:opacity-60";

export function LocalityInput({
  value,
  onChange,
  province,
  id,
  name = "city",
  placeholder = "Ej: Rosario",
  className = DEFAULT_INPUT_CLASS,
  disabled,
  required,
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [all, setAll] = useState<IndexedLocality[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    let alive = true;
    loadLocalities()
      .then((list) => alive && setAll(list))
      .catch(() => {
        // Sin lista el campo sigue funcionando como texto libre.
      });
    return () => {
      alive = false;
    };
  }, []);

  // Cierra la lista al hacer clic fuera.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const code = useMemo(() => provinceCode(province), [province]);
  const results = useMemo(
    () => (open ? searchLocalities(all, value, code) : []),
    [open, all, value, code]
  );
  const showList = open && results.length > 0;

  const select = (l: IndexedLocality) => {
    onChange(l.name);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && showList && active >= 0) {
      e.preventDefault(); // no envía el formulario: solo elige la sugerencia
      select(results[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={id}
        name={name}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={className}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => value && setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {results.map((l, i) => (
            <li
              key={`${l.code}-${l.key}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // onMouseDown (no onClick): evita que el input pierda el foco antes de elegir.
              onMouseDown={(e) => {
                e.preventDefault();
                select(l);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm ${
                i === active ? "bg-slate-100 text-[#001F58]" : "text-slate-700"
              }`}
            >
              <span className="truncate">{l.name}</span>
              {/* Sin provincia elegida hay nombres repetidos entre provincias: se aclara de cuál es. */}
              {!code && (
                <span className="shrink-0 text-xs text-slate-400">{PROVINCE_LABELS[l.code] ?? l.code}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
