"use client";

import { useState } from "react";
import { Phone, Loader2 } from "lucide-react";
import { updateProfileAction } from "@/app/actions/profile-actions";

// VA-46 (decisión D7): sin teléfono no se puede publicar, porque sin él no hay botón de WhatsApp.
// Se carga acá mismo y queda guardado en el perfil.
export function PhoneRequiredCard({ onSaved }: { onSaved: () => void }) {
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) {
      setError("Ingresá un teléfono válido, con código de área (por ejemplo 11 2345 6789).");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("phone", phone.trim());
      await updateProfileAction(fd);
      onSaved();
    } catch {
      setError("No se pudo guardar el teléfono. Probá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 space-y-3">
      <div className="flex items-start gap-3">
        <Phone className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="text-sm font-semibold text-amber-900">Cargá tu teléfono para publicar</p>
          <p className="text-xs text-amber-800">
            Los compradores te contactan por WhatsApp o llamada. Se guarda en tu perfil y lo podés cambiar en Ajustes.
          </p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-label="Teléfono de contacto"
          placeholder="Ej: +54 9 11 2345 6789"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="flex-1 min-h-11 rounded-xl border border-amber-300 bg-white px-3 text-sm"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-[#001F58] px-5 text-sm font-semibold text-white hover:bg-[#001740] disabled:opacity-50 cursor-pointer"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar teléfono
        </button>
      </div>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
