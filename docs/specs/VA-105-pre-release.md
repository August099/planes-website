# VA-105 · Pre-release: todo listo para mandar el link a los Miembros Fundadores

> **Contexto.** 10 días antes del lanzamiento oficial, los socios les mandan el link a los Miembros Fundadores para que empiecen a publicar. Se usa **el dominio real** (`ventasaeronauticas.com`), **indexado en Google** desde ese día. Lo que es solo del admin o no le sirve al usuario en ese momento se puede terminar durante esos 10 días (ver la sección final).
>
> **Reglas de esta tarea:**
> - **Avisos obligatorios al socio.** Cada vez que haya que cambiar o agregar una variable de entorno (local, Preview o Production), que correr un comando contra producción, que hacer algo a mano o que probar algo en un celular, **frená y avisame** con:
>   - qué hay que hacer;
>   - dónde hacerlo;
>   - el valor esperado, sin pedirme nunca credenciales por el chat;
>   - cómo verificar que quedó bien.
> - Mantené actualizada en `docs/PAGOS.md` la tabla de variables por ambiente, y en este archivo la lista "Variables y acciones del socio" (al final).
> - **Base de producción:** solo con mi OK explícito, con un backup `pg_dump` antes y mostrando el SQL. Nunca `db push`.
> - Una tarea = un commit. `npx tsc --noEmit`, `npm run lint` y build de producción antes de cada despliegue.
> - **Regla general vigente:** antes de empezar una funcionalidad que falte, preguntá si se muestra o queda oculta en `app/_proximamente/`. Si no hay respuesta, queda oculta.

---

## Decisiones del socio (13/10/2026)

| Tema | Decisión |
|---|---|
| Dominio | El real, `ventasaeronauticas.com`. `main` deja de mostrar "Próximamente" el día del link |
| Indexación | Sí, desde el día del link (sin `noindex` global) |
| Facturación | Se implementa ya (API de TusFacturas). **Nunca emitir facturas reales mientras se prueba. Nunca facturar una venta de $0** |
| Cupón de fundadores | Lo crean los socios desde el admin y lo mandan por mail. Code solo **verifica que los cupones funcionen bien** |
| Pago real de prueba | Lo hace el socio a mano: **Code avisa cuándo y cómo** |
| Olvidé mi contraseña | Se agrega |
| Banners | **En standby** (más adelante). Ocultos y sin accesos públicos |
| Vistas, link del perfil, favoritos vencidos | Se arreglan |
| Prueba en celular real (VA-30, QR del PDF) | La hace el socio: **Code avisa cuándo** |
| FAQ y términos | Los actualiza el socio cuando avise. Code no los toca, pero los recuerda en el checklist |
| Matrícula | Opcional. Se muestra solo si el vendedor la carga |

---

## 1. Facturación con TusFacturasAPP (etapa 5 de VA-92), con dos protecciones

Implementar según `docs/specs/VA-92-pagos-y-facturacion.md` (etapa 4 de la spec), sumando:

### 1.1 Nunca facturas reales en pruebas
- **Una factura real solo se emite si se cumplen las 4 condiciones a la vez.** Centralizalo en una sola función (`canIssueRealInvoice()`), con tests:
  1. `BILLING_ENABLED=true`;
  2. `VERCEL_ENV === "production"`;
  3. una variable explícita `TUSFACTURAS_MODE=production`;
  4. el pago de Mercado Pago tiene `live_mode === true` (consultado a la API de MP, no tomado del payload).
- Si falta cualquiera, **no se llama al endpoint de producción de TusFacturas.**
  - En local y en Preview, se usan las credenciales y el modo de desarrollo/homologación de TusFacturas, si existen (verificalo en su documentación y contame qué ofrece). Si no hay modo de prueba, se simula la respuesta (`ISSUED_SIMULATED`, sin CAE) y se loguea el JSON que se habría enviado.
  - Un pago de prueba de MP (`live_mode=false`) **nunca** genera una factura real, ni siquiera en producción. Queda marcado como `TEST` y no cuenta en el tope del monotributo ni en los KPIs.
- **El pago real que hago a mano en producción (ver 3) se hace con `BILLING_ENABLED=false`.** La factura queda `PENDING`. En "Pagos y facturas" del admin, sumar la acción **"Descartar (prueba interna)"**: la marca `SKIPPED`, pide escribir DESCARTAR, guarda quién y cuándo, y nunca se emite. Recién después de eso me avisás para activar `BILLING_ENABLED=true`.
- Antes de activar la facturación real, mostrame:
  - el JSON exacto de una factura de ejemplo (tipo C, punto de venta, concepto, período, receptor consumidor final y con CUIT);
  - qué pasa ante un error.

### 1.2 Sin factura si la venta vale $0
- Si el total cobrado es 0 (cupón del 100%, plan de cortesía o suscripción manual), **no se crea la fila `Invoice`** ni se llama a TusFacturas. La compra queda activada, con "Factura: no corresponde" en "Mis compras" y en el admin.
- **Aplica también a los cobros de suscripción de $0**, si llegara a haberlos.
- Con un cupón parcial, la factura es por el **monto efectivamente cobrado**.
- **Tests:**
  - cupón del 100% → sin factura;
  - cupón del 50% → factura por la mitad;
  - pago de prueba → sin factura real;
  - reenvío del webhook → una sola factura.

---

## 2. Cupones: revisión de punta a punta

Revisar el código de cupones (validación, checkout, webhook, perfil) y corregir lo que falle. Casos a cubrir con tests o un script de verificación contra `va_dev`:

1. **Guardado ≠ usado.** El bug anotado en la Fase 6 dice que `claimCouponToProfile` creaba un `CouponUsage` que contaba como uso. Verificá si sigue: un cupón guardado en el perfil tiene que poder usarse al pagar, aunque tenga `maxUsesPerUser = 1`.
2. **El uso se consume solo cuando el pago se aprueba** (o al activar con cupón del 100%), dentro de la transacción de activación. Un pago rechazado, cancelado o abandonado no consume el cupón. Un reembolso total ¿lo devuelve? Proponé y preguntame.
3. **Límites:**
   - `maxUses` global y por usuario;
   - vencimiento (fecha y hora, en hora argentina);
   - cupón inactivo;
   - alcance (`AIRCRAFT`, `SPARE_PART`, `HANGAR`, `FEATURED`, planes): un cupón de avión no sirve para un repuesto.
4. **Concurrencia:** dos usuarios usan el último uso disponible al mismo tiempo → solo uno lo consigue y el otro ve un mensaje claro.
5. **Código sin distinguir mayúsculas** y sin espacios al principio ni al final.
6. **Montos:** porcentaje y monto fijo. El total nunca queda negativo. El monto que va a Mercado Pago coincide con lo que se muestra y con lo que valida el webhook.
7. **Cupón del 100%:** publica o activa sin pasar por Mercado Pago, sin factura (1.2), y queda registrado en la compra con `finalPrice = 0`.
8. **Mensajes al usuario** para cada caso: inexistente, vencido, agotado, ya usado por vos, no aplica a este producto.
9. **El admin ve cuántos usos tiene cada cupón y de quién.**

Entregame una tabla caso → resultado esperado → resultado obtenido.

---

## 3. Pago real en producción (lo hace el socio a mano)

- Code **avisa cuándo** hacerlo: después del despliegue a producción con las credenciales reales de MP y el webhook de producción configurado.
- El aviso incluye:
  - qué comprar (lo más barato: un aviso suelto o un destacado con precio bajo puesto a propósito);
  - el monto;
  - qué verificar: estado del pago, activación, `WebhookEvent`, `Payment`, factura en `PENDING` con `BILLING_ENABLED=false`;
  - cómo descartar esa factura (1.1);
  - cómo reembolsar desde el panel de Mercado Pago, si conviene.
- **Antes, en el Preview:**
  - corregir `MP_WEBHOOK_SECRET` (pendiente del socio);
  - pago de prueba aprobado, rechazado y pendiente;
  - débito de suscripción con la cuenta compradora de prueba.

  Avisame en cada paso que dependa de mí.

---

## 4. Olvidé mi contraseña (y cambiar contraseña)

- Link "¿Olvidaste tu contraseña?" en `/login`, que lleva a `/forgot-password` (email).
- **Respuesta siempre genérica** ("Si hay una cuenta con ese email, te mandamos un link"), para no revelar qué emails existen.
- **Token:**
  - aleatorio de 32 bytes, guardado **hasheado** (SHA-256) en una tabla nueva (`PasswordResetToken`: `userId`, `tokenHash`, `expiresAt`, `usedAt`);
  - vence en 1 hora y es de un solo uso;
  - pedir uno nuevo invalida los anteriores.

  Mostrame el SQL de la migración.
- **Límite:** 1 pedido por minuto y 5 por hora por email, y un límite por IP.
- **Mail con Resend**, con el mismo estilo que el de verificación. Link a `/reset-password?token=…`.
- **Cuentas que solo tienen Google**, sin contraseña: el mail dice que entren con Google (o el formulario lo informa sin revelar la cuenta; proponé).
- **`/reset-password`:**
  - nueva contraseña con las mismas reglas que el registro;
  - confirma, marca el token usado y, si el email no estaba verificado, lo marca verificado (el link prueba la casilla);
  - lleva a `/login` con aviso de éxito.
- **Cerrar las sesiones abiertas** al cambiar la contraseña (por ejemplo, `passwordChangedAt` comparado en el callback `jwt`). Contame cómo queda con Auth.js v5.
- **"Cambiar contraseña" en Ajustes** del perfil (contraseña actual + nueva) para cuentas con contraseña.
- `noindex` en estas páginas y fuera del sitemap.
- Probado a 375 px y con `delivered@resend.dev`.

---

## 5. Lo que ve el fundador

1. **"Vistas" en el perfil:** contar solo `AIRCRAFT_VIEW` / `SPARE_PART_VIEW` (y `HANGAR_VIEW` cuando exista), con el mismo criterio de deduplicación que VA-17. Es la parte básica de VA-98; lo avanzado (Pro) puede esperar a la ventana de 10 días.
2. **Banner "Ir a mi perfil"** del detalle: apunta a `/profile`, que no existe. Debe ir a `/profile/<id>`. Buscá otros links a `/profile` sin id.
3. **Favoritos vencidos o no disponibles:** se muestran grisados con la etiqueta "Ya no está disponible", sin precio clickeable, con "Quitar de favoritos" y al final de la lista. No se borran solos.
4. **VA-101:** `/onboarding/account-type?from=publish` compila sin parar desde el segundo acceso. Es el camino del que va a publicar. Verificá también en el build de producción.
5. **VA-93: ocultar lo que no está terminado** (`app/_proximamente/` + `docs/FUNCIONES_OCULTAS.md`). Con los accesos quitados del header, del menú de celular, de `/services`, del footer, del sitemap y de los JSON-LD:
   - hangares (listado, detalle y link del menú de Servicios);
   - herramientas;
   - foro;
   - **banners (standby)**: `/banners` y `/ads` no responden públicamente, y la gestión del admin puede quedar.

   Visibles en Servicios: solo Guías y Comparador.
6. **`/plans` con los planes reales** (los de `docs/specs/PLANTILLA_PLANES.md`, cuando la complete) y el resto de VA-94. Hasta tener la plantilla, que `/plans` no muestre planes de prueba.
7. **Bucket `documents` público:** el formulario dice "Documentación (solo privado)", pero el bucket es público. Pasarlo a privado, con links firmados de corta duración y acceso solo para el dueño del aviso y los admins. **Antes de tocar archivos existentes, mostrame el plan** (cuántos hay y si cambian las URLs guardadas).
8. **Matrícula:** opcional en el formulario. En el detalle, el comparador, el PDF y el JSON-LD se muestra solo si se cargó. Sin "—" ni fila vacía; en el comparador, "No informada".
9. **Prueba en celular real:** cuando esté desplegado, avisame para probar las 6 pruebas de aceptación de VA-30 y escanear el QR del PDF. Mandame la lista de pasos.

---

## 6. Pase a producción (prepararlo Code, ejecutarlo el socio)

Armá en `docs/PASE_A_PRODUCCION.md` un runbook paso a paso, con cada comando y el resultado esperado. Avisame cuándo arrancar. Incluye:

1. **Backup** de producción (`pg_dump`, formato custom) y verificación del archivo.
2. `prisma migrate resolve --applied 20261008145019_baseline_db_push` (después de `migrate diff` vacío) y `migrate deploy` de todas las migraciones pendientes, con `migrate status` al final.
3. **Datos base:** taxonomía si hace falta, `scripts/seed-guides.ts --apply` (si no, las guías quedan vacías), `ListingPrice`, `FeaturedPrice`, planes de la plantilla y configuración de facturación.
4. **Limpieza** (scripts con modo "solo informar" primero; nada se borra sin mi OK):
   - compras, pagos, `WebhookEvent` e `Invoice` de prueba (el Preview usó esta base);
   - avisos "Prueba …";
   - usuarios de prueba;
   - planes "Plan 1" (consulta de VA-92);
   - huérfanos del storage (`scripts/storage-orphans.mjs`);
   - fundadores asignados a cuentas de prueba (`augusto@gmail.com`, `delivered@resend.dev`, etc.): listarlos para que yo decida en `/admin/users`.
5. **Variables de Production en Vercel:** lista completa, con cuáles cambian respecto del Preview (MP de producción, `MP_WEBHOOK_SECRET` de producción, `APP_URL`, `CRON_SECRET`, `BILLING_ENABLED=false` hasta el paso 1.1, `TUSFACTURAS_*`, `SUPPORT_EMAIL`, `NEXT_PUBLIC_SITE_URL`).
6. **Fuera del código** (checklist para mí):
   - Google OAuth en estado **publicado** (no "en prueba"), con `https://ventasaeronauticas.com` en orígenes y redirecciones;
   - dominio verificado en Resend;
   - webhook de producción en Mercado Pago;
   - `www` → dominio sin `www` con 301;
   - Search Console y Bing con el sitemap.
7. **Merge** `milton/auth-roles` → `pre-production` → `main`, sacando la página "Próximamente". `robots.txt` permite indexar y el sitemap responde 200.
8. **Verificación posterior:**
   - Home, `/planes`, `/spareparts`, un detalle, `/plans`, login con Google y con email, registro con mail de verificación y olvidé mi contraseña;
   - publicar con el cupón del 100% (creado por mí);
   - sin errores en los logs de Vercel.

---

## 7. Checklist antes de mandar el link (Code la mantiene al día y me la muestra)

- [ ] Facturación implementada con las dos protecciones y sus tests (1).
- [ ] Cupones: tabla de casos sin fallas (2).
- [ ] Preview: pagos y suscripción de prueba OK (3).
- [ ] Olvidé y cambiar contraseña (4).
- [ ] Puntos 5.1 a 5.8.
- [ ] Runbook de producción ejecutado y verificado (6).
- [ ] Pago real a mano hecho y su factura descartada (3 y 1.1).
- [ ] Prueba en celular real hecha por el socio (5.9).
- [ ] **FAQ actualizada por el socio** (hoy tiene "Pregunta 1 / Respuesta 1"). Recordámelo.
- [ ] **Términos y condiciones actualizados por el socio** (planes, suscripciones, cancelación, beneficio de fundadores). Recordámelo.
- [ ] Planes cargados desde la plantilla.
- [ ] Decidido VA-96 (renombrar a `aircraft`): antes del link o después del lanzamiento, **nunca durante los 10 días**. Preguntame.

## 8. Se puede terminar durante los 10 días (no bloquea el link)

- **Admin y gestión:** VA-102 (gastos fijos y KPI de cobertura) y la gestión de banners (standby).
- **Pro y extras:** VA-98 avanzado (métricas Pro) y VA-99 (carga masiva; mientras tanto, carga asistida a mano).
- **Diseño:** VA-97 (grilla del perfil) y VA-100 (color del footer).
- **Mediciones y celular:** VA-76 (mediciones) y el panel admin en celular.
- **Hangares:** el resto, oculto.
- **Revisión de los socios:** las 6 guías en borrador y la activación de la facturación real después del paso 1.1.
- **Otros:** VA-104 (`milton/actus`), el favicon cuadrado y el fondo de `/faq` (`.jpg` → `.png`).

---

## Variables y acciones del socio (Code completa esta lista a medida que avanza)

| Fecha | Ambiente | Qué | Estado |
|---|---|---|---|
| | Preview | Corregir `MP_WEBHOOK_SECRET` y volver a desplegar | Pendiente |
| | | | |
