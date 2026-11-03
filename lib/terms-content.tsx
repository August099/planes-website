// lib/terms-content.tsx
// 3/11: ampliados y actualizados según cómo funciona la web y la normativa vigente (Disposiciones 954/2025 y
// 377/2026). Conviene que los revise un abogado. Si cambia una regla del sitio, actualizarla acá.
import { LegalDocument, type LegalSection } from "@/components/ui/legal/LegalDocument";

const CONTACT = "[aeronauticasventas@gmail.com](mailto:aeronauticasventas@gmail.com)";

export const termsSections: LegalSection[] = [
  {
    id: "objeto",
    title: "Quiénes somos y qué regulan estos términos",
    blocks: [
      "**Ventas Aeronáuticas** es un sitio de avisos clasificados de aeronaves y repuestos aeronáuticos que funciona en la República Argentina en [ventasaeronauticas.com](https://ventasaeronauticas.com). En estos términos, “nosotros” se refiere a quienes operan el sitio bajo ese nombre comercial. Los datos fiscales del emisor constan en cada factura.",
      `Podés comunicarte con nosotros por correo a ${CONTACT}, por teléfono o WhatsApp al +54 9 3456 44-5758, y por Instagram en @ventas.aeronauticas. Esos canales sirven también para consultas y reclamos.`,
      "Estos términos regulan el uso de las funciones que requieren una cuenta y la contratación de los planes pagos. También describen las reglas de convivencia que aplican a quien publica, pregunta o contacta a otras personas a través del sitio.",
      "Estos términos se complementan con la [Política de privacidad](/privacy), que explica cómo tratamos tus datos personales y qué cookies usamos, y con la información de cada plan publicada en [Planes y precios](/plans).",
    ],
  },
  {
    id: "definiciones",
    title: "Definiciones",
    blocks: [
      "Para que el texto sea más claro, usamos estas palabras con el siguiente sentido:",
      {
        list: [
          "**Sitio:** la web de Ventas Aeronáuticas, con todas sus páginas y funciones.",
          "**Usuario:** toda persona que tiene una cuenta. **Visitante:** quien navega sin haber iniciado sesión.",
          "**Vendedor:** el usuario que publica un aviso. **Comprador o interesado:** quien consulta un aviso o contacta a un vendedor.",
          "**Aviso:** la publicación de una aeronave o de un repuesto, con sus datos, fotos, documentos y video.",
          "**Cupo:** la cantidad de avisos que una cuenta puede tener activos al mismo tiempo, por tipo.",
          "**Plan:** el conjunto de cupos y beneficios de una cuenta. Hoy son Base, Pro y Broker / Empresa.",
          "**Página personalizada:** el perfil ampliado de una cuenta, con portada y otros contenidos, según su plan.",
          "**Contenido de usuario:** todo lo que un usuario carga en el sitio, como textos, fotos, documentos, preguntas y respuestas.",
        ],
      },
    ],
  },
  {
    id: "aceptacion",
    title: "Aceptación y capacidad",
    blocks: [
      "Aceptás estos términos de forma expresa cuando marcás la casilla correspondiente al crear tu cuenta o al completarla después de entrar con Google o con Facebook. **Navegar por el sitio sin cuenta no implica aceptar un contrato.**",
      "Para crear una cuenta tenés que ser mayor de 18 años y tener capacidad legal para contratar. Si actuás en nombre de una empresa o de otra persona, declarás que tenés facultades para hacerlo.",
      "Si no estás de acuerdo con estos términos, no crees una cuenta. Podés seguir viendo el contenido público del sitio.",
      "Para usar las funciones de la cuenta tenés que haber aceptado los términos y verificado tu correo electrónico.",
    ],
  },
  {
    id: "naturaleza",
    title: "Qué hace y qué no hace Ventas Aeronáuticas",
    blocks: [
      "El sitio es un espacio de publicación que pone en contacto a quien vende con quien busca comprar. Lo que nos pagan los usuarios es la suscripción a un plan, no un porcentaje de sus operaciones.",
      "No somos dueños de los bienes publicados, salvo que un aviso lo indique de forma expresa. Tampoco actuamos como agencia, bróker, martillero, corredor, mandatario, escribano, gestor ni taller aeronáutico.",
      "**No intervenimos en las operaciones entre usuarios.** Las negociaciones, señas, pagos, entregas, inspecciones y transferencias se hacen directamente entre las partes y fuera del sitio. No recibimos ni retenemos dinero de esas operaciones, y no cobramos comisión por ellas.",
      "No inspeccionamos las aeronaves ni los repuestos, no peritamos su estado y no certificamos su documentación, su titularidad o su aeronavegabilidad.",
      "El hecho de que un aviso esté publicado, destacado o en una cuenta con insignia no significa que lo recomendemos ni que hayamos comprobado lo que dice.",
    ],
  },
  {
    id: "cuenta",
    title: "Tu cuenta",
    blocks: [
      "Podés registrarte con tu correo y una contraseña, o entrar con tu cuenta de Google o de Facebook. En todos los casos verificamos tu correo con un enlace.",
      "Tenés que cargar datos reales y mantenerlos actualizados. Podés editarlos en [Ajustes](/settings). Una cuenta es personal, y no podés usar la identidad de otra persona ni crear cuentas para evadir un límite o una sanción.",
      "Elegís si tu cuenta es de un particular o de una empresa, taller o broker, y debés elegir la opción que se corresponda con tu actividad real. Los compradores pueden filtrar los avisos según ese dato. La condición de fábrica la asigna el equipo del sitio.",
      "Sos responsable de cuidar tu contraseña y de lo que se haga desde tu cuenta mientras no nos avises de un uso indebido. Si sospechás que alguien entró sin permiso, cambiá la contraseña y escribinos cuanto antes.",
      `Podés pedir el cierre de tu cuenta en cualquier momento escribiendo a ${CONTACT} desde el correo de la cuenta. Si tenés una suscripción, primero se da de baja. Conservamos los datos de pagos y facturas durante el plazo que exija la normativa, como explica la [Política de privacidad](/privacy#conservacion).`,
    ],
  },
  {
    id: "publicar",
    title: "Cómo se publica un aviso",
    blocks: [
      "Para publicar necesitás una cuenta, con su correo verificado y un teléfono de contacto. Ese teléfono y el correo de la cuenta son los datos que se muestran en tus avisos y en tu perfil.",
      "Cada aviso tiene que corresponder a un bien que existe, que podés vender y que está disponible. Si ya no lo está, tenés que pausarlo, marcarlo como vendido o borrarlo.",
      "Podés publicar hasta 15 fotos por aviso. Los archivos deben respetar los formatos y tamaños que indica el formulario, y las fotos pueden comprimirse automáticamente para que carguen más rápido.",
      "El precio es opcional. Si lo cargás, tiene que ser el precio real y en la moneda que corresponda. Si no lo cargás, el aviso se muestra como “a consultar”. Los precios los fija cada vendedor.",
      "Los avisos de aeronaves piden datos técnicos, como marca, modelo, año, horas y motores. Tenés que completarlos con información veraz y, si no contás con un dato, no inventarlo. Para motores anteriores a la incorporación de un campo nuevo, ese dato puede figurar con un guion.",
      "**Documentos:** la documentación que adjuntes a un aviso, como certificados o historiales de mantenimiento, **la puede ver y descargar cualquier visitante**. No subas nada que no quieras hacer público, y tapá los datos personales o sensibles antes de subirlo.",
      "**Ubicación:** la ciudad y la provincia son opcionales. Si las cargás, el aviso puede mostrar un mapa con una zona aproximada. Nunca publicamos una dirección exacta, salvo que la escribas vos en el texto.",
      "**Video:** podés agregar un enlace de YouTube cuando el formulario lo ofrezca. El video se reproduce desde YouTube, recién cuando el visitante lo pide.",
      "**Marcas y modelos nuevos:** si no están en la lista, podés escribirlos. Pueden sumarse a la lista para otros avisos, y podemos corregirlos, unirlos con uno existente u ocultarlos.",
      "**Publicación asistida:** si nos pedís que armemos el aviso por vos, el contenido sigue siendo tuyo y tenés que revisarlo. Sos responsable de los datos y las fotos que nos das.",
      "**Venta:** al marcar un aviso como vendido podemos preguntarte, de forma opcional, si la venta surgió de un contacto del sitio y por qué monto. Esa respuesta no se publica.",
      "Los avisos no vencen. Siguen activos hasta que los pausás, los marcás como vendidos o los borrás, o hasta que se pausan por el cupo o por moderación, según estos términos.",
    ],
  },
  {
    id: "prohibido",
    title: "Contenido y conductas prohibidas",
    blocks: [
      "No está permitido publicar, enviar o subir al sitio:",
      {
        list: [
          "Bienes que no existen, que no te pertenecen o que no estás autorizado a vender.",
          "Bienes robados, de origen ilícito o cuya venta esté prohibida por la ley.",
          "Datos, matrículas, horas, historiales, certificados o documentos falsos, adulterados o engañosos.",
          "Repuestos presentados con un origen, una condición o una trazabilidad que no tienen.",
          "Aeronaves o repuestos ocultando accidentes, gravámenes, embargos, inhibiciones u otras limitaciones que conozcas y que un comprador razonable querría saber.",
          "Fotos, textos o marcas ajenas sin autorización, o contenido que infrinja derechos de terceros.",
          "Datos personales de otras personas sin su consentimiento.",
          "Contenido discriminatorio, violento, amenazante, obsceno o que afecte a menores.",
          "Avisos duplicados, publicidad ajena al aviso, cadenas, enlaces maliciosos o spam.",
          "Avisos pensados para sacar dinero, datos o credenciales a los interesados.",
        ],
      },
      "Tampoco podés usar los datos de contacto de otros usuarios para enviarles publicidad o para otro fin que no sea la operación que motivó el contacto.",
      "Tampoco podés acosar a otros usuarios, ni hacer preguntas falsas, ni reportar avisos de mala fe, ni manipular las métricas, los favoritos o las posiciones de los avisos.",
    ],
  },
  {
    id: "aeronautica",
    title: "Reglas propias de la actividad aeronáutica",
    blocks: [
      "La venta de aeronaves y de repuestos está sujeta a normas específicas, entre ellas el Código Aeronáutico (Ley 17.285), su reglamentación, el régimen del Registro Nacional de Aeronaves (Decreto 639/2024) y las disposiciones de la Administración Nacional de Aviación Civil (ANAC). Cada usuario debe cumplir las que le correspondan.",
      "Antes de comprar, es responsabilidad del interesado verificar la titularidad, los gravámenes y la matrícula en el Registro Nacional de Aeronaves, y revisar el estado de aeronavegabilidad, los registros de mantenimiento y las directivas aplicables.",
      "Recomendamos una inspección pre-compra con un taller habilitado y asesoramiento profesional. La transferencia de una aeronave debe tramitarse e inscribirse según lo exige la normativa. Nada de lo que se muestra en el sitio reemplaza esas gestiones.",
      "Quien vende repuestos debe informar con claridad su estado y entregar la documentación de trazabilidad que corresponda. Quien compra debe confirmar que el repuesto sea apto para su instalación.",
      "Las [guías](/services/guides) del sitio son material informativo general. No son asesoramiento legal, técnico ni operativo, y pueden no reflejar el último cambio normativo.",
    ],
  },
  {
    id: "interacciones",
    title: "Contacto entre usuarios, preguntas y otras funciones",
    blocks: [
      "Los interesados pueden contactar a un vendedor por teléfono, WhatsApp o correo. Esas conversaciones ocurren fuera del sitio y no tenemos acceso a ellas.",
      "Las preguntas y respuestas en un aviso son públicas y se muestran junto a tu nombre. No incluyas datos personales ni información que no quieras hacer pública.",
      "Los favoritos y el comparador son herramientas de uso personal. El comparador resalta valores según los datos que cargaron los vendedores, así que no constituye una evaluación ni una recomendación.",
      "El buscador y los listados muestran avisos según los filtros y el orden elegidos. Por defecto, y sin ser un juicio sobre su calidad, los avisos de los planes con destacados aparecen primero. Las cuentas con plan Broker o Empresa y las del equipo pueden aparecer en la búsqueda de vendedores.",
      "Los perfiles de empresas con avisos activos y los avisos públicos pueden aparecer en buscadores externos, como Google. Esos servicios deciden qué muestran y cuándo lo actualizan.",
    ],
  },
  {
    id: "planes",
    title: "Planes y beneficios",
    blocks: [
      "Hay tres planes: **Base**, gratis y para todas las cuentas; **Pro**; y **Broker / Empresa**, que puede incluir aeronaves ilimitadas, repuestos ilimitados o las dos cosas. Lo que no es ilimitado tiene el cupo de Base. Los cupos, precios y beneficios son los publicados en [Planes y precios](/plans) al momento de contratar.",
      "**Cupo:** cuentan los avisos activos. Los pausados y los vendidos no ocupan lugar. Si llegaste al cupo, podés pausar un aviso, pasarte a un plan con más cupo o guardar el nuevo aviso como pausado.",
      "**Republicar:** vuelve a poner un aviso primero en “Últimas publicaciones”, sin cambiar su contenido. En Base y Pro tenés una cantidad por año, que se cuenta desde el alta de tu cuenta o de tu suscripción y no se acumula. El mismo aviso se puede republicar una vez cada 7 días. En Broker / Empresa republicás todos tus avisos juntos, una vez cada 30 días.",
      "**Destacados:** en los planes que lo incluyen, tus avisos aparecen primero en el orden por defecto de los listados y pueden estar entre los destacados de la página de inicio. Ordenar por otro criterio no los adelanta. No garantizamos una cantidad de visitas, contactos ni ventas.",
      "**Página personalizada:** según el plan, tu perfil muestra portada, logo, nombre comercial y datos de contacto, o además secciones armadas por vos y un detalle de avisos con tu marca. Lo que cargues ahí es público.",
      "**Métricas:** cada plan incluye el nivel de métricas que indica la grilla. Son estimaciones sumadas y orientativas: no identifican a los visitantes y pueden tener diferencias con otras mediciones.",
      "**Usuario verificado:** la insignia acompaña a ciertos planes. **No certifica la identidad del usuario, ni los avisos, ni la calidad de lo que vende.**",
      "Si un plan termina, sus beneficios dejan de mostrarse en ese momento. No se borran tus avisos, y tu página personalizada queda guardada por si volvés a suscribirte.",
    ],
  },
  {
    id: "pagos",
    title: "Precios, suscripciones y facturación",
    blocks: [
      "Pro y Broker / Empresa son suscripciones mensuales en pesos argentinos, con débito automático por Mercado Pago. Al contratar autorizás ese débito en Mercado Pago, que se rige también por sus propias condiciones.",
      "El precio que se cobra es el que figura como real al momento de contratar. Si se muestra otro tachado, es solo una referencia. Un precio promocional no tiene una duración garantizada, salvo que lo indiquemos de forma expresa.",
      "**No guardamos ni vemos los datos de tu tarjeta o de tu cuenta bancaria:** el pago se hace dentro de Mercado Pago.",
      "La suscripción queda activa cuando Mercado Pago nos confirma el cobro. Por cada pago emitimos el comprobante que corresponda, con los datos de facturación que cargaste, que son tu responsabilidad. Podés verlo en “Mis compras”, dentro de Ajustes.",
      "Si un cobro se rechaza, mantenés el plan durante un período de gracia que te informamos por correo, mientras Mercado Pago vuelve a intentarlo. Si no se logra cobrar, el plan termina y la cuenta vuelve a Base.",
      "**Cambio de plan:** el plan nuevo empieza cuando se aprueba el pago y deja de cobrarse el anterior, sin prorrateo. Lo que quedaba del período anterior no se devuelve, salvo lo que corresponda por el derecho de arrepentimiento o por un error nuestro.",
      "**Avisos que superan el cupo:** si tu plan termina o pasás a uno con menos cupo y tenés más avisos activos, se pausan los más recientes. Después podés pausar otros y activar los que prefieras. No se borra ninguno.",
      "**Cambios de precio:** si cambia el precio de tu suscripción, te lo avisamos por correo antes del cobro al que se aplica, para que puedas darla de baja si no estás de acuerdo. El cambio no afecta un período ya pagado.",
      "Además de la suscripción, podés tener otros costos ajenos a nosotros, como impuestos, intereses de tu tarjeta o cargos de tu banco.",
      "Si hubo un error de cobro de nuestra parte, escribinos y lo revisamos para devolver lo que corresponda.",
    ],
  },
  {
    id: "baja",
    title: "Baja de la suscripción",
    blocks: [
      "Podés dar de baja tu suscripción cuando quieras, sin dar explicaciones y sin costo, según el artículo 10 ter de la Ley 24.240. Podés hacerlo desde [Planes y precios](/plans) o desde [Ajustes](/settings).",
      `Si no podés entrar a tu cuenta, también podés pedir la baja a ${CONTACT} desde el correo de la cuenta. Te responderemos por el mismo medio con una constancia del pedido.`,
      "Con la baja no se hacen más débitos, y el plan sigue hasta el fin del período ya pagado. Mientras ese período siga vigente, podés volver atrás con “Seguir suscripto”.",
      "La baja no te devuelve el período en curso, salvo que estés dentro del plazo del derecho de arrepentimiento, que se explica en la sección siguiente.",
    ],
  },
  {
    id: "arrepentimiento",
    title: "Derecho de arrepentimiento",
    blocks: [
      "Si sos consumidor, tenés derecho a revocar la contratación de una suscripción dentro de los **10 días corridos** desde el pago, sin dar explicaciones y sin costo, según el artículo 34 de la Ley 24.240, el artículo 1110 del Código Civil y Comercial y la Disposición 954/2025.",
      `Podés ejercerlo con el [Botón de arrepentimiento](/arrepentimiento), que está en el pie de todas las páginas. Con sesión iniciada, se hace en “Mis compras”, dentro de Ajustes. **No necesitás una cuenta para pedirlo:** también podés hacerlo por correo a ${CONTACT} o por los otros canales de contacto, indicando el correo con el que pagaste.`,
      "El botón aplica al primer cobro de cada suscripción, no a las renovaciones mensuales posteriores. Para esos cobros, tenés la baja de la sección anterior. Esto no limita ningún derecho que la ley te reconozca.",
      "Te devolvemos el total por Mercado Pago, sin descontar nada. El reintegro puede tardar según el medio de pago. La suscripción termina en ese momento y la cuenta vuelve a Base.",
      "Cuando termina la suscripción, dejan de mostrarse los beneficios del plan, como destacados, verificado, página personalizada, detalle propio y métricas. Las republicaciones vuelven a las de Base.",
      "Si tenés más avisos activos que el cupo de Base, podés elegir cuáles quedan activos. Si no elegís, se pausan los más recientes.",
      "Si un reembolso se hace por otra vía, como directamente en Mercado Pago o por un contracargo, la suscripción termina de la misma manera.",
      "Este derecho no aplica a quien compra para revender o para integrar el servicio a un proceso productivo o de prestación a terceros, en los términos de la normativa de consumo.",
    ],
  },
  {
    id: "bonificaciones",
    title: "Planes bonificados y promociones",
    blocks: [
      "El equipo del sitio puede bonificar un plan a ciertas cuentas, por ejemplo como miembros fundadores o por una acción promocional. La decisión de bonificar se toma caso por caso, sin que exista un derecho a recibirla.",
      "Un plan bonificado no se cobra ni se renueva solo. Dura hasta la fecha que informamos al otorgarlo y, al terminar, la cuenta vuelve a Base con las reglas de cupo de estos términos, salvo que contrates un plan.",
      "El beneficio es personal. No se puede transferir, vender ni canjear por dinero.",
      "Los cupones o promociones tienen las condiciones que se informan en cada caso. Si no se indica otra cosa, no son acumulables.",
    ],
  },
  {
    id: "moderacion",
    title: "Reportes y moderación",
    blocks: [
      "Cualquier persona puede reportar un aviso que crea falso, engañoso o contrario a estos términos, con el botón Reportar. Revisamos los reportes y podemos pedirte más información. No tenemos la obligación de revisar de antemano todo lo que se publica.",
      "Si un aviso incumple estos términos, podemos pausarlo. Te informamos el motivo por correo y en tu cuenta. Mientras esté pausado por moderación, no se muestra al público, sus documentos no están disponibles y no ocupa cupo.",
      "Podés corregir el aviso y pedir una revisión. Después lo reactivamos o lo mantenemos pausado, y te avisamos qué decidimos. Si no estás de acuerdo, podés escribirnos y explicarnos por qué.",
      "Podemos corregir errores evidentes en datos de catálogo, como marcas y modelos, sin cambiar el sentido de tu aviso.",
      "Si recibimos una orden de una autoridad competente, podemos retirar contenido o entregar información, en la medida en que la ley lo exija.",
    ],
  },
  {
    id: "suspension",
    title: "Suspensión y cierre de cuentas",
    blocks: [
      "Podemos suspender o cerrar una cuenta, en forma total o parcial, si incumple estos términos de manera grave o reiterada, si detectamos un fraude o un riesgo para otros usuarios, o si una norma o autoridad lo exige. Salvo urgencia o impedimento legal, te informamos el motivo y te damos la oportunidad de responder.",
      "Si cerramos una cuenta por causas que no te son imputables, o dejamos de prestar el servicio, te avisamos con una anticipación razonable y te devolvemos la parte proporcional del período pagado que no pudiste usar.",
      "Si el cierre se debe a un incumplimiento tuyo, no corresponde devolver el período en curso, salvo lo que la ley establezca.",
      "El cierre de una cuenta no afecta las obligaciones ya generadas ni los datos que debamos conservar por ley.",
    ],
  },
  {
    id: "propiedad",
    title: "Propiedad intelectual",
    blocks: [
      "El nombre, el logo, el diseño, los textos propios y el software del sitio nos pertenecen o los usamos con autorización, y están protegidos por la normativa aplicable, entre ella las Leyes 11.723 y 22.362. No podés copiarlos ni usarlos sin permiso.",
      "Las marcas y logos de fabricantes pertenecen a sus titulares. Se usan solo para identificar productos, sin que eso indique una relación con ellos.",
      "**Tu contenido sigue siendo tuyo.** Al subirlo nos das una autorización gratuita, no exclusiva y limitada a lo necesario para operar el sitio mientras esté publicado. Eso incluye mostrarlo, adaptar su formato, generar miniaturas y fichas en PDF, y permitir que se comparta o que aparezca en buscadores.",
      "Declarás que tenés derecho a publicar lo que subís y que no infringe derechos de terceros, como los de autor, de marca o de imagen.",
      `Si creés que un contenido infringe tus derechos, escribinos a ${CONTACT} indicando el aviso y el motivo. Lo revisamos y, si corresponde, lo retiramos.`,
    ],
  },
  {
    id: "uso",
    title: "Uso adecuado del sitio",
    blocks: [
      "No podés intentar acceder a áreas o datos sin autorización, vulnerar las medidas de seguridad, introducir código malicioso, sobrecargar el sitio ni hacerte pasar por otra persona. Algunas de estas conductas pueden ser delitos, según la Ley 26.388.",
      "No podés extraer de forma masiva o automatizada avisos, datos de contacto u otra información, ni reutilizarlos para armar bases de datos o enviar publicidad. Esto no alcanza a los buscadores que indexan el sitio respetando sus reglas técnicas.",
      "Podemos aplicar límites razonables a pedidos repetidos, y bloquear accesos automatizados o abusivos, para proteger el servicio.",
    ],
  },
  {
    id: "disponibilidad",
    title: "Disponibilidad y cambios del servicio",
    blocks: [
      "Trabajamos para que el sitio funcione de forma continua y segura, pero pueden ocurrir interrupciones por mantenimiento, fallas técnicas o problemas de proveedores, de redes o de terceros.",
      "Cuando podamos preverlo, avisaremos de las interrupciones importantes. Si una falla nuestra te impide usar un plan pago de forma significativa, escribinos y lo revisamos para compensar lo que corresponda.",
      "Podemos mejorar, cambiar o quitar funciones del sitio. Si un cambio reduce de forma relevante lo que contrataste, te avisamos con anticipación y podés dar de baja la suscripción sin costo.",
      "Algunas funciones dependen de terceros, como Mercado Pago, Google, Facebook, YouTube o el proveedor de mapas. Esos servicios se rigen por sus propias condiciones.",
    ],
  },
  {
    id: "responsabilidad",
    title: "Responsabilidad",
    blocks: [
      "**Cada usuario es responsable por el contenido que publica y por las operaciones que realiza.** Como no somos parte de esas operaciones, no respondemos por el estado, la existencia, la titularidad o la entrega de los bienes, por la veracidad de lo que cargan los usuarios, ni por el cumplimiento o los pagos entre comprador y vendedor.",
      "Respondemos por lo que sí prestamos, es decir, el funcionamiento del sitio y de los planes contratados, según la normativa aplicable.",
      "Nada de estos términos excluye ni limita los derechos que la ley reconoce a los consumidores, ni nuestra responsabilidad en los casos en que la ley no permite limitarla. Si una cláusula pudiera interpretarse de otra forma, debe entenderse con este alcance.",
      "Si tu incumplimiento de estos términos o de la ley le causa un daño a otro usuario, a un tercero o a nosotros, respondés por ese daño según las normas aplicables.",
    ],
  },
  {
    id: "seguridad-compra",
    title: "Recomendaciones para operar con seguridad",
    blocks: [
      "Estas recomendaciones no reemplazan tus propias verificaciones:",
      {
        list: [
          "No adelantes dinero sin haber visto el bien y su documentación.",
          "Comprobá que quien vende sea el titular o tenga facultades para vender, y verificá la información en los registros que correspondan.",
          "Desconfiá de precios muy por debajo del mercado, de la urgencia para pagar y de los pedidos de pago por medios inusuales.",
          "Hacé una inspección con un profesional habilitado y dejá la operación por escrito.",
          "Nunca compartas contraseñas ni códigos de verificación. No te vamos a pedir la contraseña por ningún medio.",
          "Si algo te parece sospechoso, usá el botón Reportar y, si fuiste víctima de un delito, hacé la denuncia ante la autoridad.",
        ],
      },
    ],
  },
  {
    id: "consumidores",
    title: "Derechos de los consumidores y reclamos",
    blocks: [
      "Si contratás un plan como destinatario final, te amparan la Ley 24.240 de Defensa del Consumidor y los artículos 1092 y siguientes del Código Civil y Comercial. Ante una duda, estos términos se interpretan en el sentido más favorable para vos.",
      `Podés hacer consultas y reclamos por correo a ${CONTACT}, por teléfono o WhatsApp al +54 9 3456 44-5758. Si no quedás conforme, podés acudir a la autoridad de defensa del consumidor de tu jurisdicción o a los tribunales competentes.`,
      "Podés publicar opiniones sobre el sitio o sus servicios. No te aplicamos sanción alguna por una opinión negativa. Esto no impide retirar contenido ilegal o que infrinja derechos de terceros.",
      "Si usás el sitio para tu actividad comercial o profesional, algunas de estas normas pueden no aplicarse, según corresponda en cada caso.",
    ],
  },
  {
    id: "privacidad",
    title: "Privacidad, cookies y servicios de terceros",
    blocks: [
      "El tratamiento de tus datos y el uso de cookies se rigen por la [Política de privacidad](/privacy), que incluye la [información sobre cookies](/privacy#cookies). Podés aceptar o rechazar las cookies de medición y cambiar tu elección desde el enlace “Cookies” del pie de la página.",
      "El sitio puede incluir enlaces y contenidos de terceros, como videos, mapas o las redes de los vendedores. No controlamos esos sitios ni sus políticas.",
    ],
  },
  {
    id: "cambios",
    title: "Cambios en estos términos",
    blocks: [
      "Podemos actualizar estos términos por cambios en el sitio, en la normativa o en los servicios. La fecha de la última versión figura al comienzo de esta página, y las versiones nuevas rigen desde su publicación para quienes las acepten.",
      "Si un cambio es relevante para tus derechos u obligaciones, te lo avisamos por correo o en el sitio antes de que rija, con una anticipación razonable, y te explicamos qué cambia. Puede que te pidamos aceptarlo para seguir usando tu cuenta.",
      "Si no estás de acuerdo, podés dar de baja tu suscripción y pedir el cierre de tu cuenta sin costo antes de que rija el cambio. Un cambio de precio o de beneficios no afecta el período ya pagado.",
    ],
  },
  {
    id: "generales",
    title: "Comunicaciones y disposiciones generales",
    blocks: [
      "Las comunicaciones sobre tu cuenta, tus avisos y tus pagos las enviamos por correo al que tengas registrado, o las mostramos en tu cuenta. Mantené ese correo al día y revisá también la carpeta de spam.",
      "Si una cláusula resulta inválida, el resto de los términos sigue vigente. Si no ejercemos un derecho en un momento dado, no significa que renunciemos a él.",
      "Podemos ceder la operación del sitio a quien continúe el servicio, siempre que se respeten tus derechos. Si eso ocurre, te lo avisaremos. No podés ceder tu cuenta sin nuestro consentimiento.",
      "Estos términos están escritos en español. Si existiera una traducción, prevalece esta versión.",
    ],
  },
  {
    id: "ley",
    title: "Ley aplicable y jurisdicción",
    blocks: [
      "Estos términos se rigen por las leyes de la República Argentina.",
      "Si sos consumidor, podés iniciar tus reclamos ante los tribunales y autoridades de tu domicilio. Ninguna cláusula de estos términos te obliga a litigar en otro lugar.",
      "Si no sos consumidor, las controversias se resolverán ante los tribunales competentes de la República Argentina, según las normas de competencia aplicables.",
      `Antes de iniciar un reclamo, te invitamos a escribirnos a ${CONTACT}, para intentar resolverlo. Esta invitación es opcional y no limita tu derecho a reclamar directamente.`,
    ],
  },
];

export function TermsContent() {
  return (
    <div className="flex flex-col gap-6 leading-relaxed text-[#001F58]/80">
      <p>
        Leé estos términos con atención antes de crear una cuenta o contratar un plan. Están escritos para que se entiendan, y cada cláusula tiene un número para poder citarla si tenés una consulta o un reclamo.
      </p>
      <LegalDocument sections={termsSections} />
    </div>
  );
}
