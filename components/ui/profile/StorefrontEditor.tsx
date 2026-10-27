"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { updateProfileAction, uploadStorefrontImageAction } from "@/app/actions/profile-actions";
import { compressImage } from "@/lib/image-compressor";
import type { StorefrontData } from "@/components/ui/profile/StorefrontHeader";
import { PhoneInput } from "@/components/ui/PhoneInput";

// Edición de la página personalizada (VA-87), solo para quien tiene el beneficio del plan.
// Las imágenes se comprimen en el navegador antes de subir (límite de 4,5 MB por request en Vercel).
const INPUT = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
const LABEL = "mb-1 block text-xs font-semibold text-slate-600";

function ImageField({
  kind,
  label,
  hint,
  current,
}: {
  kind: "cover" | "detailCover";
  label: string;
  hint: string;
  current: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(current);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const compressed = await compressImage(file, "covers");
      if (compressed.size > 4.5 * 1024 * 1024) throw new Error("La imagen sigue siendo muy pesada.");
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("image", compressed);
      const res = await uploadStorefrontImageAction(fd);
      setUrl(res.url);
    } catch {
      setError("No se pudo subir la imagen. Probá con un JPG, PNG o WebP.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <span className={LABEL}>{label}</span>
      <div className="flex items-center gap-4">
        <div className="relative aspect-[4/1] w-48 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
          {url && <Image src={url} alt="" fill sizes="192px" className="object-cover" />}
          {loading && (
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
              <Loader2 className="h-4 w-4 animate-spin" />
            </span>
          )}
        </div>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="rounded-md border border-[#00205B]/20 px-3 py-1.5 text-xs font-semibold text-[#00205B] hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            {url ? "Cambiar" : "Subir"}
          </button>
          <p className="text-[11px] text-slate-500">{hint}</p>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onChange} />
    </div>
  );
}

export function StorefrontEditor({ storefront }: { storefront: StorefrontData }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateProfileAction(new FormData(e.currentTarget));
      setMessage({ ok: true, text: "Página actualizada." });
    } catch {
      setMessage({ ok: false, text: "No se pudo guardar. Revisá la web y el WhatsApp." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5 rounded-lg border border-[#00205B]/12 bg-white p-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Beneficio de tu plan</p>
        <h2 className="mt-1 text-lg font-bold text-[#00205B]">Página personalizada</h2>
        <p className="mt-1 text-sm text-slate-600">Así ven tu perfil los compradores: portada, logo, nombre comercial y contacto. El logo es tu foto de perfil (en Datos personales).</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <ImageField kind="cover" label="Portada" hint="Ancha, por ejemplo 1600 × 400 px." current={storefront.coverUrl} />
        {storefront.customDetail && (
          <ImageField kind="detailCover" label="Portada de tus avisos" hint="Opcional: si no subís una, se usa la de tu Página." current={storefront.detailCoverUrl ?? null} />
        )}
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sf-business" className={LABEL}>Nombre comercial</label>
            <input id="sf-business" name="businessName" defaultValue={storefront.businessName ?? ""} maxLength={200} className={INPUT} />
          </div>
          <div>
            <label htmlFor="sf-whatsapp" className={LABEL}>WhatsApp</label>
            {/* Se guarda solo con dígitos (incluye el código de país); el "+" es para que PhoneInput lo lea como internacional. */}
            <PhoneInput id="sf-whatsapp" name="whatsapp" defaultValue={storefront.whatsapp ? `+${storefront.whatsapp}` : null} className={INPUT} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="sf-website" className={LABEL}>Web</label>
            <input id="sf-website" name="website" type="text" placeholder="www.tuempresa.com.ar" defaultValue={storefront.website ?? ""} className={INPUT} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="sf-bio" className={LABEL}>Descripción del negocio</label>
            <textarea id="sf-bio" name="bio" rows={4} maxLength={1500} defaultValue={storefront.bio ?? ""} className={INPUT} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#00205B] px-5 text-xs font-bold text-white hover:bg-[#001331] disabled:opacity-60 cursor-pointer"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar página"}
          </button>
          {message && <span className={`text-xs font-medium ${message.ok ? "text-green-700" : "text-red-700"}`}>{message.text}</span>}
        </div>
      </form>
    </section>
  );
}
