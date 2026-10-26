// lib/terms-content.tsx
// VA-189: reescritos según cómo funciona la web en octubre de 2026. Borrador para los socios: conviene que
// lo revise un abogado antes del lanzamiento.
import React from "react";

export const termsSections = [
  { id: "naturaleza", title: "1. Qué es Ventas Aeronáuticas" },
  { id: "registro", title: "2. Tu cuenta" },
  { id: "publicar", title: "3. Publicar avisos" },
  { id: "planes", title: "4. Planes y beneficios" },
  { id: "pagos", title: "5. Suscripciones y pagos" },
  { id: "arrepentimiento", title: "6. Botón de arrepentimiento" },
  { id: "fundadores", title: "7. Miembros fundadores" },
  { id: "responsabilidad", title: "8. Contenido de los avisos" },
  { id: "denuncias", title: "9. Reportes y moderación" },
  { id: "exencion", title: "10. Límites de responsabilidad" },
  { id: "marca", title: "11. Propiedad intelectual" },
  { id: "privacidad", title: "12. Privacidad, cookies y servicios de terceros" },
  { id: "ley", title: "13. Cambios, ley aplicable y contacto" },
];

const H = "font-heading font-semibold text-[#001F58] text-base";
const LIST = "list-disc pl-5 space-y-1.5";
const LINK = "font-semibold underline underline-offset-2";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div id={id} className="flex flex-col gap-2 scroll-mt-24">
      <h3 className={H}>{title}</h3>
      {children}
    </div>
  );
}

export function TermsContent() {
  return (
    <div className="flex flex-col gap-6 text-[#001F58]/80 leading-relaxed">
      <p>
        Estos términos rigen el uso de <strong>Ventas Aeronáuticas</strong> (el sitio, sus planes y sus servicios). Al registrarte o usar el sitio, los aceptás. Si no estás de acuerdo con alguna parte, no uses el sitio.
      </p>

      <Section id="naturaleza" title="1. Qué es Ventas Aeronáuticas">
        <p>
          Ventas Aeronáuticas es un sitio de avisos de aeronaves y repuestos aeronáuticos en la República Argentina. Pone en contacto a quien vende con quien compra; no compra, no vende y no participa de las operaciones.
        </p>
        <ul className={LIST}>
          <li>Ventas Aeronáuticas es un nombre comercial operado en la República Argentina.</li>
          <li>No somos agencia aeronáutica, bróker, martillero ni intermediario: no cobramos comisión por las ventas.</li>
          <li>Las negociaciones, señas, pagos y transferencias de dominio se hacen directamente entre comprador y vendedor, fuera del sitio. Lo único que cobramos son los planes para publicar.</li>
        </ul>
      </Section>

      <Section id="registro" title="2. Tu cuenta">
        <ul className={LIST}>
          <li>Para publicar, preguntar en un aviso o guardar favoritos tenés que registrarte con datos reales y mantenerlos al día. Para publicar, además, tenés que cargar un teléfono de contacto.</li>
          <li>Tenés que ser mayor de 18 años y tener capacidad legal para contratar.</li>
          <li>Indicás si publicás como particular o como empresa, taller o broker. Lo podés cambiar desde Ajustes.</li>
          <li>Sos responsable de cuidar tu contraseña y de lo que se haga con tu cuenta.</li>
          <li>Podemos suspender o dar de baja una cuenta que no cumpla estos términos.</li>
        </ul>
      </Section>

      <Section id="publicar" title="3. Publicar avisos">
        <ul className={LIST}>
          <li>
            <strong>Cupo:</strong> cada plan permite una cantidad de avisos activos al mismo tiempo, por tipo (aeronaves y repuestos). Los avisos no vencen: siguen activos hasta que los pauses, los marques como vendidos o los borres. Los pausados y los vendidos no ocupan cupo.
          </li>
          <li>
            <strong>Documentos:</strong> la documentación que adjuntes a un aviso (certificados, historiales de mantenimiento, etc.) la puede ver y descargar cualquier visitante. No subas nada que no quieras hacer público.
          </li>
          <li>
            <strong>Ubicación:</strong> el aviso muestra la ciudad y la provincia, y un mapa con una zona aproximada. Nunca se muestra una dirección exacta.
          </li>
          <li>
            <strong>Video:</strong> en los planes que lo incluyen, podés agregar un video de YouTube al aviso.
          </li>
          <li>
            <strong>Marcas y modelos nuevos:</strong> si la marca o el modelo de tu aeronave no están en la lista, podés escribirlos. Se guardan en mayúsculas y se suman a la lista para los próximos avisos; podemos corregir el nombre, unirlos a uno que ya exista u ocultarlos.
          </li>
          <li>
            <strong>Ventas:</strong> al marcar un aviso como vendido te preguntamos, de forma opcional, si lo vendiste gracias a un contacto del sitio y por cuánto. Esa respuesta no se publica: la usamos sumada con otras para nuestras estadísticas.
          </li>
        </ul>
      </Section>

      <Section id="planes" title="4. Planes y beneficios">
        <p>
          Hay tres planes: <strong>Base</strong> (gratis, para todas las cuentas), <strong>Pro</strong> y <strong>Broker / Empresa</strong>, que puede incluir aeronaves ilimitadas, repuestos ilimitados o las dos cosas; lo que no es ilimitado tiene el cupo de Base. Los cupos, precios y beneficios de cada plan son los que figuran en{" "}
          <a href="/plans" className={LINK}>Planes y precios</a> al momento de contratar.
        </p>
        <ul className={LIST}>
          <li>
            <strong>Republicar:</strong> vuelve a poner un aviso primero en &quot;Últimas publicaciones&quot;, sin cambiar su contenido. En Base y Pro tenés una cantidad por año, que se cuenta desde el alta de tu cuenta o de tu suscripción y no se acumula de un año al otro; el mismo aviso se puede republicar una vez cada 7 días. En Broker / Empresa republicás todos tus avisos juntos, una vez cada 30 días.
          </li>
          <li>
            <strong>Destacados:</strong> en los planes que lo incluyen, tus avisos aparecen primero en el orden por defecto de los listados y entre los destacados de la página de inicio. Ordenar por precio, año u otro criterio no los adelanta.
          </li>
          <li>
            <strong>Página personalizada:</strong> según el plan, tu perfil muestra tu portada, logo, nombre comercial y WhatsApp (básica) o, además, secciones que armás vos y un detalle de avisos con tu marca (completa). Lo que cargás ahí es público.
          </li>
          <li>
            <strong>Métricas y verificado:</strong> cada plan incluye el nivel de métricas y, cuando corresponde, la insignia de usuario verificado que indica la grilla de planes. La insignia acompaña al plan; no certifica la identidad ni los avisos.
          </li>
          <li>Si el plan termina, los beneficios se dejan de mostrar en el momento. Tu página personalizada queda guardada por si volvés a suscribirte.</li>
        </ul>
      </Section>

      <Section id="pagos" title="5. Suscripciones y pagos">
        <ul className={LIST}>
          <li>Pro y Broker / Empresa son suscripciones mensuales en pesos argentinos, con débito automático a través de Mercado Pago. Por cada cobro emitimos factura.</li>
          <li>Si un cobro es rechazado, mantenés el plan durante un período de gracia que te informamos por correo, mientras Mercado Pago vuelve a intentar. Si no se cobra, el plan termina.</li>
          <li>Podés cancelar cuando quieras desde Ajustes o desde Planes y precios: no se hacen más débitos y el plan sigue hasta el fin del período pagado. Mientras ese período siga vigente, podés volver atrás con &quot;Seguir suscripto&quot;.</li>
          <li>Los cambios de plan son inmediatos y sin prorrateo.</li>
          <li>
            Si el plan termina o pasás a uno con menos cupo y tenés más avisos activos que el cupo nuevo, se pausan los más recientes. Después podés pausar otro y activar el que prefieras. No se borra nada.
          </li>
          <li>Fuera del botón de arrepentimiento no se devuelven períodos ya usados, salvo un error de cobro nuestro.</li>
        </ul>
      </Section>

      <Section id="arrepentimiento" title="6. Botón de arrepentimiento">
        <p>
          Según el artículo 34 de la Ley 24.240 de Defensa del Consumidor y la Resolución 424/2020, podés arrepentirte de una suscripción dentro de los 10 días corridos desde el pago, sin costo ni explicaciones, con el &quot;Botón de arrepentimiento&quot; del pie de todas las páginas o desde Ajustes, en &quot;Mis compras&quot;. Aplica al primer cobro de cada suscripción.
        </p>
        <ul className={LIST}>
          <li>Te devolvemos el total por Mercado Pago (el reintegro puede tardar unos días según el medio de pago) y la suscripción termina en el momento.</li>
          <li>Se quita lo que obtuviste con ese plan, aunque ya lo hayas usado: la cuenta vuelve a Base, con sus republicaciones y sin destacados, página personalizada, detalle propio, métricas del plan ni verificado.</li>
          <li>Si tenés más avisos activos que el cupo de Base, elegís cuáles quedan activos; si no elegís, se pausan los más recientes.</li>
          <li>Si el reembolso se hace por otra vía (por ejemplo, desde Mercado Pago o por un contracargo), el resultado es el mismo.</li>
        </ul>
      </Section>

      <Section id="fundadores" title="7. Miembros fundadores">
        <ul className={LIST}>
          <li>
            Las primeras cuentas que publiquen su primer aviso, hasta el número que fijemos (al lanzamiento, 15), son miembros fundadores. No incluye cuentas del equipo de Ventas Aeronáuticas.
          </li>
          <li>
            Como agradecimiento, reciben 6 meses bonificados de Broker / Empresa con aeronaves y repuestos ilimitados, desde esa primera publicación. No se cobra nada, no se renueva sola y al terminar la cuenta vuelve a Base, con las mismas reglas de la sección 5 si tiene más avisos que el cupo.
          </li>
          <li>El beneficio es personal y no se puede transferir ni canjear por dinero. No se otorga a una cuenta que ya tenga una suscripción vigente.</li>
        </ul>
      </Section>

      <Section id="responsabilidad" title="8. Contenido de los avisos">
        <p>Cada vendedor es el único responsable de lo que publica.</p>
        <ul className={LIST}>
          <li>Los datos técnicos, fotos y documentos tienen que reflejar el estado real del bien.</li>
          <li>Está prohibido subir documentación falsa o adulterada, o que viole normas de la ANAC.</li>
          <li>No incluyas datos personales de otras personas sin su consentimiento.</li>
          <li>No hacemos inspecciones físicas ni peritajes técnicos de las aeronaves o repuestos.</li>
        </ul>
      </Section>

      <Section id="denuncias" title="9. Reportes y moderación">
        <p>
          Cualquier usuario puede reportar un aviso. Si lo revisamos y corresponde, lo pausamos con un motivo que le informamos al vendedor por correo y en su cuenta. Mientras esté pausado no se muestra ni ocupa cupo. El vendedor puede corregirlo y pedir una revisión; después lo reactivamos o lo mantenemos pausado, y se lo avisamos.
        </p>
      </Section>

      <Section id="exencion" title="10. Límites de responsabilidad">
        <p>
          En la medida que permite la ley argentina, Ventas Aeronáuticas no responde por daños, fraudes o incumplimientos entre comprador y vendedor, ni por la exactitud de lo que publican los usuarios. Hacé tus propias verificaciones antes de comprar.
        </p>
      </Section>

      <Section id="marca" title="11. Propiedad intelectual">
        <p>
          El nombre, el logo y el diseño de Ventas Aeronáuticas son nuestros. Las marcas y logos de fabricantes que aparecen en el sitio pertenecen a sus titulares y se usan solo para identificar los productos. Al publicar fotos y textos nos autorizás a mostrarlos en el sitio mientras el aviso exista.
        </p>
      </Section>

      <Section id="privacidad" title="12. Privacidad, cookies y servicios de terceros">
        <p>
          El tratamiento de tus datos y el uso de cookies se rigen por la <a href="/privacy" className={LINK}>Política de privacidad</a>, que incluye la{" "}
          <a href="/privacy#cookies" className={LINK}>política de cookies</a>. Podés aceptar o rechazar las cookies de medición y cambiar tu elección desde el link &quot;Cookies&quot; del pie de la página.
        </p>
        <p>
          El mapa de los avisos usa OpenFreeMap y los videos se reproducen con YouTube (se cargan recién cuando tocás &quot;Ver video&quot;). Esos servicios tienen sus propias condiciones.
        </p>
      </Section>

      <Section id="ley" title="13. Cambios, ley aplicable y contacto">
        <ul className={LIST}>
          <li>Podemos actualizar estos términos. La fecha de la última versión figura arriba; los cambios en precios o beneficios no afectan un período ya pagado.</li>
          <li>Se rigen por las leyes de la República Argentina.</li>
          <li>
            Consultas: <a href="mailto:aeronauticasventas@gmail.com" className={LINK}>aeronauticasventas@gmail.com</a>.
          </li>
        </ul>
      </Section>
    </div>
  );
}
