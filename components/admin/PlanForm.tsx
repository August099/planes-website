"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { savePlanAction } from "@/app/actions/admin-plans-actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatListingPrice, isLargePriceChange, priceChangePercent } from "@/lib/listing-price-format";
import { billingText, defaultUsageText, PLAN_KINDS, planInputSchema, type PlanData } from "@/lib/plan-rules";

// Formulario de un plan (VA-80). Dos bloques: lo que usa el sistema (tipo, precio, cupos,
// beneficios) y lo que se muestra en /plans. Cambiar el precio de un plan existente pasa por un
// diálogo con antes → después; los cambios grandes piden escribir CONFIRMAR (como en VA-59).

export type PlanFormValues = PlanData;

const LABEL = "mb-1 block text-xs font-semibold text-slate-600";
const INPUT = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400";
const SECTION = "space-y-4 rounded-lg border border-[#001F58]/12 bg-white p-5 sm:p-6";
const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";

function Check({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#001F58]" />
      <span>
        <span className="block text-sm text-slate-800">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

export function PlanForm({ planId, initial }: { planId?: string; initial: PlanFormValues }) {
  const router = useRouter();
  const [v, setV] = useState<PlanFormValues>(initial);
  const [featuresText, setFeaturesText] = useState(initial.features.join("\n"));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof PlanFormValues>(key: K, value: PlanFormValues[K]) => setV((prev) => ({ ...prev, [key]: value }));
  const isSubscription = v.type === "SUBSCRIPTION";
  const features = featuresText.split("\n").map((f) => f.trim()).filter(Boolean);
  const values = { ...v, features, billingInterval: isSubscription ? v.billingInterval ?? "MONTHLY" : null };

  const priceChanged = !!planId && Number(v.price) !== initial.price;
  const large = priceChanged && isLargePriceChange(initial.price, Number(v.price));
  const pct = priceChanged ? priceChangePercent(initial.price, Number(v.price)) : null;

  const save = (confirmText?: string) => {
    setError(null);
    startTransition(async () => {
      const res = await savePlanAction({ ...values, id: planId, confirmText });
      if (!res.ok) {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }
      setConfirmOpen(false);
      router.push("/admin/plans");
      router.refresh();
    });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = planInputSchema.safeParse(values);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) errs[String(issue.path[0] ?? "form")] ??= issue.message;
      setFieldErrors(errs);
      setError("Revisá los campos marcados.");
      return;
    }
    setFieldErrors({});
    if (priceChanged) setConfirmOpen(true);
    else save();
  };

  const err = (k: string) => fieldErrors[k] && <p className="mt-1 text-xs text-red-700">{fieldErrors[k]}</p>;

  return (
    <form onSubmit={onSubmit} className="max-w-4xl space-y-6" noValidate>
      <section className={SECTION}>
        <div>
          <p className={EYEBROW}>Lo que usa el sistema</p>
          <h2 className="mt-1 text-lg font-bold text-[#001F58]">Tipo, precio y qué incluye</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="plan-name" className={LABEL}>Título</label>
            <input id="plan-name" value={v.name} onChange={(e) => set("name", e.target.value)} maxLength={80} className={INPUT} />
            {err("name")}
          </div>
          <div>
            <label htmlFor="plan-type" className={LABEL}>Tipo</label>
            <select
              id="plan-type"
              value={v.type}
              onChange={(e) => {
                const type = e.target.value as PlanFormValues["type"];
                setV((prev) => ({
                  ...prev,
                  type,
                  ...(type !== "SUBSCRIPTION" && { isUnlimitedAircraft: false, isUnlimitedSpareParts: false }),
                }));
              }}
              className={INPUT}
            >
              {PLAN_KINDS.map((k) => (
                <option key={k.value} value={k.value}>{k.label}</option>
              ))}
            </select>
            {err("type")}
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div>
              <label htmlFor="plan-price" className={LABEL}>Precio (AR$)</label>
              <input
                id="plan-price"
                inputMode="numeric"
                value={String(v.price)}
                onChange={(e) => set("price", Number(e.target.value.replace(/\D/g, "") || 0))}
                className={`${INPUT} tabular-nums`}
              />
            </div>
            <div>
              <label htmlFor="plan-interval" className={LABEL}>Cobro</label>
              <select
                id="plan-interval"
                value={isSubscription ? v.billingInterval ?? "MONTHLY" : ""}
                disabled={!isSubscription}
                onChange={(e) => set("billingInterval", e.target.value as "MONTHLY" | "YEARLY")}
                className={INPUT}
              >
                {!isSubscription && <option value="">Pago único</option>}
                <option value="MONTHLY">Mensual</option>
                <option value="YEARLY">Anual</option>
              </select>
            </div>
            {err("price")}
            {err("billingInterval")}
          </div>

          <div>
            <label htmlFor="plan-aircraft" className={LABEL}>Avisos de avión</label>
            <input
              id="plan-aircraft"
              inputMode="numeric"
              value={v.isUnlimitedAircraft ? "" : String(v.aircraftListingsCount)}
              placeholder={v.isUnlimitedAircraft ? "Ilimitados" : "0"}
              disabled={v.isUnlimitedAircraft}
              onChange={(e) => set("aircraftListingsCount", Number(e.target.value.replace(/\D/g, "") || 0))}
              className={`${INPUT} tabular-nums`}
            />
            {err("aircraftListingsCount")}
            {isSubscription && (
              <div className="mt-2">
                <Check label="Ilimitados" checked={v.isUnlimitedAircraft} onChange={(c) => set("isUnlimitedAircraft", c)} />
              </div>
            )}
          </div>
          <div>
            <label htmlFor="plan-parts" className={LABEL}>Avisos de repuesto</label>
            <input
              id="plan-parts"
              inputMode="numeric"
              value={v.isUnlimitedSpareParts ? "" : String(v.sparePartsListingsCount)}
              placeholder={v.isUnlimitedSpareParts ? "Ilimitados" : "0"}
              disabled={v.isUnlimitedSpareParts}
              onChange={(e) => set("sparePartsListingsCount", Number(e.target.value.replace(/\D/g, "") || 0))}
              className={`${INPUT} tabular-nums`}
            />
            {err("sparePartsListingsCount")}
            {isSubscription && (
              <div className="mt-2">
                <Check label="Ilimitados" checked={v.isUnlimitedSpareParts} onChange={(c) => set("isUnlimitedSpareParts", c)} />
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-3 border-t border-[#001F58]/10 pt-4 sm:grid-cols-2">
          <Check
            label="Publicaciones sin vencimiento"
            hint="Mientras la suscripción esté vigente, los avisos se crean y renuevan sin fecha de vencimiento."
            checked={v.noExpiry}
            disabled={!isSubscription}
            onChange={(c) => set("noExpiry", c)}
          />
          <Check label="Insignia de vendedor verificado" checked={v.includesVerifiedBadge} onChange={(c) => set("includesVerifiedBadge", c)} />
          <Check
            label="Página VA"
            hint="Página personalizada: portada, logo y contacto en el perfil (VA-87)."
            checked={v.includesCustomPage}
            disabled={!isSubscription}
            onChange={(c) => set("includesCustomPage", c)}
          />
          {isSubscription && (
            <div>
              <label htmlFor="plan-featured" className={LABEL}>Destacados incluidos por mes</label>
              <input
                id="plan-featured"
                inputMode="numeric"
                value={String(v.featuredPerMonth ?? 0)}
                onChange={(e) => set("featuredPerMonth", Number(e.target.value.replace(/\D/g, "") || 0))}
                className={`${INPUT} tabular-nums sm:max-w-32`}
              />
              <p className="mt-1 text-xs text-slate-500">Se reponen en cada período pago y no se acumulan.</p>
              {err("featuredPerMonth")}
            </div>
          )}
        </div>
      </section>

      <section className={SECTION}>
        <div>
          <p className={EYEBROW}>Lo que se ve en /plans</p>
          <h2 className="mt-1 text-lg font-bold text-[#001F58]">Tarjeta del plan</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="plan-usage" className={LABEL}>Resumen de lo que incluye</label>
            <input
              id="plan-usage"
              value={v.usageDescription}
              onChange={(e) => set("usageDescription", e.target.value)}
              placeholder={defaultUsageText(v)}
              maxLength={60}
              className={INPUT}
            />
            <p className="mt-1 text-xs text-slate-500">Vacío: se arma solo (“{defaultUsageText(v) || "…"}”).</p>
          </div>
          <div>
            <label htmlFor="plan-badge" className={LABEL}>Etiqueta</label>
            <input id="plan-badge" value={v.badge} onChange={(e) => set("badge", e.target.value)} placeholder="Ahorrá 20%" maxLength={30} className={INPUT} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="plan-description" className={LABEL}>Descripción</label>
            <textarea id="plan-description" rows={2} value={v.description} onChange={(e) => set("description", e.target.value)} maxLength={300} className={INPUT} />
            {err("description")}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="plan-features" className={LABEL}>Ítems (uno por línea, hasta 10)</label>
            <textarea id="plan-features" rows={5} value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} className={INPUT} />
            {err("features")}
          </div>
        </div>
        <div className="grid gap-3 border-t border-[#001F58]/10 pt-4 sm:grid-cols-2">
          <Check label="Destacar como “Más elegido”" checked={v.isPopular} onChange={(c) => set("isPopular", c)} />
          <Check label="Activo (se ve en /plans)" checked={v.isActive} onChange={(c) => set("isActive", c)} />
        </div>
        <div className="max-w-[10rem]">
          <label htmlFor="plan-order" className={LABEL}>Orden</label>
          <input
            id="plan-order"
            inputMode="numeric"
            value={String(v.sortOrder)}
            onChange={(e) => set("sortOrder", Number(e.target.value.replace(/\D/g, "") || 0))}
            className={`${INPUT} tabular-nums`}
          />
          <p className="mt-1 text-xs text-slate-500">Menor, más a la izquierda.</p>
        </div>
      </section>

      {error && !confirmOpen && <p className="text-sm font-medium text-red-700">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-10 items-center rounded-md bg-[#001F58] px-5 text-xs font-bold text-white hover:bg-[#00133A] disabled:opacity-60 cursor-pointer"
        >
          {pending ? "Guardando…" : planId ? "Guardar cambios" : "Crear plan"}
        </button>
        <Link href="/admin/plans" className="rounded-md px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
          Cancelar
        </Link>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        eyebrow="Cambio de precio"
        title={v.name}
        confirmLabel="Guardar precio"
        requireText={large ? "CONFIRMAR" : undefined}
        pending={pending}
        error={error}
        onConfirm={(typed) => save(typed)}
        onClose={() => setConfirmOpen(false)}
      >
        <dl className="grid grid-cols-3 divide-x divide-[#001F58]/10 rounded-md border border-[#001F58]/12 text-center tabular-nums">
          <div className="p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Antes</dt>
            <dd className="mt-1 text-sm text-slate-600">{formatListingPrice(initial.price)}</dd>
          </div>
          <div className="p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Después</dt>
            <dd className="mt-1 text-sm font-bold text-[#001F58]">{formatListingPrice(Number(v.price))}</dd>
          </div>
          <div className="p-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Variación</dt>
            <dd className={`mt-1 text-sm font-semibold ${large ? "text-[#C20D1A]" : "text-slate-700"}`}>
              {pct === null ? "—" : `${pct > 0 ? "+" : ""}${pct.toFixed(1).replace(".", ",")} %`}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-slate-600">
          {billingText(v.type, values.billingInterval)}. Vale para las compras nuevas y los cobros siguientes; cuando esté el
          pago online, hay que avisarles a los suscriptores.
        </p>
      </ConfirmDialog>
    </form>
  );
}
