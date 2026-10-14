import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
  const domain = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const confirmLink = `${domain}/verify-email?token=${token}`;

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
