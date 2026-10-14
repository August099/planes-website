import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqPageJsonLd } from "@/lib/structured-data";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

// VA-123: preguntas reales según cómo funciona la web (14/10). Si cambia una regla (vencimientos,
// renovación, promoción, límites), actualizar la respuesta acá: también sale como FAQPage (JSON-LD).
type Faq = { id: string; group: string; question: string; answer: string };

const faqs: Faq[] = [
  // Publicar
  { id: "como-publico", group: "Publicar", question: "¿Cómo publico un avión o un repuesto?", answer: "Creá tu cuenta (con tu email o con Google), cargá un teléfono de contacto y entrá a Vender. El formulario te guía paso a paso: datos del avión o del repuesto, fotos y descripción. Al terminar, el aviso queda publicado o, si no tenés saldo ni plan, te lleva a pagarlo." },
  { id: "gratis-lanzamiento", group: "Publicar", question: "¿Es gratis publicar?", answer: "Durante el lanzamiento, cada cuenta nueva tiene 1 publicación de avión y 1 de repuesto gratis. Se usan solas al publicar: no hace falta ningún cupón. Después, cada aviso se paga al terminar de cargarlo o se publica con un plan." },
  { id: "cuanto-dura", group: "Publicar", question: "¿Cuánto tiempo queda publicado un aviso?", answer: "Un aviso suelto queda visible 45 días. Antes de que venza lo podés renovar desde tu perfil por 45 días más. Con un plan que incluye ese tipo de aviso sin límite, tus avisos no vencen." },
  { id: "renovar", group: "Publicar", question: "¿Cuánto cuesta renovar un aviso?", answer: "Renovar cuesta un porcentaje del precio de publicar (hoy, el 70 %). Si tenés un plan que cubre ese tipo de aviso, la renovación no tiene cargo." },
  { id: "fotos", group: "Publicar", question: "¿Cuántas fotos puedo subir?", answer: "Hasta 15 fotos por aviso, en JPG, PNG o WebP. Las comprimimos en tu navegador para que suban rápido aunque las saques con el celular. La primera foto es la que se ve en los listados." },
  { id: "documentos", group: "Publicar", question: "¿Quién ve la documentación que adjunto?", answer: "Los documentos (por ejemplo, el certificado de aeronavegabilidad o el historial de mantenimiento) no son públicos: solo los ven vos y el equipo de Ventas Aeronáuticas. Si un comprador interesado los necesita, se los mandás vos." },
  { id: "editar-pausar", group: "Publicar", question: "¿Puedo editar o borrar mi aviso?", answer: "Sí. Desde tu perfil, en Mis publicaciones, podés editar todo el aviso (fotos, motor, precio, descripción), renovarlo o borrarlo." },
  // Planes y pagos
  { id: "planes", group: "Planes y pagos", question: "¿Qué planes hay?", answer: "Además de pagar cada aviso por separado, hay suscripciones mensuales para quienes publican seguido (por ejemplo, avisos ilimitados de aviones o de repuestos) y packs de publicaciones. Los precios y lo que incluye cada uno están en Planes y precios." },
  { id: "medios-de-pago", group: "Planes y pagos", question: "¿Cómo se paga?", answer: "Con Mercado Pago: tarjeta de crédito o débito, dinero en cuenta y los demás medios que ofrece. Las suscripciones se debitan todos los meses de la cuenta de Mercado Pago que elijas." },
  { id: "cancelar-plan", group: "Planes y pagos", question: "¿Cómo cancelo o cambio mi suscripción?", answer: "Desde Planes y precios o desde tu perfil. Si cancelás, no se te cobra más y el plan sigue hasta el fin del período pagado. Si cambiás de plan, el nuevo empieza apenas se aprueba el pago y deja de cobrarse el anterior; lo que quedaba del período no se devuelve." },
  { id: "arrepentimiento", group: "Planes y pagos", question: "¿Puedo arrepentirme de una compra?", answer: "Sí. Dentro de los 10 días corridos desde el pago podés pedir la devolución con el botón de arrepentimiento, en Mis compras de tu perfil. Te devolvemos el dinero por Mercado Pago y se da de baja lo que compraste." },
  { id: "factura", group: "Planes y pagos", question: "¿Me dan factura?", answer: "Sí. Emitimos factura por cada pago y la podés descargar desde la pantalla del pago y desde Mis compras. Tus datos de facturación se guardan en Ajustes de tu perfil." },
  { id: "comisiones", group: "Planes y pagos", question: "¿Cobran comisión por la venta?", answer: "No. Ventas Aeronáuticas cobra solo por publicar; la operación se acuerda directamente entre comprador y vendedor." },
  // Comprar
  { id: "contactar", group: "Comprar", question: "¿Cómo contacto a un vendedor?", answer: "En cada aviso están los botones de WhatsApp, teléfono y email del vendedor. También podés dejarle una pregunta en el aviso: la respuesta queda a la vista de todos." },
  { id: "seguridad", group: "Comprar", question: "¿Cómo compro de forma segura?", answer: "Revisá la documentación y los registros de mantenimiento, hacé una inspección pre-compra con un taller habilitado y verificá la titularidad ante la ANAC antes de pagar. No adelantes dinero sin ver la aeronave. En Servicios hay guías para comprar un avión usado y para la transferencia." },
  { id: "comparar", group: "Comprar", question: "¿Puedo comparar aeronaves?", answer: "Sí. Tocá Comparar en hasta 3 avisos y abrí el comparador: muestra todos los datos lado a lado y marca el mejor valor en precio, año y horas." },
  { id: "reportar", group: "Comprar", question: "¿Qué hago si un aviso parece falso o tiene datos incorrectos?", answer: "Usá el botón Reportar del aviso y contanos qué pasa. El equipo lo revisa y, si corresponde, lo da de baja." },
  // Cuenta
  { id: "tipo-cuenta", group: "Cuenta", question: "¿Qué tipo de cuenta elijo?", answer: "Particular si vendés lo tuyo; Empresa, taller o broker si vendés como actividad comercial. Lo podés cambiar desde Mi perfil. Los compradores pueden filtrar los avisos según quién publica." },
  { id: "contrasena", group: "Cuenta", question: "Olvidé mi contraseña, ¿qué hago?", answer: "En Iniciar sesión tocá ¿Olvidaste tu contraseña? y te mandamos un link por email para elegir una nueva. Si entrás con Google, seguí entrando con Google." },
  { id: "contacto", group: "Cuenta", question: "¿Cómo me comunico con Ventas Aeronáuticas?", answer: "Por email, teléfono o Instagram (están al pie de cada página). Si tenés una idea para mejorar la web, dejala en el formulario de sugerencias de Nosotros." },
];

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Respuestas sobre cómo comprar, vender y publicar aviones y repuestos aeronáuticos en Ventas Aeronáuticas.",
  alternates: { canonical: "/faq" },
};

export default function FAQPage() {
  const groups = [...new Set(faqs.map((f) => f.group))];

  return (
    <main className="relative isolate overflow-hidden min-h-screen">
      <JsonLd data={faqPageJsonLd(faqs)} />
      <PageBackground page="faq" />

      <div className="container mx-auto px-4 pt-6 pb-20 max-w-6xl">
        <Breadcrumbs items={[{ label: "Preguntas frecuentes" }]} className="mb-8 sm:mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 items-start">
          
          <aside className="hidden md:col-span-1 md:flex flex-col gap-2 border-l border-[#001F58]/20 pl-4 md:sticky md:top-24">
            {groups.map((group) => (
              <div key={group} className="mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{group}</p>
                {faqs
                  .filter((f) => f.group === group)
                  .map((faq) => (
                    <a
                      key={faq.id}
                      href={`#${faq.id}`}
                      className="block text-sm py-1 font-medium text-[#001F58]/70 hover:text-[#001F58] transition-colors"
                    >
                      {faq.question}
                    </a>
                  ))}
              </div>
            ))}
          </aside>

          <section className="md:col-span-3">
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#001F58] mb-2">
              PREGUNTAS FRECUENTES
            </h1>
            <p className="text-sm text-[#001F58]/60 mb-12 border-b border-[#001F58]/20 pb-4">
              Todo lo que necesitás saber antes de comprar o publicar
            </p>

            <div className="flex flex-col gap-14">
              {groups.map((group) => (
                <div key={group} className="flex flex-col gap-8">
                  <h2 className="border-b border-[#001F58]/15 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{group}</h2>
                  {faqs
                    .filter((f) => f.group === group)
                    .map((faq) => (
                      <div key={faq.id} id={faq.id} className="flex flex-col gap-2 scroll-mt-24">
                        <h3 className="font-heading text-lg font-semibold text-[#001F58]">{faq.question}</h3>
                        <p className="font-sans text-sm text-[#001F58]/80 leading-relaxed max-w-3xl">{faq.answer}</p>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
