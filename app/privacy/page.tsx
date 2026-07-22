import Image from "next/image";

const policySections = [
  { id: "recoleccion", title: "1. Datos que recolectamos" },
  { id: "finalidad", title: "2. Finalidad del tratamiento" },
  { id: "publicidad", title: "3. Publicidad de Documentos" },
  { id: "exencion", title: "4. Exención de responsabilidad" },
  { id: "terceros", title: "5. Compartición de datos" },
  { id: "derechos", title: "6. Derechos del titular" },
];

export default function PrivacidadPage() {
  return (
    <main className="relative isolate overflow-hidden min-h-screen -mb-16">
      {/* Fondo optimizado con la imagen solicitada */}
      <Image
        src="/bkg-privacidad.jpg"
        alt=""
        fill
        priority
        className="-z-20 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-background/85" />

      <div className="container mx-auto px-4 pt-20 pb-36 max-w-6xl">
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
              <strong>Última actualización:</strong> Julio 2026.
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
                <p>Dependiendo de cómo interactúes en nuestra plataforma, recolectamos la siguiente información:</p>
                <ul className="list-disc pl-5 space-y-2 text-[#001F58]/90">
                  <li><strong>Datos de cuenta del Vendedor:</strong> Nombre completo, dirección de correo electrónico, contraseña encriptada, número de teléfono, tipo de vendedor (particular o mayorista), fotografía de perfil y datos básicos de autenticación si decides iniciar sesión a través de redes sociales o cuentas de terceros.</li>
                  <li><strong>Datos de las Publicaciones y Documentación:</strong> Detalles técnicos de las aeronaves, precio, ubicación, fotografías y los documentos legales de la aeronave que decidas adjuntar de forma voluntaria.</li>
                  <li><strong>Datos de Alertas y Preferencias:</strong> Categorías y filtros de aeronaves seleccionados explícitamente por el usuario para recibir notificaciones automáticas de nuevos anuncios.</li>
                  <li><strong>Datos de Interesados (Compradores):</strong> Cuando utilizas el formulario de contacto para consultar por una aeronave, recolectamos tu nombre, correo electrónico, teléfono y el mensaje redactado.</li>
                  <li><strong>Datos de Reportes y Denuncias:</strong> Correo electrónico, motivos y detalles provistos al informar sobre una publicación potencialmente fraudulenta o errónea.</li>
                  <li><strong>Datos de Transacciones de Pago:</strong> Información del estado de tu pago e identificadores de transacciones provistos por la pasarela de pagos. <strong>Aclaración importante:</strong> Ventas Aeronáuticas no almacena, procesa ni tiene acceso a tus datos de tarjetas de crédito o cuentas bancarias; la operación financiera se realiza de forma exclusiva y segura dentro de Mercado Pago.</li>
                </ul>
              </div>

              {/* SECCIÓN 2 */}
              <div id="finalidad" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  2. Finalidad del tratamiento de los datos
                </h2>
                <p>Utilizamos la información recolectada únicamente para los siguientes fines:</p>
                <ul className="list-disc pl-5 space-y-2 text-[#001F58]/90">
                  <li>Gestionar la creación de tu cuenta, validar tu identidad como usuario y procesar los cobros de los planes de publicación.</li>
                  <li>Mostrar públicamente los anuncios de las aeronaves, incluyendo sus imágenes y documentación legal adjunta.</li>
                  <li><strong>Sistema de Alertas Personalizadas:</strong> Enviar correos electrónicos automáticos con avisos de nuevas publicaciones que coincidan con las categorías seleccionadas por el usuario. El usuario puede dar de baja este servicio en cualquier momento desde el propio correo o su perfil.</li>
                  <li><strong>Conectar a las partes:</strong> Facilitar que los compradores contacten de manera directa a los vendedores mediante el envío de los formularios de consulta.</li>
                  <li>Garantizar la seguridad y transparencia del marketplace mediante el análisis de reportes y denuncias sobre publicaciones.</li>
                </ul>
              </div>

              {/* SECCIÓN 3 */}
              <div id="publicidad" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  3. Publicidad de Documentos Legales de las Aeronaves
                </h2>
                <p>La plataforma permite a los vendedores subir, de forma completamente opcional, documentos legales de las aeronaves con el fin de otorgar mayor transparencia y confianza a la publicación.</p>
                <ul className="list-disc pl-5 space-y-2 text-[#001F58]/90">
                  <li><strong>Acceso Público:</strong> Al subir estos documentos, el vendedor acepta y consiente expresamente que <strong>serán visibles, consultables y descargables por cualquier usuario o visitante</strong> que acceda a dicha publicación.</li>
                  <li><strong>Responsabilidad del Vendedor:</strong> Es responsabilidad exclusiva del vendedor asegurarse de que la difusión de dichos documentos no vulnere derechos de propiedad, confidencialidad o datos personales de terceros (como propietarios anteriores, pilotos o firmas civiles que no correspondan al vendedor actual) sin el debido consentimiento. Ventas Aeronáuticas no pre-modera, edita ni filtra el contenido de estos documentos adjuntos.</li>
                </ul>
              </div>

              {/* SECCIÓN 4 */}
              <div id="exencion" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  4. Exención de responsabilidad por transacciones entre particulares
                </h2>
                <p>
                  Ventas Aeronáuticas funciona exclusivamente como un espacio publicitario (marketplace) para la exposición de aeronaves. La plataforma <strong>no interviene, no intermedia, ni procesa el pago de los aviones</strong>. El intercambio económico, la verificación física del bien y la transferencia de dominio se realizan de manera externa, privada y directa entre el comprador y el vendedor. Ventas Aeronáuticas no almacena ni solicita datos comerciales ni financieros relacionados con la compraventa final de las aeronaves.
                </p>
              </div>

              {/* SECCIÓN 5 */}
              <div id="terceros" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  5. Compartición de datos con terceros
                </h2>
                <p>Tus datos personales no serán vendidos, alquilados ni cedidos a terceras empresas bajo ningún concepto, salvo por las siguientes necesidades operativas del servicio:</p>
                <ul className="list-disc pl-5 space-y-2 text-[#001F58]/90">
                  <li><strong>Entre usuarios del sitio:</strong> Los datos de contacto provistos por un interesado en el formulario de consulta se transmiten directamente al vendedor de la aeronave para posibilitar la comunicación mutua.</li>
                  <li><strong>Proveedores de infraestructura técnica:</strong> Empresas proveedoras de alojamiento web, bases de datos y la pasarela de pagos integrada (Mercado Pago), indispensables para el correcto funcionamiento del sitio.</li>
                </ul>
              </div>

              {/* SECCIÓN 6 */}
              <div id="derechos" className="flex flex-col gap-3 scroll-mt-24">
                <h2 className="font-heading text-xl font-semibold text-[#001F58]">
                  6. Derechos del titular de los datos
                </h2>
                <p>
                    <a href="mailto:aeronauticasventas@gmail.com" className="font-semibold text-[#001F58] underline hover:text-[#001F58]/80 transition-colors">aeronauticasventas@gmail.com</a> adjuntando una prueba que acredite tu identidad.
                </p>
              </div>

              {/* Marco Legal Oficial Destacado */}
              <div className="bg-[#001F58]/5 border-l-4 border-[#001F58] p-5 mt-4 rounded-r-xl italic text-xs text-[#001F58]/90 space-y-3">
                <p>
                  "El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley Nº 25.326."
                </p>
                <p className="mb-0">
                  "La AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que se interpongan con relación al incumplimiento de las normas sobre protección de datos personales."
                </p>
              </div>

            </div>
          </section>

        </div>
      </div>
    </main>
  );
}

