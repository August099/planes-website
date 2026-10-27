"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { acceptTermsAction, myAccountStatusAction, sendMyVerificationEmailAction } from "./actions";

// Los dos pasos para usar la cuenta: términos y email verificado. Al terminar se actualiza la sesión (si no,
// AccountGate seguiría viéndola incompleta hasta 5 minutos) y se sigue al destino.
export function CompleteAccount({
  name,
  email,
  termsAccepted: initialTerms,
  emailVerified: initialVerified,
  next,
}: {
  name: string | null;
  email: string;
  termsAccepted: boolean;
  emailVerified: boolean;
  next: string;
}) {
  const { update } = useSession();
  const [terms, setTerms] = useState(initialTerms);
  const [verified, setVerified] = useState(initialVerified);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState<null | "terms" | "mail" | "check">(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const finish = async () => {
    await update(); // vuelve a leer términos y verificación en el token
    window.location.assign(next);
  };

  // Llegó con todo hecho (por ejemplo, desde el link del mail): sigue solo.
  useEffect(() => {
    if (initialTerms && initialVerified) void finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, []);

  const accept = async () => {
    setBusy("terms");
    setMessage(null);
    const res = await acceptTermsAction(checked);
    setBusy(null);
    if (!res.ok) return setMessage({ kind: "error", text: res.error });
    setTerms(true);
    if (verified) await finish();
  };

  const sendMail = async () => {
    setBusy("mail");
    setMessage(null);
    const res = await sendMyVerificationEmailAction();
    setBusy(null);
    setMessage(res.ok ? { kind: "ok", text: `Te mandamos un mail a ${email}. Abrí el link y después tocá "Ya lo verifiqué".` } : { kind: "error", text: res.error });
  };

  const checkVerified = async () => {
    setBusy("check");
    setMessage(null);
    const status = await myAccountStatusAction();
    setBusy(null);
    if (status?.emailVerified) {
      setVerified(true);
      if (terms) await finish();
    } else {
      setMessage({ kind: "error", text: "Todavía no vemos la verificación. Abrí el link del mail (revisá spam) y volvé a probar." });
    }
  };

  const step = "rounded-[22px] border border-[#00205B]/10 bg-white p-5";
  const button =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#00205B] px-5 text-sm font-bold text-white transition-colors hover:bg-[#D62828] disabled:opacity-50 cursor-pointer";

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="rounded-[28px] bg-[linear-gradient(120deg,#0A4C96_0%,#00205B_72%)] px-6 py-7 text-white">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">Un paso más</p>
        <h1 className="va-h1-keep mt-1 font-heading text-2xl font-extrabold tracking-[-0.03em]">
          {name ? `Hola, ${name}.` : "Hola."} Completá tu cuenta
        </h1>
        <p className="mt-2 text-sm text-white/85">Para usar Ventas Aeronáuticas necesitamos dos cosas.</p>
      </div>

      {/* 1. Términos */}
      <section className={step} aria-labelledby="paso-terminos">
        <h2 id="paso-terminos" className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#00205B]">
          {terms && <CheckCircle2 className="h-5 w-5 text-[#0A4C96]" aria-hidden />} 1. Términos y condiciones
        </h2>
        {terms ? (
          <p className="mt-2 text-sm text-slate-600">Aceptados.</p>
        ) : (
          <div className="mt-3 space-y-3">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="mt-0.5 h-4 w-4" />
              <span>
                He leído y acepto los{" "}
                <Link href="/terms" target="_blank" className="font-semibold text-[#00205B] underline">
                  Términos y Condiciones
                </Link>{" "}
                y la{" "}
                <Link href="/privacy" target="_blank" className="font-semibold text-[#00205B] underline">
                  Política de privacidad
                </Link>
                .
              </span>
            </label>
            <button type="button" onClick={accept} disabled={!checked || busy !== null} className={button}>
              {busy === "terms" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Aceptar
            </button>
          </div>
        )}
      </section>

      {/* 2. Email */}
      <section className={step} aria-labelledby="paso-email">
        <h2 id="paso-email" className="flex items-center gap-2 font-heading text-lg font-extrabold text-[#00205B]">
          {verified && <CheckCircle2 className="h-5 w-5 text-[#0A4C96]" aria-hidden />} 2. Verificá tu email
        </h2>
        {verified ? (
          <p className="mt-2 text-sm text-slate-600">{email} está verificado.</p>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-slate-600">
              Te mandamos un link a <strong className="text-[#00205B]">{email}</strong> para confirmar que es tuyo.
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={sendMail} disabled={busy !== null} className={button}>
                {busy === "mail" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />}
                Enviarme el mail
              </button>
              <button
                type="button"
                onClick={checkVerified}
                disabled={busy !== null}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#00205B]/20 px-5 text-sm font-bold text-[#00205B] hover:border-[#00205B] disabled:opacity-50 cursor-pointer"
              >
                {busy === "check" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Ya lo verifiqué
              </button>
            </div>
          </div>
        )}
      </section>

      {message && (
        <p role="status" className={`text-sm font-semibold ${message.kind === "ok" ? "text-[#0A4C96]" : "text-red-700"}`}>
          {message.text}
        </p>
      )}

      {terms && verified && (
        <button type="button" onClick={finish} className={`${button} w-full`}>
          Continuar
        </button>
      )}
    </div>
  );
}
