# Cómo trabajar con las bases de datos

Desde el 25/10/2026 hay tres bases separadas. Esta guía es para manejarlas sin ayuda: qué es cada una, cómo
apuntar a la correcta y los comandos de cada tarea. Todos los comandos son de **PowerShell** y se corren
desde la carpeta del proyecto (`C:\Users\pc\Documents\planes-website`), salvo que se diga otra cosa.

## 1. Las tres bases

| Base | Para qué se usa | Quién la usa | Dónde está la conexión |
|---|---|---|---|
| **Local** (`va_dev`, en tu PC) | Desarrollo y pruebas automáticas | `npm run dev` y Code | `.env` del proyecto |
| **Preview** (Supabase, proyecto de pruebas) | Probar en Vercel antes de lanzar | Vercel, rama `pre-production` | Vercel → Preview, tu gestor de contraseñas y `preview.ps1` |
| **Producción** (Supabase, proyecto actual) | La web real | Vercel, rama `main` | Vercel → Production, tu gestor de contraseñas y `produccion.ps1` |

Lo que pasa en una base no afecta a las otras. El `.env` del proyecto apunta siempre a la local: **nunca
pongas ahí la conexión del Preview ni la de producción.**

## 2. Preparación (una sola vez)

### 2.1 Dos archivos con las conexiones, fuera del proyecto

Creá la carpeta `C:\Users\pc\va-env` y adentro estos dos archivos. Están fuera del repo, así que nunca
terminan en git. Las conexiones salen de Supabase → el proyecto → **Connect** → "Session pooler" (puerto
5432).

`C:\Users\pc\va-env\preview.ps1`:

```powershell
$env:DATABASE_URL = "<conexión del Preview, puerto 5432>"
$env:RUNTIME_DATABASE_URL = $env:DATABASE_URL
$Host.UI.RawUI.WindowTitle = "BASE: PREVIEW"
Write-Host "`n  Apuntando a la base del PREVIEW  `n" -ForegroundColor Black -BackgroundColor Yellow
```

`C:\Users\pc\va-env\produccion.ps1`:

```powershell
$env:DATABASE_URL = "<conexión de producción, puerto 5432>"
$env:RUNTIME_DATABASE_URL = $env:DATABASE_URL
$Host.UI.RawUI.WindowTitle = "BASE: PRODUCCION"
Write-Host "`n  CUIDADO: apuntando a la base de PRODUCCION  `n" -ForegroundColor White -BackgroundColor Red
```

Y uno para volver a la normalidad, `C:\Users\pc\va-env\salir.ps1`:

```powershell
Remove-Item Env:DATABASE_URL, Env:RUNTIME_DATABASE_URL -ErrorAction SilentlyContinue
$Host.UI.RawUI.WindowTitle = "PowerShell"
Write-Host "Variables borradas: los comandos vuelven a usar la base local (.env)."
```

Si PowerShell no deja correr los archivos, una sola vez:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

### 2.2 Variables en Vercel

En Vercel → Settings → Environment Variables, cada una de estas cinco tiene un valor para **Preview**
(proyecto de pruebas) y otro para **Production** (proyecto actual):

- `DATABASE_URL`: Session pooler, puerto 5432.
- `RUNTIME_DATABASE_URL`: Transaction pooler, puerto 6543, terminada en `?pgbouncer=true`.
- `NEXT_PUBLIC_SUPABASE_URL`: Settings → API → Project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Settings → API → `anon` key.
- `SUPABASE_SERVICE_ROLE_KEY`: Settings → API → `service_role` key.

Después de cambiar una variable hay que hacer **Redeploy** para que la tome.

## 3. Antes de cualquier comando: mirá a qué base apuntás

1. Abrí **una terminal nueva** para cada base. No mezcles las dos en la misma.
2. Cargá la base: `. C:\Users\pc\va-env\preview.ps1` (con el punto y el espacio adelante).
3. Fijate el cartel y el título de la ventana.
4. Corré `npx prisma migrate status` y leé la **primera línea**: dice el host. Tiene que ser el del proyecto
   que querés. Si dice `localhost` o `va_dev`, la variable no se cargó.
5. Al terminar: `. C:\Users\pc\va-env\salir.ps1` o cerrá la terminal.

Este paso es el que evita aplicar algo en la base equivocada (el 24/10 se migró producción creyendo que era
el Preview).

## 4. Tareas de todos los días

### 4.1 Aplicar migraciones nuevas

El orden es siempre **local → Preview → producción**:

1. **Local:** las aplica Code y te muestra el SQL antes.
2. **Preview:** cuando Code avisa que hay migraciones nuevas, y antes de subir `pre-production`:
   ```powershell
   . C:\Users\pc\va-env\preview.ps1
   npx prisma migrate status      # muestra las pendientes
   npx prisma migrate deploy
   npx prisma migrate status      # tiene que decir "Database schema is up to date!"
   . C:\Users\pc\va-env\salir.ps1
   ```
3. **Producción:** solo el día del pase y **después del backup** (4.3), con los mismos comandos y
   `produccion.ps1`.

Si `migrate deploy` muestra un error, no lo vuelvas a correr: pasale el texto del error a Code (sin la
conexión).

### 4.2 Scripts de datos (informe y aplicar)

Los scripts de `scripts/` primero informan (solo leen) y después aplican con `--apply`. Contra el Preview o
producción, además, piden `--confirm-production`.

```powershell
. C:\Users\pc\va-env\preview.ps1
npx tsx --require ./scripts/stub-server-only.cjs scripts/va190-report.ts                                  # informe
npx tsx --require ./scripts/stub-server-only.cjs scripts/va190-report.ts --apply --confirm-production     # aplicar
. C:\Users\pc\va-env\salir.ps1
```

Leé el informe antes de aplicar. Cada script dice en su primer comentario qué hace.

### 4.3 Backup de producción

Antes de tocar producción, siempre. Queda en `Documents\va-backups` con la fecha y la hora:

```powershell
. C:\Users\pc\va-env\produccion.ps1
$out = "C:\Users\pc\Documents\va-backups\backup-prod-$(Get-Date -Format yyyyMMdd-HHmm).dump"
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" --format=custom --no-owner --no-privileges --schema=public -d $env:DATABASE_URL -f $out
Get-Item $out | Select-Object Name, Length
. C:\Users\pc\va-env\salir.ps1
```

Si el tamaño da 0 o hay un error, no sigas con el pase.

### 4.4 Refrescar el Preview con una copia de producción

Sirve para probar con datos parecidos a los reales. **Borra todo lo que haya en el Preview.**

1. Hacé un backup de producción (4.3).
2. En Supabase del Preview → SQL Editor, vaciá la base:
   ```sql
   drop schema public cascade;
   create schema public;
   grant usage on schema public to postgres, anon, authenticated, service_role;
   grant all on schema public to postgres, service_role;
   ```
3. Restaurá sin las líneas del esquema `public` (Supabase ya lo crea y no deja recrearlo):
   ```powershell
   . C:\Users\pc\va-env\preview.ps1
   $dump = "C:\Users\pc\Documents\va-backups\<el backup>.dump"
   $lista = "C:\Users\pc\Documents\va-backups\lista-restore.txt"
   & "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" -l $dump | Where-Object { $_ -notmatch 'SCHEMA - public|SCHEMA public' } | Set-Content -Encoding ascii $lista
   & "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" --no-owner --no-privileges --exit-on-error -L $lista -d $env:DATABASE_URL $dump
   npx prisma migrate status
   . C:\Users\pc\va-env\salir.ps1
   ```
4. Si el código en `pre-production` tiene migraciones que producción todavía no tiene, aplicalas (4.1, paso 2).

Las fotos de los avisos copiados siguen en el storage de producción y se ven igual. Lo que se sube desde el
Preview queda en el storage del Preview.

### 4.5 Ver datos o hacer una consulta

Para mirar, lo más simple es Supabase → el proyecto → **Table Editor** o **SQL Editor**: el nombre del
proyecto está arriba, así que no hay confusión. Para cambiar datos en producción, preferí el admin de la web
o un script de Code antes que el SQL Editor.

## 5. Si algo sale mal en producción

1. No corras nada más.
2. Avisale a Code con lo que viste (sin conexiones ni claves).
3. Si hay que volver atrás, el backup más reciente está en `Documents\va-backups`. Restaurarlo sobre
   producción reemplaza todo lo cargado después del backup: es la última opción y se decide antes con los
   socios.

## 6. Reglas cortas

- `.env` = local. Preview y producción solo en `va-env\*.ps1`, en Vercel y en tu gestor de contraseñas.
- Una terminal por base; primera línea de Prisma revisada antes de confirmar.
- Migraciones: local → Preview → producción. Producción, siempre después de un backup.
- Los informes se leen antes de aplicar.
- Las migraciones y los scripts contra el Preview o producción los corrés vos y le pasás la salida a Code.
