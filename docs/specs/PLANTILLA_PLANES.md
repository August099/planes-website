# Plantilla · Planes a cargar en /admin/plans

> **Para Code:** creá (o actualizá) exactamente los planes de abajo usando `planInputSchema` / `planRecordFromInput` de `lib/plan-rules.ts`. Hacelo con un script en `scripts/`, idempotente por `name`, o guiame para cargarlos a mano desde `/admin/plans/new`.
>
> - Mostrame la lista final antes de escribir en la base.
> - Primero solo en la base local; en producción, recién con mi OK.
> - No crees planes de 1 publicación: el aviso suelto se cobra con el precio de `/admin/prices` (ListingPrice).
> - Si un plan pide algo que el formulario todavía no tiene (ver "Pendientes del formulario" al final), avisame antes.

---

## Precios sueltos (no son planes, se editan en /admin/prices)

| Tipo | Precio actual | Precio que quiero |
|---|---|---|
| Aviso de aeronave | AR$ 30.000 | AR$ ______ |
| Aviso de repuesto | AR$ 15.000 | AR$ ______ |
| Aviso de hangar | (ver /admin/prices) | AR$ ______ |

## Precios de destacados (tabla FeaturedPrice)

| Días | Precio (AR$) | Activo (sí/no) |
|---|---|---|
| 7 | ______ | ___ |
| 15 | ______ | ___ |
| 30 | ______ | ___ |

---

## Reglas del formulario (para completar sin errores)

- **Tipo:**
  - `AIRCRAFT_PACK`: pack de aviones, pago único.
  - `SPARE_PART_PACK`: pack de repuestos, pago único.
  - `SUBSCRIPTION`: suscripción mensual o anual.
- **Precio:** en pesos, sin centavos, entre 0 y 10.000.000.
- **Cobro:** solo en suscripciones (`MONTHLY` o `YEARLY`); un pack es siempre pago único.
- **Cupos:** de 0 a 1000. Un pack de aviones necesita al menos 1 aviso de avión, y uno de repuestos al menos 1 de repuesto. Todo plan tiene que incluir alguna publicación.
- **Ilimitados, sin vencimiento, página personalizada y destacados por mes:** solo en suscripciones.
- **Destacados por mes:** de 0 a 100. Se reponen cada período y no se acumulan.
- **Textos:**
  - Título: entre 3 y 80 caracteres.
  - Resumen: hasta 60 caracteres. Si se deja vacío, se arma solo (por ejemplo "3 avisos de avión").
  - Etiqueta: hasta 30 caracteres.
  - Descripción: hasta 300 caracteres.
  - Ítems: hasta 10, de 120 caracteres cada uno.
- Un plan **activo** tiene que mostrarse en al menos una pestaña: Aviones o Repuestos.
- **Orden:** de 0 a 999; cuanto menor, más a la izquierda.

---

## Plan 1

### Lo que usa el sistema
- **Título:**
- **Tipo** (`AIRCRAFT_PACK` / `SPARE_PART_PACK` / `SUBSCRIPTION`):
- **Precio (AR$):**
- **Cobro** (solo suscripción: `MONTHLY` / `YEARLY`):
- **Avisos de avión** (número o "ilimitados"; ilimitados solo en suscripción):
- **Avisos de repuesto** (número o "ilimitados"; ilimitados solo en suscripción):
- **Publicaciones sin vencimiento** (sí/no, solo suscripción):
- **Insignia de vendedor verificado** (sí/no):
- **Página personalizada** (sí/no, solo suscripción):
- **Destacados incluidos por mes** (0–100, solo suscripción):

### Lo que se ve en /plans
- **Resumen** (≤ 60, vacío para que se arme solo):
- **Etiqueta** (≤ 30, ej. "Ahorrá 20%"):
- **Descripción** (≤ 300):
- **Ítems** (uno por línea, hasta 10):
  -
  -
  -
- **Mostrar en la pestaña Aviones** (sí/no):
- **Mostrar en la pestaña Repuestos** (sí/no):
- **Destacar como "Más elegido"** (sí/no):
- **Activo** (sí/no):
- **Orden** (0–999):

### Beneficios Pro que todavía no están en el formulario (marcá si este plan los da)
- **Métricas avanzadas (VA-98)** (sí/no):
- **Carga masiva de repuestos (VA-99)** (sí/no):
- **Avisos de hangar** (número o "ilimitados"; ver pendientes):

---

## Plan 2

### Lo que usa el sistema
- **Título:**
- **Tipo:**
- **Precio (AR$):**
- **Cobro:**
- **Avisos de avión:**
- **Avisos de repuesto:**
- **Publicaciones sin vencimiento:**
- **Insignia de vendedor verificado:**
- **Página personalizada:**
- **Destacados incluidos por mes:**

### Lo que se ve en /plans
- **Resumen:**
- **Etiqueta:**
- **Descripción:**
- **Ítems:**
  -
  -
  -
- **Pestaña Aviones:**
- **Pestaña Repuestos:**
- **"Más elegido":**
- **Activo:**
- **Orden:**

### Beneficios Pro pendientes
- **Métricas avanzadas:**
- **Carga masiva:**
- **Avisos de hangar:**

---

## Plan 3

*(Copiá el bloque del Plan 2 tantas veces como planes quieras.)*

---

## Planes de banner (AD_BANNER, para /banners, VA-103)

Se cargan aparte: el formulario actual de planes no los muestra.

| Título | Precio (AR$) | Duración (días) | Sección donde aparece (informativo) | Descripción corta | Activo |
|---|---|---|---|---|---|
| | | | | | |
| | | | | | |

- **¿El pago es al pedir el banner o después de aprobarlo?** ______

---

## Planes existentes

- **¿Qué hago con los planes que ya están cargados?** (archivar todos / dejar estos: ______ / editar estos: ______)
- **Plan de cortesía para atilasilvero@gmail.com:** ¿qué plan le asigno? ______

---

## Pendientes del formulario (Code: avisame si hace falta implementarlos)

- **HANGAR_PACK** y los campos de hangar (`hangarListingsCount`, `isUnlimitedHangars`, `showInHangarsTab`): están en el schema, pero no en el formulario, y la edición devuelve 404 para estos planes.
- **AD_BANNER:** no se crea ni se edita desde `/admin/plans` (VA-103).
- **Interruptores de "Métricas avanzadas" y "Carga masiva":** todavía no existen en el modelo `Plan` (VA-98 y VA-99).
- **`savingsPercent`:** existe en el schema, pero no en el formulario. Por ahora el ahorro se escribe a mano en la **Etiqueta**.
- **Moneda:** es siempre ARS (`currency` no es editable).
