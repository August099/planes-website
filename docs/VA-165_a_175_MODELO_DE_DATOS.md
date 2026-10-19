# VA-165 a VA-175 · Qué cambia de VA-152/153 y modelo de datos propuesto (19/10)

> Para revisar antes de migrar. **No se aplicó nada.** Cada bloque de SQL es una migración aparte, en el
> commit de su tarea, creada con `migrate dev` (o, si `migrate dev` se cuelga como en VA-152, con
> `migrate diff` + `migrate deploy`, verificando con la shadow DB que el resultado coincide con el schema).
> Los cambios de **datos** con montos o planes van en un script con modo informe (como `va152-migrate-data.ts`),
> no en la migración, porque en producción pueden diferir.

---

## 1. Qué cambia de lo hecho en VA-152 y VA-153

| Tema | Hoy (VA-152/153) | Con el lote del 19/10 |
|---|---|---|
| Cupo gratis | "Gratis" 1 avión / 5 repuestos (tabla `QuotaSettings`) | **Base 1 / 3**. Base pasa a ser un plan más (fila en `Plan`, `tier = BASE`, precio 0), así toda la grilla se edita en un solo lugar |
| Pro | 3 / 15, sin Página VA ni métricas | **3 / 10**, $38.000 (tachado $50.000), verificado, destacadas, **Página VA actual** ("banner en el perfil") y **métricas Pro** |
| Empresarial | 3 opciones; único con Página VA y métricas | **"Broker / Empresa"**: aviones ilimitados o repuestos ilimitados $55.000, ambos $85.000 (tachados $68.000 y $108.000); lo no ilimitado, cupo de **Base**. Página VA **completa** y armable, detalles personalizados, métricas completas |
| Beneficios | `includesCustomPage` y `includesSellerMetrics` (sí/no) | Niveles: Página VA **ninguna / banner / completa** y métricas **básicas / Pro / completas**, más **destacadas**, **detalles personalizados** y **republicaciones** |
| Precio | uno por plan | **real** (se cobra, etiqueta "Promo de lanzamiento") y **tachado** (solo se muestra) |
| Categoría del modelo (VA-153) | fija: el modelo pone la categoría y no se puede cambiar | **recomendada**: se completa sola, se puede cambiar ("Recomendada para este modelo: …"); las reglas usan la elegida; sin "Avisanos" |
| Filtros y buscador por categoría | marcas según la categoría de los **modelos** | marcas según los **avisos reales** de esa categoría |
| Admins | como el Empresarial; 1 admin con una suscripción de cortesía | **Broker completo para siempre**, se ve "Admin"; su cortesía se **cierra** (no se borra) |

**Cuentas por encima del cupo nuevo en `va_dev`** (`scripts/va166-report.ts`, solo lee): **6 de 17**. Las 6
son de prueba y **ya estaban por encima con 1 / 5** por la cantidad de aviones (de 3 a 6 aviones activos con
cupo 1); el paso de 5 a 3 repuestos **no suma ninguna cuenta nueva**. Conservan sus avisos y no pueden
publicar ni activar más hasta quedar dentro del cupo (criterio de VA-152). Hay 2 cortesías vigentes: la de
1 admin (se cierra con VA-174) y la de 1 cuenta que no es admin (queda como Broker de cortesía, como hoy).

---

## 2. VA-165 · Categoría recomendada

Se renombra la columna (no se pierde lo cargado ni lo aplicado en producción por VA-153). El submodelo
(`categoryOverride`) queda como está: todos están vacíos y heredan la del modelo (decisión del 18/10).

```sql
ALTER TABLE "AircraftModel" RENAME COLUMN "defaultCategoryId" TO "recommendedCategoryId";
ALTER TABLE "AircraftModel" RENAME CONSTRAINT "AircraftModel_defaultCategoryId_fkey"
  TO "AircraftModel_recommendedCategoryId_fkey";
```

---

## 3. VA-166 + VA-174 · Planes según la grilla

```sql
-- Niveles nuevos
ALTER TYPE "PlanTier" ADD VALUE 'BASE';
CREATE TYPE "VaPageLevel" AS ENUM ('NONE', 'BANNER', 'FULL');
CREATE TYPE "MetricsLevel" AS ENUM ('BASIC', 'PRO', 'FULL');

ALTER TABLE "Plan"
  ADD COLUMN "listPrice"             DECIMAL(12,2),                         -- precio tachado (solo se muestra)
  ADD COLUMN "republishesPerYear"    INTEGER NOT NULL DEFAULT 0,            -- Base 2, Pro 5
  ADD COLUMN "republishAllEveryDays" INTEGER,                               -- Broker: 30 ("Republicar todas")
  ADD COLUMN "includesFeatured"      BOOLEAN NOT NULL DEFAULT false,        -- VA-168
  ADD COLUMN "vaPageLevel"           "VaPageLevel" NOT NULL DEFAULT 'NONE', -- VA-169
  ADD COLUMN "includesCustomDetail"  BOOLEAN NOT NULL DEFAULT false,        -- VA-170
  ADD COLUMN "metricsLevel"          "MetricsLevel" NOT NULL DEFAULT 'BASIC'; -- VA-171

-- Lo que había pasa a los niveles nuevos y se quitan las columnas viejas
UPDATE "Plan" SET "vaPageLevel" = CASE WHEN tier = 'BUSINESS' THEN 'FULL'::"VaPageLevel"
                                       WHEN "includesCustomPage" THEN 'BANNER'::"VaPageLevel" ELSE 'NONE' END,
                  "metricsLevel" = CASE WHEN tier = 'BUSINESS' THEN 'FULL'::"MetricsLevel"
                                        WHEN "includesSellerMetrics" THEN 'PRO'::"MetricsLevel" ELSE 'BASIC' END;
ALTER TABLE "Plan" DROP COLUMN "includesCustomPage", DROP COLUMN "includesSellerMetrics";

-- Ajustes globales: la espera entre republicaciones del mismo aviso (VA-167). El cupo gratis pasa
-- al plan Base (lo crea el script de datos con los valores de esta tabla) y se quitan sus columnas.
ALTER TABLE "QuotaSettings"
  ADD COLUMN "republishCooldownDays" INTEGER NOT NULL DEFAULT 7,
  DROP COLUMN "freeAircraftQuota", DROP COLUMN "freeSparePartQuota";

-- Filas de la grilla de /plans (y del admin)
CREATE TABLE "PlanGridRow" (
  "id"        TEXT NOT NULL,
  "label"     TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "systemKey" TEXT,                           -- fila que mueve la lógica (cupos, republicaciones, verificado,
                                              -- destacadas, Página VA, detalles, métricas): no se borra y su
                                              -- valor sale de las columnas de Plan
  "cells"     JSONB NOT NULL DEFAULT '{}',    -- filas propias: {"BASE":{"kind":"yes"|"no"|"text","text":"…"},"PRO":…,"BROKER":…}
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlanGridRow_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlanGridRow_systemKey_key" ON "PlanGridRow"("systemKey");
```

> El `ALTER TYPE … ADD VALUE` va en su propia migración (Postgres no deja usar el valor nuevo en la misma
> transacción). El orden de la columna `QuotaSettings.free*` → plan Base: **primero** el script de datos
> crea la fila Base copiando esos valores y **después** la migración quita las columnas (dos migraciones,
> como `va152_cupos` y `va152_limpieza`).

**Script de datos `scripts/va166-migrate-data.ts`** (informe / `--apply` / `--confirm-production`):
- crea el plan **Base** (precio 0, 1 / 3, 2 republicaciones por año, métricas básicas) y las filas de la grilla
  de la imagen (sistema + "Edición libre de publicaciones" y "Contacto del vendedor" como filas propias);
- **Pro:** 3 / 10, $38.000 (tachado $50.000), 5 republicaciones, verificado, destacadas, Página VA banner,
  métricas Pro;
- **Broker / Empresa** (las 3 filas del Empresarial): $55.000 / $55.000 / $85.000 (tachados $68.000 /
  $68.000 / $108.000), "Republicar todas" cada 30 días, verificado, destacadas, Página VA completa,
  detalles personalizados, métricas completas;
- **VA-174:** las suscripciones de cortesía (`source = MANUAL`) de cuentas admin pasan a `CANCELLED` (no se
  borran; sin pagos asociados) y sus avisos no se tocan;
- informa cuántos suscriptores pagos tiene cada plan (en `va_dev` y producción hoy: ninguno).

---

## 4. VA-167 · Republicar

Una columna **no nula** para ordenar (Prisma no puede ordenar por `republishedAt ?? createdAt`): arranca
igual a `createdAt` (el orden "recientes" de hoy) y solo cambia al republicar. El detalle muestra
"Actualizado el …" si es posterior a la publicación. El saldo **no se guarda**: sale de contar las
republicaciones del período (auditable, sin desfasajes).

```sql
ALTER TABLE "Aircraft"  ADD COLUMN "lastPublishedAt" TIMESTAMP(3);
UPDATE "Aircraft"  SET "lastPublishedAt" = "createdAt";
ALTER TABLE "Aircraft"  ALTER COLUMN "lastPublishedAt" SET NOT NULL, ALTER COLUMN "lastPublishedAt" SET DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "Aircraft_status_lastPublishedAt_idx" ON "Aircraft"("status", "lastPublishedAt");
-- ídem "SparePart"

CREATE TABLE "Republication" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "aircraftId"  TEXT,
  "sparePartId" TEXT,
  "bulk"        BOOLEAN NOT NULL DEFAULT false,   -- "Republicar todas" (Broker): una fila por aviso, todas con bulk
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Republication_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Republication_userId_createdAt_idx" ON "Republication"("userId", "createdAt");
CREATE INDEX "Republication_aircraftId_idx"  ON "Republication"("aircraftId");
CREATE INDEX "Republication_sparePartId_idx" ON "Republication"("sparePartId");
ALTER TABLE "Republication" ADD CONSTRAINT "Republication_userId_fkey"      FOREIGN KEY ("userId")      REFERENCES "User"("id")      ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "Republication" ADD CONSTRAINT "Republication_aircraftId_fkey"  FOREIGN KEY ("aircraftId")  REFERENCES "Aircraft"("id")  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Republication" ADD CONSTRAINT "Republication_sparePartId_fkey" FOREIGN KEY ("sparePartId") REFERENCES "SparePart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Solo si el mail de reposición se aprueba (pregunta abierta):
ALTER TABLE "User" ADD COLUMN "republishEmails" BOOLEAN NOT NULL DEFAULT true;
```

El cartel "Tenés N republicaciones" se cierra en el navegador (se guarda el saldo que se cerró; vuelve si
cambia): no hace falta columna.

---

## 5. VA-168 · Destacadas

Sin cambios de datos: sale de `Plan.includesFeatured` (y de `isAdmin`).

---

## 6. VA-169 + VA-175 · Página VA armable

Los datos de la página (nombre comercial, logo, portada, WhatsApp, descripción) siguen en `User`, como hoy.
Las secciones van en una tabla aparte, con borrador y publicado ("Publicar cambios"):

```sql
CREATE TABLE "ProfilePage" (
  "userId"        TEXT NOT NULL,
  "sections"      JSONB NOT NULL DEFAULT '[]',  -- publicadas; validadas con zod (máx. 6)
  "draftSections" JSONB,                        -- en edición; null = sin cambios sin publicar
  "publishedAt"   TIMESTAMP(3),
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProfilePage_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "ProfilePage" ADD CONSTRAINT "ProfilePage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Cada sección: `{ id, type: "carousel" | "grid" | "text", title, hidden, rule?: "recent" | "aircraft" |
"parts" | {category}, listingIds?: [...], order?: "manual" | "recent", body? }`. Si el Broker baja de plan,
la fila queda guardada y no se muestra.

---

## 7. VA-170 · Detalle del Broker

```sql
ALTER TABLE "User"
  ADD COLUMN "detailCoverUrl" TEXT,          -- portada propia para los detalles (si no, la de la Página VA o la estándar)
  ADD COLUMN "accentColor"    VARCHAR(16);   -- clave de una paleta cerrada (ej. "navy", "red", "teal"); null = la de VA
ALTER TABLE "Aircraft"  ADD COLUMN "youtubeUrl" VARCHAR(100);
ALTER TABLE "SparePart" ADD COLUMN "youtubeUrl" VARCHAR(100);
```

---

## 8. VA-171 · Métricas por plan

```sql
ALTER TYPE "AnalyticsEventType" ADD VALUE 'COMPARE_ADD';            -- se agregó al comparador
ALTER TYPE "AnalyticsEventType" ADD VALUE 'PROFILE_LISTING_CLICK';  -- clic a un aviso desde la Página VA
ALTER TABLE "AnalyticsEvent" ADD COLUMN "region" VARCHAR(8);        -- provincia aproximada (encabezado de
                                                                    -- Vercel, sin guardar la IP)
```

**Retención:** hoy la purga manual del admin borra todo lo de más de 90 días. Para 90 días y rango
personalizado propongo que la purga **conserve 13 meses** los eventos de avisos y perfiles (vistas,
contactos, perfil, comparador) y siga borrando a los 90 días el resto (páginas, búsquedas, filtros). Peso
estimado: ~0,3 KB por evento con índices; 100.000 vistas por mes ≈ 30 MB por mes, ~400 MB al año (el plan
de Supabase incluye 8 GB). Se revisa con los números reales de producción en VA-164.

---

## 9. VA-172 · Buscar Brokers

Sin cambios de datos ni índice nuevo: se busca solo entre las cuentas con `ProfilePage.publishedAt` y
plan con Página VA completa (decenas de filas, no toda la tabla de usuarios), con el debounce de hoy. Si
algún día son miles, se agrega un índice trigram.

---

## 10. VA-173 · Gastos fijos

```sql
CREATE TYPE "ExpenseFrequency" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TABLE "FixedExpense" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "amount"    DECIMAL(12,2) NOT NULL,
  "currency"  TEXT NOT NULL DEFAULT 'ARS',   -- 'ARS' o 'USD'
  "frequency" "ExpenseFrequency" NOT NULL DEFAULT 'MONTHLY',
  "since"     TIMESTAMP(3) NOT NULL,
  "notes"     TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FixedExpense_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ExchangeRate" (
  "id"          TEXT NOT NULL,
  "usdToArs"    DECIMAL(12,2) NOT NULL,
  "date"        TIMESTAMP(3) NOT NULL,
  "createdById" TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ExchangeRate_date_idx" ON "ExchangeRate"("date");
```

El contador de cuentas por tipo y su variación del mes se calculan de `User` y `Subscription` (sin tabla).
