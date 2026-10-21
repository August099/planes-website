"use client";

import { Phone, MessageCircle, Mail } from "lucide-react";
import { logContactClick } from "@/app/actions/analytics-actions";
import { ensureAnalyticsCookies } from "@/lib/analytics-client";

interface ContactButtonsProps {
  phone?: string | null;
  email?: string | null;
  whatsappUrl?: string | null;
  emailUrl?: string | null;
  entityId: string;
  entityType: "AIRCRAFT" | "SPARE_PART" | "HANGAR";
  className?: string;
  compact?: boolean;
}

export function ContactButtons({
  phone,
  email,
  whatsappUrl,
  emailUrl,
  entityId,
  entityType,
  className = "",
  compact = false,
}: ContactButtonsProps) {
  const handleTrack = (eventType: "PHONE_CLICK" | "WHATSAPP_CLICK" | "EMAIL_CLICK") => {
    ensureAnalyticsCookies();
    logContactClick(entityId, entityType, eventType);
  };

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 ${className}`}>
      {phone && (
        <a
          onClick={() => handleTrack("PHONE_CLICK")}
          href={`tel:${phone}`}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 sm:px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs rounded-xl transition-colors shrink-0"
          title="Llamar"
        >
          <Phone className="w-4 h-4 shrink-0" />
          <span className={compact ? "hidden sm:inline" : "inline"}>Llamar</span>
        </a>
      )}

      {phone && whatsappUrl && (
        <a
          onClick={() => handleTrack("WHATSAPP_CLICK")}
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 sm:px-3 bg-emerald-500 text-white hover:bg-emerald-600 font-semibold text-xs rounded-xl transition-colors shadow-xs shrink-0"
          title="WhatsApp"
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span className={compact ? "hidden sm:inline" : "inline"}>WhatsApp</span>
        </a>
      )}

      {email && emailUrl && (
        <a
          onClick={() => handleTrack("EMAIL_CLICK")}
          href={emailUrl}
          className="flex items-center justify-center gap-1.5 py-2 px-2.5 sm:px-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs rounded-xl transition-colors shadow-xs shrink-0"
          title="Enviar Correo"
        >
          <Mail className="w-4 h-4 text-slate-500 shrink-0" />
          <span className={compact ? "hidden sm:inline" : "inline"}>Enviar Correo</span>
        </a>
      )}
    </div>
  );
}