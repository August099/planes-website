"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveBillingProfileAction } from "@/app/actions/billing-profile-actions";
import { IVA_CONDITIONS, isValidCuit } from "@/lib/billing-rules";

// VA-92: "Datos de facturación" en Ajustes del perfil. Lo que se guarda acá lo usa el checkout
// directo (sin formulario); también se actualiza si el usuario los cambia al pagar.

export type BillingProfileValues = {
  kind: "CONSUMIDOR_FINAL" | "EMPRESA";
  name: string;
  docNumber: string;
  ivaCondition: "RI" | "M" | "E" | "";
  address: string;
  email: string;
};

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const FIELD_LABEL = "mb-1 block text-xs font-semibold text-slate-600";
const INPUT = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

export function BillingProfilePanel({ initial, saved }: { initial: BillingProfileValues; saved: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof BillingProfileValues>(k: K, value: BillingProfileValues[K]) => setV((p) => ({ ...p, [k]: value }));
  const empresa = v.kind === "EMPRESA";

  const save = () =>
    start(async () => {
      setMessage(null);
      const payload = empresa ? v : { kind: v.kind, name: v.name, docNumber: v.docNumber, email: v.email };
      const res = await saveBillingProfileAction(payload);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setMessage({ ok: false, text: res.error });
        return;
      }
      setErrors({});
      setMessage({ ok: true, text: "Guardado. Se usan al pagar, sin volver a cargarlos." });
      router.refresh();
    });

  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-red-700">{errors[k]}</p>;

  return (
    <section className="rounded-lg border border-[#00205B]/12 bg-white p-5 sm:p-6">
      <p className={LABEL}>Facturación</p>
      <h2 className="mt-1 text-lg font-bold text-[#00205B]">Datos de facturación</h2>
      <p className="mt-1 text-sm text-slate-600">
        {saved ? "Los usamos para tus facturas: al pagar no tenés que completar nada." : "Guardalos una vez y al pagar no tenés que completar nada."}
      </p>

      <div role="radiogroup" aria-label="Tipo de factura" className="mt-4 grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1">
        {(
          [
            ["CONSUMIDOR_FINAL", "Consumidor final"],
            ["EMPRESA", "Empresa o responsable"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={v.kind === value}
            onClick={() => {
              set("kind", value);
              setErrors({});
            }}
            className={`min-h-10 rounded text-sm font-medium transition-colors cursor-pointer ${v.kind === value ? "bg-white text-[#00205B] shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
          >
            {value === "EMPRESA" ? (
              <>
                <span className="sm:hidden">Empresa</span>
                <span className="hidden sm:inline">{label}</span>
              </>
            ) : (
              label
            )}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="bp-name" className={FIELD_LABEL}>
            {empresa ? "Razón social" : "Nombre y apellido"}
          </label>
          <input id="bp-name" className={INPUT} value={v.name} onChange={(e) => set("name", e.target.value)} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="bp-doc" className={FIELD_LABEL}>
            {empresa ? "CUIT" : "DNI (opcional)"}
          </label>
          <input id="bp-doc" inputMode="numeric" className={INPUT} value={v.docNumber} onChange={(e) => set("docNumber", e.target.value)} />
          {err("docNumber") ||
            (empresa && v.docNumber.replace(/\D/g, "").length === 11 && !isValidCuit(v.docNumber) && (
              <p className="mt-1 text-xs text-red-700">Revisá el CUIT: el dígito verificador no coincide.</p>
            ))}
        </div>
        {empresa && (
          <div>
            <label htmlFor="bp-iva" className={FIELD_LABEL}>
              Condición frente al IVA
            </label>
            <select id="bp-iva" className={INPUT} value={v.ivaCondition} onChange={(e) => set("ivaCondition", e.target.value as BillingProfileValues["ivaCondition"])}>
              <option value="">Elegí una opción</option>
              {IVA_CONDITIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {err("ivaCondition")}
          </div>
        )}
        {empresa && (
          <div className="sm:col-span-2">
            <label htmlFor="bp-address" className={FIELD_LABEL}>
              Domicilio fiscal (opcional)
            </label>
            <input id="bp-address" className={INPUT} value={v.address} onChange={(e) => set("address", e.target.value)} />
          </div>
        )}
        <div className={empresa ? "sm:col-span-2" : ""}>
          <label htmlFor="bp-email" className={FIELD_LABEL}>
            Email para las facturas
          </label>
          <input id="bp-email" type="email" className={INPUT} value={v.email} onChange={(e) => set("email", e.target.value)} />
          {err("email")}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="inline-flex min-h-10 items-center rounded-md bg-[#00205B] px-5 text-sm font-bold text-white hover:bg-[#001331] disabled:opacity-50 cursor-pointer"
        >
          Guardar datos
        </button>
        {message && <p className={`text-xs ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.text}</p>}
      </div>
    </section>
  );
}
