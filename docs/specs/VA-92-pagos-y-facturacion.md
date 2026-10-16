# VA-92 · Pagos con Mercado Pago + facturación automática (Factura C) con TusFacturasAPP

## Estado de la configuración y decisiones (actualizado el 12/10/2026)
- **Aplicación de Mercado Pago creada** en Tus integraciones, con la solución **Checkout Pro**. Las credenciales sirven también para la API de Suscripciones. Las **credenciales de prueba ya están habilitadas.** El usuario carga en `.env.local`: `MP_ACCESS_TOKEN` y `MP_PUBLIC_KEY` (de prueba), `APP_URL=http://localhost:3000`.
- **Pagos únicos: Checkout Pro con la API de Preferences** (`/checkout/preferences`), **no** la API de Orders. `/api/test-preference` y `app/testmp` ya no existen (se borraron en VA-05); la base es `lib/mercadopago.ts` y el webhook existente, que hay que rehacer según la Etapa 3. `/banners` pasa al mismo flujo de checkout.
- **Suscripciones:** API de Suscripciones (preapproval), sin "Planes de suscripción" del panel. Crear la suscripción directamente por API, o con plan asociado si simplifica; justificá la elección.
- **Cuentas de prueba:** el usuario crea una vendedora y una compradora. Los pagos de prueba se hacen con la compradora y las tarjetas de prueba (el nombre del titular define el resultado: APRO, OTHE, CONT, etc.).
  - Si las suscripciones dan el error de "payer and collector must be both real or test users", el usuario va a crear una aplicación dentro de la cuenta **vendedora de prueba** y usar esas credenciales en `MP_ACCESS_TOKEN` durante las pruebas.
  - El código no debe asumir cuál de las dos credenciales se usa: todo sale de las variables de entorno.
- **Webhooks: los configura el usuario DESPUÉS** de que exista la ruta. Orden de trabajo:
  1. Implementar el webhook (`POST /api/webhooks/mercadopago`) y avisarle al usuario la ruta exacta.
  2. Levantar un túnel (cloudflared o ngrok) y darle al usuario la URL pública completa.
  3. **Frenar y esperar.** El usuario la carga en Webhooks › Configurar notificaciones (modo prueba), con los eventos **Pagos** y **Planes y suscripciones** (y, opcionalmente, Reclamos y Contracargos), y carga en `.env.local` la clave secreta como `MP_WEBHOOK_SECRET`.
  4. Recién ahí probar con "Simular notificación" y con pagos de prueba reales.

  Mientras `MP_WEBHOOK_SECRET` no esté cargada, el webhook rechaza todo (fail closed) y lo informa en el log.
- **Facturación:** si las credenciales de TusFacturas todavía no están, implementarla igual, pero con `BILLING_ENABLED=false`. Los pagos funcionan sin facturar y las compras quedan con la factura "pendiente", para emitirla cuando se active.
- **Documentar en `docs/PAGOS.md`:** cómo levantar el túnel, qué URL cargar en el panel, los eventos a marcar, la tabla de tarjetas de prueba y el checklist de pase a producción.

> **Antes de empezar:** leé el schema actual (Plan, Purchase, Subscription, Coupon, CouponUsage, AdBanner), el código de pagos existente (`app/testmp`, actions) y la documentación oficial de Mercado Pago (Checkout Pro, Suscripciones/preapproval, Webhooks y validación de firma) y de TusFacturasAPP (autenticación, facturación, notas de crédito, consumidor final). Proponé el plan por etapas y esperá mi OK antes de migrar.
>
> **Credenciales:** nunca me las pidas por el chat. Creá `.env.example` con los nombres de las variables. Yo cargo los valores en `.env.local` y en Vercel. No toques `.env`.

## Variables de entorno (nombres sugeridos)
- `MP_ACCESS_TOKEN` (servidor).
- `MP_PUBLIC_KEY`, solo si hace falta en el cliente.
- `MP_WEBHOOK_SECRET`: la clave secreta de los webhooks.
- `TUSFACTURAS_APIKEY`, `TUSFACTURAS_APITOKEN`, `TUSFACTURAS_USERTOKEN`.
- `TUSFACTURAS_PUNTO_VENTA`.
- `BILLING_ENABLED`: `true`/`false`. Si está en `false`, no se emiten facturas pero los pagos funcionan.
- `APP_URL`: para `back_urls` y `notification_url`.

## Etapa 1 · Cobro de publicaciones (pago único) con Checkout Pro
- Productos de pago único: los planes `ONE_TIME` (packs de aeronaves, repuestos y hangares, banners) y los destacados cuando existan.
- Flujo:
  1. El usuario elige un plan.
  2. Aplica un cupón opcional (la lógica de cupones ya existente).
  3. Completa los datos de facturación.
  4. Se crea la preferencia con `external_reference = purchase.id`, `back_urls` (éxito/pendiente/error) y `notification_url`.
  5. Se redirige a Mercado Pago.
- **Cupón del 100%:** si el total queda en $0, no se pasa por Mercado Pago ni se factura. Se activa directo, registrando la compra con `finalPrice = 0`.
- **La fuente de verdad es el webhook, no la página de retorno.** La página `/payment/success` (o la existente) solo muestra "Estamos confirmando tu pago…" y consulta el estado. La publicación o el plan se activan únicamente cuando el webhook confirma `approved`.
- Estados: approved (activa y factura), pending/in_process (aviso "pago pendiente"), rejected/cancelled (permitir reintentar).

## Etapa 2 · Suscripciones mensuales (preapproval)
- Planes con `billingType` recurrente: suscripciones "Repuestos" / "Profesional" y la página personalizada.
- Alta con la API de suscripciones de Mercado Pago, guardando `Subscription.mpSubscriptionId`.
- Webhooks de la suscripción y de cada cobro recurrente:
  - cada cobro aprobado extiende `currentPeriodEnd` y genera su factura;
  - un cobro rechazado deja la suscripción en un estado de gracia de N días (configurable) y le avisa al usuario por mail; vencida la gracia, pierde los beneficios.
- El usuario puede cancelar desde su panel ("se cancela al final del período": `cancelAtPeriodEnd`).

## Etapa 3 · Webhooks (seguridad e idempotencia)
- Route handler `POST /api/webhooks/mercadopago`.
- **Validar la firma** (header `x-signature` con la clave secreta, según la documentación oficial). Si no valida, responder 401 y registrar el intento.
- **Guardar cada evento** en una tabla `WebhookEvent` (proveedor, tipo, id externo, payload, estado de procesamiento y error) y responder 200 rápido. El procesamiento es idempotente: el mismo pago procesado dos veces no activa ni factura dos veces. Restricción única en `mpPaymentId`.
- Ante cada notificación, consultar el pago a la API de Mercado Pago con el id recibido. Nunca confiar solo en el payload.
- Tabla `Payment` (o extender `Purchase`) con: `mpPaymentId` único, estado, monto, método, fecha de aprobación y relación con Purchase o Subscription.

## Etapa 4 · Facturación automática con TusFacturasAPP (Factura C)
- **Cuándo:** al confirmarse un pago aprobado, tanto único como cada cobro recurrente. Se dispara después de activar el producto. Si la facturación falla, **el pago y la activación no se pierden**: la factura queda pendiente para reintento.
- **Datos de facturación (al comprar):**
  - "Consumidor final": nombre y, según las reglas de ARCA, DNI. Seguí la guía de consumidor final de TusFacturas y dejá configurable el monto a partir del cual el DNI es obligatorio.
  - "Empresa / responsable": CUIT, razón social y condición frente al IVA.
  - Email para recibir la factura.
  - Guardar estos datos en el perfil para la próxima compra.
- **Comprobante:**
  - `FACTURA C`, operación `V`, moneda `PES` (cotización 1), el punto de venta de la variable de entorno.
  - Rubro de servicios, con período facturado desde/hasta: en pago único, la fecha del pago; en suscripción, el período cubierto.
  - El detalle con la descripción del plan ("Publicación de aeronave – Plan 1 Avión", etc.) y el precio final, sin IVA discriminado.
  - Total igual al monto cobrado (con el cupón ya descontado).
  - `external_reference = payment.id` o `purchase.id`.
  - Que TusFacturas envíe la factura por mail (`envia_por_mail`).
- **Idempotencia:** TusFacturas no valida el `external_reference` repetido, así que la unicidad la garantizamos nosotros: tabla `Invoice` con restricción única por pago. Antes de emitir, verificar que no exista una factura emitida para ese pago.
- **Guardar en `Invoice`:** tipo, punto de venta, número, CAE (con trim), vencimiento del CAE, total, fecha, datos del receptor, observaciones de ARCA, estado (PENDING / ISSUED / ERROR), errores en texto largo y cantidad de intentos.
- **El PDF que devuelve TusFacturas es temporal:** descargarlo en el momento y subirlo a Supabase Storage (bucket privado). Guardar nuestra URL y servirlo con un link firmado.
- **Errores y reintentos:**
  - HTTP 429: esperar y reintentar.
  - `error: "S"`: guardar los `errores`, marcar ERROR y reintentar con backoff hasta N veces.
  - Avisar por mail al admin si sigue fallando.
- **Notas de crédito C:**
  - Si un pago se reembolsa (webhook de refund) o el admin anula una compra, emitir la nota de crédito C asociada a la factura original (`comprobantes_asociados`) y desactivar lo comprado.
  - Reembolso parcial: nota de crédito por el monto parcial.

## Etapa 5 · Panel del usuario y panel admin
- **Usuario, "Mis compras":** fecha, concepto, monto, estado del pago, estado de la factura, botón para descargar el PDF y estado de la suscripción con opción de cancelar.
- **Admin, sección "Pagos y facturas":**
  - Listado con filtros (estado del pago, estado de la factura, fechas).
  - Detalle con los eventos de webhook.
  - Botón "Reintentar factura" para las que están en ERROR.
  - Emitir nota de crédito manual.
  - Exportar CSV del período para el contador.
- **Control del tope del monotributo:**
  - Mostrar el total facturado de los últimos 12 meses (facturas menos notas de crédito).
  - Un campo editable con el tope anual de la categoría y un umbral de alerta (por ejemplo, 80%) que manda un mail al admin.
  - Es solo un indicador: no bloquea nada.

## Etapa 6 · Pruebas y pase a producción
- **Mercado Pago:** credenciales de prueba y cuentas de prueba (vendedora y compradora). Probar aprobado, rechazado, pendiente, cupón parcial, cupón 100%, reembolso total y parcial, suscripción con cobro aprobado, rechazado y cancelación.
- **Webhooks en local:** con un túnel (cloudflared o ngrok). Documentá en `docs/PAGOS.md` cómo levantarlo.
- **TusFacturas:**
  - Desarrollar contra la cuenta o el plan de desarrollo (comprobantes de prueba).
  - Para producción, usar las credenciales del punto de venta vinculado a ARCA, ejecutar una vez "Recuperar numeración desde ARCA" y emitir **una factura real de bajo monto** para verificar el CAE, el número en ARCA, el PDF y el mail. Después anularla con nota de crédito si corresponde.
- **Checklist en `docs/PAGOS.md`:** variables por ambiente (local, preview y producción en Vercel), URL del webhook a configurar en Mercado Pago y pasos de verificación.

## Aceptación
- Todos los casos de prueba de la Etapa 6 pasan en modo prueba.
- Ningún pago se factura dos veces, aunque Mercado Pago reenvíe el webhook (probar reenviando el mismo evento).
- Si TusFacturas falla, la compra queda activa y la factura pendiente, y el reintento la emite.
- El PDF queda guardado en nuestro storage y se descarga desde "Mis compras".
- Los paneles de usuario y de admin funcionan a 375 px.
- `docs/PAGOS.md` documenta el pase a producción.
