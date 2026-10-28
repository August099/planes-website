"use client";

import { useMemo, useState } from "react";

// Teléfono con código de país (27/10): Argentina (+54) por defecto y se puede cambiar. Guarda el número en
// formato internacional ("+54 9 3456 445758"): así el botón de WhatsApp (wa.me + solo dígitos) funciona aunque
// la persona escriba el número sin el código. Para Argentina agrega el 9 de celulares si falta y saca el 0
// del código de área. Con `name`, manda el valor completo en un input oculto (formularios con FormData).
//
// label corto para que entre en campos angostos; name para lectores de pantalla.
export const PHONE_COUNTRIES = [
  { code: "54", label: "AR +54", name: "Argentina" },
  { code: "598", label: "UY +598", name: "Uruguay" },
  { code: "595", label: "PY +595", name: "Paraguay" },
  { code: "56", label: "CL +56", name: "Chile" },
  { code: "55", label: "BR +55", name: "Brasil" },
  { code: "591", label: "BO +591", name: "Bolivia" },
  { code: "51", label: "PE +51", name: "Perú" },
  { code: "1", label: "US +1", name: "Estados Unidos o Canadá" },
  { code: "34", label: "ES +34", name: "España" },
] as const;

/** Separa un número guardado en código de país y resto. Sin "+" se toma como argentino. */
export function splitPhone(value: string | null | undefined): { code: string; local: string } {
  const raw = (value ?? "").trim();
  if (!raw.startsWith("+")) return { code: "54", local: raw };
  const digits = raw.replace(/\D/g, "");
  const country = [...PHONE_COUNTRIES].sort((a, b) => b.code.length - a.code.length).find((c) => digits.startsWith(c.code));
  if (!country) return { code: "54", local: raw };
  const rest = raw.slice(raw.indexOf(country.code) + country.code.length).trim();
  return { code: country.code, local: country.code === "54" ? rest.replace(/^9\s*/, "") : rest };
}

/** Arma el número internacional. Vacío si no hay dígitos. */
export function joinPhone(code: string, local: string): string {
  let digits = local.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith(code) && digits.length > 10) digits = digits.slice(code.length); // pegaron el número con el código
  if (code === "54") {
    digits = digits.replace(/^0/, "");
    if (!digits.startsWith("9")) digits = `9${digits}`;
    return `+54 ${digits.slice(0, 1)} ${digits.slice(1)}`;
  }
  return `+${code} ${digits}`;
}

export function PhoneInput({
  name,
  defaultValue,
  onChange,
  required,
  placeholder = "Ej: 11 2345 6789",
  className = "",
  selectClassName = "",
  id,
  ariaLabel = "Teléfono",
}: {
  name?: string;
  defaultValue?: string | null;
  onChange?: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  selectClassName?: string;
  id?: string;
  ariaLabel?: string;
}) {
  const initial = useMemo(() => splitPhone(defaultValue), [defaultValue]);
  const [code, setCode] = useState(initial.code);
  const [local, setLocal] = useState(initial.local);
  const full = joinPhone(code, local);

  const update = (nextCode: string, nextLocal: string) => {
    setCode(nextCode);
    setLocal(nextLocal);
    onChange?.(joinPhone(nextCode, nextLocal));
  };

  // 28/10: los formularios pasan su clase de campo con w-full, que le ganaba al ancho del código y en el
  // celular dejaba el número aplastado al costado. El código lleva siempre su ancho fijo.
  const selectCls = (selectClassName || className).replace(/(^|\s)w-(full|auto)(?=\s|$)/g, " ");

  return (
    <div className="flex w-full gap-2">
      <select
        aria-label="Código de país"
        value={code}
        onChange={(e) => update(e.target.value, local)}
        className={`w-[6.5rem] shrink-0 ${selectCls}`}
      >
        {PHONE_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code} aria-label={`${c.name} (+${c.code})`}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        aria-label={ariaLabel}
        required={required}
        placeholder={placeholder}
        value={local}
        onChange={(e) => update(code, e.target.value)}
        className={`min-w-0 flex-1 ${className}`}
      />
      {name && <input type="hidden" name={name} value={full} />}
    </div>
  );
}
