"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { checkCouponAction, startCheckoutAction } from "@/app/checkout/actions";
import { IVA_CONDITIONS, billingSchema, isValidCuit } from "@/lib/billing-rules";

// VA-92: formulario del checkout. Datos de facturación (consumidor final o empresa), cupón y
// resumen con el total. El servidor vuelve a calcular todo al confirmar.

type Kind = "CONSUMIDOR_FINAL" | "EMPRESA";
export type BillingDefaults = {
  kind: Kind;
  name: string;
  docNumber: string;
  ivaCondition: "RI" | "M" | "E" | "";
  address: string;
  email: string;
};

type Props = {
  productKey: string;
  product: { name: string; includes: string; price: number };
  defaults: BillingDefaults;
  dniRequiredFrom: number;
  initialCoupon?: string;
};

const NUMBER = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const money = (n: number) => (n === 0 ? "Sin cargo" : `AR$ ${NUMBER.format(n)}`);
const LABEL = "text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const FIELD_LABEL = "block text-xs font-semibold text-slate-600 mb-1";
const INPUT = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#001F58] focus:outline-none focus:ring-2 focus:ring-[#001F58]/15";

export function CheckoutForm({ productKey, product, defaults, dniRequiredFrom, initialCoupon = "" }: Props) {
  const [kind, setKind] = useState<Kind>(defaults.kind);
  const [name, setName] = useState(defaults.name);
  const [docNumber, setDocNumber] = useState(defaults.docNumber);
  const [ivaCondition, setIvaCondition] = useState(defaults.ivaCondition);
  const [address, setAddress] = useState(defaults.address);
  const [email, setEmail] = useState(defaults.email);

  const [couponInput, setCouponInput] = useState(initialCoupon);
  const [coupon, setCoupon] = useState<{ code: string; discountAmount: number; finalPrice: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const total = coupon ? coupon.finalPrice : product.price;
  const dniRequired = kind === "CONSUMIDOR_FINAL" && total >= dniRequiredFrom;

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCheckingCoupon(true);
    setCouponError(null);
    const res = await checkCouponAction(productKey, couponInput);
    setCheckingCoupon(false);
    if (res.ok) setCoupon({ code: res.code, discountAmount: res.discountAmount, finalPrice: res.finalPrice });
    else {
      setCoupon(null);
      setCouponError(res.error);
    }
  };

  const billing =
    kind === "EMPRESA"
      ? { kind, name, docNumber, ivaCondition, address, email }
      : { kind, name, docNumber, email };

  const validate = () => {
    const next: Record<string, string> = {};
    const parsed = billingSchema.safeParse(billing);
    if (!parsed.success) for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
    if (dniRequired && !docNumber.replace(/\D/g, "")) next.docNumber = "Para este monto ARCA pide el DNI.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setSubmitting(true);
    const res = await startCheckoutAction({ productKey, couponCode: coupon?.code, billing });
    if (res.ok) {
      // A Mercado Pago (otro dominio) o a la página de estado (cupón del 100%).
      window.location.assign(res.redirectTo);
      return;
    }
    setSubmitting(false);
    setFormError(res.error);
    if (res.fieldErrors) {
      setErrors(res.fieldErrors);
      if (res.fieldErrors.coupon) {
        setCoupon(null);
        setCouponError(res.fieldErrors.coupon);
      }
    }
  };

  const err = (key: string) => errors[key] && <p className="mt-1 text-xs text-red-700">{errors[key]}</p>;

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="rounded-lg border border-[#001F58]/12 bg-white p-5 sm:p-8">
        <p className={LABEL}>Datos de facturación</p>
        <h1 className="mt-1 text-2xl font-bold text-[#001F58]">¿A nombre de quién va la factura?</h1>
        <p className="mt-2 text-sm text-slate-600">Te enviamos la factura C por email. Guardamos estos datos para tu próxima compra.</p>

        <div role="radiogroup" aria-label="Tipo de factura" className="mt-6 grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-1">
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
              aria-checked={kind === value}
              onClick={() => {
                setKind(value);
                setErrors({});
              }}
              className={`min-h-10 rounded text-sm font-medium transition-colors cursor-pointer ${
                kind === value ? "bg-white text-[#001F58] shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
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

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="b-name" className={FIELD_LABEL}>
              {kind === "EMPRESA" ? "Razón social" : "Nombre y apellido"}
            </label>
            <input id="b-name" className={INPUT} value={name} onChange={(e) => setName(e.target.value)} autoComplete={kind === "EMPRESA" ? "organization" : "name"} />
            {err("name")}
          </div>

          <div>
            <label htmlFor="b-doc" className={FIELD_LABEL}>
              {kind === "EMPRESA" ? "CUIT" : dniRequired ? "DNI" : "DNI (opcional)"}
            </label>
            <input
              id="b-doc"
              inputMode="numeric"
              className={INPUT}
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder={kind === "EMPRESA" ? "20-12345678-3" : "12345678"}
            />
            {err("docNumber") ||
              (kind === "EMPRESA" && docNumber.replace(/\D/g, "").length === 11 && !isValidCuit(docNumber) && (
                <p className="mt-1 text-xs text-red-700">Revisá el CUIT: el dígito verificador no coincide.</p>
              ))}
          </div>

          {kind === "EMPRESA" && (
            <div>
              <label htmlFor="b-iva" className={FIELD_LABEL}>
                Condición frente al IVA
              </label>
              <select id="b-iva" className={INPUT} value={ivaCondition} onChange={(e) => setIvaCondition(e.target.value as BillingDefaults["ivaCondition"])}>
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

          {kind === "EMPRESA" && (
            <div className="sm:col-span-2">
              <label htmlFor="b-address" className={FIELD_LABEL}>
                Domicilio fiscal (opcional)
              </label>
              <input id="b-address" className={INPUT} value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
            </div>
          )}

          <div className={kind === "EMPRESA" ? "sm:col-span-2" : ""}>
            <label htmlFor="b-email" className={FIELD_LABEL}>
              Email para la factura
            </label>
            <input id="b-email" type="email" className={INPUT} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            {err("email")}
          </div>
        </div>

        {formError && (
          <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#E70F1F] px-5 text-sm font-bold text-white hover:bg-[#C20D1A] disabled:opacity-60 sm:w-auto cursor-pointer"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {total === 0 ? "Confirmar sin cargo" : "Pagar"}
        </button>
        {total > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            Te llevamos a Mercado Pago, donde elegís el medio de pago. Cuando el pago se acredite, activamos tu compra.
          </p>
        )}
      </section>

      <aside className="self-start rounded-lg border border-[#001F58]/12 bg-white">
        <p className={`border-b border-[#001F58]/10 px-5 py-3 ${LABEL}`}>Elegiste</p>
        <dl className="divide-y divide-[#001F58]/10 text-sm">
          <div className="px-5 py-3">
            <dt className="text-slate-500">Plan</dt>
            <dd className="font-semibold text-[#001F58]">{product.name}</dd>
          </div>
          <div className="px-5 py-3">
            <dt className="text-slate-500">Incluye</dt>
            <dd className="text-slate-800">{product.includes}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 px-5 py-3">
            <dt className="text-slate-500">Precio</dt>
            <dd className="tabular-nums text-slate-800">{money(product.price)}</dd>
          </div>
          {coupon && (
            <div className="flex items-baseline justify-between gap-3 px-5 py-3">
              <dt className="text-slate-500">
                Cupón <span className="font-semibold tracking-wide text-slate-700">{coupon.code}</span>
              </dt>
              <dd className="tabular-nums text-emerald-700">− AR$ {NUMBER.format(coupon.discountAmount)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-3 px-5 py-3">
            <dt className="font-semibold text-[#001F58]">Total</dt>
            <dd className="text-lg font-bold tabular-nums text-[#001F58]">{money(total)}</dd>
          </div>
        </dl>
        <div className="border-t border-[#001F58]/10 px-5 py-4">
          <label htmlFor="coupon" className={FIELD_LABEL}>
            Cupón de descuento
          </label>
          <div className="flex gap-2">
            <input
              id="coupon"
              className={`${INPUT} uppercase`}
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void applyCoupon();
                }
              }}
            />
            <button
              type="button"
              onClick={applyCoupon}
              disabled={checkingCoupon || !couponInput.trim()}
              className="inline-flex min-h-10 shrink-0 items-center rounded-md border border-[#001F58]/20 px-4 text-sm font-semibold text-[#001F58] hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
            >
              {checkingCoupon ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Verificando" /> : "Aplicar"}
            </button>
          </div>
          {couponError && <p className="mt-1 text-xs text-red-700">{couponError}</p>}
          {coupon && (
            <button
              type="button"
              onClick={() => {
                setCoupon(null);
                setCouponInput("");
              }}
              className="mt-2 text-xs font-semibold text-slate-500 hover:text-red-700 cursor-pointer"
            >
              Quitar cupón
            </button>
          )}
        </div>
      </aside>
    </form>
  );
}
