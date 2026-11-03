import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqPageJsonLd } from "@/lib/structured-data";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PageHeader } from "@/components/ui/PageHeader";

// VA-123: preguntas reales según cómo funciona la web (14/10). Si cambia una regla (vencimientos,
// renovación, promoción, límites), actualizar la respuesta acá: también sale como FAQPage (JSON-LD).
type Faq = { id: string; group: string; question: string; answer: string };

const faqs: Faq[] = [
  // Publicar
  { id: "como-publico", group: "Publicar", question: "¿Cómo publico un avión o un repuesto?", answer: "Creá tu cuenta (con tu email, Google o Facebook), aceptá los términos, verificá tu correo y cargá un teléfono de contacto. Después entrá a Vender: el formulario te guía paso a paso con los datos, las fotos y la descripción. Al terminar, el aviso queda publicado al momento." },
  { id: "gratis", group: "Publicar", question: "¿Es gratis publicar?", answer: "Sí. Todas las cuentas tienen, para siempre, un cupo gratis de avisos activos al mismo tiempo: hoy, 1 avión y 3 repuestos (plan Base). Si necesitás más, los planes Pro y Broker / Empresa tienen más cupo." },
  { id: "cuanto-dura", group: "Publicar", question: "¿Cuánto tiempo queda publicado un aviso?", answer: "No vence: sigue publicado hasta que lo pauses, lo marques como vendido o lo borres. El cupo cuenta solo los avisos activos; si pausás uno, liberás su lugar para otro." },
  { id: "sin-cupo", group: "Publicar", question: "¿Qué pasa si ya usé mi cupo?", answer: "El formulario te avisa al empezar. Podés pausar uno de tus avisos, pasarte a un plan con más cupo o guardar el nuevo como pausado y activarlo cuando tengas lugar." },
  { id: "datos-obligatorios", group: "Publicar", question: "¿Qué datos son obligatorios en un aviso?", answer: "Los que marca el formulario con un asterisco. En aeronaves, cada motor pide su DURG/SMOH; el TBO es opcional. La ciudad y la provincia son opcionales, y el precio también: si no lo cargás, el aviso aparece como \"a consultar\"." },
  { id: "fotos", group: "Publicar", question: "¿Cuántas fotos puedo subir?", answer: "Hasta 15 fotos por aviso, en JPG, PNG o WebP. Las comprimimos en tu navegador para que suban rápido aunque las saques con el celular. La primera foto es la que se ve en los listados." },
  { id: "documentos", group: "Publicar", question: "¿Quién ve la documentación que adjunto?", answer: "Cualquier visitante del aviso puede verla y descargarla. No subas nada que no quieras hacer público, y tapá los datos personales o sensibles antes de adjuntarlo. Podés subir PDF, Word o imágenes de hasta 10 MB." },
  { id: "video", group: "Publicar", question: "¿Puedo agregar un video?", answer: "Sí, podés pegar un enlace de YouTube en el formulario. El video se carga recién cuando alguien toca Ver video, para que la página no se haga más lenta." },
  { id: "editar-pausar", group: "Publicar", question: "¿Puedo editar o borrar mi aviso?", answer: "Sí. Desde tu perfil podés editar todo el aviso (fotos, motor, precio, descripción), pausarlo, volver a activarlo, marcarlo como vendido o borrarlo. También tenés el botón Editar sobre la foto del aviso, y al lado de Imprimir cuando entrás a un aviso tuyo." },
  { id: "republicar", group: "Publicar", question: "¿Qué es republicar?", answer: "Vuelve a poner tu aviso primero en Últimas publicaciones, sin cambiar su contenido. Hoy, Base tiene 2 por año y Pro 5; el mismo aviso se puede republicar una vez cada 7 días. En Broker / Empresa republicás todos tus avisos juntos, una vez cada 30 días." },
  { id: "asistida", group: "Publicar", question: "¿Me pueden ayudar a publicar?", answer: "Sí. Con la publicación asistida nos dejás tu nombre y tu WhatsApp en la página de publicar, nos mandás las fotos y los datos, y armamos el aviso por vos. Es importante que revises que todo esté bien." },
  // Planes y pagos
  { id: "planes", group: "Planes y pagos", question: "¿Qué planes hay?", answer: "Base (gratis, para todas las cuentas), Pro (3 aviones y 10 repuestos activos a la vez, usuario verificado, destacadas, banner en tu perfil y métricas) y Broker / Empresa, donde elegís publicar aviones ilimitados, repuestos ilimitados o las dos cosas, con tu página personalizada completa, detalles personalizados y métricas completas. Pro y Broker / Empresa son suscripciones mensuales. Los precios están en Planes." },
  { id: "medios-de-pago", group: "Planes y pagos", question: "¿Cómo se paga?", answer: "Con Mercado Pago: tarjeta de crédito o débito, dinero en cuenta y los demás medios que ofrece. Las suscripciones se debitan todos los meses de la cuenta de Mercado Pago que elijas. No guardamos ni vemos los datos de tu tarjeta." },
  { id: "cancelar-plan", group: "Planes y pagos", question: "¿Cómo cancelo o cambio mi suscripción?", answer: "Desde Planes y precios o desde Ajustes. Si cancelás, no se te cobra más y el plan sigue hasta el fin del período pagado. Si cambiás de plan, el nuevo empieza apenas se aprueba el pago y deja de cobrarse el anterior; lo que quedaba del período no se devuelve. Si el plan nuevo (o Base) tiene menos cupo y tenés más avisos activos, se pausan los más nuevos y después elegís cuáles quedan activos. No se borra ninguno." },
  { id: "cobro-rechazado", group: "Planes y pagos", question: "¿Qué pasa si se rechaza un cobro?", answer: "Te avisamos por correo y mantenés el plan durante un período de gracia, mientras Mercado Pago vuelve a intentarlo. Si no se logra cobrar, el plan termina y la cuenta vuelve a Base." },
  { id: "arrepentimiento", group: "Planes y pagos", question: "¿Puedo arrepentirme de una suscripción?", answer: "Sí. Dentro de los 10 días corridos desde el primer pago de la suscripción podés pedir la devolución con el botón de arrepentimiento del pie de la página, o en Mis compras, dentro de Ajustes. No hace falta una cuenta: también podés pedirlo por nuestros canales de contacto. Te devolvemos el total por Mercado Pago, la suscripción termina y volvés al plan Base." },
  { id: "factura", group: "Planes y pagos", question: "¿Me dan factura?", answer: "Sí. Emitimos un comprobante por cada pago, y lo podés ver desde Mis compras, en Ajustes. Tus datos de facturación también se guardan ahí." },
  { id: "comisiones", group: "Planes y pagos", question: "¿Cobran comisión por la venta?", answer: "No. Publicar es gratis dentro del cupo y los planes pagos son una suscripción mensual; la operación se acuerda directamente entre comprador y vendedor." },
  { id: "bonificado", group: "Planes y pagos", question: "¿Qué es un plan bonificado?", answer: "Es un plan que el equipo del sitio le da a una cuenta sin cobrarle, por ejemplo a un miembro fundador. Dura hasta la fecha que se le informa; no se renueva solo ni se puede transferir." },
  // Comprar
  { id: "buscar", group: "Comprar", question: "¿Cómo busco un avión o un repuesto?", answer: "Podés usar el buscador de arriba, por marca, modelo, número de parte o ciudad, o el filtro de la página de inicio, con su interruptor Aviones / Repuestos. Los listados también tienen filtros. No importa si escribís con o sin acentos: Cordoba y Córdoba dan lo mismo. También podés buscar a un vendedor Broker o Empresa por su nombre." },
  { id: "contactar", group: "Comprar", question: "¿Cómo contacto a un vendedor?", answer: "En cada aviso están los botones de WhatsApp, teléfono y email del vendedor, y también aparecen en su perfil. Además, podés dejarle una pregunta en el aviso: la respuesta queda a la vista de todos." },
  { id: "seguridad", group: "Comprar", question: "¿Cómo compro de forma segura?", answer: "Revisá la documentación y los registros de mantenimiento, hacé una inspección pre-compra con un taller habilitado y verificá la titularidad ante la ANAC antes de pagar. No adelantes dinero sin ver la aeronave. En Servicios hay guías para comprar un avión usado y para la transferencia." },
  { id: "revisan", group: "Comprar", question: "¿Ustedes revisan las aeronaves o intervienen en la venta?", answer: "No. Somos un sitio de avisos: no inspeccionamos los bienes ni certificamos su documentación, y no recibimos pagos de las operaciones. La insignia de usuario verificado acompaña a ciertos planes; no certifica a la persona ni a los avisos." },
  { id: "comparar", group: "Comprar", question: "¿Puedo comparar aeronaves?", answer: "Sí. Tocá Comparar en hasta 3 avisos y abrí el comparador: muestra todos los datos lado a lado y marca el mejor valor en precio, año y horas." },
  { id: "favoritos", group: "Comprar", question: "¿Puedo guardar avisos?", answer: "Sí. Con una cuenta, tocá el corazón de un aviso y lo encontrás después en Favoritos." },
  { id: "reportar", group: "Comprar", question: "¿Qué hago si un aviso parece falso o tiene datos incorrectos?", answer: "Usá el botón Reportar del aviso y contanos qué pasa. El equipo lo revisa y, si corresponde, lo pausa. Al vendedor se le informa el motivo, y puede corregirlo y pedir una revisión." },
  // Cuenta y datos
  { id: "tipo-cuenta", group: "Cuenta y datos", question: "¿Qué tipo de cuenta elijo?", answer: "Particular si vendés lo tuyo; Empresa, taller o broker si vendés como actividad comercial. Lo podés cambiar desde Ajustes. Los compradores pueden filtrar los avisos según quién publica." },
  { id: "contacto-publico", group: "Cuenta y datos", question: "¿Qué datos míos se ven?", answer: "Tu nombre, tu tipo de cuenta y lo que cargues en tus avisos. Tu teléfono (también para WhatsApp) y el email de tu cuenta se muestran en tus avisos y en tu perfil mientras tengas avisos activos. Los datos de facturación y tus pagos son privados. El detalle está en la Política de privacidad." },
  { id: "contrasena", group: "Cuenta y datos", question: "Olvidé mi contraseña, ¿qué hago?", answer: "En Iniciar sesión tocá ¿Olvidaste tu contraseña? y te mandamos un link por email para elegir una nueva. Si entrás con Google o Facebook, seguí entrando de la misma forma." },
  { id: "verificar", group: "Cuenta y datos", question: "¿Por qué tengo que verificar mi correo?", answer: "Para confirmar que la cuenta es tuya y que te llegan los avisos sobre tus publicaciones y tus pagos. Te mandamos un enlace, y si no lo encontrás, revisá la carpeta de spam." },
  { id: "borrar-cuenta", group: "Cuenta y datos", question: "¿Cómo borro mi cuenta o pido mis datos?", answer: "Escribinos a aeronauticasventas@gmail.com desde el correo de tu cuenta. Los datos de pagos y facturas se conservan durante el plazo que exige la normativa. Tus derechos sobre tus datos están en la Política de privacidad." },
  { id: "contacto", group: "Cuenta y datos", question: "¿Cómo me comunico con Ventas Aeronáuticas?", answer: "Por email, teléfono o Instagram (están al pie de cada página). Si tenés una idea para mejorar la web, dejala en el formulario de sugerencias de Nosotros." },
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
        <Breadcrumbs items={[{ label: "Preguntas frecuentes" }]} className="mb-6" />
        <PageHeader variant="plain" routeId="va-route-faq" className="mb-10" title="Preguntas frecuentes" subtitle="Todo lo que necesitás saber antes de comprar o publicar" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 items-start">
          
          <aside className="hidden md:col-span-1 md:flex flex-col gap-2 border-l border-[#00205B]/20 pl-4 md:sticky md:top-24">
            {groups.map((group) => (
              <div key={group} className="mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{group}</p>
                {faqs
                  .filter((f) => f.group === group)
                  .map((faq) => (
                    <a
                      key={faq.id}
                      href={`#${faq.id}`}
                      className="block text-sm py-1 font-medium text-[#00205B]/70 hover:text-[#00205B] transition-colors"
                    >
                      {faq.question}
                    </a>
                  ))}
              </div>
            ))}
          </aside>

          <section className="md:col-span-3">

            <div className="flex flex-col gap-14">
              {groups.map((group) => (
                <div key={group} className="flex flex-col gap-8">
                  <h2 className="border-b border-[#00205B]/15 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{group}</h2>
                  {faqs
                    .filter((f) => f.group === group)
                    .map((faq) => (
                      <div key={faq.id} id={faq.id} className="flex flex-col gap-2 scroll-mt-24">
                        <h3 className="font-heading text-lg font-semibold text-[#00205B]">{faq.question}</h3>
                        <p className="font-sans text-sm text-[#00205B]/80 leading-relaxed max-w-3xl">{faq.answer}</p>
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
