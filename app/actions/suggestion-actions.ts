"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hitRateLimit, limitKey } from "@/lib/rate-limit";
import { sendSuggestionEmail } from "@/lib/mail";
import { absoluteUrl } from "@/lib/site";

export type SuggestionState = { status: "idle" | "sent" | "error"; message?: string; fieldErrors?: Record<string, string> };

const schema = z.object({
  message: z.string().trim().min(10, "Contanos un poco más (al menos 10 caracteres).").max(2000, "Hasta 2000 caracteres."),
  name: z.string().trim().max(100, "Hasta 100 caracteres.").optional(),
  email: z.union([z.literal(""), z.email("Revisá el email.")]).optional(),
});

// VA-122: formulario de sugerencias de /about. Se guarda en la base (admin → Sugerencias) y avisa por
// mail a SUPPORT_EMAIL. Límite por IP y un campo trampa para bots.
export async function submitSuggestionAction(_prev: SuggestionState, formData: FormData): Promise<SuggestionState> {
  // Campo oculto: una persona no lo completa; un bot sí. Se responde como si se hubiera enviado.
  if (String(formData.get("website") ?? "").trim()) return { status: "sent" };

  const parsed = schema.safeParse({
    message: String(formData.get("message") ?? ""),
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { status: "error", message: "Revisá los datos marcados.", fieldErrors };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "sin-ip";
  const allowed = await hitRateLimit([{ key: limitKey("suggestion-ip", ip), limits: [{ max: 5, windowMs: 3_600_000 }] }]);
  if (!allowed) return { status: "error", message: "Mandaste varias sugerencias seguidas. Probá de nuevo en un rato." };

  const session = await auth();
  const { message, name, email } = parsed.data;
  await prisma.suggestion.create({
    data: { message, name: name || null, email: email || null, userId: session?.user?.id ?? null },
  });
  try {
    await sendSuggestionEmail({ message, name: name || null, email: email || null, adminUrl: absoluteUrl("/admin/suggestions") });
  } catch (error) {
    // La sugerencia ya quedó guardada: se ve igual en el admin.
    console.error("[sugerencias] no se pudo mandar el aviso por mail:", error);
  }
  return { status: "sent" };
}
