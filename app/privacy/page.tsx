import type { Metadata } from "next";
import { PageBackground } from "@/components/ui/PageBackground";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

const policySections = [
  { id: "recoleccion", title: "1. Datos que recolectamos" },
  { id: "finalidad", title: "2. Finalidad del tratamiento" },
  { id: "publicidad", title: "3. Qué se publica y qué no" },
  { id: "exencion", title: "4. Exención de responsabilidad" },
  { id: "terceros", title: "5. Proveedores y compartición de datos" },
  { id: "cookies", title: "6. Cookies y medición" },
  { id: "derechos", title: "7. Derechos del titular" },
];

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: "Cómo Ventas Aeronáuticas recopila, usa y protege los datos personales de sus usuarios.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacidadPage() {
  return (
    <main className="relative isolate overflow-hidden min-h-screen">
      <PageBackground page="legal" />

      <div className="container mx-auto px-4 pt-6 pb-20 max-w-6xl">
        <Breadcrumbs items={[{ label: "Privacidad" }]} className="mb-8 sm:mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 items-start">
          
          {/* MENÚ LATERAL: Índices del documento legal */}
          <aside className="md:col-span-1 flex flex-col gap-2 border-l border-[#001F58]/20 pl-4 md:sticky md:top-24">
            <p className="text-xs font-semibold text-[#001F58]/50 uppercase tracking-wider mb-2">
              Índice
            </p>
            {policySections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-sm py-1.5 font-medium text-[#001F58]/70 hover:text-[#001F58] transition-colors scroll-smooth"
              >
                {section.title}
              </a>
            ))}
          </aside>

          {/* CUERPO PRINCIPAL: Contenido de la Política de Privacidad */}
          <section className="md:col-span-3">
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#001F58] mb-2">
              POLÍTICA DE PRIVACIDAD
            </h1>
            <p className="text-sm text-[#001F58]/60 mb-12 border-b border-[#001F58]/20 pb-4">
              <strong>Última actualización:</strong> Octubre 2026.
            </p>

            <div className="flex flex-col gap-10 font-sans text-sm text-[#001F58]/80 leading-relaxed max-w-3xl">
              
              <p>
                El presente documento establece los términos en que <strong>Ventas Aeronáuticas</strong> trata los datos personales de sus usuarios en la República Argentina, de conformidad con la Ley N° 25.326 de Protección de Datos Personales y las normativas vigentes de la Agencia de Acceso a la Información Pública (AAIP).
              </p>

              {/* SECCIÓN 1 */}
              <div id="recoleccion" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  1. Datos que recolectamos
                </h2>
                <p>Dependiendo de cómo uses la plataforma, recolectamos la siguiente información:</p>
                <ul className="list-disc pl-5 space-y-2 text-[#001F58]/90">
                  <li><strong>Datos de cuenta:</strong> nombre, correo electrónico, contraseña (guardada cifrada, nunca en texto), teléfono, ciudad y provincia, tipo de cuenta (particular o empresa) y foto de perfil. Si iniciás sesión con <strong>Google</strong>, recibimos de Google tu nombre, tu correo y tu foto de perfil; no accedemos a tu contraseña de Google ni a otros datos de tu cuenta.</li>
                  <li><strong>Datos de las publicaciones:</strong> detalles técnicos de las aeronaves y repuestos, precio, ubicación, fotografías y los documentos que decidas adjuntar.</li>
                  <li><strong>Preguntas en los avisos:</strong> el texto de las preguntas y respuestas que dejás en una publicación, que se muestran públicamente junto a tu nombre.</li>
                  <li><strong>Reportes y sugerencias:</strong> los motivos y detalles que escribís al reportar una publicación, y lo que nos mandás desde el formulario de sugerencias (con tu nombre y correo, si decidís dejarlos).</li>
                  <li><strong>Pagos y facturación:</strong> el estado de tus pagos e identificadores de las operaciones que nos informa Mercado Pago, y los datos de facturación que cargás (nombre o razón social, DNI o CUIT, condición frente al IVA, domicilio y correo). <strong>Ventas Aeronáuticas no almacena ni tiene acceso a los datos de tus tarjetas o cuentas bancarias:</strong> el pago se hace dentro de Mercado Pago.</li>
                  <li><strong>Datos de uso:</strong> páginas y publicaciones vistas, búsquedas, clics en los botones de contacto y el sitio desde el que llegaste (por ejemplo, un buscador o un enlace con parámetros de campaña), asociados a un identificador anónimo (ver la sección 6).</li>
                </ul>
              </div>

              {/* SECCIÓN 2 */}
              <div id="finalidad" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  2. Finalidad del tratamiento de los datos
                </h2>
                <p>Usamos la información únicamente para:</p>
                <ul className="list-disc pl-5 space-y-2 text-[#001F58]/90">
                  <li>Crear y administrar tu cuenta, verificar tu correo y permitirte recuperar el acceso.</li>
                  <li>Mostrar tus publicaciones y permitir que los interesados te contacten por WhatsApp, teléfono o correo.</li>
                  <li>Cobrar los planes, emitir las facturas, gestionar cancelaciones, cambios de plan y devoluciones (incluido el derecho de arrepentimiento).</li>
                  <li>Enviarte correos operativos: verificación de cuenta, cambio de contraseña, estado de pagos y avisos sobre tu suscripción.</li>
                  <li>Mantener la seguridad del sitio: revisar reportes, evitar abusos y limitar pedidos repetidos.</li>
                  <li>Medir el uso del sitio de forma agregada para mejorarlo (qué se busca, qué se ve, de dónde llegan las visitas).</li>
                </ul>
              </div>

              {/* SECCIÓN 3 */}
              <div id="publicidad" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  3. Qué se publica y qué no
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-[#001F58]/90">
                  <li><strong>Público:</strong> el contenido de tus avisos (título, datos técnicos, precio, fotos, la matrícula si la cargás, ciudad y provincia, y una zona aproximada en un mapa, nunca la dirección exacta), tu nombre de vendedor, tu tipo de cuenta y los medios de contacto que figuran en tu aviso (teléfono, WhatsApp y correo), y las preguntas y respuestas.</li>
                  <li><strong>Privado:</strong> los documentos que adjuntes a una publicación (por ejemplo, certificados o historiales de mantenimiento) solo los ven vos y el equipo de Ventas Aeronáuticas. También son privados tus datos de facturación y tus pagos.</li>
                  <li><strong>Responsabilidad del vendedor:</strong> es responsabilidad del vendedor no incluir en fotos, descripciones o documentos datos personales de terceros sin su consentimiento.</li>
                </ul>
              </div>

              {/* SECCIÓN 4 */}
              <div id="exencion" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  4. Exención de responsabilidad por transacciones entre particulares
                </h2>
                <p>
                  Ventas Aeronáuticas funciona exclusivamente como un espacio de publicación de avisos. La plataforma <strong>no interviene, no intermedia ni procesa el pago de las aeronaves ni de los repuestos</strong>. El intercambio económico, la verificación del bien y la transferencia de dominio se realizan de manera externa y directa entre comprador y vendedor. Solo cobramos por publicar.
                </p>
              </div>

              {/* SECCIÓN 5 */}
              <div id="terceros" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  5. Proveedores y compartición de datos
                </h2>
                <p>Tus datos personales no se venden, alquilan ni ceden. Solo se comparten con los proveedores que necesitamos para prestar el servicio, y únicamente lo indispensable para cada función:</p>
                <ul className="list-disc pl-5 space-y-2 text-[#001F58]/90">
                  <li><strong>Mercado Pago:</strong> procesamiento de pagos, suscripciones y devoluciones.</li>
                  <li><strong>Google:</strong> inicio de sesión con tu cuenta de Google, si elegís esa opción.</li>
                  <li><strong>Supabase:</strong> base de datos y almacenamiento de fotos y documentos.</li>
                  <li><strong>Vercel:</strong> alojamiento del sitio y medición anónima de su rendimiento.</li>
                  <li><strong>Resend:</strong> envío de los correos del sitio (verificación, contraseña, pagos).</li>
                  <li><strong>TusFacturas:</strong> emisión de las facturas electrónicas ante ARCA.</li>
                  <li><strong>OpenFreeMap:</strong> el mapa de zona del detalle de un aviso descarga las teselas (imágenes del mapa) de sus servidores, que reciben la dirección IP del navegador como cualquier sitio. No usa cookies y no recibe datos tuyos ni del aviso: el mapa muestra solo una zona aproximada.</li>
                </ul>
                <p>Algunos de estos proveedores pueden almacenar datos fuera de la Argentina; en todos los casos se usan solo para prestar el servicio. También podemos compartir datos cuando lo exija una autoridad competente.</p>
              </div>

              {/* SECCIÓN 6 */}
              <div id="cookies" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  6. Cookies y medición
                </h2>
                <p>Usamos cookies y el almacenamiento del navegador para que el sitio funcione y, solo si lo aceptás, para medir su uso. No usamos cookies de publicidad ni de seguimiento de terceros.</p>
                <p>La primera vez que entrás, un cartel te pregunta: con <strong>&quot;Aceptar&quot;</strong> se usan también las de medición; con <strong>&quot;Solo necesarias&quot;</strong>, no se crean. Las visitas se siguen contando igual, sin identificarte. Podés cambiar la elección cuando quieras desde el link <strong>&quot;Cookies&quot;</strong> del pie de la página; se recuerda por un año.</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm text-[#001F58]/90">
                    <thead className="border-b border-[#001F58]/15 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <tr>
                        <th className="py-2 pr-3">Qué</th>
                        <th className="py-2 pr-3">Tipo</th>
                        <th className="py-2 pr-3">Para qué</th>
                        <th className="py-2">Duración</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#001F58]/10">
                      <tr>
                        <td className="py-2 pr-3 align-top font-mono text-xs">authjs.session-token (y sus variantes __Secure-/__Host-), authjs.csrf-token, authjs.callback-url</td>
                        <td className="py-2 pr-3 align-top">Necesaria</td>
                        <td className="py-2 pr-3 align-top">Mantener tu sesión iniciada de forma segura y protegerla</td>
                        <td className="py-2 align-top">Mientras dure la sesión (hasta 30 días)</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-3 align-top font-mono text-xs">va_consent</td>
                        <td className="py-2 pr-3 align-top">Necesaria</td>
                        <td className="py-2 pr-3 align-top">Recordar si aceptaste las cookies de medición o elegiste solo las necesarias</td>
                        <td className="py-2 align-top">1 año</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-3 align-top font-mono text-xs">Comparador (almacenamiento local)</td>
                        <td className="py-2 pr-3 align-top">Necesaria</td>
                        <td className="py-2 pr-3 align-top">Las aeronaves que elegiste para comparar; queda solo en tu dispositivo</td>
                        <td className="py-2 align-top">Hasta que la quites</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-3 align-top font-mono text-xs">Cartel de la Home (almacenamiento local)</td>
                        <td className="py-2 pr-3 align-top">Necesaria</td>
                        <td className="py-2 pr-3 align-top">Si ya cerraste o viste el cartel de bienvenida, para no mostrártelo de más</td>
                        <td className="py-2 align-top">Hasta que borres los datos del navegador</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-3 align-top font-mono text-xs">Marcas de visita (almacenamiento de la pestaña)</td>
                        <td className="py-2 pr-3 align-top">Necesaria</td>
                        <td className="py-2 pr-3 align-top">Contar una sola vez la visita a un aviso o a un perfil en la misma pestaña. No llevan ningún identificador</td>
                        <td className="py-2 align-top">Se borran al cerrar la pestaña</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-3 align-top font-mono text-xs">va_anon</td>
                        <td className="py-2 pr-3 align-top">Medición (solo si aceptás)</td>
                        <td className="py-2 pr-3 align-top">Identificador anónimo del navegador para contar visitantes únicos, sin saber quién sos si no iniciaste sesión</td>
                        <td className="py-2 align-top">1 año</td>
                      </tr>
                      <tr>
                        <td className="py-2 pr-3 align-top font-mono text-xs">va_src</td>
                        <td className="py-2 pr-3 align-top">Medición (solo si aceptás)</td>
                        <td className="py-2 pr-3 align-top">El sitio o la campaña desde la que llegaste en esta visita</td>
                        <td className="py-2 align-top">Al cerrar el navegador</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {/* VA-171 */}
                <p>Para las métricas de los vendedores registramos la provincia aproximada desde la que se ve un aviso, a partir de la conexión y sin guardar la dirección IP. Se muestra solo sumada (por ejemplo, &quot;30 vistas desde Córdoba&quot;), nunca quién visitó. Estos datos se conservan hasta 13 meses.</p>
                <p>Al iniciar sesión con Google o al pagar con Mercado Pago, esos servicios usan sus propias cookies en sus sitios, según sus políticas. Las métricas de rendimiento de Vercel (Speed Insights) no usan cookies ni identifican al visitante.</p>
                <p>También podés borrar o bloquear las cookies desde la configuración de tu navegador; si bloqueás las necesarias, no vas a poder iniciar sesión.</p>
              </div>

              {/* SECCIÓN 7 */}
              <div id="derechos" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  7. Derechos del titular de los datos
                </h2>
                <p>
                  Podés acceder a tus datos, actualizarlos, rectificarlos o pedir que los eliminemos (Ley N° 25.326). Buena parte se edita directamente desde tu perfil. Para el resto, o para eliminar tu cuenta, escribinos a{" "}
                  <a href="mailto:aeronauticasventas@gmail.com" className="font-semibold text-[#001F58] underline hover:text-[#001F58]/80 transition-colors">aeronauticasventas@gmail.com</a> desde el correo de tu cuenta o adjuntando una prueba que acredite tu identidad. Los datos de pagos y facturas se conservan el tiempo que exige la normativa fiscal.
                </p>
              </div>

              {/* Marco Legal Oficial Destacado */}
              <div className="bg-[#001F58]/5 border-l-4 border-[#001F58] p-5 mt-4 rounded-r-xl italic text-xs text-[#001F58]/90 space-y-3">
                <p>
                  “El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326.”
                </p>
                <p className="mb-0">
                  “La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales.”
                </p>
              </div>

            </div>
          </section>

        </div>
      </div>
    </main>
  );
}

