"use client";

import { Phone, MessageCircle, Mail } from "lucide-react";
import { logContactClick } from "@/app/actions/analytics-actions"; // Ajusta la ruta si es necesario

interface ContactButtonsProps {
  phone?: string | null;
  email?: string | null;
  whatsappUrl?: string | null;
  emailUrl?: string | null;
  entityId: string;
  entityType: "AIRCRAFT" | "SPARE_PART";
}

export function ContactButtons({
  phone,
  email,
  whatsappUrl,
  emailUrl,
  entityId,
  entityType,
}: ContactButtonsProps) {
  
  const handleTrack = (eventType: "PHONE_CLICK" | "WHATSAPP_CLICK" | "EMAIL_CLICK") => {
    // Se ejecuta en segundo plano, no bloquea que se abra el link
    logContactClick(entityId, entityType, eventType);
  };

  return (
    <div className="space-y-2 pt-2">
      {phone && (
        <div className="flex gap-2">
          <a
            onClick={() => handleTrack("PHONE_CLICK")}
            href={`tel:${phone}`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-xl transition-colors"
          >
            <Phone className="w-4 h-4" /> Llamar
          </a>

          {whatsappUrl && (
            <a
              onClick={() => handleTrack("WHATSAPP_CLICK")}
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-500 text-white hover:bg-emerald-600 font-semibold text-xs rounded-xl transition-colors shadow-xs"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          )}
        </div>
      )}

      {email && emailUrl && (
        <a
          onClick={() => handleTrack("EMAIL_CLICK")}
          href={emailUrl}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-xl transition-colors"
        >
          <Mail className="w-4 h-4 text-slate-500" /> Enviar Correo
        </a>
      )}
    </div>
  );
}