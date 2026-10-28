import "server-only";
import { prisma } from "@/lib/prisma";
import { appBaseUrl, EMAIL_FROM, escapeHtml, sendMail } from "@/lib/mail";

// 28/10 (socio): la bonificación de fundadores pasó a ser 100 % manual desde /admin/users. Para saber a
// quién dársela, cada cuenta nueva de empresa (no particular) manda un mail a los socios. Se pausa con el
// interruptor de /admin/users, que se guarda en QuotaSettings.foundingMembersLimit (> 0 = avisos prendidos;
// el campo ya no se usa para el límite automático). Nunca corta el registro: si falla, queda en el log.
import { BUSINESS_SIGNUP_NOTICE_TO } from "@/lib/business-signup-notice-to";

export async function businessSignupNoticeEnabled(): Promise<boolean> {
  const s = await prisma.quotaSettings.findUnique({ where: { id: "default" }, select: { foundingMembersLimit: true } });
  return (s?.foundingMembersLimit ?? 15) > 0;
}

/** Avisa si la cuenta es de empresa y los avisos están prendidos. `previousType` evita repetirlo al guardar Ajustes. */
export async function notifyBusinessSignup(userId: string, previousType?: string | null): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, userType: true, isAdmin: true } });
    if (!user || user.isAdmin || user.userType === "PARTICULAR") return;
    if (previousType && previousType !== "PARTICULAR") return; // ya era de empresa
    if (!(await businessSignupNoticeEnabled())) return;
    const profile = `${appBaseUrl()}/profile/${user.id}`;
    const admin = `${appBaseUrl()}/admin/users`;
    await sendMail({
      from: EMAIL_FROM,
      to: BUSINESS_SIGNUP_NOTICE_TO,
      subject: `Nueva cuenta de empresa: ${user.name ?? user.email}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #001F58;">
          <h2>Nueva cuenta de empresa</h2>
          <p><strong>${escapeHtml(user.name ?? "Sin nombre")}</strong> · ${escapeHtml(user.email)}</p>
          <p>Tipo: ${user.userType === "FACTORY" ? "Fábrica" : "Empresa / Taller / Broker"}</p>
          <p><a href="${profile}" style="color: #001F58;">Ver el perfil</a> · <a href="${admin}" style="color: #001F58;">Bonificar desde el admin</a></p>
          <p style="color: #555; font-size: 12px;">Estos avisos se pausan en el admin, en Usuarios.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error al avisar la cuenta de empresa nueva:", error);
  }
}
