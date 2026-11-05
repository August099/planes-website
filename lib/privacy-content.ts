// 3/11: política ampliada según lo que el sitio hace de verdad. Si se suma un proveedor, una cookie o un dato,
// actualizarlo acá. Conviene que la revise un abogado.
import type { LegalSection } from "@/components/ui/legal/LegalDocument";

const CONTACT = "[aeronauticasventas@gmail.com](mailto:aeronauticasventas@gmail.com)";

export const privacySections: LegalSection[] = [
  {
    id: "responsable",
    title: "Quién es responsable de tus datos",
    blocks: [
      "Esta política explica qué datos personales trata **Ventas Aeronáuticas**, para qué, con quién los compartimos y qué derechos tenés, según la Ley 25.326 de Protección de Datos Personales y su reglamentación. Se aplica a [ventasaeronauticas.com](https://ventasaeronauticas.com).",
      `Los responsables del tratamiento son quienes operan el sitio bajo el nombre comercial Ventas Aeronáuticas, en la República Argentina. Para cualquier tema de privacidad, escribinos a ${CONTACT}, o comunicate al +54 9 3456 44-5758.`,
    ],
  },
  {
    id: "definiciones",
    title: "Conceptos básicos",
    blocks: [
      {
        list: [
          "**Dato personal:** información que identifica o permite identificar a una persona, como su nombre, su correo o su teléfono.",
          "**Tratamiento:** cualquier operación con datos, como guardarlos, usarlos, mostrarlos o borrarlos.",
          "**Titular:** la persona a la que se refieren los datos. **Proveedor:** la empresa que nos presta un servicio y trata datos por nuestra cuenta o para esa función.",
          "**Cookie y almacenamiento local:** pequeños datos que el navegador guarda en tu dispositivo.",
        ],
      },
    ],
  },
  {
    id: "recoleccion",
    title: "Qué datos recolectamos",
    blocks: [
      "Según cómo uses el sitio, recolectamos los siguientes datos:",
      {
        list: [
          "**Datos de cuenta:** nombre, correo electrónico, contraseña (guardada de forma cifrada, nunca en texto), teléfono, ciudad, provincia, tipo de cuenta, foto de perfil y las redes o la web que decidas cargar. También registramos cuándo aceptaste los términos y verificaste tu correo.",
          "**Inicio de sesión con Google o Facebook:** si elegís esa opción, recibimos de esa empresa tu nombre, tu correo y tu foto de perfil. No accedemos a tu contraseña ni a otros datos de esas cuentas.",
          "**Avisos:** datos técnicos de las aeronaves y repuestos, precio, ubicación, fotos, enlace de YouTube, matrícula si la cargás, y los documentos que adjuntes.",
          "**Página personalizada:** portada, logo, nombre comercial, web, descripción y secciones que armes, si tu plan la incluye.",
          "**Actividad en tu cuenta:** favoritos, preguntas y respuestas, avisos pausados, republicados o vendidos, y lo que nos cuentes de forma opcional sobre una venta.",
          "**Reportes y sugerencias:** lo que escribís al reportar un aviso y lo que nos mandás por el formulario de sugerencias, con tu nombre y correo si decidís dejarlos.",
          "**Publicación asistida:** el nombre, el WhatsApp, la descripción y el material que nos mandes para que armemos tu aviso.",
          "**Pagos y facturación:** el estado y los identificadores de tus pagos que nos informa Mercado Pago, el correo de esa cuenta, y los datos de facturación que cargás (nombre o razón social, DNI o CUIT, condición frente al IVA, domicilio y correo). **No guardamos ni vemos los datos de tu tarjeta o de tu cuenta bancaria.**",
          "**Datos de uso:** páginas y avisos vistos, búsquedas, clics en los botones de contacto, uso del comparador y el sitio o la campaña desde la que llegaste, como se explica en las secciones de cookies y medición.",
          "**Datos técnicos:** la dirección IP, el navegador y el dispositivo, que se usan para prestar el sitio, protegerlo y estimar la provincia aproximada de una visita.",
        ],
      },
      "No te pedimos datos sensibles, como los referidos a tu salud, tu religión o tu ideología. Te pedimos que no los incluyas en los avisos, las preguntas ni los documentos.",
    ],
  },
  {
    id: "plan-de-vuelo",
    title: "Plan de vuelo y calculadoras",
    blocks: [
      "Las calculadoras se usan sin cuenta y hacen los cálculos en tu dispositivo: lo que cargás no se guarda en nuestros servidores. Si copiás el enlace de una calculadora, los valores van dentro del enlace, y los ve quien lo reciba.",
      "Usamos tu ubicación solo si tocás el botón para usarla, y tu navegador te pide permiso antes. Para el sol se usa en tu dispositivo. Para el clima más cercano se envía a nuestro servidor, redondeada, solo para buscar la estación. En ningún caso la guardamos.",
      "El plan que estás armando queda guardado en tu navegador hasta que lo borres. Si lo guardás con tu cuenta, guardamos en nuestra base lo que cargaste, incluidos la matrícula, el nombre del piloto y la ruta, hasta que lo borres o elimines la cuenta. Para el PDF, los datos pasan por nuestro servidor solo para armarlo y no quedan guardados. Si compartís el plan por WhatsApp, lo mandás vos con esa aplicación.",
      "Las unidades elegidas quedan guardadas en tu navegador, como figura en la sección de cookies. El mapa descarga imágenes de OpenFreeMap, según se indica en la sección de proveedores.",
    ],
  },
  {
    id: "origen",
    title: "De dónde obtenemos los datos",
    blocks: [
      "La mayoría los cargás vos. Otros se generan al usar el sitio. También recibimos datos de Google o de Facebook si entrás con esas cuentas, y de Mercado Pago sobre el resultado de tus pagos.",
      "Si un usuario carga datos de otra persona, por ejemplo en una foto o en un documento, es responsable de contar con su consentimiento. Esa persona puede pedirnos que los retiremos, como se explica en la sección de derechos.",
    ],
  },
  {
    id: "finalidad",
    title: "Para qué usamos tus datos",
    blocks: [
      "Usamos los datos únicamente para estas finalidades:",
      {
        list: [
          "**Prestar el servicio:** crear y administrar tu cuenta, verificar tu correo, recuperar el acceso y publicar tus avisos y tu perfil.",
          "**Conectar a compradores y vendedores:** mostrar tus medios de contacto y tus preguntas y respuestas.",
          "**Cobrar y facturar:** gestionar suscripciones, cambios de plan, bajas, devoluciones y comprobantes.",
          "**Enviar correos operativos:** verificación, contraseña, estado de pagos, avisos sobre tu suscripción y decisiones de moderación.",
          "**Dar seguridad:** revisar reportes, moderar, evitar abusos y fraudes, y limitar pedidos repetidos.",
          "**Atender consultas:** responder reclamos, sugerencias y pedidos sobre tus datos.",
          "**Medir y mejorar:** entender de forma sumada qué se busca, qué se ve y de dónde llegan las visitas.",
          "**Dar métricas a los vendedores:** mostrar vistas, contactos, favoritos y usos del comparador de sus avisos, siempre sumados y sin decir quién fue.",
          "**Gestionar el programa de cuentas de empresa:** avisar internamente de cada cuenta nueva de empresa, para evaluar una bonificación, y llevar la cuenta de los miembros fundadores.",
          "**Armar estadísticas internas:** por ejemplo, cuántas ventas hubo y por qué monto, en total.",
          "**Cumplir la ley:** obligaciones fiscales y contables, y pedidos de autoridades competentes.",
        ],
      },
      "Tratamos tus datos con tu consentimiento, para ejecutar el servicio que pedís o para cumplir una obligación legal. No los usamos para decisiones automáticas que produzcan efectos jurídicos sobre vos. El orden de los listados depende de los filtros, de la fecha y del plan de cada cuenta, no de un perfil tuyo.",
    ],
  },
  {
    id: "obligatorios",
    title: "Qué datos son obligatorios",
    blocks: [
      "Para crear una cuenta necesitamos tu nombre y tu correo. Para publicar, además, un teléfono de contacto. Para pagar, los datos de facturación. Sin ellos no podemos prestar esa parte del servicio.",
      "El resto es optativo: foto, ciudad, provincia, redes, web, descripción y lo que nos cuentes sobre una venta. Si das datos inexactos, puede que no podamos prestarte el servicio o emitir bien tu factura.",
    ],
  },
  {
    id: "publicidad",
    title: "Qué se publica y qué no",
    blocks: [
      {
        list: [
          "**Público:** el contenido de tus avisos, incluidos título, datos técnicos, precio, fotos, video, matrícula si la cargás, ciudad y provincia, y una zona aproximada en el mapa, nunca una dirección exacta. También tus preguntas y respuestas, tu nombre de vendedor y tu tipo de cuenta.",
          "**Documentos:** lo que adjuntes a un aviso lo puede ver y descargar cualquier visitante, como advierte el formulario.",
          "**Medios de contacto:** tu teléfono, tu WhatsApp, que usa ese mismo número, y el correo de tu cuenta se muestran en tus avisos y en tu perfil mientras tengas avisos activos. Si no tenés avisos activos, no se muestran a los visitantes.",
          "**Página personalizada:** todo lo que cargues en ella es público.",
          "**Privado:** tus datos de facturación y tus pagos, lo que nos contás sobre tus ventas y los reportes que hacés.",
        ],
      },
      "Los avisos públicos y los perfiles de empresas con avisos activos pueden aparecer en buscadores como Google. Los perfiles de particulares y de cuentas sin avisos se marcan para que no se indexen. Si borrás un contenido, el buscador puede tardar un tiempo en actualizarlo, y eso no depende de nosotros.",
      "Toda información pública puede ser vista, copiada o guardada por terceros. Pensalo antes de publicar datos personales, y no incluyas datos de otras personas sin su consentimiento.",
    ],
  },
  {
    id: "terceros",
    title: "Con quién compartimos datos",
    blocks: [
      "**No vendemos, alquilamos ni cedemos tus datos personales para publicidad de terceros.** Solo compartimos lo indispensable con los proveedores que necesitamos para el servicio:",
      {
        list: [
          "**Mercado Pago:** pagos, suscripciones y devoluciones.",
          "**Google y Facebook (Meta):** inicio de sesión, si elegís esa opción.",
          "**Supabase:** base de datos y almacenamiento de fotos y documentos.",
          "**Vercel:** alojamiento del sitio y medición anónima de su rendimiento.",
          "**Resend:** envío de los correos del sitio.",
          "**TusFacturas:** emisión de las facturas electrónicas ante ARCA, con tus datos de facturación.",
          "**YouTube (Google):** si un aviso tiene video, el reproductor en modo de privacidad mejorada (youtube-nocookie.com) se carga recién cuando tocás “Ver video”. Desde ahí rigen las políticas de YouTube.",
          "**aviationweather.gov (NOAA):** el clima se consulta desde nuestro servidor, sin datos tuyos. Si pedís el aeródromo más cercano, tu ubicación aproximada llega a nuestro servidor solo para buscarlo, y no la guardamos.",
          "**OpenFreeMap:** el mapa de zona descarga imágenes de sus servidores, que reciben la dirección IP de tu navegador como cualquier sitio. No usa cookies ni recibe datos tuyos o del aviso.",
        ],
      },
      "También compartimos datos cuando lo ordene una autoridad competente, cuando sea necesario para defender derechos en un reclamo, o si la operación del sitio pasa a otra persona que continúe el servicio. En ese último caso, te avisaremos antes.",
      "Cada vendedor recibe los datos de quien lo contacta, porque esa persona se los da directamente al llamarlo o al escribirle. Desde ese momento, el vendedor es responsable de lo que haga con ellos.",
    ],
  },
  {
    id: "transferencias",
    title: "Transferencias internacionales",
    blocks: [
      "Algunos proveedores alojan o procesan datos fuera de la Argentina, por ejemplo en Estados Unidos y Canadá. Algunos de esos países pueden no tener una legislación que la autoridad argentina considere adecuada.",
      "Al aceptar esta política, prestás tu consentimiento para esas transferencias, que se limitan a lo necesario para prestar el servicio. Elegimos proveedores que publican medidas de seguridad y de protección de datos.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies y almacenamiento del navegador",
    blocks: [
      "Usamos cookies y el almacenamiento del navegador para que el sitio funcione y, solo si lo aceptás, para medir su uso. No usamos cookies de publicidad ni de seguimiento de terceros.",
      "La primera vez que entrás, un cartel te pregunta tu elección. Con **“Aceptar”** se usan también las de medición, y con **“Solo necesarias”** no se crean. Podés cambiar la elección cuando quieras desde el enlace **“Cookies”** del pie de la página. Se recuerda por un año.",
      {
        table: {
          headers: ["Qué", "Tipo", "Para qué", "Duración"],
          rows: [
            ["authjs.session-token (y sus variantes __Secure-/__Host-), authjs.csrf-token, authjs.callback-url", "Necesaria", "Mantener tu sesión iniciada de forma segura y protegerla", "Mientras dure la sesión (hasta 30 días)"],
            ["va_consent", "Necesaria", "Recordar si aceptaste las cookies de medición o elegiste solo las necesarias", "1 año"],
            ["Comparador (almacenamiento local)", "Necesaria", "Las aeronaves que elegiste para comparar; queda solo en tu dispositivo", "Hasta que la quites"],
            ["Cartel de la Home (almacenamiento local)", "Necesaria", "Si ya cerraste o viste el cartel de bienvenida, para no mostrártelo de más", "Hasta que borres los datos del navegador"],
            ["va_calc_units (almacenamiento local)", "Necesaria", "Las unidades que elegiste en las calculadoras; queda solo en tu dispositivo", "Hasta que borres los datos del navegador"],
            ["va_fp_draft (almacenamiento local)", "Necesaria", "El plan de vuelo que estás armando; queda solo en tu dispositivo", "Hasta que lo borres"],
            ["va_weather_favorites (almacenamiento local)", "Necesaria", "Los aeródromos favoritos que guardaste en Clima; quedan solo en tu dispositivo", "Hasta que los quites"],
            ["va_republish_dismissed (almacenamiento local)", "Necesaria", "Si cerraste el aviso de republicaciones disponibles, para no mostrarlo hasta que cambie tu saldo", "Hasta que borres los datos del navegador"],
            ["Marcas de visita (almacenamiento de la pestaña)", "Necesaria", "Contar una sola vez la visita a una página, un aviso o un perfil en la misma pestaña. No llevan ningún identificador", "Se borran al cerrar la pestaña"],
            ["va_anon", "Medición (solo si aceptás)", "Identificador anónimo del navegador para contar visitantes únicos, sin saber quién sos si no iniciaste sesión", "1 año"],
            ["va_src", "Medición (solo si aceptás)", "El sitio o la campaña desde la que llegaste en esta visita", "Al cerrar el navegador"],
          ],
        },
      },
      "Al iniciar sesión con Google o con Facebook, o al pagar con Mercado Pago, esos servicios usan sus propias cookies en sus sitios, según sus políticas.",
      "También podés borrar o bloquear las cookies desde la configuración de tu navegador. Si bloqueás las necesarias, no vas a poder iniciar sesión.",
    ],
  },
  {
    id: "medicion",
    title: "Cómo medimos las visitas",
    blocks: [
      "Registramos las páginas y avisos vistos, las búsquedas y los clics de contacto para conocer el uso del sitio de forma sumada y para las métricas de los vendedores. A los vendedores nunca les decimos quién visitó sus avisos.",
      "Para estimar cuántas personas entran por día, aunque hayas rechazado las cookies de medición, calculamos un código a partir de la fecha, la IP y el navegador. **No guardamos la IP para esto**, el código no se puede revertir por medios razonables, y cambia todos los días, así que no permite seguir a una persona de un día a otro.",
      "Para las métricas registramos la provincia aproximada de la visita, a partir de la conexión y sin guardar la IP. Se muestra solo sumada, por ejemplo “30 vistas desde Córdoba”. Si tenés una sesión iniciada, tu actividad puede quedar asociada a tu cuenta para fines internos. Las visitas del propio vendedor y del equipo no cuentan en sus métricas.",
      "Las métricas de rendimiento de Vercel (Speed Insights) no usan cookies ni identifican al visitante. Los accesos automatizados conocidos, como los buscadores, no se cuentan como visitas.",
    ],
  },
  {
    id: "comunicaciones",
    title: "Correos y comunicaciones",
    blocks: [
      "Los correos que enviamos son operativos y necesarios para tu cuenta, tus avisos o tus pagos. Por eso no se pueden desactivar mientras tengas una cuenta.",
      "No enviamos publicidad por correo sin tu consentimiento. Si en el futuro lo hiciéramos, cada envío va a incluir una forma simple de dejar de recibirla, y podés pedir el retiro o bloqueo de tus datos para esos fines, según el artículo 27 de la Ley 25.326.",
    ],
  },
  {
    id: "conservacion",
    title: "Cuánto tiempo conservamos los datos",
    blocks: [
      {
        list: [
          "**Cuenta y avisos:** mientras tu cuenta esté activa, o hasta que los borres o pidas su eliminación.",
          "**Pagos y facturas:** durante el plazo que exija la normativa fiscal y contable, aunque cierres tu cuenta. Estos datos no se pueden borrar antes.",
          "**Medición:** mientras sean útiles para las métricas y estadísticas. Las métricas de los vendedores usan como máximo los últimos 13 meses.",
          "**Moderación y reportes:** el tiempo necesario para atender el caso y prevenir que se repita un abuso.",
          "**Límites de seguridad:** los registros técnicos de pedidos repetidos se eliminan periódicamente, por lo general en un día.",
          "**Copias de seguridad y registros de proveedores:** pueden conservar datos por un tiempo adicional hasta que se renueven, según sus políticas.",
        ],
      },
      "Cuando un dato deja de ser necesario, lo eliminamos o lo dejamos en una forma que no identifique a nadie. Al borrar un aviso o cerrar una cuenta, lo que ya se haya compartido con terceros o copiado por ellos puede seguir existiendo fuera de nuestro control.",
    ],
  },
  {
    id: "seguridad",
    title: "Cómo protegemos los datos",
    blocks: [
      "Aplicamos medidas técnicas y organizativas razonables, entre ellas conexiones cifradas (HTTPS), contraseñas guardadas de forma cifrada, control de acceso al panel de administración, límites a los intentos repetidos, y almacenamiento privado de documentos, con enlaces temporales para descargarlos.",
      "Ningún sistema es infalible, así que no podemos garantizar una seguridad absoluta. Si detectamos un incidente que afecte tus datos de forma relevante, vamos a tomar medidas para contenerlo y te vamos a informar cuando corresponda.",
      "Vos también ayudás: usá una contraseña propia y segura, no la compartas y cerrá la sesión en dispositivos ajenos.",
    ],
  },
  {
    id: "derechos",
    title: "Tus derechos sobre tus datos",
    blocks: [
      "Como titular podés **acceder** a tus datos, **rectificarlos, actualizarlos o suprimirlos**, y **retirar tu consentimiento** cuando el tratamiento se base en él, según la Ley 25.326. Si esos datos son necesarios para un plan contratado, retirarlo puede impedirnos seguir prestándolo.",
      `Buena parte de tus datos se puede editar en [Ajustes](/settings), y tus avisos, en tu perfil. Para el resto, o para cerrar tu cuenta, escribinos a ${CONTACT} desde el correo de la cuenta o con algo que acredite tu identidad. Si actuás por otra persona, tenés que acreditar que la representás.`,
      "Respondemos a un pedido de acceso dentro de los 10 días corridos, y a uno de rectificación, actualización o supresión dentro de los 5 días hábiles. El acceso es gratuito a intervalos no menores a seis meses, salvo que acredites un interés legítimo.",
      "No podemos suprimir datos cuando debamos conservarlos por una obligación legal, por ejemplo los de pagos y facturas, o cuando pudiera perjudicar derechos de terceros o una investigación. Si es así, te lo explicamos.",
      "Si tus datos aparecen en un aviso de otra persona sin tu consentimiento, escribinos indicando el aviso. Lo revisamos y, si corresponde, los retiramos.",
      "Las solicitudes que no respondamos en plazo, o los reclamos que tengas, los podés presentar ante la Agencia de Acceso a la Información Pública, sin perjuicio de otras vías legales.",
    ],
  },
  {
    id: "menores",
    title: "Menores de edad",
    blocks: [
      `Las cuentas son solo para mayores de 18 años. No buscamos recolectar datos de menores a sabiendas. Si creés que un menor nos dio sus datos, escribinos a ${CONTACT} y los vamos a eliminar según corresponda.`,
      "No se deben publicar fotos ni datos de menores en los avisos.",
    ],
  },
  {
    id: "enlaces",
    title: "Sitios de terceros",
    blocks: [
      "El sitio tiene enlaces a sitios ajenos, como las redes y webs de los vendedores, WhatsApp, Mercado Pago o YouTube. Al entrar, se aplican sus políticas, y te sugerimos leerlas.",
    ],
  },
  {
    id: "exencion",
    title: "Operaciones entre usuarios",
    blocks: [
      "El sitio es un espacio de publicación de avisos. **No interviene ni procesa los pagos de las aeronaves o los repuestos.** Si en una operación intercambiás datos con otra persona, por ejemplo para una transferencia, ese intercambio es fuera del sitio y bajo la responsabilidad de cada parte.",
    ],
  },
  {
    id: "cambios",
    title: "Cambios en esta política",
    blocks: [
      "Podemos actualizar esta política si cambian el sitio, los proveedores o la normativa. La fecha de la última versión figura al comienzo de la página. Si un cambio afecta de forma relevante cómo usamos tus datos, te lo avisamos por correo o en el sitio antes de que rija y, si la ley lo requiere, te pedimos un nuevo consentimiento.",
    ],
  },
  {
    id: "contacto",
    title: "Contacto",
    blocks: [
      `Para consultas o pedidos sobre tus datos, escribinos a ${CONTACT} o comunicate al +54 9 3456 44-5758.`,
    ],
  },
];
