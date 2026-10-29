# Cómo funciona la sección de pagos

Explicación completa de los cobros del sitio: qué se cobra, cómo paga el usuario, cómo nos enteramos de
que pagó, qué se activa, cómo se factura y qué se ve en el perfil y en el admin. Se actualiza cada vez
que cambia algo de pagos.

- Detalle técnico y pase a producción: `docs/PAGOS.md` y `docs/PASE_A_PRODUCCION.md`.
- Especificaciones: `docs/specs/VA-92-pagos-y-facturacion.md` y, para el modelo de cupos,
  `docs/specs/VA-152-a-VA-164-lote-18-10.md`. Informe de impacto: `docs/VA-152_INFORME_IMPACTO.md`.
- Historial de cambios: `docs/REGISTRO_DE_CAMBIOS.md`.

_Última actualización: 18/10/2026 (VA-152: cupos fijos sin vencimiento)._

---

## 1. Qué se cobra

**Desde VA-152 (18/10) no se cobra por publicar.** Cada cuenta tiene un **cupo**: cuántos avisos puede
tener **activos al mismo tiempo**, por tipo. Los avisos **no vencen**. Se cobra solo la suscripción
mensual a un plan con más cupo.

**VA-166 (19/10): la grilla de los socios.** El precio real es el que se cobra (etiqueta "Promo de
lanzamiento", sin fecha); el tachado es solo para mostrar.

| Plan | Aviones activos | Repuestos activos | Precio real (tachado) | Beneficios | Cobro |
|---|---|---|---|---|---|
| **Base** (toda cuenta sin suscripción, para siempre) | 1 | 3 | gratis | 2 republicaciones por año, métricas básicas | — |
| **Pro** | 3 | 10 | AR$ 38.000 (50.000) | 5 republicaciones por año, verificado, destacadas, Página VA "banner", métricas Pro | Débito automático mensual |
| **Broker / Empresa · Aviones ilimitados** | ilimitados | el de Base (3) | AR$ 55.000 (68.000) | "Republicar todas" cada 30 días, verificado, destacadas, Página VA completa, detalles personalizados, métricas completas | Débito automático mensual |
| **Broker / Empresa · Repuestos ilimitados** | el de Base (1) | ilimitados | AR$ 55.000 (68.000) | ídem | Débito automático mensual |
| **Broker / Empresa · Todo ilimitado** | ilimitados | ilimitados | AR$ 85.000 (108.000) | ídem | Débito automático mensual |

- **Todo se edita en `/admin/plans`** con la misma grilla de `/plans`: precios real y tachado, cupos,
  republicaciones y beneficios (filas del sistema, con candado) y filas de texto propias. Cambiar un precio
  real con suscriptores pide escribir CONFIRMAR: vale para sus cobros siguientes y hay que avisarles.
  Mientras un plan pago no esté activo o no tenga precio, `/plans` dice "Muy pronto" en su columna.
- **Base** es una fila más de `Plan` (`tier = BASE`, precio 0): no se puede pagar ni asignar como cortesía.
  Su cupo vale también para lo que el Broker no tiene ilimitado.
- **Admins (VA-174):** el Broker completo (ambos ilimitados) para siempre, sin suscripción ni cortesía; se
  ven como "Admin". No pueden suscribirse ni recibir cortesías y no cuentan en ingresos.
- La regla está en un solo lugar: `lib/plan-benefits.ts` (y el cupo, en `lib/quota.ts`).
- **Los hangares** (ocultos, VA-93) no usan cupos: siguen como estaban.
- **Ya no existen:** el aviso suelto, los packs, la renovación (paga o gratis), el vencimiento a los 45
  días, el estado "pendiente de pago", el saldo de lanzamiento y los precios de `/admin/prices` (la
  página se quitó). Las compras y pagos de ese modelo quedan como historial: no se borran.
- **Banners** (VA-103, oculto): el camino de pago único sigue en el código para cuando se publiquen.

Todos los precios son en pesos argentinos (ARS). La lógica del cupo está en un solo lugar:
`lib/quota.ts`.

---

## 2. Publicar con cupo

- **Cuenta en el cupo** solo el aviso **activo**. No cuentan los pausados (por el dueño o por el
  sistema), los vendidos ni (VA-154) los pausados por moderación.
- **Con lugar libre**, el aviso se publica activo al terminar el formulario.
- **Sin lugar**, el formulario lo avisa **al empezar** ("Ya tenés 1 avión activo, que es el cupo de tu
  plan Gratis") con tres salidas: **"Pausar uno de mis avisos"** (lleva al perfil), **"Pasarme a Pro"**
  (si hay planes pagos activos) o **"Guardar como pausado"** (se guarda y se activa después).
- **En "Mis publicaciones"** (perfil): arriba, el uso del cupo ("Plan Gratis · Aviones 1/1 · Repuestos
  3/5", con link a los planes si está lleno) y, en cada aviso, **Pausar**, **Activar** (necesita lugar
  libre del mismo tipo) y **Vendido** ("Volver a publicar" si estaba vendido).
- **Siempre en el servidor:** el cupo se mira y el aviso se crea (o se activa) en la misma transacción,
  con la fila del usuario bloqueada. Dos altas simultáneas con un solo lugar libre no quedan las dos
  activas.
- **Cuentas que ya superaban el cupo** al pasar a este modelo: conservan sus avisos activos, pero no
  publican ni activan otro hasta quedar dentro del cupo.

---

## 3. El checkout (`/checkout`)

Es la pantalla de pago de los planes (`/checkout?planId=…`).

- **Resumen ("Elegiste"):** qué plan, qué incluye y precio por mes.
- **Datos de facturación, con lo mínimo:** si ya sabemos el nombre y el email (del perfil o de un pago
  anterior), solo se ve una línea: _"Factura C a nombre de … · se envía a …"_ con **"Cambiar"**. El
  formulario completo aparece solo si faltan datos o si el usuario toca "Cambiar":
  - **Consumidor final:** nombre y email; el DNI solo cuando ARCA lo pide (desde el monto configurado
    en el admin).
  - **Empresa o responsable:** razón social, CUIT (se valida el dígito verificador), condición frente al
    IVA y email.
- Además se pide el **email de la cuenta de Mercado Pago** con la que se autoriza el débito (puede no ser
  el de la factura).
- **Cambio de plan:** con una suscripción vigente, pagar otro plan (u otra opción del Empresarial) lo
  reemplaza apenas se aprueba el primer cobro, sin prorrateo. Si el plan nuevo tiene menos cupo, se
  pausan los avisos más nuevos que sobran (ver 5).

El precio nunca viene del navegador: el servidor lo vuelve a leer del plan.

---

## 4. Cómo nos enteramos de que pagó (el webhook)

**La fuente de verdad es Mercado Pago avisándonos, no la página a la que vuelve el usuario.**

1. Mercado Pago manda un aviso ("notificación") a `/api/webhooks/mercadopago`.
2. Se **valida la firma** con la clave secreta (`MP_WEBHOOK_SECRET`). Si no coincide, se rechaza (401)
   y se registra el intento. Sin clave cargada, se rechaza todo.
3. Se **guarda el aviso** (tabla de eventos) y se responde enseguida.
4. Después se **consulta el pago a Mercado Pago** con el número recibido (nunca se confía solo en el
   aviso) y se controla el monto.
5. Si es un cobro de suscripción aprobado, se **renueva el período una sola vez**, aunque Mercado Pago
   repita el aviso, y la factura queda pendiente de emitir.
6. Si un cobro de suscripción se **reembolsa** (a mano en el panel de Mercado Pago) o hay **contracargo**,
   la suscripción termina en el momento (como el arrepentimiento, ver 8b). Un reembolso de un débito
   anterior, ya reemplazado por un cambio de plan, no termina el plan de hoy.

La página a la que vuelve el usuario (`/payment/status`) **solo muestra** el estado: "Estamos
confirmando tu pago…" (y se actualiza sola), "El pago no se completó" (con "Intentar de nuevo") o
"¡Pago acreditado!".

---

## 5. Suscripciones (débito automático)

- **Alta:** el usuario elige Pro o arma su Empresarial en `/plans` (casillas "Aviones ilimitados" y
  "Repuestos ilimitados", que eligen una de sus 3 opciones), completa el checkout y autoriza el débito en
  Mercado Pago. Mientras no llegue el primer cobro, la suscripción figura "confirmando".
- **Cada cobro aprobado:** renueva el período y deja la factura pendiente.
- **Cobro rechazado:** el plan sigue activo durante la **gracia** (7 días, configurable) y el usuario
  recibe un mail. En el perfil ve un aviso con la fecha de baja. Mercado Pago reintenta el cobro solo.
- **Cancelar:** desde el perfil o desde `/plans`. Se pausa el débito y el plan sigue hasta el fin del
  período ya pagado. "Seguir suscripto" lo reactiva mientras el período siga vigente.
- **Baja de un plan pago** (fin del período tras cancelar, gracia vencida, arrepentimiento o cambio a un
  plan con menos cupo): si la cuenta tiene más avisos activos que el cupo nuevo, **se pausan en el momento
  los más nuevos** (por fecha de publicación). Sin plazos (decisión del 18/10): después el dueño pausa otro
  y activa el que prefiera. No se borra nada.
- **Proceso diario** (cron de Vercel, 6 de la mañana de Argentina): cierra las suscripciones con la
  gracia vencida y las canceladas que terminaron su período, cancela el débito en Mercado Pago y aplica
  la baja de arriba.

---

## 6. Página VA, métricas y planes de cortesía

- **Página VA** (portada, logo, nombre comercial y contacto en el perfil): Pro (la actual, "banner") y
  Broker / admins (completa, VA-169). **Métricas de vendedor** (VA-151): desde el nivel Pro (VA-171 suma las
  del Broker). Se prenden por columna en la grilla de `/admin/plans`.
- **"Cuenta verificada":** automática mientras el Pro o el Broker esté vigente (fila "Usuario verificado").
- **Plan de cortesía:** el admin lo asigna en `/admin/users` → columna "Plan" → **"Asignar plan de
  cortesía"** (Pro o una opción del Broker / Empresa, vencimiento y nota; nunca a un admin). No se cobra ni se renueva y
  no cuenta en ingresos ni en los KPIs. Al vencer o al quitarlo, la cuenta vuelve al plan Base (con la baja de 5).
  VA-174: la cortesía que tenía un admin se cerró (`scripts/va166-migrate-data.ts`).
  No pisa una suscripción paga vigente. Las cortesías que existían (Suscripción VA) pasaron al
  **Empresarial · Todo ilimitado** (script `scripts/va152-migrate-data.ts`).

---

**Miembros fundadores (VA-182; desde el 28/10, manual):** la bonificación ya no se otorga sola al publicar:
se asigna a mano en `/admin/users` ("Plan bonificado"). Cada cuenta de empresa nueva (no particular) manda un
mail a aeronauticasventas@gmail.com; el aviso se pausa con el interruptor de `/admin/users`. Antes: las primeras 15 cuentas no admin que publican su primer aviso (límite
editable en `/admin/users`) reciben **6 meses bonificados** de Broker / Empresa con todo ilimitado: una
suscripción sin cobro (`MANUAL`, nota "Miembro fundador") hasta esa fecha, que vence sola y vuelve a Base
como cualquier plan. No pasa por Mercado Pago ni factura, y no cuenta como ingreso. Si la cuenta ya tenía
una suscripción vigente, no se otorga. Al usuario nunca se le dice "cortesía": se dice "bonificado" (también
en los planes que asigna el admin).

## 7. Cupones

**Sin pantallas desde VA-152:** se quitaron la página del admin (el código quedó en
`app/admin/_cupones`, una carpeta privada que no genera la ruta) y la pestaña "Mis cupones" del perfil.
La lógica (validación, reserva de usos, cupón del 100%) **sigue en el código** (`lib/coupons.ts`) por si
se usa más adelante. Hoy las suscripciones no aceptan cupones: Mercado Pago no permite un primer cobro
distinto en el débito automático (las opciones serían un primer mes gratis o un descuento por varios
meses). Los cupones de avisos, destacados, hangares, banners y renovación que hubiera se desactivan con
el script de datos de VA-152 (no se borran). Verificación de la lógica: `scripts/verify-coupons.ts`.

---

## 8. Facturación (Factura C con TusFacturasAPP)

**Estado:** implementada. **Nunca emite facturas reales al probar** y **nunca factura una venta de $0**.

**¿Cuándo se emite una factura real?** Solo si se cumplen las **cinco** condiciones a la vez:
1. `BILLING_ENABLED=true`;
2. el sitio corre en **Producción de Vercel** (`VERCEL_ENV=production`; en Preview o local, nunca);
3. `TUSFACTURAS_MODE=production`;
4. Mercado Pago informó el pago como real (`live_mode`);
5. la cuenta de Mercado Pago **no** es de prueba (las cuentas de prueba informan `live_mode` como real).

Si falta cualquiera, la factura queda **"Simulada"**: se arma el JSON exacto que se mandaría a
TusFacturas, se guarda (se ve en el admin) y **no se llama a TusFacturas**. Con `BILLING_ENABLED=false`
ni siquiera se simula: la factura queda **pendiente**.

Cómo funciona:
- **Sin trámites para el usuario:** los datos de facturación se guardan en el perfil (**Ajustes →
  "Datos de facturación"**) y en el checkout solo se ve el resumen. Consumidor final sin datos, con DNI,
  o empresa con CUIT y condición de IVA.
- **Una factura por pago**, nunca dos aunque Mercado Pago repita el aviso.
- **$0 no se factura:** un cupón del 100% no genera factura ("No corresponde" en Mis compras).
- **Se factura lo cobrado:** con un cupón del 50%, la factura es por la mitad.
- **Emisión automática** apenas se aprueba el pago (también cada cobro de la suscripción). Punto de venta
  **3** (`TUSFACTURAS_PUNTO_VENTA`).
- **Descarga:** "Descargar factura" en la pantalla de estado del pago y en **"Mis compras"**.
- **PDF guardado** en un bucket privado de Supabase (`invoices`; el link de TusFacturas dura un día).
- **Errores:** reintentos con espera creciente (también si TusFacturas pide esperar); el proceso diario
  reintenta las pendientes; si sigue fallando, mail al admin. En el detalle del pago: **"Procesar ahora"**
  / **"Reintentar factura"** y **"Descartar"** (hay que escribir DESCARTAR; para pruebas internas).
- **Notas de crédito C** por reembolsos, también parciales, asociadas a la factura original. Si la
  factura todavía no se había emitido: con reembolso total se descarta; con parcial, se ajusta el monto.
- **Pagos de prueba:** quedan marcados "Prueba" en el admin y **no cuentan** para el tope del
  monotributo.
- **Tope del monotributo:** indicador en el admin con alerta por mail al llegar al porcentaje elegido.

**Datos del cliente (29/10, primera prueba real):** TusFacturas exige que su API acepte la IP de Vercel (en su
panel: aceptar cualquier IP, porque Vercel cambia de IP). Sin dirección se manda "No especifica", sin provincia el
código 25 ("Otro") y va `condicion_iva_operacion` (RG 5616/2024); con "-" y la provincia 26 respondía "Error al
crear al cliente".

Para el **pago real de prueba** en producción: se hace con `BILLING_ENABLED=false` (la factura queda
pendiente) y después se descarta desde el admin.

---

---

## 8b. Botón de arrepentimiento (VA-125; VA-152: solo suscripciones)

**Qué es:** dentro de los **10 días** del pago de una suscripción, el usuario toca **"Arrepentirme"** en
"Mis compras" y le devolvemos el total por Mercado Pago en el momento.

- **Qué pasa:** la suscripción **termina en el momento**, se cancela el débito y la cuenta vuelve al plan
  Base. Si tiene más avisos activos que el cupo de Base, **elige en el diálogo cuáles quedan activos**
  (VA-181; arranca tildado lo que quedaría sin elegir: los más viejos) y se pausan los demás. Por webhook
  (reembolso a mano o contracargo) no hay elección: se pausan los más nuevos.
- **Lo que pierde (VA-181):** el diálogo y el mail lo listan según su plan: verificado, destacadas (salen de
  la lista en el momento, sin esperar la caché de 5 minutos), página personalizada (queda guardada sin
  mostrarse), detalle personalizado con video, republicaciones del plan (quedan las de Base que no usó en el
  año) y métricas Pro o completas. Todo sale del plan vigente, así que se va solo al terminar la suscripción.
  Lo ya republicado no vuelve a su lugar anterior en los listados.
- **Verificación:** `scripts/verify-withdrawal.ts` (día 1, 10 y 11; 2.º cobro; Broker con 30 aviones que
  elige uno; doble clic con una sola devolución; webhook repetido), sin Mercado Pago ni mails.
- **Solo el primer cobro** de cada débito (el alta, o el primero del plan nuevo en un cambio de plan). Es
  una constante (`WITHDRAWAL_SUBSCRIPTION_SCOPE` en `lib/payments/withdrawal.ts`): falta confirmarlo con
  el contador o un abogado.
- **Mismo camino** para el botón, un reembolso hecho a mano desde el panel de Mercado Pago y un
  contracargo (`lib/payments/subscription-reversal.ts`).
- **Factura:** emitida → nota de crédito; pendiente o simulada → se descarta.
- **Compras viejas** (avisos sueltos, packs, renovaciones del modelo anterior): ya no muestran el botón.
  Siguen visibles en "Mis compras" y en el admin como historial (con "Lo que se revirtió" de los
  arrepentimientos que hubo antes de VA-152).
- **El usuario** recibe un mail con el monto y lo que pasó con su plan.
- **El admin** ve el filtro **"Arrepentimientos"** en "Pagos y facturas" y la columna **"Arrepent."** en
  `/admin/users` (solo informativa: el derecho no se puede negar).

---

## 9. Lo que ve el usuario en su perfil

- **Mis publicaciones:** el uso del cupo y, en cada aviso, Pausar / Activar / Vendido.
- **Mis compras:** fecha, concepto, monto, estado del pago, estado de la factura y "Ver". Las compras del
  modelo anterior siguen ahí.
- **Ajustes → Tu plan:** plan vigente, próximo cobro o fecha de fin, cancelar o seguir suscripto, aviso
  de cobro rechazado. Los planes de cortesía se ven sin precio ni cobros.
- **Ajustes → Datos de facturación:** consumidor final o empresa, guardados para siempre.

---

## 10. Lo que ve el admin

- **`/admin/payments` ("Pagos y facturas"):**
  - indicadores: facturado de los últimos 12 meses, tope del monotributo (%) y estado de la facturación;
  - listado de pagos (incluidas las compras viejas) y cobros de suscripciones, con filtros por estado del
    pago, de la factura y fechas;
  - **detalle** de cada pago: resumen, pagos de Mercado Pago, facturas ("Reintentar factura") y los
    avisos del webhook con su resultado;
  - **Exportar CSV** del período para el contador;
  - **configuración:** tope del monotributo y alerta, desde qué monto se pide DNI, días de gracia y
    reintentos de factura.
- **`/admin/plans` ("Planes y precios"):** la grilla editable de `/plans` (VA-166: Base, Pro y Broker /
  Empresa, con precios real y tachado, cupos, beneficios, filas propias, vista previa y la lista de lo que
  cambia antes de guardar) y, abajo, los planes del modelo anterior archivados con sus compras.
- **Plan de prueba (27/10, `lib/test-plan.ts`):** tarjeta aparte en `/admin/plans`, fuera de la grilla.
  Es un pago único (precio editable, $100 por defecto) que no da cupo ni beneficios: sirve para probar el
  cobro y la factura. Con el interruptor "Mostrar en /plans" se publica (aparece al pie de `/plans` con
  "Pagar prueba" y se puede comprar) o queda como borrador (no se ve ni se puede pagar). La fila del plan
  (`id = plan-de-prueba`, sin nivel) se crea la primera vez que se guarda. En `main`, mientras siga el
  bloqueo de pagos reales (`lib/payments-lock.ts`), tampoco se puede pagar.
- **Eventos (27/10, `lib/track-event.ts`):** además de los pagos en sus tablas, quedan como eventos de
  analíticas: inicio del checkout (`CHECKOUT_STARTED`, pago único o suscripción), pago aprobado
  (`PAYMENT_COMPLETED`, también el cupón del 100 %), rechazado (`PAYMENT_FAILED`), reembolso
  (`REFUND_ISSUED`), alta y renovación de la suscripción (`SUBSCRIPTION_STARTED` / `_RENEWED`, por cobro
  aprobado) y cancelación (`SUBSCRIPTION_CANCELLED`). Uno por pago aunque Mercado Pago reintente el aviso;
  si el registro falla, el pago sigue igual.
- **`/admin/users`:** plan y cupo usado/total de cada cuenta (en ámbar si está por encima) y el plan de
  cortesía.
- **KPIs** (`/admin/kpi`): ingresos solo de suscripciones pagas (sin cortesías ni pagos de prueba), en
  pesos.

---

## 11. Ambientes y pruebas

- **Local:** se desarrolla con credenciales de prueba. Los avisos de Mercado Pago no llegan a la
  computadora (sin túnel), así que el circuito completo se prueba en el Preview.
- **Preview (`pre-production`):** se usan credenciales de prueba y la base de Supabase. Ahí se configura
  el webhook en Mercado Pago (modo prueba). Necesita `MP_WEBHOOK_SECRET` (de la aplicación de la cuenta
  vendedora de prueba) y `CRON_SECRET`.
- **Cuentas de prueba:** se paga con la cuenta **compradora de prueba** (en ventana de incógnito) y las
  tarjetas de prueba (`docs/PAGOS.md`). Las suscripciones exigen que el email de la cuenta de Mercado
  Pago sea el de la compradora de prueba.
- **Producción:** credenciales reales, facturación activa y el checklist de `docs/PAGOS.md`.


### Estado de las pruebas (18/10/2026)

- ✅ Cupos en la base local (`scripts/verify-quota.ts`, 23 casos): publicar sin cupo, "Guardar como
  pausado", pausar libera, vendido no cuenta, Pro 3/15, baja del Pro (pausa los 2 más nuevos),
  Empresarial con 40 repuestos, Página VA y métricas solo en Empresarial y admins, y dos altas
  simultáneas con un solo lugar (queda una sola activa).
- ⏳ En el Preview: suscripción Pro con cobro de prueba, cambio a Empresarial, cancelación y
  arrepentimiento con la baja, cuando los planes tengan precio.
