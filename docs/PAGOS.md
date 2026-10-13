# Pagos y facturación (VA-92)

Mercado Pago (Checkout Pro para pagos únicos y API de Suscripciones para los mensuales) y facturación
automática (Factura C) con TusFacturasAPP. Especificación: `docs/specs/VA-92-pagos-y-facturacion.md`.
Este documento se completa a medida que se cierra cada etapa.

## Ambientes

| | Local | Preview (rama `pre-production`) | Producción |
|---|---|---|---|
| URL | `http://localhost:3000` | `https://planes-website-git-pre-production-diodo.vercel.app` | `https://ventasaeronauticas.com` |
| Base | `va_dev` (Postgres local) | **una base aparte** (ver abajo) | Supabase de producción |
| Credenciales de MP | de prueba | de prueba | de producción |
| Webhooks | no llegan (sin túnel) | sí: se prueban acá | sí |
| Facturación | `BILLING_ENABLED=false` | `false` hasta tener TusFacturas de desarrollo | `true` |

**Los webhooks se prueban en el Preview, no en local** (decisión del 12/10/2026: sin túnel). El
desarrollo sigue en local y cada etapa se despliega a `pre-production` para probar el flujo completo.

## Variables de entorno

Nombres en `.env.example`. Valores: en local, `.env.local` (nunca `.env`, que es de las
migraciones); en Vercel, Settings › Environment Variables, con el ambiente que corresponda.

| Variable | Local | Preview | Producción | Notas |
|---|---|---|---|---|
| `MP_ACCESS_TOKEN` | prueba | prueba | producción | Si las suscripciones dan "payer and collector must be both real or test users", usar el de una aplicación creada en la cuenta **vendedora de prueba**. |
| `MP_PUBLIC_KEY` | prueba | prueba | producción | Checkout Pro redirige: hoy no se usa en el cliente. |
| `MP_WEBHOOK_SECRET` | opcional | sí | sí | Sin ella el webhook responde 401 a todo y lo registra (fail closed). |
| `APP_URL` | `http://localhost:3000` | URL del preview | URL de producción | `back_urls` de Mercado Pago. |
| `MP_NOTIFICATION_URL` | opcional | opcional | no | `notification_url` de las preferencias. Si falta: `APP_URL` + `/api/webhooks/mercadopago`. |
| `BILLING_ENABLED` | `false` | `false` | `true` | En `false` los pagos funcionan y la factura queda pendiente. |
| `CRON_SECRET` | opcional | sí | sí | Cron diario de suscripciones (`vercel.json` → `/api/cron/subscriptions`). Vercel la manda como `Authorization: Bearer …`. Sin ella, el cron responde 401 y no cierra nada. |
| `TUSFACTURAS_APIKEY`, `TUSFACTURAS_APITOKEN`, `TUSFACTURAS_USERTOKEN`, `TUSFACTURAS_PUNTO_VENTA` | — | desarrollo | producción | Etapa 4. |

## Base del Preview

El build de Vercel (`prisma generate && next build`) **no aplica migraciones**: la base de cada
ambiente se migra a mano con `prisma migrate deploy`.

**Cómo verificar que el Preview no usa la base de producción:** en Vercel › Settings › Environment
Variables, buscar `DATABASE_URL` y `RUNTIME_DATABASE_URL` y mirar en qué ambientes están marcadas.
Si la misma variable tiene tildados **Production y Preview**, el Preview usa la base de producción.
Para confirmarlo sin mostrar la contraseña, comparar el identificador del proyecto de Supabase que
aparece en el host o en el usuario de la URL (`db.<ref>.supabase.co` o `postgres.<ref>@...pooler...`)
de la variable de Production con la de Preview.

**Recomendación:** un proyecto de Supabase aparte para `pre-production` (base y storage propios: las
fotos que se suben desde el Preview tampoco tienen que ir al storage de producción). Variables de
Preview limitadas a la rama `pre-production` (Vercel permite elegir la rama en el ambiente Preview).

Aplicarle las migraciones (desde la PC, en PowerShell, sin tocar `.env`):

```powershell
$env:DATABASE_URL = "<conexión directa de la base de pre-production>"
npx prisma migrate deploy
Remove-Item Env:DATABASE_URL
```

`prisma.config.ts` carga `.env` con `dotenv`, que no pisa una variable que ya existe en el entorno:
el comando usa la de pre-production. Después hace falta cargar los datos base (categorías, taxonomía,
planes, precios por aviso, guías): ver el checklist de la etapa en `docs/PLAN_FIXES_MVP.md`.

## Webhooks de Mercado Pago

- Ruta: `POST /api/webhooks/mercadopago`.
- URL a cargar en Mercado Pago (Tus integraciones › la aplicación › Webhooks › Configurar
  notificaciones, **modo prueba**):
  `https://planes-website-git-pre-production-diodo.vercel.app/api/webhooks/mercadopago`
- Eventos: **Pagos** y **Planes y suscripciones** (opcional: Reclamos y Contracargos).
- La clave secreta que muestra el panel va en `MP_WEBHOOK_SECRET` del ambiente Preview.
- Después de cambiar una variable en Vercel hay que **volver a desplegar** para que la tome.

## Suscripciones

- Se crean por API (preapproval), sin "Planes de suscripción" del panel: el precio sale de `/admin/plans`.
- En el checkout se pide el **email de la cuenta de Mercado Pago** que autoriza el débito. **En pruebas tiene que ser el de la cuenta compradora de prueba**; si no, Mercado Pago responde "Both payer and collector must be real or test users" (el usuario ve "Mercado Pago no aceptó ese email").
- Cada cobro llega por el webhook (`subscription_authorized_payment`): aprobado extiende el período y deja la factura pendiente; rechazado abre la gracia (días en la configuración de facturación) y manda un mail.
- "Cancelar suscripción" pausa el débito en Mercado Pago; el cron diario la cancela al terminar el período.

## Tarjetas de prueba (Argentina)

Datos de la documentación de Mercado Pago (verificar ahí si algo cambia). Pagar siempre con la
**cuenta compradora de prueba**. Vencimiento: cualquier fecha futura (por ejemplo 11/30).

| Tarjeta | Número | CVV |
|---|---|---|
| Mastercard crédito | 5031 7557 3453 0604 | 123 |
| Visa crédito | 4509 9535 6623 3704 | 123 |
| American Express | 3711 803032 57522 | 1234 |
| Mastercard débito | 5287 3383 1025 3304 | 123 |
| Visa débito | 4002 7686 9439 5619 | 123 |

El **nombre del titular** define el resultado (documento: DNI 12345678 para aprobar; ver la
documentación para el resto):

| Titular | Resultado |
|---|---|
| `APRO` | Aprobado |
| `CONT` | Pendiente |
| `OTHE` | Rechazado por error general |
| `CALL` | Rechazado: validar para autorizar |
| `FUND` | Rechazado: monto insuficiente |
| `SECU` | Rechazado: código de seguridad inválido |
| `EXPI` | Rechazado: fecha de vencimiento |
| `FORM` | Rechazado: error en el formulario |

## Checklist de pase a producción

Se completa en la Etapa 6.
