// lib/terms-content.tsx
import React from "react";

export const termsSections = [
  { id: "naturaleza", title: "1. Naturaleza del Servicio" },
  { id: "registro", title: "2. Registro y Obligaciones" },
  { id: "planes", title: "3. Planes y Pagos" },
  { id: "responsabilidad", title: "4. Contenido y Documentos" },
  { id: "exencion", title: "5. Exención de Responsabilidad" },
  { id: "denuncias", title: "6. Sistema de Denuncias" },
  { id: "ley", title: "7. Ley Aplicable" },
  { id: "marca", title: "8. Propiedad Intelectual" },
];

export function TermsContent() {
  return (
    <div className="flex flex-col gap-6 text-[#001F58]/80 leading-relaxed">
      <p>
        Bienvenido a <strong>Ventas Aeronáuticas</strong>. Al acceder, registrarse o utilizar nuestro sitio web, usted acepta cumplir y estar sujeto a los siguientes Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, no deberá utilizar nuestros servicios.
      </p>

      <div id="naturaleza" className="flex flex-col gap-2 scroll-mt-24">
        <h3 className="font-heading font-semibold text-[#001F58] text-base">
          1. Naturaleza del Servicio
        </h3>
        <p>Ventas Aeronáuticas es una plataforma web dedicada exclusivamente a la difusión publicitaria y catalogación de anuncios de aeronaves dentro de la República Argentina. El sitio funciona como un punto de encuentro (marketplace) entre vendedores y compradores interesados.</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Identificación del Responsable:</strong> Ventas Aeronáuticas es un nombre comercial operado en la República Argentina.</li>
          <li><strong>Inexistencia de Intermediación:</strong> Ventas Aeronáuticas no es una agencia aeronáutica, no actúa como bróker, no es martillero ni ejerce como intermediario en las operaciones comerciales.</li>
          <li><strong>Pagos Fuera de la Plataforma:</strong> Las transacciones, negociaciones, señas, pagos y transferencias de dominio de las aeronaves se realizan de manera 100% externa y directa entre las partes.</li>
        </ul>
      </div>

      <div id="registro" className="flex flex-col gap-2 scroll-mt-24">
        <h3 className="font-heading font-semibold text-[#001F58] text-base">
          2. Registro de Usuarios y Obligaciones
        </h3>
        <p>Para publicar avisos o interactuar con funciones avanzadas, el usuario debe registrarse aportando datos reales y vigentes.</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>El usuario es el único responsable de mantener la confidencialidad de sus credenciales de acceso.</li>
          <li>Queda prohibido el registro de menores de 18 años o de personas que no posean capacidad legal para contratar.</li>
          <li>Ventas Aeronáuticas se reserva el derecho de suspender o dar de baja cualquier cuenta que infrinja estos términos.</li>
        </ul>
      </div>

      <div id="planes" className="flex flex-col gap-2 scroll-mt-24">
        <h3 className="font-heading font-semibold text-[#001F58] text-base">
          3. Planes de Publicación y Condiciones de Pago
        </h3>
        <p>El servicio de exposición de anuncios requiere la contratación de planes de pago, los cuales se rigen bajo las siguientes reglas:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Procesamiento de Pagos:</strong> Todos los cargos se facturan en Pesos Argentinos a través de pasarelas de pago seguras.</li>
          <li><strong>Vencimiento y Renovación:</strong> Las publicaciones tienen un período de vigencia determinado por el plan contratado.</li>
          <li><strong>Política de Reembolsos:</strong> No se realizarán reembolsos ni devoluciones de dinero una vez aprobado el pago.</li>
        </ul>
      </div>

      <div id="responsabilidad" className="flex flex-col gap-2 scroll-mt-24">
        <h3 className="font-heading font-semibold text-[#001F58] text-base">
          4. Responsabilidad por el Contenido de los Anuncios y Documentación
        </h3>
        <p>Cada vendedor es el único y exclusivo responsable legal de la veracidad de los datos introducidos en su publicación.</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Veracidad de la Información:</strong> El vendedor garantiza que los detalles técnicos reflejan el estado real del bien.</li>
          <li><strong>Documentos de la Aeronave:</strong> Queda prohibido subir documentación falsa, adulterada o violatoria de normas ANAC.</li>
          <li><strong>Ausencia de Auditoría Técnica:</strong> Ventas Aeronáuticas no realiza inspecciones físicas ni peritajes técnicos.</li>
        </ul>
      </div>

      <div id="exencion" className="flex flex-col gap-2 scroll-mt-24">
        <h3 className="font-heading font-semibold text-[#001F58] text-base">
          5. Exención General de Responsabilidad
        </h3>
        <p>En el grado máximo permitido por las leyes de la República Argentina, Ventas Aeronáuticas queda exenta de toda responsabilidad por daños, fraudes o problemas contractuales entre partes.</p>
      </div>

      <div id="denuncias" className="flex flex-col gap-2 scroll-mt-24">
        <h3 className="font-heading font-semibold text-[#001F58] text-base">
          6. Sistema de Denuncias y Moderación
        </h3>
        <p>Los usuarios pueden reportar anuncios sospechosos. Ventas Aeronáuticas podrá remover el contenido preventivamente.</p>
      </div>

      <div id="ley" className="flex flex-col gap-2 scroll-mt-24">
        <h3 className="font-heading font-semibold text-[#001F58] text-base">
          7. Ley Aplicable y Jurisdicción
        </h3>
        <p>Los presentes Términos y Condiciones se rigen por las leyes de la República Argentina.</p>
      </div>

      <div id="marca" className="flex flex-col gap-2 scroll-mt-24">
        <h3 className="font-heading font-semibold text-[#001F58] text-base">
          8. Propiedad Intelectual
        </h3>
        <p>Marcas, logotipos y diseños son propiedad exclusiva o se utilizan con fines descriptivos e identificatorios.</p>
      </div>
    </div>
  );
}