import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, token: string) {
  const domain = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const confirmLink = `${domain}/verify-email?token=${token}`;

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Ventas Aeronáuticas <no-reply@tu-dominio.com>",
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