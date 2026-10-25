# Pase a producción (VA-105)

Runbook paso a paso: lo prepara Code y lo **ejecuta el socio**. Cada paso tiene el comando y el
resultado esperado. Si algo no da lo esperado, **frenar y avisar** antes de seguir.

- Las credenciales nunca pasan por el chat: cada comando usa variables que el socio carga en su
  terminal (`PROD_DATABASE_URL` = conexión **directa** de Supabase, puerto 5432, sin pooler).
- Comandos para **Git Bash** desde la carpeta del proyecto, en la rama que se va a desplegar.
- Nada se borra sin OK explícito.

---

## 1. Backup de producción

```bash
pg_dump --format=custom --no-owner --no-privileges --file="backup-prod-$(date +%Y%m%d-%H%M).dump" "$PROD_DATABASE_URL"
```

**Verificar el archivo:**

```bash
ls -lh backup-prod-*.dump
pg_restore --list backup-prod-*.dump | grep -c "TABLE DATA"
```

Esperado: el archivo pesa más de unos pocos KB y el conteo de `TABLE DATA` es mayor que 30. Guardarlo
fuera del repositorio (no se commitea).

---

## 2. Migraciones

```bash
export DATABASE_URL="$PROD_DATABASE_URL"
npx prisma migrate status
```

**Si `20261008145019_baseline_db_push` figura como pendiente** (la base de producción se armó con
`db push`), primero se confirma que la base ya tiene esos cambios, comparándola con el schema de ese
momento:

```bash
git show 2fd957f:prisma/schema.prisma > /tmp/schema-baseline.prisma
npx prisma migrate diff --from-config-datasource --to-schema /tmp/schema-baseline.prisma --exit-code
```

Esperado: sin diferencias (código de salida 0). **Si muestra diferencias, frenar y mandárselas a Code.**
Si está vacío:

```bash
npx prisma migrate resolve --applied 20261008145019_baseline_db_push
```

**VA-152: informe ANTES de migrar** (solo lee; la migración `va152_limpieza` borra columnas que este
informe necesita). Guardar la salida y mandársela a Code: suscripciones a los planes viejos (de quién),
cuentas con más avisos activos que el cupo Gratis, avisos vencidos o pendientes de pago, compras, pagos y
cupones.

```bash
export RUNTIME_DATABASE_URL="$PROD_DATABASE_URL"
npx tsx scripts/va152-report.ts
```

**Aplicar todas las pendientes y verificar:**

```bash
npm run migrate:deploy
npx prisma migrate status
```

Esperado: la última aplicada es la última carpeta de `prisma/migrations` y el estado dice
**"Database schema is up to date!"**.

`va152_limpieza` pasa a **pausados** los avisos vencidos y "pendiente de pago" (aviones y repuestos; los
hangares no se tocan) y borra el vencimiento, los saldos de publicaciones y la configuración de
renovación y destacados. Las compras, pagos y facturas no se tocan.

Migraciones que entran (si no estaban): VA-43, VA-44, VA-54, VA-11, VA-16, VA-87, VA-59, VA-83, VA-85,
VA-80, VA-84 (dos), VA-92 (dos), VA-105 facturación, contraseña, porcentaje de renovación y compra de
renovación, y desde el 17/10: VA-150, VA-149, VA-148, VA-151 (dos), VA-96 y VA-152 (`va152_cupos` y
`va152_limpieza`). **Ya aplicadas en producción el 24/10** (por error, al migrar el que se creía el Preview; backup posterior en
`Documents/va-backups/backup-prod-20261025-0023.dump`). Lote del 22/10 y 24/10: `va187_fila_pagina_personalizada` (solo datos: "Branding" →
"Página personalizada"), `va182_fundadores`, `va183_ventas` (rellena fecha y precio de los ya vendidos) y
`va190_taxonomia_usuarios`.

---

## 3. Datos base

Todos con `export DATABASE_URL="$PROD_DATABASE_URL"` y `export RUNTIME_DATABASE_URL="$PROD_DATABASE_URL"` (las guías usan la segunda; las variables exportadas mandan sobre el `.env`). Primero **sin** aplicar (solo informan) y
después, si el informe está bien, con el flag de aplicar.

| Qué | Informe | Aplicar | Esperado |
|---|---|---|---|
| Guías | `npx tsx scripts/seed-guides.ts --allow-remote` | `… --apply --allow-remote` | 4 publicadas y 6 en borrador; las que ya existen no se tocan |
| Planes y cupos (VA-152) | `npx tsx scripts/va152-migrate-data.ts --confirm-production` | `… --apply --confirm-production` | Cupo Gratis 1 / 5; Pro y las 3 opciones del Empresarial **sin precio e inactivos**; las cortesías pasan al Empresarial · Todo ilimitado; los planes viejos sin compras se borran y los demás quedan archivados; cupones de avisos inactivos; lotes de lanzamiento borrados. **Si frena por una suscripción paga en un plan viejo, avisar** |
| Coordenadas de los avisos viejos | `npx tsx scripts/geocode-listings.ts --allow-remote` | `… --apply --allow-remote` | Los avisos sin latitud/longitud (los de antes de VA-83) toman el centro de su localidad con la API Georef: sin eso, el mapa del detalle muestra la provincia pero no el punto. Los de ciudad ambigua ("Buenos Aires, Buenos Aires") quedan sin resolver: corregir la ciudad del aviso. Correrlo también en el Preview |
| Planes según la grilla (VA-166, VA-174) | `npx tsx scripts/va166-migrate-data.ts` | `… --apply --confirm-production` | Base 1 / 3 (lo crea la migración), Pro 3 / 10 a AR$ 38.000 (tachado 50.000), Broker 55.000 / 85.000 (tachados 68.000 / 108.000), beneficios de la grilla y la cortesía del admin cerrada. Los planes se activan después en `/admin/plans`. **Si informa suscriptores pagos, frenar y avisar** |
| Marcas y modelos propios (VA-190) | `npx tsx --require ./scripts/stub-server-only.cjs scripts/va190-report.ts` | `… --apply --confirm-production` | Los avisos con "Otra marca" / "Otro modelo" pasan a la lista en MAYÚSCULAS (sin duplicar) y las marcas de repuestos quedan en mayúsculas. Mandarle el informe a Code antes de aplicar |
| Categoría de cada modelo (VA-153) | `npx tsx scripts/va153-import-categorias.ts` | `… --apply --confirm-production` | 3 cambios (PC-12 → BT, Duke → BP, C-425 Conquest → BT); nada "en la planilla pero no en la base" ni al revés. Los avisos con categoría distinta a la de su modelo solo se informan |
| Precios de los planes | `/admin/plans` → Editar | — | Precio de Pro y de las 3 opciones del Empresarial (los definen los socios) y **Activo** en cada uno |
| Facturación | `/admin/payments` → Configuración | — | Tope del monotributo, alerta, desde qué monto se pide DNI y días de gracia |
| Taxonomía | `/admin/taxonomy` | — | Marcas, modelos y categorías como en el Preview |

Guardar cada plan desde `/admin/plans` refresca `/plans` al momento (el script no puede invalidar la
caché: si se cargan los precios de otra forma, `/plans` tarda hasta una hora).

---

## 3b. Producción sin datos de usuarios (pedido del socio, 25/10)

Antes del lanzamiento se borran todas las cuentas (también las de los admins), los avisos y todo lo que cargaron
los usuarios, incluidos los datos financieros de prueba. Se conserva la configuración (taxonomía, filtros,
planes y grilla, guías, ajustes, cupones y gastos fijos). Con producción vacía, el script de VA-190 ya no
tiene nada que corregir.

1. Backup (`docs/BASES_DE_DATOS.md`, 4.3).
2. Con `produccion.ps1`: `npx tsx --require ./scripts/stub-server-only.cjs scripts/wipe-user-data.ts` (informe).
3. Si el informe está bien: el mismo comando con `--apply --confirm-production`.
4. Archivos del storage (`--storage`): ver antes que el Preview y la base local usan las fotos de producción.
5. Después del lanzamiento, cada socio se registra y se lo hace admin por SQL (sección 3, "Hacerse admin").
6. Producción tiene 0 guías: cargarlas con `scripts/seed-guides.ts --allow-remote --apply` (sección 3).

## 4. Limpieza (solo informe primero)

```bash
npx tsx --require ./scripts/stub-server-only.cjs scripts/prod-cleanup-report.ts
# con DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de producción exportadas
# (no usar --env-file=.env: compararía contra la base local)
node scripts/storage-orphans.mjs
```

`prod-cleanup-report.ts` **solo lee**. Lista:

- pagos de prueba, compras nunca activadas, eventos del webhook y facturas (el Preview usó esta base);
- avisos "Prueba…";
- usuarios de prueba (`@ventasaeronauticas.test`, `@resend.dev`, `augusto@gmail.com`);
- los planes que quedan.

`storage-orphans.mjs` sin `--delete` solo informa.

**Mandarle los dos informes a Code.** Lo que se borre se decide juntos y se hace después, con otro
backup.

---

## 5. Variables de Production en Vercel

Settings → Environment Variables → entorno **Production**. Después de cambiarlas: **Redeploy**.

| Variable | Valor en Production | ¿Cambia respecto del Preview? |
|---|---|---|
| `DATABASE_URL`, `RUNTIME_DATABASE_URL` | base de producción | **Sí** (el Preview nunca usa la de producción) |
| `NEXT_PUBLIC_SITE_URL`, `NEXTAUTH_URL`, `APP_URL` | `https://ventasaeronauticas.com` | **Sí** |
| `AUTH_SECRET` | uno propio de producción | **Sí** |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | cliente OAuth de producción | según cómo esté hoy |
| `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY` | credenciales **de producción** de Mercado Pago | **Sí** |
| `MP_WEBHOOK_SECRET` | la clave del webhook **de producción** (paso 6) | **Sí** |
| `MP_NOTIFICATION_URL` | vacía (usa `APP_URL` + `/api/webhooks/mercadopago`) | — |
| `CRON_SECRET` | una propia | **Sí** |
| `BILLING_ENABLED` | `false` hasta terminar el pago real de prueba (paso 8) | — |
| `TUSFACTURAS_API_KEY`, `TUSFACTURAS_API_TOKEN`, `TUSFACTURAS_USER_TOKEN` | las de producción (ya cargadas) | — |
| `TUSFACTURAS_PUNTO_VENTA` | `3` (ya cargada) | — |
| `TUSFACTURAS_MODE` | **vacía** hasta el paso 8; después `production` | — |
| `INVOICES_BUCKET` | vacía (usa `invoices`, ya creado y privado) | — |
| `SUPPORT_EMAIL`, `EMAIL_FROM`, `RESEND_API_KEY` | los de producción | revisar |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | proyecto de producción | revisar |

---

## 6. Fuera del código (checklist)

- [x] URIs del dominio de pre-production cargadas en Google OAuth (socio, 14/10).
- [ ] Google OAuth en estado **publicado** (no "en prueba"), con `https://ventasaeronauticas.com` en
      orígenes autorizados y `https://ventasaeronauticas.com/api/auth/callback/google` en redirecciones.
- [x] Dominio de producción verificado en Resend (SPF y DKIM). `EMAIL_FROM` tiene que usar ese dominio
      también en el Preview (por ejemplo `Ventas Aeronáuticas <no-reply@ventasaeronauticas.com>`): Resend
      solo envía desde dominios verificados, sin importar desde qué URL corre la web.
- [ ] Webhook de producción en Mercado Pago → `https://ventasaeronauticas.com/api/webhooks/mercadopago`,
      eventos **Pagos** y **Planes y suscripciones**. Su clave va a `MP_WEBHOOK_SECRET`.
- [ ] `www.ventasaeronauticas.com` → dominio sin `www` con 301 (Vercel → Domains).
- [ ] Bucket **`documents`** de Supabase en **privado** (Storage → documents → Edit → apagar "Public
      bucket"). Hacerlo **después** del deploy: desde VA-105 los documentos se abren con link firmado.
- [ ] Search Console y Bing Webmaster Tools con `https://ventasaeronauticas.com/sitemap.xml`.

---

## 7. Merge y deploy

1. `milton/auth-roles` → `pre-production`: probar el Preview (login, publicar, pagar con la cuenta de
   prueba, webhook).
2. `pre-production` → `main`, sacando la página "Próximamente" (Code lo prepara en un commit aparte).
3. Verificar:

```bash
curl -s https://ventasaeronauticas.com/robots.txt
curl -s -o /dev/null -w "%{http_code}\n" https://ventasaeronauticas.com/sitemap.xml
```

Esperado: `robots.txt` con `Allow: /` y el sitemap responde `200`.

---

## 8. Pago real de prueba y facturación (en el Preview)

Decidido el 25/10: se prueba en el **Preview** (base propia desde el 25/10), con el **Pro a AR$ 100** y una
tarjeta real. Prueba la suscripción completa: débito, aviso de Mercado Pago, Factura C real, arrepentimiento,
reembolso y nota de crédito. Producción no se toca.

1. Preview, con la cuenta admin → `/admin/plans`: Pro a **AR$ 100**, **Activo**, guardar.
2. Vercel, **solo el ambiente Preview**: `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` con las credenciales de
   **producción** de Mercado Pago; `BILLING_ENABLED=true` y las credenciales reales de TusFacturas (punto de
   venta 3). Redeploy.
3. Mercado Pago → tu aplicación → Webhooks → **modo productivo**: URL
   `https://planes-website-git-pre-production-diodo.vercel.app/api/webhooks/mercadopago` mientras dure la prueba
   (las suscripciones avisan a la URL de la aplicación, no a una por pedido).
4. Con una cuenta **que no sea admin**, suscribirse al Pro y pagar con una tarjeta real.
5. `/admin/payments`: el pago aprobado y la factura **emitida** (Factura C en ARCA).
6. Ajustes → Mis compras → **Arrepentirme**: se devuelven los AR$ 100 (puede tardar unos días según el medio de
   pago), la suscripción termina y se emite la **nota de crédito**. Revisarlo en `/admin/payments`.
7. Al terminar: variables del Preview de vuelta a las de prueba (y `BILLING_ENABLED` como estaba), webhook del
   modo productivo a la URL de producción (o vacío hasta el lanzamiento) y el Pro del Preview a su precio.

Lo que no tiene vuelta atrás: la Factura C y la nota de crédito quedan en ARCA (avisar a quien lleva la
contabilidad) y el cobro de AR$ 100 es real hasta que vuelve el reintegro.

Para producción, el día del lanzamiento: `TUSFACTURAS_MODE=production` y `BILLING_ENABLED=true` (solo
Production), webhook del modo productivo a la URL de producción, y revisar la primera venta real en
`/admin/payments`.

---

## 9. Verificación posterior

- [ ] Home, `/aircraft`, `/spareparts`, un detalle de avión y uno de repuesto.
- [ ] `/plans` con Gratis, Pro y Empresarial (con precio y activos).
- [ ] Login con Google y con email; registro con mail de verificación; "Olvidé mi contraseña" (el mail
      llega y el link funciona).
- [ ] Cupo Gratis (VA-152): una cuenta nueva ve la ventana de bienvenida una vez, publica 1 avión y 5
      repuestos sin pagar nada y, al entrar a publicar un 2.º avión, el formulario avisa que no tiene cupo.
- [ ] `/services/hangars`, `/ads` y `/banners` dan 404.
- [ ] `/about` con los textos reales de la misión (no deben quedar `[COMPLETAR]`) y una sugerencia de prueba llega por mail.
- [ ] `/arrepentimiento` desde el footer lleva a Mis compras.
- [ ] Vercel → Logs sin errores en la primera hora.

## Checklist previo al lanzamiento

- [ ] Pasos 1 a 9 hechos.
- [ ] FAQ y términos actualizados (los actualiza el socio).
- [ ] Prueba en celular real: las 6 pruebas de aceptación de VA-30 y escanear el QR del PDF de un aviso.
- [ ] Planes con precio y activos en `/admin/plans`; el "Pago de prueba" sigue archivado (VA-152).

> VA-158 (18/10): se quitaron los Miembros Fundadores (insignia, admin y textos). Si se manda un mail de
> lanzamiento, el link con `utm_campaign` sigue sirviendo para medir el origen en `/admin/traffic`.
