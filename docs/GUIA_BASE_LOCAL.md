# Guía: armar tu base de datos local (Postgres) para Ventas Aeronáuticas

Esta guía es para que cualquier desarrollador del equipo tenga una base local como `va_dev`, la que usamos para desarrollar y probar sin tocar producción. Está armada a partir de cómo quedó configurado el proyecto: README, `docs/REGISTRO_DE_CAMBIOS.md` y VA-10 en el plan.

> **Regla de oro:** nunca uses `prisma db push`, y nunca corras migraciones contra producción desde tu PC salvo que estés haciendo un deploy a propósito. En local se usa `migrate dev` / `migrate deploy` contra **tu** base.

---

## Tutorial · Instalar PostgreSQL en CachyOS (Linux)

CachyOS es una distribución basada en Arch Linux: se instala con `pacman` y el servicio se maneja con `systemd`. Si usás CachyOS, seguí esta sección y salteá el paso 0 de Windows. Todos los comandos de las secciones siguientes funcionan igual en la terminal de Linux; donde dice PowerShell, usá tu terminal normal (bash/fish).

**1. Instalar Postgres, Node y Git**

```bash
sudo pacman -Syu                       # actualizar el sistema primero
sudo pacman -S postgresql nodejs npm git
psql --version                         # verificar
```

Arch instala la última versión estable de Postgres. Sirve cualquiera **igual o más nueva que la 17**: un backup de una versión vieja se restaura sin problemas en una nueva, pero no al revés.

**2. (Recomendado si tu disco usa Btrfs, el sistema de archivos por defecto de CachyOS)**

Desactivá la copia en escritura en la carpeta de datos **antes** de inicializarla, para que Postgres rinda mejor:

```bash
sudo mkdir -p /var/lib/postgres/data
sudo chattr +C /var/lib/postgres/data
sudo chown postgres:postgres /var/lib/postgres/data
```

Si no usás Btrfs, salteá este paso. Podés ver tu sistema de archivos con `findmnt -no FSTYPE /`.

**3. Inicializar el cluster de datos (una sola vez)**

```bash
sudo -iu postgres initdb --locale=C.UTF-8 --encoding=UTF8 \
  --auth-local=peer --auth-host=scram-sha-256 \
  -D /var/lib/postgres/data
```

- `--auth-local=peer`: desde la consola de Linux, el usuario del sistema `postgres` entra sin contraseña.
- `--auth-host=scram-sha-256`: por red (`localhost`, que es lo que usa la app) se pide contraseña, igual que en Windows.

**4. Iniciar el servicio y dejarlo activado al arrancar la PC**

```bash
sudo systemctl enable --now postgresql
systemctl status postgresql            # tiene que decir "active (running)"
```

**5. Ponerle contraseña al usuario `postgres`**

Esta es la que va en el `.env`:

```bash
sudo -iu postgres psql -c "\password postgres"
```

Te pide la contraseña dos veces. Anotala.

**6. Probar la conexión como lo hará la app**

```bash
psql -h localhost -U postgres -c "select version();"
```

Pide la contraseña del paso 5 y muestra la versión. Si funciona, Postgres está listo.

**7. (Opcional) No escribir la contraseña en cada comando**

```bash
echo "localhost:5432:*:postgres:TU_CONTRASEÑA" >> ~/.pgpass
chmod 600 ~/.pgpass                    # obligatorio: si no, Postgres lo ignora
```

**Comandos útiles del servicio:**

```bash
sudo systemctl restart postgresql      # reiniciar
sudo systemctl stop postgresql         # detener
journalctl -u postgresql -e            # ver los logs si algo falla
```

Listo. Seguí desde la sección **1. El archivo `.env`**. En Linux, el `.env` y los comandos de `npx` son exactamente iguales.

---

## 0. Requisitos en Windows (una sola vez)

1. **Node.js** (la versión LTS) y **Git**.
2. **PostgreSQL 17** para Windows (instalador de EDB desde postgresql.org). Usá la versión 17, la misma que usamos, porque un backup de una versión más nueva no se restaura en una más vieja.
   - Durante la instalación te pide una **contraseña para el usuario `postgres`**: anotala, la vas a usar en el `.env`.
   - Dejá el puerto **5432** y marcá "Command Line Tools" (pgAdmin es opcional).
   - El servicio se llama `postgresql-x64-17`. Si algún día la app no conecta, revisá en "Servicios" de Windows que esté iniciado (para iniciarlo hacen falta permisos de administrador).
3. Agregá las herramientas de Postgres al PATH, para poder usar `psql`, `createdb` y `pg_restore` desde la terminal:
   - Carpeta: `C:\Program Files\PostgreSQL\17\bin`.
   - Windows → "Editar las variables de entorno del sistema" → Path → Nuevo → pegar esa ruta. Cerrá y abrí la terminal.
   - Probá con: `psql --version`.
4. Cloná el repo y entrá a la rama de trabajo que corresponda. Después corré `npm install`.

## 1. El archivo `.env`

El `.env` **no está en el repo**: está en `.gitignore`, a propósito, porque tiene claves. Pedile a quien ya tenga el proyecto andando los valores de las claves de servicios (Supabase, Resend, Auth, Google, Stadia, etc.) por un canal privado. Nunca los pegues en chats públicos ni en issues.

Lo que sí tenés que poner vos son las dos URLs de la base local. El proyecto usa **dos variables** que en local apuntan a lo mismo:

```
DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/va_dev"
RUNTIME_DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/va_dev"
```

- `DATABASE_URL` la usa Prisma para migraciones y seeds (`prisma.config.ts`).
- `RUNTIME_DATABASE_URL` la usa la app cuando corre (`lib/prisma.ts`) y algunos scripts.
- Si tu contraseña tiene símbolos como `@`, `#` o `/`, hay que escribirlos codificados (por ejemplo `@` → `%40`).
- Las URLs de producción, si te las pasan, dejalas **comentadas** (con `#` adelante).

Opcional: para no escribir la contraseña en cada comando de `psql`, creá `%APPDATA%\postgresql\pgpass.conf` con esta línea:

```
localhost:5432:*:postgres:TU_CONTRASEÑA
```

---

## 2. Elegí cómo armar la base

Hay dos caminos:

| | Opción A · Copia de la base de otro desarrollador | Opción B · Base limpia desde cero |
|---|---|---|
| Qué obtenés | Exactamente los mismos datos (avisos de prueba, usuarios, guías, coordenadas) | El esquema completo, con las categorías y marcas reales y datos de prueba genéricos |
| Cuándo conviene | Para ver y probar lo mismo que el otro | Para empezar rápido o si no hace falta tener los mismos datos |
| Ojo | `va_dev` salió de una copia de producción: tiene **datos reales de usuarios** (emails, nombres). Tratala como confidencial | Los avisos de prueba no tienen las mismas fotos |

### Opción A · Copia de la base de otro desarrollador

**El que ya tiene la base** genera el backup, en una terminal (PowerShell):

```powershell
pg_dump -U postgres -h localhost -F c -d va_dev -f "C:\Users\pc\Documents\backups-va\va_dev_AAAA-MM-DD.dump"
```

Le pasa el archivo `.dump` por un canal privado (Drive compartido entre ustedes, por ejemplo). Nunca en un lugar público, por los datos reales.

**El que la recibe**, en PowerShell:

```powershell
# 1) Crear la base vacía
createdb -U postgres -h localhost va_dev

# 2) Restaurar el backup (sin dueños ni permisos del otro equipo)
pg_restore -U postgres -h localhost -d va_dev --no-owner --no-privileges "C:\ruta\al\va_dev_AAAA-MM-DD.dump"

# 3) Desde la carpeta del repo: ver si la base está al día con las migraciones de tu rama
npx prisma migrate status
```

- Si dice **"Database schema is up to date!"**: listo.
- Si lista **migraciones pendientes** (porque tu rama es más nueva que el backup), aplicalas con:

  ```powershell
  npx prisma migrate deploy
  ```

- Si dice que la base tiene cambios que no están en las migraciones ("drift"), **frená** y consultá antes de hacer nada. No aceptes un reset.

### Opción B · Base limpia desde cero

En PowerShell, desde la carpeta del repo:

```powershell
# 1) Crear la base vacía
createdb -U postgres -h localhost va_dev

# 2) Crear todas las tablas aplicando las migraciones del repo
npx prisma migrate deploy

# 3) Cargar la taxonomía real: categorías de aeronaves y repuestos, marcas y modelos
npx tsx --env-file=.env prisma/seed-taxonomy.ts

# 4) Cargar datos de prueba: 6 usuarios mock, avisos de aviones y repuestos
npx prisma db seed

# 5) Cargar las guías (las 4 publicadas y las 6 nuevas en borrador)
npx tsx scripts/seed-guides.ts            # primero en modo prueba: muestra qué haría
npx tsx scripts/seed-guides.ts --apply    # después, para escribir
```

Pasos opcionales, para que funcionen el mapa y los filtros por provincia con los datos de prueba:

```powershell
npx tsx --env-file=.env scripts/normalize-provinces.ts          # dry-run
npx tsx --env-file=.env scripts/normalize-provinces.ts --apply
npx tsx --env-file=.env scripts/geocode-listings.ts             # dry-run
npx tsx --env-file=.env scripts/geocode-listings.ts --apply
```

Antes de correr cualquier script, mirá el comentario del principio del archivo: ahí dice qué variables usa y qué flags acepta. Los scripts nuevos corren en modo prueba por defecto y solo escriben con `--apply`.

---

## 3. Levantar la app

```powershell
npx prisma generate     # genera el cliente de Prisma
npm run dev             # http://localhost:3000
```

- **Después de cada migración** (tuya o al traer cambios con `git pull`) corré `npx prisma generate` y **reiniciá `npm run dev`**. En Prisma 7, `migrate` no regenera el cliente, y el servidor sigue usando el viejo: aparecen errores raros como "Argument `category` is missing".
- Si se ven estilos o fuentes viejas, borrá la carpeta `.next/dev` y reiniciá.

## 4. Trabajo diario

- **Traer cambios de otros:** `git pull` → `npx prisma migrate deploy`, si hay migraciones nuevas → `npx prisma generate` → reiniciar `npm run dev`.
- **Cambiar el schema vos:** editás `prisma/schema.prisma` → `npx prisma migrate dev --name descripcion_corta` → revisás el SQL generado en `prisma/migrations/...` → lo commiteás junto con el schema.
- **Ver el estado:** `npx prisma migrate status`.
- **Mirar los datos:** `npx prisma studio` abre un panel en el navegador.

## 5. Cosas a tener en cuenta

- **Las fotos no viven en la base, viven en Supabase Storage.** Si tu `.env` apunta al mismo proyecto de Supabase que producción, lo que subas desde local queda en ese bucket real. Usá avisos de prueba con nombres claros ("Prueba …") y borralos cuando termines.
- **Para iniciar sesión en local:**
  - podés registrarte desde `/register`; para la verificación por mail, Resend tiene la casilla de prueba `delivered@resend.dev`;
  - o usar los usuarios mock del seed, que no tienen contraseña: sirven para mostrar avisos, no para loguearse.
- **No existe todavía "olvidé mi contraseña".** Si te olvidás la de tu usuario de prueba, registrá otro.
- **Nunca** apuntes `DATABASE_URL` a producción en tu `.env` mientras desarrollás. Los comandos de producción se corren de forma explícita en el deploy (ver VA-10 en `docs/PLAN_FIXES_MVP.md`).

## Problemas comunes

| Síntoma | Qué hacer |
|---|---|
| (Windows) `psql`/`createdb` "no se reconoce como comando" | Falta agregar `C:\Program Files\PostgreSQL\17\bin` al PATH (paso 0.3) y reabrir la terminal |
| `password authentication failed` | La contraseña del `.env` no coincide con la del usuario `postgres`, o tiene símbolos sin codificar |
| `connection refused` en el puerto 5432 | El servicio está detenido. Windows: iniciar `postgresql-x64-17` desde "Servicios" como administrador. CachyOS: `sudo systemctl start postgresql` |
| (CachyOS) `Peer authentication failed for user "postgres"` | Faltó `-h localhost` en el comando: sin eso intenta entrar por socket con tu usuario de Linux |
| (CachyOS) `initdb: directory ... exists but is not empty` | Ya estaba inicializado: salteá el paso 3 y seguí desde el 4 |
| `database "va_dev" already exists` | Ya la creaste. Para empezar de cero: `dropdb -U postgres -h localhost va_dev` (borra todo) y repetir |
| `pg_restore: unsupported version` | El backup viene de un Postgres más nuevo que el tuyo: instalá la 17 |
| Errores de Prisma después de un `git pull` | `npx prisma migrate deploy` → `npx prisma generate` → reiniciar `npm run dev` |
