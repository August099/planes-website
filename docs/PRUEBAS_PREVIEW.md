# Pruebas en el Preview (pre-production)

Guía para levantar el Preview y probar todo antes de pasar a producción (16/10/2026). El Preview es
la rama `pre-production` desplegada por Vercel en
`https://planes-website-git-pre-production-diodo.vercel.app`. Pagos: siempre con la **cuenta
vendedora de prueba** de Mercado Pago (nunca las credenciales reales en el Preview). Facturas: nunca
se emiten de verdad acá.

Anotar cada resultado en `docs/REGISTRO_DE_CAMBIOS.md` → "Pruebas de pagos" (y lo que falle, en
"Bugs encontrados").

---

## 1. Base y storage del Preview

**El Preview no puede usar la base de producción** (ver `docs/PAGOS.md` → "Base del Preview").

1. Supabase: un proyecto aparte para el Preview (base + storage). Si ya existe, usarlo.
2. En ese proyecto, Storage: crear los buckets que usa la web, igual que en producción:
   `listings`, `avatars` y `brands` (públicos) y `documents` e `invoices` (privados).
3. Migraciones, desde la PC (PowerShell, sin tocar `.env`). **VA-152:** antes de migrar, el informe
   (solo lee; mandarle la salida a Code):
   ```powershell
   $env:DATABASE_URL = "<conexión directa de la base del Preview>"
   $env:RUNTIME_DATABASE_URL = $env:DATABASE_URL
   npx tsx scripts/va152-report.ts
   npx prisma migrate deploy
   npx prisma migrate status        # "Database schema is up to date!"
   ```
4. Datos base, con la misma variable puesta (y `$env:RUNTIME_DATABASE_URL` igual a la de arriba):
   ```powershell
   $env:RUNTIME_DATABASE_URL = $env:DATABASE_URL
   npx tsx prisma/seed-taxonomy.ts
   npx tsx prisma/seed.ts                # solo si la base está vacía (crea datos de ejemplo)
   npx tsx scripts/seed-guides.ts --allow-remote --apply
   npx tsx scripts/va152-migrate-data.ts --confirm-production            # informe
   npx tsx scripts/va152-migrate-data.ts --confirm-production --apply    # planes y cupos (VA-152)
   Remove-Item Env:DATABASE_URL; Remove-Item Env:RUNTIME_DATABASE_URL
   ```
   (`va152-migrate-data` pide `--confirm-production` cuando la base no es local; acá es la del Preview.)
5. Hacerse admin: registrarse en el Preview y, en el SQL Editor de Supabase,
   `update "User" set "isAdmin" = true where email = '<tu email>';`
6. En `/admin/plans` ("Planes y precios") cargar el precio de Pro y de las 3 opciones del Empresarial
   (para probar, montos de prueba) y marcarlos activos; en `/admin/payments` → Configuración los datos
   de facturación.

---

## 2. Variables de entorno en Vercel (ambiente Preview)

Vercel → Settings → Environment Variables. Para cada una: tildar **solo Preview** y, en "Branch",
elegir **`pre-production`**. Si una variable ya existe marcada en Production y Preview a la vez,
editarla para separar los valores. **Después de cargar todo: Redeploy** del último deploy de
`pre-production` (las variables se leen al desplegar).

| Variable | Valor en el Preview | Notas |
|---|---|---|
| `DATABASE_URL` | conexión directa de la base del Preview | la usan las migraciones |
| `RUNTIME_DATABASE_URL` | pooler de la base del Preview | la usa la app |
| `NEXT_PUBLIC_SITE_URL` | `https://planes-website-git-pre-production-diodo.vercel.app` | links, QR del PDF, sitemap |
| `NEXTAUTH_URL` | la misma URL del Preview | links de los mails (verificación, contraseña) |
| `APP_URL` | la misma URL del Preview | vuelta de Mercado Pago y webhook. **Una variable aparte solo para Preview**: el 16/10 estaba la de producción para todos los ambientes y los avisos de los pagos del Preview iban a `ventasaeronauticas.com` |
| `AUTH_SECRET` | uno propio del Preview (`npx auth secret` o 32 caracteres al azar) | distinto del de producción |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | el cliente OAuth donde agregaste la URI del Preview | redirect: `<URL del Preview>/api/auth/callback/google` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | del proyecto de Supabase del Preview | |
| `RESEND_API_KEY` | la de Resend | |
| `EMAIL_FROM` | una dirección del **dominio verificado** (`...@ventasaeronauticas.com`) | si no, Resend no envía |
| `SUPPORT_EMAIL` | el mail donde quieren recibir sugerencias y avisos | |
| `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` | de la aplicación de la **cuenta vendedora de prueba** | las que estaban en `.env.local` |
| `MP_WEBHOOK_SECRET` | la clave del webhook en **modo prueba** (paso 3) | sin ella, ningún pago se activa |
| `MP_NOTIFICATION_URL` | no crearla | sin ella usa `APP_URL` + `/api/webhooks/mercadopago` |
| `CRON_SECRET` | una cualquiera (opcional) | el cron diario solo corre en Production |
| `BILLING_ENABLED` | `false` | |
| `TUSFACTURAS_MODE` | vacía | en el Preview nunca se factura de verdad |
| `TUSFACTURAS_*` (resto), `INVOICES_BUCKET` | no hacen falta | |

No cargar en el Preview: las credenciales reales de Mercado Pago ni `TUSFACTURAS_MODE=production`.

---

## 3. Webhook de Mercado Pago (modo prueba)

En Mercado Pago, logueado con la **cuenta vendedora de prueba** → Tus integraciones → la aplicación →
Webhooks → Configurar notificaciones → **Modo prueba**:

- URL: `https://planes-website-git-pre-production-diodo.vercel.app/api/webhooks/mercadopago`
- Eventos: **Pagos** y **Planes y suscripciones**.
- Guardar, copiar la **clave secreta** → `MP_WEBHOOK_SECRET` del Preview → Redeploy.

Para pagar: la **cuenta compradora de prueba** (logueado con ella en Mercado Pago, en incógnito) y
las tarjetas de prueba de `docs/PAGOS.md` (titular `APRO` = aprobado, `OTHE` = rechazado).

---

**Si un pago aprobado no se activa solo:** `scripts/process-mp-payment.ts --recent` muestra, por pago,
a qué `notification_url` mandó el aviso Mercado Pago (tiene que ser la del Preview). En la base del
Preview, `select "receivedAt", topic, status, error from "WebhookEvent" order by "receivedAt" desc limit 10;`
muestra si llegó y por qué se rechazó. Para activar a mano una compra: el script con `DATABASE_URL` y
`RUNTIME_DATABASE_URL` de la base del Preview puestas en la terminal.

## 4. Desplegar la rama

```powershell
git checkout pre-production
git pull origin pre-production
git merge milton/auth-roles
git push origin pre-production
git checkout milton/auth-roles
```

Esperar el deploy en Vercel (Deployments) y que termine sin errores.

---

## 5. Qué probar

Marcar cada punto. Celular real para los que dicen 📱.

### Lote del 22/10 y 24/10 (VA-176 a VA-191)

- [ ] **Video (VA-176):** en un aviso de Broker con video, tocar "Ver video": el carrusel no cambia solo mientras suena. Pasar a otra foto (flecha, miniatura o deslizando 📱): el video deja de sonar y al volver aparece "Ver video".
- [ ] **Página personalizada (VA-177):** en `/plans`, `/faq`, Ajustes, el perfil, el buscador y `/admin/plans` no aparece "Página VA".
- [ ] **Republicar (VA-178):** con una cuenta Base o Pro, en el detalle de un aviso propio tocar "Republicar": la franja desaparece, aparece "Actualizado el …" y, si era la última republicación, se apaga el punto de "Mi Cuenta" sin recargar. En Mi cuenta → Activos, ese aviso dice "Republicado. Otra vez desde el …" (7 días después). Con un Broker, después de "Republicar todas", el detalle no muestra el link.
- [ ] **Notificaciones (VA-179):** responder una pregunta en `/questions` apaga el punto de "Mi Cuenta" sin recargar. Verificar el email con el link del mail: al volver, Ajustes ya no muestra "Falta: Email verificado".
- [ ] **Métricas (VA-180):** con una cuenta que no sea admin ni la dueña, marcar como favorito y agregar al comparador un aviso de un Broker. En 1 o 2 minutos, el panel del Broker (Mi cuenta → Métricas, 30 días) lo muestra en la fila de ese aviso (columnas Favoritos y Comparador).
- [ ] **Arrepentimiento (VA-181):** con una suscripción pagada hace menos de 10 días y más avisos que el cupo de Base, "Arrepentirme" muestra lo que se pierde y la lista para elegir qué avisos quedan (no deja tildar más que el cupo). Confirmar: se devuelve el pago, queda activo solo lo elegido, la cuenta sale de las destacadas de la Home al recargar y la página personalizada deja de verse. 📱 El diálogo entra en el celular sin scroll lateral.
- [ ] **Datos faltantes (VA-185):** con una cuenta sin ciudad o sin teléfono, el menú del usuario tiene punto y "Ajustes" también; tocarlo lleva a la sección de datos. "Mi cuenta" no muestra el cartel. Completar y guardar: el cartel y los puntos se van sin recargar.

### Cuentas y lanzamiento
- [ ] Registro con email: llega el mail de verificación y el link abre el Preview (no localhost).
- [x] Login en el Preview (confirmado por el socio, 17/10). Falta confirmar que fue **con Google** y probar el registro de una cuenta nueva con Google.
- [ ] "Olvidé mi contraseña": llega el mail y el link funciona.
- [ ] Ventana de bienvenida: sale **una sola vez** por cuenta nueva y dice "Publicá gratis 1 avión y 5 repuestos. Sin vencimiento".
- [x] Publicar en el Preview (confirmado por el socio, 17/10).

### Cupos (VA-152)
- [ ] Cuenta nueva: publica 1 avión y 5 repuestos sin pagar nada. Al entrar a publicar el 2.º avión, el formulario avisa **al empezar** ("Ya tenés 1 avión activo…") con "Pausar uno de mis avisos", "Pasarme a Pro" y "Guardar como pausado".
- [ ] "Guardar como pausado": el aviso queda pausado y no se ve en el sitio.
- [ ] Perfil → Mis publicaciones: arriba "Plan Gratis · Aviones 1/1 · Repuestos 5/5". Pausar el avión activo y activar el otro funciona; activar sin lugar muestra el mensaje y no lo activa.
- [ ] "Vendido": el aviso deja de verse y no cuenta en el cupo.
- [ ] `/plans`: Gratis, Pro y Empresarial; en el Empresarial, las casillas cambian el precio y el cupo.
- [ ] Ningún texto del sitio habla de vencimiento, renovación, packs ni "pendiente de pago" (Home, `/howtopublish`, `/faq`, `/terms`, perfil, detalle).

### Publicar y ver
- [ ] Formulario de avión: motor opcional en Proyecto, dos obligatorios en Bimotor; texto de fotos (máx. 15).
- [ ] Detalle de avión y de repuesto: título, categoría con link, ficha, mapa de zona (SVG), compartir, PDF con QR (el QR abre el Preview).
- [ ] Listados `/aircraft` y `/spareparts`: orden de filtros, filtros en celular con "Aplicar" siempre visible 📱.
- [ ] Home: 6 destacadas al azar, sin "//" rojas; menú Repuestos con categorías; Servicios sin desplegable.
- [ ] Comparador: la X vacía la bandeja.

### Cuentas y gastos fijos (VA-173)
- [ ] `/admin`: arriba, las cuentas por tipo; tocar "Broker" lleva a `/admin/users` filtrado.
- [ ] `/admin/expenses`: cargar un gasto en dólares y el tipo de cambio; el total mensual en pesos y la cobertura del resumen se actualizan.

### Buscar Brokers (VA-172)
- [ ] Buscar el nombre comercial del admin (o de un Broker) en el header 📱: aparece "Vendedores" con su logo y "N avisos"; el link abre su Página VA.
- [ ] Buscar "cessna": no aparece el bloque (sin Brokers que coincidan).

### Detalle del Broker (VA-170)
- [ ] Como admin, en Ajustes → Página VA: elegir un color de acento y (opcional) una portada para los avisos.
- [ ] Publicar o editar un aviso del admin con un link de YouTube (youtu.be/…); un link que no es de YouTube da error.
- [ ] Abrir ese aviso sin sesión 📱: franja con portada y "Ver Página VA", foto con degradé, datos grandes con el color elegido, la diapositiva "Ver video" (el video carga recién al tocarla), "Más de …" al pie y el PDF con los dos logos.
- [ ] Un aviso de una cuenta Base se ve igual que antes.

### Página VA armable (VA-169)
- [ ] Como admin, en tu perfil → "Editar": agregar un carrusel ("Solo aviones") y un texto, subirlos con las flechas, ocultar uno, ver la vista previa en "Celular" y "Publicar cambios".
- [ ] Sin sesión, el perfil del admin muestra esas secciones (sin la grilla común) 📱.
- [ ] "Guardar borrador": los visitantes siguen viendo lo publicado; el dueño ve "Tenés cambios sin publicar".

### Ajustes (VA-175)
- [ ] Menú de usuario → "Ajustes" (compu y celular 📱): datos, foto, contraseña, plan, compras, facturación, cookies y, con Pro o Broker, la Página VA. Guardar cada sección.
- [ ] "Mi cuenta" ya no tiene pestañas de ajustes ni de compras; "Ajustes" arriba a la derecha.
- [ ] `/arrepentimiento` con sesión lleva a Ajustes → Mis compras.

### Métricas por plan (VA-171)
- [ ] Cuenta Pro (cortesía): pestaña "Métricas" con 7 y 30 días.
- [ ] Como admin (o Broker): además "Últimos 90 días", rango con dos fechas y "Ver rango", "Exportar CSV" (baja un .csv que abre en Excel), fuentes de tráfico, provincias, "Comparador" en la tabla y el efecto de las republicaciones.
- [ ] Desde otra cuenta, agregar al comparador un aviso del admin y entrar a un aviso desde su Página VA: suben "Comparador" y "Clics desde tu Página VA" (la caché tarda hasta 10 minutos).

### Destacadas por plan (VA-168)
- [ ] Con un aviso de una cuenta Pro (cortesía desde `/admin/users`) y otros más nuevos de cuentas Base: en `/aircraft` el del Pro aparece primero; ordenando por precio, no.
- [ ] Home → "Aeronaves destacadas": aparecen primero los avisos de cuentas Pro, Broker y admins.

### Republicar (VA-167)
- [ ] Cuenta Base con avisos activos: en "Mis publicaciones" aparece "Tenés 2 republicaciones disponibles" y el punto en "Mi Cuenta" del menú 📱.
- [ ] "Republicar" en un aviso: confirmar → el aviso aparece primero en "Últimas publicaciones" de la Home y en `/aircraft` (orden por defecto); en su detalle dice "Actualizado el …".
- [ ] Republicar el mismo aviso otra vez: avisa que hay que esperar 7 días. Republicar otro: queda en 0 y el cartel desaparece.
- [ ] Cerrar el cartel con la X: se van el cartel y el punto; vuelven cuando cambia el saldo.
- [ ] Como admin: "Republicar todas" republica todos los avisos activos y después dice "Podés volver a republicar el dd/mm".

### Planes según la grilla (VA-166, VA-174)
- [ ] `/plans` en la compu y en el celular 📱: grilla Base / Pro / Broker con "Promo de lanzamiento" y el precio tachado; en el Broker, apagar "Aviones ilimitados" cambia el precio (85.000 → 55.000) y la fila de aviones pasa a "1".
- [ ] Sin sesión, los botones llevan a crear la cuenta; con una cuenta Base, "Suscribirme"; como admin, "Como admin tenés todo incluido".
- [ ] `/admin/plans`: cambiar el cupo de repuestos de Base a 4, ver la línea "Base pasa de 3 a 4 repuestos activos", guardar y publicar el 4.º repuesto con una cuenta Base. Volverlo a 3.
- [ ] Cuenta Base con 3 repuestos activos: el 4.º pide pausar uno o pasarse a Pro.
- [ ] `/admin/users`: los admins dicen "Admin · Broker completo" (sin "Asignar plan de cortesía").

### Categoría recomendada y formulario guiado (VA-153, VA-165)
- [ ] `/publish` → Aeronave: elegir "Agrícola" en Tipo de aeronave → en Marca solo aparecen marcas con modelos agrícolas (Air Tractor, Cessna, Piper, Thrush…) y en Modelo solo los agrícolas; "Ver todas las marcas" muestra todas.
- [ ] Sin tipo elegido: Cessna → C-182 propone "Monomotor · Pistón" con "Recomendada para este modelo: Monomotor Pistón". Cambiarlo a Agrícola se puede y dice "Elegiste una categoría distinta de la recomendada"; al publicar queda Agrícola.
- [ ] "Otro modelo..." pide el tipo a mano.
- [ ] Home → buscador: elegir una categoría deja solo las marcas con avisos de esa categoría.
- [ ] `/admin/taxonomy` → una marca → cada modelo tiene su selector de categoría recomendada.
- [ ] Un aviso con documentos: sin iniciar sesión se ven y se abren en el detalle; el formulario avisa que son públicos.

### Mapa del detalle (VA-156)
- [ ] Detalle de un aviso con coordenadas: el bloque "Zona" muestra el mapa real con el círculo (sin pin), no deja acercar más que el círculo y se ve la atribución abajo 📱.
- [ ] En celular el mapa se mueve con dos dedos (con uno se scrollea la página).

### Cookies (VA-155)
- [ ] En una ventana de incógnito: el cartel sale abajo y no tapa la bandeja del comparador ni "Aplicar filtros" (celular) 📱.
- [ ] "Solo necesarias": el cartel no vuelve al recargar. Footer → "Cookies" lo abre de nuevo y dice "Elegiste: solo necesarias".
- [ ] `/privacy#cookies` con la tabla de cookies y `/terms` con el punto 9.

### Moderación (VA-154)
- [ ] Reportar un aviso de otra cuenta; en `/admin/report` → "Pausar indefinidamente" con un motivo: el aviso deja de verse (listado, búsqueda, Home) y el detalle dice "no disponible".
- [ ] El dueño entra al sitio: ve la ventana con el motivo una vez (y le llega el mail). En Mis publicaciones: "Pausado por moderación", el motivo y "Pedir revisión"; no puede activarlo.
- [ ] Editar y "Pedir revisión": aparece en "Revisiones pendientes". "Mantener pausado" con mensaje → ventana y mail nuevos; "Reactivar" → vuelve a verse (o queda pausado si no tiene cupo).

### Pagos (cuenta compradora de prueba)
- [ ] **Suscripción al Pro**: en el checkout, el email de la **cuenta compradora de prueba**; vuelve solo al sitio, se activa sola, aparece en el perfil y el cupo pasa a 3 / 15.
- [ ] `/admin/payments`: el cobro aprobado y la factura **pendiente** (no simulada como emitida).
- [ ] Pago **rechazado** (titular `OTHE`): la página dice que no se pudo cobrar y no se activa nada.
- [ ] `/plans` con el Pro activo: "Cancelar" en el Pro y "Cambiar a este plan" en el Empresarial; probar el cambio (inmediato) y un cambio de opción del Empresarial.
- [x] Cancelar la suscripción: queda activa hasta el fin del período (confirmado por el socio, 17/10).
- [ ] **Baja con más avisos que el cupo:** con 3 aviones activos en el Pro, arrepentirse del alta (Mis compras → "Arrepentirme"): se devuelve el pago, la suscripción termina y se pausan los 2 aviones más nuevos.

### Páginas y mails
- [ ] `/about`: el formulario de sugerencias guarda y llega el mail a `SUPPORT_EMAIL`; aparece en `/admin/suggestions`.
- [ ] `/faq`, `/terms`, `/privacy`, `/arrepentimiento` (footer) se ven bien.
- [ ] `/services/hangars`, `/ads` y `/banners` dan 404.
- [ ] Vercel → Logs del Preview sin errores durante las pruebas.

---

## 6. Después

Con todo en verde: pasar a producción con `docs/PASE_A_PRODUCCION.md` (ahí van las credenciales
reales, el webhook de producción, el pago real de prueba (a redefinir con VA-152) y recién después la
facturación).
