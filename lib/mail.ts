import { Resend } from "resend";

// El cliente se crea al mandar, no al cargar el archivo: new Resend() sin clave tira error, y creado acá
// arriba rompía todo lo que importa este archivo (registro, publicar) si faltaba RESEND_API_KEY.
let client: Resend | null = null;
function resendClient(): Resend {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new Error("RESEND_API_KEY no está configurada: no se puede mandar el mail.");
  client ??= new Resend(key);
  return client;
}
const resend = { emails: { send: (...args: Parameters<Resend["emails"]["send"]>) => resendClient().emails.send(...args) } };

/** Dominio para los links de los mails: el de la app; nunca localhost en producción. */
export function appBaseUrl(): string {
  const raw = process.env.NEXTAUTH_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://ventasaeronauticas.com";
  return raw.trim().replace(/\/+$/, "");
}

export const EMAIL_FROM =
  process.env.EMAIL_FROM || "Ventas Aeronáuticas <no-reply@ventasaeronauticas.com>";

// Casilla interna que recibe solicitudes y reportes. Se configura con SUPPORT_EMAIL.
export function getSupportEmail(): string | null {
  return process.env.SUPPORT_EMAIL?.trim() || null;
}

// Escapa texto del usuario antes de interpolarlo en el HTML de un mail.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendVerificationEmail(email: string, token: string) {
  const confirmLink = `${appBaseUrl()}/verify-email?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "Confirmá tu cuenta en Ventas Aeronáuticas",
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #001F58;">
          <h2>¡Bienvenido a Ventas Aeronáuticas!</h2>
          <p>Hacé clic en el siguiente botón para confirmar tu casilla de correo electrónico y activar tu cuenta:</p>
          <div style="margin: 24px 0;">
            <a href="${confirmLink}" style="padding: 12px 24px; background-color: #E70F1F; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">
              Confirmar mi cuenta
            </a>
          </div>
          <p style="font-size: 12px; color: #666;">Si no creaste esta cuenta, podés ignorar este correo.</p>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend Error]:", error);
      throw new Error(error.message);
    }

    // Queda en los logs de Vercel: si el usuario dice que no le llegó, el id se busca en Resend → Emails.
    console.info(`[mail] verificación enviada (id ${data?.id})`);
    return data;
  } catch (err) {
    console.error("Error al enviar email de verificación:", err);
    throw err;
  }
}
// VA-92: cobro rechazado de una suscripción. El plan sigue activo durante la gracia.
export async function sendSubscriptionPaymentFailedEmail(input: { to: string; name: string | null; planName: string; graceUntil: Date; profileUrl: string }) {
  const until = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(input.graceUntil);
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: input.to,
    subject: `No pudimos cobrar tu plan ${input.planName}`,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #001F58;">
        <h2>No pudimos cobrar tu suscripción</h2>
        <p>Hola${input.name ? ` ${escapeHtml(input.name)}` : ""}: Mercado Pago rechazó el cobro de tu plan <strong>${escapeHtml(input.planName)}</strong>.</p>
        <p>Tu plan sigue activo hasta el <strong>${until}</strong>. Revisá el medio de pago en tu cuenta de Mercado Pago: el cobro se reintenta automáticamente. Si para esa fecha no se acredita, el plan se da de baja y tus publicaciones vuelven a las condiciones sin plan.</p>
        <div style="margin: 24px 0;">
          <a href="${input.profileUrl}" style="padding: 12px 24px; background-color: #001F58; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Ver mi plan</a>
        </div>
      </div>
    `,
  });
  if (error) throw new Error(error.message);
}

// VA-105 · 3: "Olvidé mi contraseña". Mismo estilo que el mail de verificación.
export async function sendPasswordResetEmail(input: { to: string; link: string; hasPassword: boolean }) {
  const body = input.hasPassword
    ? `<p>Recibimos un pedido para restablecer la contraseña de tu cuenta. Hacé clic en el botón para elegir una nueva:</p>`
    : `<p>Recibimos un pedido para restablecer la contraseña, pero tu cuenta no tiene contraseña: ingresás con <strong>Google</strong>. Podés seguir entrando así desde <a href="${input.link.split("/reset-password")[0]}/login" style="color: #001F58;">Iniciar sesión</a>.</p>
       <p>Si además querés poder entrar con tu email y una contraseña, creala acá:</p>`;
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: input.to,
    subject: input.hasPassword ? "Restablecé tu contraseña de Ventas Aeronáuticas" : "Tu cuenta de Ventas Aeronáuticas entra con Google",
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #001F58;">
        <h2>${input.hasPassword ? "Restablecé tu contraseña" : "Tu cuenta entra con Google"}</h2>
        ${body}
        <div style="margin: 24px 0;">
          <a href="${input.link}" style="padding: 12px 24px; background-color: #E70F1F; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">
            ${input.hasPassword ? "Elegir una contraseña nueva" : "Crear una contraseña"}
          </a>
        </div>
        <p style="font-size: 12px; color: #666;">El link vence en 1 hora y sirve una sola vez. Si no lo pediste, podés ignorar este correo: tu contraseña no cambia.</p>
      </div>
    `,
  });
  if (error) throw new Error(error.message);
}

// VA-122: aviso interno de una sugerencia del formulario de /about.
export async function sendSuggestionEmail(input: { message: string; name: string | null; email: string | null; adminUrl: string }) {
  const to = getSupportEmail();
  if (!to) return;
  const from = [input.name, input.email].filter(Boolean).map((v) => escapeHtml(v!)).join(" · ") || "Anónimo";
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    ...(input.email ? { replyTo: input.email } : {}),
    subject: "Nueva sugerencia desde la web",
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #001F58;">
        <h2>Nueva sugerencia</h2>
        <p style="color: #555;">De: ${from}</p>
        <p style="white-space: pre-wrap; border-left: 3px solid #E70F1F; padding-left: 12px;">${escapeHtml(input.message)}</p>
        <p><a href="${input.adminUrl}" style="color: #001F58;">Ver todas las sugerencias</a></p>
      </div>
    `,
  });
  if (error) throw new Error(error.message);
}

// VA-150: confirmación del arrepentimiento, con el monto y lo que se retiró.
export async function sendWithdrawalEmail(input: { to: string; name: string | null; amount: number; description: string; lines: string[] }) {
  const money = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(input.amount);
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: input.to,
    subject: "Recibimos tu pedido de arrepentimiento",
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #001F58;">
        <h2>Pedido de arrepentimiento</h2>
        <p>Hola${input.name ? ` ${escapeHtml(input.name)}` : ""}: te devolvemos <strong>AR$ ${money}</strong> por Mercado Pago de <strong>${escapeHtml(input.description)}</strong>. Según el medio de pago, puede tardar unos días en verse.</p>
        ${input.lines.length ? `<ul>${input.lines.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>` : ""}
        <p style="font-size: 12px; color: #666;">Si querés volver a publicar un aviso que quedó "pendiente de pago", lo encontrás en tu perfil con el botón "Pagar".</p>
      </div>
    `,
  });
  if (error) throw new Error(error.message);
}

// VA-154: moderación de un aviso (pausa desde un reporte, reactivación o "se mantiene pausado").
export async function sendModerationEmail(input: {
  to: string;
  name: string | null;
  listingTitle: string;
  kind: "PAUSE" | "REACTIVATE" | "KEEP_PAUSED";
  message: string | null;
  reactivatedAs?: "ACTIVE" | "PAUSED";
  profileUrl: string;
}) {
  const title = escapeHtml(input.listingTitle);
  const subject =
    input.kind === "PAUSE"
      ? `Pausamos tu aviso "${input.listingTitle}"`
      : input.kind === "REACTIVATE"
        ? `Revisamos tu aviso "${input.listingTitle}"`
        : `Tu aviso "${input.listingTitle}" sigue pausado`;
  const lead =
    input.kind === "PAUSE"
      ? `Pausamos tu aviso <strong>${title}</strong> después de revisar un reporte. No se ve en el sitio hasta que lo revisemos de nuevo.`
      : input.kind === "REACTIVATE"
        ? input.reactivatedAs === "ACTIVE"
          ? `Revisamos tu aviso <strong>${title}</strong> y ya está publicado de nuevo.`
          : `Revisamos tu aviso <strong>${title}</strong> y lo levantamos, pero quedó <strong>pausado</strong> porque no te queda cupo: activalo desde tu perfil cuando tengas lugar.`
        : `Revisamos tu aviso <strong>${title}</strong> y por ahora sigue pausado.`;
  const next =
    input.kind === "REACTIVATE"
      ? ""
      : `<p>Podés editarlo desde tu perfil y, cuando esté corregido, tocar <strong>"Pedir revisión"</strong>.</p>`;
  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: input.to,
    subject,
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #001F58;">
        <p>Hola${input.name ? ` ${escapeHtml(input.name)}` : ""}:</p>
        <p>${lead}</p>
        ${input.message ? `<p><strong>${input.kind === "PAUSE" ? "Motivo" : "Mensaje"}:</strong> ${escapeHtml(input.message)}</p>` : ""}
        ${next}
        <div style="margin: 24px 0;">
          <a href="${input.profileUrl}" style="padding: 12px 24px; background-color: #001F58; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">Ir a mis publicaciones</a>
        </div>
      </div>
    `,
  });
  if (error) throw new Error(error.message);
}
