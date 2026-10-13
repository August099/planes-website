# Cómo funciona la sección de pagos

Explicación completa de los cobros del sitio: qué se cobra, cómo paga el usuario, cómo nos enteramos de
que pagó, qué se activa, cómo se factura y qué se ve en el perfil y en el admin. Se actualiza cada vez
que cambia algo de pagos.

- Detalle técnico y pase a producción: `docs/PAGOS.md`.
- Especificación original: `docs/specs/VA-92-pagos-y-facturacion.md`.
- Historial de cambios: `docs/REGISTRO_DE_CAMBIOS.md` (filas VA-92).

_Última actualización: 13/10/2026._

---

## 1. Qué se cobra

| Qué | Cómo se paga | Dónde se configura el precio |
|---|---|---|
| **Publicación suelta** (un avión, un repuesto) | Pago único, al terminar el formulario de publicación | `/admin/prices` (precio individual) |
| **Pack** (por ejemplo "Plan 3 Aviones") | Pago único; suma saldo de publicaciones | `/admin/plans` |
| **Suscripción** (por ejemplo "Profesional") | Débito automático mensual o anual | `/admin/plans` |
| **Destacado** (VA-95, en construcción) | Pago único por 7 días | `/admin/prices` |
| **Banner** (VA-103, oculto por ahora) | Se cobra después de que el admin aprueba la solicitud | `/admin/plans` (tipo banner) |

**Dónde se ofrecen los planes:** `/plans` (link "Planes y precios" en el footer) y avisos discretos para
quien no tiene plan: en "Mis publicaciones", en su perfil (beneficios de la cuenta Pro) y al publicar el
2.º aviso sin plan, con el ahorro del pack más conveniente frente a la publicación suelta.

**No existen planes de 1 publicación.** Quien quiere publicar una sola cosa la paga al terminar el
formulario, al precio individual. En `/plans` ese precio aparece como referencia.

Todos los precios son en pesos argentinos (ARS).

---

## 2. Publicar: cuándo se paga y cuándo no

Al apretar **"Publicar"** en el formulario:

1. **Si tiene una suscripción vigente que cubre ese tipo de aviso** (ilimitada, o con cupo y le quedan
   lugares) → se publica directo.
2. **Si no, pero tiene saldo de un pack** → se descuenta 1 y se publica directo.
3. **Si no tiene ni suscripción ni saldo** → el aviso se guarda como **"pendiente de pago"** (no se ve
   en el sitio) y el usuario pasa directo al pago de esa publicación.

El aviso pendiente de pago lo ve solo el dueño, con un aviso arriba y el botón **"Pagar"**. Cuando el
pago se acredita, el aviso se publica solo (45 días, o sin vencimiento si su plan lo incluye).

---

## 3. El checkout (`/checkout`)

Es la pantalla de pago. Sirve para packs, suscripciones y publicaciones sueltas.

- **Resumen ("Elegiste"):** qué compra, qué incluye, precio y total.
- **Cupón:** campo para aplicar un cupón (no aplica a suscripciones). Un cupón del 100% deja el total en
  "Sin cargo" y el botón pasa a "Confirmar sin cargo": se activa sin pasar por Mercado Pago y sin factura.
- **Datos de facturación, con lo mínimo:** si ya sabemos el nombre y el email (del perfil o de una compra
  anterior), solo se ve una línea: _"Factura C a nombre de … · se envía a …"_ con **"Cambiar"**. El
  formulario completo aparece solo si faltan datos o si el usuario toca "Cambiar":
  - **Consumidor final:** nombre y email; el DNI solo cuando ARCA lo pide (desde el monto configurado
    en el admin).
  - **Empresa o responsable:** razón social, CUIT (se valida el dígito verificador), condición frente al
    IVA y email.
- **Suscripciones:** además se pide el **email de la cuenta de Mercado Pago** con la que se autoriza el
  débito (puede no ser el de la factura).
- **Botón "Pagar":** lleva a Mercado Pago, donde el usuario elige el medio (tarjeta, dinero en cuenta,
  efectivo…). Todos los botones de pago del sitio dicen solo "Pagar".

El precio nunca viene del navegador: el servidor lo vuelve a calcular con el plan, el precio individual
y el cupón.

---

## 4. Cómo nos enteramos de que pagó (el webhook)

**La fuente de verdad es Mercado Pago avisándonos, no la página a la que vuelve el usuario.**

1. Mercado Pago manda un aviso ("notificación") a `/api/webhooks/mercadopago`.
2. Se **valida la firma** con la clave secreta (`MP_WEBHOOK_SECRET`). Si no coincide, se rechaza (401)
   y se registra el intento. Sin clave cargada, se rechaza todo.
3. Se **guarda el aviso** (tabla de eventos) y se responde enseguida.
4. Después se **consulta el pago a Mercado Pago** con el número recibido (nunca se confía solo en el
   aviso) y se controla que el **monto y la moneda** coincidan con la compra.
5. Si está aprobado, se **activa lo comprado una sola vez**, aunque Mercado Pago repita el aviso:
   - **pack:** suma el saldo de publicaciones;
   - **publicación suelta:** publica el aviso pendiente;
   - **cupón:** se registra el uso;
   - **factura:** queda pendiente de emitir.
6. Si el pago se **reembolsa** (o hay contracargo), se revierte lo comprado (una sola vez): el saldo baja
   (sin quedar negativo) y el aviso vuelve a "pendiente de pago".

La página a la que vuelve el usuario (`/payment/status`) **solo muestra** el estado: "Estamos
confirmando tu pago…" (y se actualiza sola), "Tu pago está pendiente" (por ejemplo, efectivo), "El pago
no se completó" (con "Intentar de nuevo") o "¡Pago acreditado!".

---

## 5. Suscripciones (débito automático)

- **Alta:** el usuario elige un plan mensual en `/plans`, completa el checkout y autoriza el débito en
  Mercado Pago. Mientras no llegue el primer cobro, la suscripción figura "confirmando".
- **Cada cobro aprobado** (aviso de Mercado Pago): renueva el período (un mes o un año), repone los
  destacados incluidos del mes (no se acumulan) y deja la factura pendiente.
- **Cobro rechazado:** el plan sigue activo durante la **gracia** (7 días, configurable) y el usuario
  recibe un mail. En el perfil ve un aviso con la fecha de baja. Mercado Pago reintenta el cobro solo; si
  se acredita, todo sigue normal.
- **Cancelar:** desde el perfil (Ajustes → "Cancelar suscripción"). Se pausa el débito y el plan sigue
  hasta el fin del período ya pagado. "Seguir suscripto" lo reactiva mientras el período siga vigente.
- **Proceso diario** (cron de Vercel, 6 de la mañana de Argentina): cierra las suscripciones con la
  gracia vencida y las canceladas que terminaron su período, cancela el débito en Mercado Pago y les
  devuelve la fecha de vencimiento (45 días) a los avisos que no vencían gracias al plan.

**Beneficios mientras la suscripción está vigente** (incluida la gracia): publicaciones según el plan,
avisos sin vencimiento (si el plan lo dice), página personalizada (cuenta Pro) y destacados incluidos.

---

## 6. Cuenta Pro y planes de cortesía

- **Cuenta Pro** = suscripción vigente a un plan con **página personalizada**. Tiene portada, logo,
  nombre comercial y contacto propios en el perfil, y la insignia **"Cuenta verificada"** (solo la tienen
  las cuentas Pro). Si además es miembro fundador, se ve **"Miembro fundador"** al lado.
- **Plan de cortesía:** el admin lo asigna en `/admin/users` → columna "Plan" → **"Asignar plan de
  cortesía"** (plan, vencimiento y nota). No se cobra ni se renueva, no cuenta en ingresos ni en los
  KPIs, y al vencer el usuario pierde los beneficios. Se puede **"Quitar"**. No pisa una suscripción paga
  vigente. En el perfil se ve como _"Plan de cortesía, sin cargo"_ con la fecha de vencimiento.

---

## 7. Cupones

- Se crean en `/admin/coupons` (porcentaje, monto fijo o 100%), con alcance (todo, aeronaves, repuestos,
  destacados, banners), usos máximos, usos por persona y vigencia.
- Se aplican en el checkout y el servidor los vuelve a validar al pagar.
- **El uso se cuenta recién cuando la compra se concreta** (pago aprobado o cupón del 100%). Un cupón que
  el usuario "guardó" en su perfil no cuenta como usado hasta que paga con él.
- **Promoción de lanzamiento:** es el cupón **`LANZAMIENTO`** (100%, a crear en el admin). El formulario
  de publicación de aviones muestra el código.

---

## 8. Facturación (Factura C con TusFacturasAPP) — en espera

**Estado:** preparada pero **apagada** (`BILLING_ENABLED=false`) hasta tener la API de TusFacturas.
Mientras tanto los pagos funcionan normal y cada pago aprobado deja su factura **pendiente**; cuando se
active, se emiten.

Cómo va a funcionar (y lo que ya está):
- **Sin trámites para el usuario:** los datos de facturación se guardan en el perfil (**Ajustes →
  "Datos de facturación"**) y en el checkout solo se ve el resumen. ✅ hecho.
- **Una factura por pago**, nunca dos aunque Mercado Pago repita el aviso. ✅ la base lo garantiza.
- **Emisión automática** apenas se aprueba el pago (también cada cobro de la suscripción). ⏳
- **Descarga:** en la pantalla de estado del pago y en **"Mis compras"** del perfil (la columna
  "Factura" ya está; aparece "Descargar" cuando haya PDF). ⏳
- **PDF guardado** en un bucket privado de Supabase (el de TusFacturas es temporal). ⏳
- **Errores:** reintento automático; si sigue fallando, mail al admin y botón "Reintentar factura" en el
  admin. ✅ el botón y el registro de intentos ya están.
- **Notas de crédito** por reembolsos (también parciales) o anulaciones. ⏳
- **Tope del monotributo:** indicador en el admin con alerta por mail al llegar al porcentaje elegido. ✅
  el indicador y la configuración ya están; la alerta por mail se activa con la facturación.

---

## 9. Lo que ve el usuario en su perfil

- **Mis compras:** fecha, concepto, monto, estado del pago (Pagado, Pendiente de pago, Rechazado, Sin
  cargo…), estado de la factura y "Ver" (lleva a la página de estado).
- **Ajustes → Tu plan:** plan vigente, próximo cobro o fecha de fin, cancelar o seguir suscripto, aviso
  de cobro rechazado. Los planes de cortesía se ven sin precio ni cobros.
- **Ajustes → Datos de facturación:** consumidor final o empresa, guardados para siempre.

---

## 10. Lo que ve el admin

- **`/admin/payments` ("Pagos y facturas"):**
  - indicadores: facturado de los últimos 12 meses, tope del monotributo (%) y estado de la facturación;
  - listado de pagos únicos y cobros de suscripciones, con filtros por estado del pago, de la factura y
    fechas;
  - **detalle** de cada pago: resumen, pagos de Mercado Pago, facturas ("Reintentar factura") y los
    avisos del webhook con su resultado;
  - **Exportar CSV** del período para el contador;
  - **configuración:** tope del monotributo y alerta, desde qué monto se pide DNI, días de gracia y
    reintentos de factura.
- **`/admin/plans`:** planes, packs y suscripciones (precio, publicaciones, beneficios, destacados por
  mes, si se muestran en `/plans`).
- **`/admin/prices`:** precio de la publicación suelta (y, con VA-95, de los destacados).
- **`/admin/users`:** columna "Plan" con la suscripción de cada usuario y el plan de cortesía.
- **`/admin/coupons`:** cupones.

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

### Estado de las pruebas (13/10/2026)

- ✅ Pago real de prueba aprobado y procesado por el webhook (en local, con aviso firmado): activó la
  compra una sola vez con tres avisos simultáneos.
- ✅ Monto que no coincide: no se entrega nada. Cupón del 100%: activa sin Mercado Pago.
- ✅ Publicar con saldo / sin saldo, proceso diario de suscripciones.
- ⏳ En el Preview: firma del webhook (falta corregir `MP_WEBHOOK_SECRET`), suscripción con cobro real,
  cobro rechazado y cancelación.
