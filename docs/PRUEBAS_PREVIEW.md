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
3. Migraciones, desde la PC (PowerShell, sin tocar `.env`):
   ```powershell
   $env:DATABASE_URL = "<conexión directa de la base del Preview>"
   npx prisma migrate deploy
   npx prisma migrate status        # "Database schema is up to date!"
   ```
4. Datos base, con la misma variable puesta (y `$env:RUNTIME_DATABASE_URL` igual a la de arriba):
   ```powershell
   $env:RUNTIME_DATABASE_URL = $env:DATABASE_URL
   npx tsx prisma/seed-taxonomy.ts
   npx tsx prisma/seed.ts                # solo si la base está vacía (crea datos de ejemplo)
   npx tsx scripts/seed-guides.ts --allow-remote --apply
   npx tsx --require ./scripts/stub-server-only.cjs scripts/seed-real-plans.ts --confirm-production --apply
   Remove-Item Env:DATABASE_URL; Remove-Item Env:RUNTIME_DATABASE_URL
   ```
   (`seed-real-plans` pide `--confirm-production` cuando la base no es local; acá es la del Preview.)
5. Hacerse admin: registrarse en el Preview y, en el SQL Editor de Supabase,
   `update "User" set "isAdmin" = true where email = '<tu email>';`
6. En `/admin/prices` cargar los precios sueltos (avión, repuesto, renovación) y en
   `/admin/payments` → Configuración los datos de facturación.

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

### Cuentas y lanzamiento
- [ ] Registro con email: llega el mail de verificación y el link abre el Preview (no localhost).
- [ ] Login con Google.
- [ ] "Olvidé mi contraseña": llega el mail y el link funciona.
- [ ] Ventana de bienvenida del lanzamiento: sale **una sola vez** por cuenta nueva.
- [ ] Publicar un avión y un repuesto **gratis** con el saldo de lanzamiento (sin pasar por Mercado Pago); el segundo avión ya pide pago.

### Publicar y ver
- [ ] Formulario de avión: motor opcional en Proyecto, dos obligatorios en Bimotor; texto de fotos (máx. 15).
- [ ] Detalle de avión y de repuesto: título, categoría con link, ficha, mapa de zona (SVG), compartir, PDF con QR (el QR abre el Preview).
- [ ] Listados `/planes` y `/spareparts`: orden de filtros, filtros en celular con "Aplicar" siempre visible 📱.
- [ ] Home: 6 destacadas al azar, sin "//" rojas; menú Repuestos con categorías; Servicios sin desplegable.
- [ ] Comparador: la X vacía la bandeja.

### Pagos (cuenta compradora de prueba)
- [ ] **Pago único** (por ejemplo el "Pago de prueba" o un aviso suelto): al pagar, vuelve **solo** al sitio y la página pasa sola a "¡Pago acreditado!" (webhook, sin script).
- [ ] `/admin/payments`: el pago aprobado y la factura **pendiente** (no simulada como emitida).
- [ ] Pago **rechazado** (titular `OTHE`): la página dice que no se pudo cobrar y no se activa nada.
- [ ] **Suscripción mensual**: en el checkout, el email de la **cuenta compradora de prueba**; se activa sola y aparece en el perfil.
- [ ] `/plans` con la suscripción activa: "Cancelar" en la actual y "Cambiar a este plan" en las otras; probar el cambio (inmediato).
- [ ] Cancelar la suscripción: queda activa hasta el fin del período.
- [ ] **Arrepentimiento** de un pago único desde Mis compras: se devuelve y se revierte lo comprado.

### Páginas y mails
- [ ] `/about`: el formulario de sugerencias guarda y llega el mail a `SUPPORT_EMAIL`; aparece en `/admin/suggestions`.
- [ ] `/faq`, `/terms`, `/privacy`, `/arrepentimiento` (footer) se ven bien.
- [ ] `/services/hangars`, `/ads` y `/banners` dan 404.
- [ ] Vercel → Logs del Preview sin errores durante las pruebas.

---

## 6. Después

Con todo en verde: pasar a producción con `docs/PASE_A_PRODUCCION.md` (ahí van las credenciales
reales, el webhook de producción, el pago real de AR$ 100 y recién después la facturación).
