"use client";

import { useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Link2 } from "lucide-react";

// VA-191: piezas de las calculadoras. Los valores van en la URL (se puede compartir un cálculo) y las unidades
// elegidas se recuerdan en el navegador. Campos de 16 px, para que iOS no haga zoom.

const LABEL = "mb-1 block text-xs font-semibold text-slate-600";
const INPUT = "min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base tabular-nums text-[#00205B] placeholder:text-slate-400";

/** Admite coma o punto. Vacío o inválido: null. */
export function num(text: string | undefined): number | null {
  const t = (text ?? "").trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Sin decimales de más, con formato argentino. */
export const fmt = (n: number, digits = 0) => n.toLocaleString("es-AR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
/** Rumbo de tres cifras: 7 → "007". */
export const fmtHeading = (n: number) => String(Math.round(n) % 360).padStart(3, "0");

/** Estado de los campos, leído de la URL al entrar y escrito en ella al cambiar. */
export function useFields<K extends string>(keys: readonly K[]) {
  const params = useSearchParams();
  const [fields, setFields] = useState<Record<K, string>>(() => Object.fromEntries(keys.map((k) => [k, params?.get(k) ?? ""])) as Record<K, string>);
  const set = useCallback((key: K, value: string) => {
    setFields((prev) => {
      const next = { ...prev, [key]: value };
      const url = new URL(window.location.href);
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
      window.history.replaceState(window.history.state, "", url);
      return next;
    });
  }, []);
  return { fields, set };
}

const UNITS_KEY = "va_calc_units";

function readUnits(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(UNITS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** Unidad recordada entre visitas y entre calculadoras. */
export function useUnit<T extends string>(key: string, allowed: readonly T[], fallback: T): [T, (u: T) => void] {
  const [unit, setUnit] = useState<T>(() => {
    if (typeof window === "undefined") return fallback;
    const saved = readUnits()[key];
    return allowed.includes(saved as T) ? (saved as T) : fallback;
  });
  const change = (next: T) => {
    setUnit(next);
    try {
      localStorage.setItem(UNITS_KEY, JSON.stringify({ ...readUnits(), [key]: next }));
    } catch {
      // Sin almacenamiento, la elección dura hasta salir de la página.
    }
  };
  return [unit, change];
}

export function NumberField({
  label,
  value,
  onChange,
  suffix,
  hint,
  placeholder,
  integer = false,
  text = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  hint?: string;
  placeholder?: string;
  integer?: boolean;
  /** Para valores como "1:30": teclado completo. */
  text?: boolean;
}) {
  return (
    <label className="block">
      <span className={LABEL}>{label}</span>
      <span className="relative block">
        <input
          type="text"
          inputMode={text ? "text" : integer ? "numeric" : "decimal"}
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT} ${suffix ? "pr-14" : ""}`}
        />
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">{suffix}</span>}
      </span>
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-md border border-[#00205B]/20 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-10 cursor-pointer rounded px-3 text-sm font-semibold transition-colors ${value === o.value ? "bg-[#00205B] text-white" : "text-[#00205B] hover:bg-slate-100"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Datos arriba y resultado al costado; en el celular, el resultado va primero y queda a la vista mientras se carga. */
export function CalcLayout({ inputs, result, units }: { inputs: React.ReactNode; result: React.ReactNode; units?: React.ReactNode }) {
  return (
    <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-10">
      <section aria-label="Resultado" className="sticky top-20 z-10 max-h-[45vh] overflow-y-auto rounded-lg md:order-2 md:top-24 md:max-h-[calc(100vh-7rem)]">
        {result}
      </section>
      <section aria-label="Datos" className="space-y-4 md:order-1">
        {units && <div className="flex flex-wrap gap-2">{units}</div>}
        {inputs}
        <ShareLink />
      </section>
    </div>
  );
}

export function ResultPanel({ headline, unit, label, empty, children }: { headline?: string | null; unit?: string; label: string; empty: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#00205B]/15 bg-white p-4 shadow-sm sm:p-5" aria-live="polite">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      {headline ? (
        <>
          <p className="mt-1 font-heading text-3xl font-extrabold tabular-nums text-[#00205B] sm:text-4xl">
            {headline} {unit && <span className="text-lg font-bold">{unit}</span>}
          </p>
          {children && <div className="mt-3 border-t border-[#00205B]/10 pt-3">{children}</div>}
        </>
      ) : (
        <p className="mt-1 text-sm text-slate-600">{empty}</p>
      )}
    </div>
  );
}

export function Facts({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="space-y-1.5 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-3">
          <dt className="text-slate-600">{r.label}</dt>
          <dd className="text-right font-semibold tabular-nums text-[#00205B]">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Algo que el piloto tiene que mirar. Lleva texto, no solo color. */
export function Warning({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 border-l-2 border-[#D62828] pl-3 text-sm font-medium text-[#00205B]">{children}</p>;
}

function ShareLink() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" onClick={copy} className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-[#00205B] underline underline-offset-2 hover:text-[#D62828]">
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
      {copied ? "Enlace copiado" : "Copiar enlace con estos datos"}
    </button>
  );
}
