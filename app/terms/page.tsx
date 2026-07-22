import Image from "next/image";

const termsSections = [
  { id: "naturaleza", title: "1. Naturaleza del Servicio" },
  { id: "registro", title: "2. Registro y Obligaciones" },
  { id: "planes", title: "3. Planes y Pagos" },
  { id: "responsabilidad", title: "4. Contenido y Documentos" },
  { id: "exencion", title: "5. Exención de Responsabilidad" },
  { id: "denuncias", title: "6. Sistema de Denuncias" },
  { id: "ley", title: "7. Ley Aplicable" },
  { id: "contacto", title: "8. Contacto" },
];

export default function TerminosPage() {
  return (
    <main className="relative isolate overflow-hidden min-h-screen -mb-16">
      {/* Fondo optimizado con la imagen solicitada */}
      <Image
        src="/bkg-terms.jpg"
        alt=""
        fill
        priority
        className="-z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-background/85" />

      <div className="container mx-auto px-4 pt-20 pb-36 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 items-start">
          
          {/* MENÚ LATERAL: Índices de Términos y Condiciones */}
          <aside className="md:col-span-1 flex flex-col gap-2 border-l border-[#001F58]/20 pl-4 md:sticky md:top-24">
            <p className="text-xs font-semibold text-[#001F58]/50 uppercase tracking-wider mb-2">
              Índice
            </p>
            {termsSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-sm py-1.5 font-medium text-[#001F58]/70 hover:text-[#001F58] transition-colors scroll-smooth"
              >
                {section.title}
              </a>
            ))}
          </aside>

          {/* CUERPO PRINCIPAL */}
          <section className="md:col-span-3">
            <h1 className="font-heading text-3xl sm:text-4xl font-semibold text-[#001F58] mb-2">
              TÉRMINOS Y CONDICIONES DE USO
            </h1>
            <p className="text-sm text-[#001F58]/60 mb-12 border-b border-[#001F58]/20 pb-4">
              <strong>Última actualización:</strong> Julio 2026.
            </p>

            <div className="flex flex-col gap-10 font-sans text-sm text-[#001F58]/80 leading-relaxed max-w-3xl">
              
              <p>
                Bienvenido a <strong>Ventas Aeronáuticas</strong>. Al acceder, registrarse o utilizar nuestro sitio web, usted acepta cumplir y estar sujeto a los siguientes Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, no deberá utilizar nuestros servicios.
              </p>

              {/* SECCIÓN 1 */}
              <div id="naturaleza" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  1. Naturaleza del Servicio
                </h2>
                <p>Ventas Aeronáuticas es una plataforma web dedicada exclusivamente a la difusión publicitaria y catalogación de anuncios de aeronaves dentro de la República Argentina. El sitio funciona como un punto de encuentro (marketplace) entre vendedores y compradores interesados.</p>
                <ul className="list-disc pl-5 space-y-2 text-[#001F58]/90">
                  <li><strong>Inexistencia de Intermediación:</strong> Ventas Aeronáuticas no es una agencia aeronáutica, no actúa como bróker, no es martillero ni ejerce como intermediario en las operaciones comerciales.</li>
                  <li><strong>Pagos Fuera de la Plataforma:</strong> Las transacciones, negociaciones, señas, pagos y transferencias de dominio de las aeronaves se realizan de manera 100% externa y directa entre las partes, sin ninguna intervención ni trazabilidad por parte de la plataforma.</li>
                </ul>
              </div>

              {/* SECCIÓN 2 */}
              <div id="registro" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  2. Registro de Usuarios y Obligaciones
                </h2>
                <p>Para publicar avisos o interactuar con funciones avanzadas, el usuario debe registrarse aportando datos reales y vigentes.</p>
                <ul className="list-disc pl-5 space-y-2 text-[#001F58]/90">
                  <li>El usuario es el único responsable de mantener la confidencialidad de sus credenciales de acceso.</li>
                  <li>Queda prohibido el registro de menores de 18 años o de personas que no posean capacidad legal para contratar.</li>
                  <li>Ventas Aeronáuticas se reserva el derecho de suspender o dar de baja cualquier cuenta que infrinja estos términos o actúe de forma sospechosa, sin necesidad de notificación previa.</li>
                </ul>
              </div>

              {/* SECCIÓN 3 */}
              <div id="planes" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  3. Planes de Publicación y Condiciones de Pago
                </h2>
                <p>El servicio de exposición de anuncios requiere la contratación de planes de pago, los cuales se rigen bajo las siguientes reglas:</p>
                <ul className="list-disc pl-5 space-y-2 text-[#001F58]/90">
                  <li><strong>Procesamiento de Pagos:</strong> Todos los cargos se facturan en Pesos Argentinos y se procesan de forma externa a través de la pasarela segura de Mercado Pago. El anuncio cambiará al estado "Activo" únicamente cuando el pago sea aprobado por dicha entidad financiera.</li>
                  <li><strong>Vencimiento y Renovación:</strong> Las publicaciones tienen un período de vigencia determinado por el plan contratado. Al expirar el plazo, el anuncio se ocultará automáticamente a menos que el usuario realice la renovación correspondiente.</li>
                  <li><strong>Política de Reembolsos:</strong> Debido a que el servicio publicitario se ejecuta de manera inmediata una vez aprobado el pago, no se realizarán reembolsos ni devoluciones de dinero si el usuario decide dar de baja el anuncio antes de su vencimiento o si la aeronave se vende antes del tiempo estipulado.</li>
                </ul>
              </div>

              {/* SECCIÓN 4 */}
              <div id="responsabilidad" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  4. Responsabilidad por el Contenido de los Anuncios y Documentación
                </h2>
                <p>Cada vendedor es el único y exclusivo responsable legal de la veracidad de los datos introducidos en su publicación.</p>
                <ul className="list-disc pl-5 space-y-2 text-[#001F58]/90">
                  <li><strong>Veracidad de la Información:</strong> El vendedor garantiza que los detalles técnicos, horas de motor, año, marca, modelo y precio de la aeronave reflejan fielmente el estado real del bien.</li>
                  <li><strong>Documentos de la Aeronave:</strong> La plataforma otorga la opción de subir documentos legales de la aeronave para dar transparencia al anuncio. El vendedor asume toda la responsabilidad civil y penal derivada de la exhibición pública de estos documentos. Queda estrictamente prohibido subir documentación falsa, adulterada o que viole normativas de la Administración Nacional de Aviación Civil (ANAC).</li>
                  <li><strong>Ausencia de Auditoría Técnica:</strong> Ventas Aeronáuticas no realiza inspecciones físicas, peritajes técnicos ni auditorías de dominio sobre las aeronaves publicadas. La inclusión de un anuncio no constituye un aval, garantía ni recomendación de compra por parte de la plataforma.</li>
                </ul>
              </div>

              {/* SECCIÓN 5 */}
              <div id="exencion" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  5. Exención General de Responsabilidad
                </h2>
                <p>En el grado máximo permitido por las leyes de la República Argentina, Ventas Aeronáuticas queda exenta de toda responsabilidad por:</p>
                <ul className="list-disc pl-5 space-y-2 text-[#001F58]/90">
                  <li>Cualquier daño, fraude, estafa, vicio redhibitorio (defectos ocultos) o disconformidad contractual surgida de la compraventa o alquiler de las aeronaves anunciadas en el sitio.</li>
                  <li>Pérdidas económicas resultantes de negociaciones fallidas, señas no devueltas o problemas en los trámites de transferencia ante el Registro Nacional de Aeronaves.</li>
                  <li>Interrupciones temporales del servicio web debidas a fallas técnicas, mantenimiento o problemas de conectividad ajenos a la plataforma.</li>
                </ul>
              </div>

              {/* SECCIÓN 6 */}
              <div id="denuncias" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  6. Sistema de Denuncias y Moderación
                </h2>
                <p>Los usuarios pueden reportar anuncios que consideren falsos, engañosos, duplicados o violatorios de derechos de propiedad. Ventas Aeronáuticas analizará los reportes y podrá remover el contenido de forma preventiva. El ejercicio de esta facultad de moderación no genera derecho a indemnización ni reclamo alguno a favor del anunciante removido.</p>
              </div>

              {/* SECCIÓN 7 */}
              <div id="ley" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  7. Ley Aplicable y Jurisdicción
                </h2>
                <p>
                  Para cualquier consulta respecto a estos términos, puede comunicarse con nosotros enviando un correo electrónico a <a href="mailto:aeronauticasventas@gmail.com" className="font-semibold text-[#001F58] underline hover:text-[#001F58]/80 transition-colors">aeronauticasventas@gmail.com</a>.
                </p>
              </div>

            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
