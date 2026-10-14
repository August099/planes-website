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

**Aplicar todas las pendientes y verificar:**

```bash
npm run migrate:deploy
npx prisma migrate status
```

Esperado: la última aplicada es `20261014041658_va105_renewal_purchase` y el estado dice
**"Database schema is up to date!"**.

Migraciones que entran (si no estaban): VA-43, VA-44, VA-54, VA-11, VA-16, VA-87, VA-59, VA-83, VA-85,
VA-80, VA-84 (dos), VA-92 (dos), VA-105 facturación, contraseña, porcentaje de renovación y compra de
renovación.

---

## 3. Datos base

Todos con `export DATABASE_URL="$PROD_DATABASE_URL"` y `export RUNTIME_DATABASE_URL="$PROD_DATABASE_URL"` (las guías usan la segunda; las variables exportadas mandan sobre el `.env`). Primero **sin** aplicar (solo informan) y
después, si el informe está bien, con el flag de aplicar.

| Qué | Informe | Aplicar | Esperado |
|---|---|---|---|
| Guías | `npx tsx scripts/seed-guides.ts --allow-remote` | `… --apply --allow-remote` | 4 publicadas y 6 en borrador; las que ya existen no se tocan |
| Planes reales | `npx tsx --require ./scripts/stub-server-only.cjs scripts/seed-real-plans.ts --confirm-production` | `… --apply --confirm-production` | Quedan Plan Repuestos, Plan Aviones, Suscripción VA y **Pago de prueba** (AR$ 100, VA-119, para el paso 8). Las cortesías pasan a Suscripción VA. Si frena por una suscripción paga en otro plan, avisar |
| Precios sueltos | `/admin/prices` | — | Avión AR$ 30.000, repuesto AR$ 15.000 (o los que decidan) y renovación al 70% |
| Facturación | `/admin/payments` → Configuración | — | Tope del monotributo, alerta, desde qué monto se pide DNI y días de gracia |
| Taxonomía | `/admin/taxonomy` | — | Marcas, modelos y categorías como en el Preview |

Después de cargar los planes, en `/admin/plans` abrir uno y tocar **Guardar** (así `/plans` los
muestra sin esperar la hora de caché).

Los precios de los destacados (VA-95) todavía no están: se cargan cuando se termine esa tarea.

---

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
- **fundadores asignados a cuentas de prueba**, para decidirlos en `/admin/users`;
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

- [ ] Google OAuth en estado **publicado** (no "en prueba"), con `https://ventasaeronauticas.com` en
      orígenes autorizados y `https://ventasaeronauticas.com/api/auth/callback/google` en redirecciones.
- [ ] Dominio verificado en Resend (SPF y DKIM).
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

## 8. Pago real de prueba y facturación

1. Con `BILLING_ENABLED=false`, comprar el **Pago de prueba** (AR$ 100, en `/plans`) con una tarjeta real.
2. En `/admin/payments` el pago figura aprobado y su factura **pendiente** (no se emitió nada).
3. Pedir la devolución con el **botón de arrepentimiento** (Perfil → Mis compras → "Arrepentirme", VA-125):
   prueba el reembolso real. En `/admin/payments` el pago queda reintegrado y la factura pendiente, descartada
   (si no, **Descartar** la factura a mano escribiendo DESCARTAR).
   Después, en `/admin/plans`, **Archivar** el "Pago de prueba" para que no se vea más en `/plans`.
4. Recién ahí: `TUSFACTURAS_MODE=production` y `BILLING_ENABLED=true` (solo Production) y Redeploy.
5. La próxima venta real emite la Factura C (punto de venta 3). Revisar la primera en `/admin/payments`.

---

## 9. Verificación posterior

- [ ] Home, `/planes`, `/spareparts`, un detalle de avión y uno de repuesto.
- [ ] `/plans` con los tres planes reales.
- [ ] Login con Google y con email; registro con mail de verificación; "Olvidé mi contraseña" (el mail
      llega y el link funciona).
- [ ] Saldo de lanzamiento (VA-89/VA-111): una cuenta nueva ve la ventana de bienvenida una vez y
      publica un avión y un repuesto sin pasar por Mercado Pago ni factura; un segundo avión ya va al pago.
- [ ] `/services/hangars`, `/ads` y `/banners` dan 404.
- [ ] `/about` con los textos reales de la misión (no deben quedar `[COMPLETAR]`) y una sugerencia de prueba llega por mail.
- [ ] `/arrepentimiento` desde el footer lleva a Mis compras.
- [ ] Vercel → Logs sin errores en la primera hora.

## Checklist previo a mandar el link a los fundadores

- [ ] Pasos 1 a 9 hechos.
- [ ] Cupón de fundadores creado y probado (vigencia en hora argentina, usos por persona).
- [ ] FAQ y términos actualizados (los actualiza el socio).
- [ ] Prueba en celular real: las 6 pruebas de aceptación de VA-30 y escanear el QR del PDF de un aviso.
