# Guía: levantar Ventas Aeronáuticas en localhost (CachyOS)

Esta guía es para quien ya tiene **PostgreSQL instalado y funcionando** (ver `docs/GUIA_BASE_LOCAL.md`). Al terminar vas a tener el proyecto andando en `http://localhost:3000` con una copia de la base de datos de desarrollo.

Hay pasos que hace **el que ya tiene el proyecto andando** (lo marco como 👤 *Socio con el proyecto*) y pasos que hacés **vos** (💻 *Vos*).

---

## 1. Requisitos · 💻 Vos

Verificá las versiones:

```bash
git --version
node --version     # tiene que ser 20.9 o más nueva, idealmente una versión LTS
npm --version
systemctl status postgresql   # "active (running)"
```

**Usá una versión LTS de Node, no la "current".** En Arch/CachyOS, el paquete `nodejs` instala la última versión, que a veces es muy nueva y genera avisos distintos a los que ve el resto del equipo. Para usar una LTS:

```bash
pacman -Ss nodejs-lts            # lista las LTS disponibles
sudo pacman -S nodejs-lts-XXXX   # instalá la más nueva de la lista (reemplaza al paquete nodejs)
node --version
```

Lo ideal es usar **la misma versión mayor que tu socio** (pregúntale qué le da `node --version`).

## 2. Clonar el repositorio · 💻 Vos

Tu socio te tiene que haber agregado como colaborador en GitHub.

```bash
cd ~/Documentos            # o la carpeta donde quieras tener el proyecto
git clone <URL-del-repo> planes-website
cd planes-website
git checkout milton/auth-roles   # la rama donde se trabaja (confirmalo con tu socio)
git pull
```

## 3. Instalar las dependencias · 💻 Vos

**Usá `npm ci`, no `npm install`:**

```bash
npm ci
```

- `npm ci` instala **exactamente** las versiones de `package-lock.json`, las mismas que usa tu socio.
- `npm install` puede resolver versiones distintas y modificar el `package-lock.json`. Esa es la causa más común de que a uno le aparezcan vulnerabilidades y al otro no.

### Sobre las "vulnerabilidades" que muestra npm

Si al terminar dice algo como `found N vulnerabilities`:

1. **No corras `npm audit fix --force`.** Actualiza paquetes a versiones mayores y puede romper Next.js, Prisma o Auth. Tampoco hace falta `npm audit fix` para trabajar en local.
2. Fijate que no hayas modificado el lockfile: `git status`. Si aparece `package-lock.json` modificado, descartá el cambio con `git checkout package-lock.json` y volvé a correr `npm ci`.
3. Si después de `npm ci` el número sigue siendo distinto del de tu socio, lo más probable es una de dos cosas:
   - la base de avisos de seguridad de npm se actualiza todos los días, así que si tu socio instaló hace un tiempo, a él no le aparecen las alertas nuevas hasta que vuelva a correr `npm audit`;
   - usan versiones distintas de Node o npm.

   Para comparar en igualdad, los dos corren el mismo día: `npm audit`.
4. Casi siempre son avisos de dependencias internas de herramientas de desarrollo, que no afectan al sitio publicado. Si alguno sale como **high/critical** en un paquete que usa la app en producción, se lo pasan a Claude Code para que lo evalúe y lo actualice de forma controlada. No a mano.

## 4. El archivo `.env` · 👤 Socio con el proyecto → 💻 Vos

El `.env` no está en el repo, porque tiene claves.

👤 **Socio con el proyecto:** te pasa una copia de su `.env` por un canal privado, como un mensaje directo o un archivo en un Drive compartido entre ustedes. Nunca en un grupo, un repo o un issue: tiene claves de Supabase, Auth, Resend, Google, etc.

💻 **Vos:**
1. Guardalo como `.env` en la raíz del proyecto (al lado de `package.json`).
2. Cambiá **solo** las dos URLs de base de datos para que apunten a **tu** Postgres:

   ```
   DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/va_dev"
   RUNTIME_DATABASE_URL="postgresql://postgres:TU_CONTRASEÑA@localhost:5432/va_dev"
   ```

   Si tu contraseña tiene símbolos como `@`, `#`, `/` o `:`, escribilos codificados (por ejemplo `@` → `%40`).
3. Verificá que las líneas con URLs de **producción** estén comentadas (con `#` adelante). Nunca desarrolles apuntando a producción.
4. El resto de las claves dejalas igual.

## 5. Copiar la base de datos

### 👤 Socio con el proyecto (Windows): generar el backup

En PowerShell:

```powershell
pg_dump -U postgres -h localhost -F c -d va_dev -f "C:\Users\pc\Documents\backups-va\va_dev_para_socio.dump"
```

Pásale el archivo `.dump` por el mismo canal privado. **Contiene datos reales de usuarios** (la base salió de una copia de producción): no lo subas a ningún lugar público y bórralo de los chats y descargas cuando ya esté restaurado.

### 💻 Vos (CachyOS): restaurarlo

Desde la carpeta donde descargaste el archivo:

```bash
# 1) Crear la base vacía
createdb -U postgres -h localhost va_dev

# 2) Restaurar (sin dueños ni permisos del otro equipo)
pg_restore -U postgres -h localhost -d va_dev --no-owner --no-privileges va_dev_para_socio.dump

# 3) Ir a la carpeta del proyecto y comparar la base con las migraciones de tu rama
cd ~/Documentos/planes-website
npx prisma migrate status
```

- Si dice **"Database schema is up to date!"**: perfecto.
- Si dice que hay **migraciones pendientes**: aplicalas con `npx prisma migrate deploy`.
- Si dice que hay **"drift"**, o propone resetear la base: **frená y no aceptes**. Avisale a tu socio.

Puede aparecer algún aviso durante `pg_restore` sobre extensiones o roles que no existen; si termina y `migrate status` da bien, se puede ignorar. Si ya existía una `va_dev` y querés empezar de cero: `dropdb -U postgres -h localhost va_dev` (borra todo) y repetís desde el paso 1.

## 6. Generar el cliente de Prisma y levantar el sitio · 💻 Vos

```bash
npx prisma generate
npm run dev
```

Abrí `http://localhost:3000`. La primera carga tarda un poco porque compila.

## 7. Tu usuario para probar · 💻 Vos

1. Registrate desde `http://localhost:3000/register` con tu email.
2. Si el mail de verificación no te llega, marcá tu usuario como verificado directamente en tu base local:

   ```bash
   psql -U postgres -h localhost -d va_dev -c "UPDATE \"User\" SET \"emailVerified\" = now() WHERE email = 'tu@email.com';"
   ```

3. Para entrar al panel admin (`/admin`), hacé admin a tu usuario, **solo en tu base local**:

   ```bash
   psql -U postgres -h localhost -d va_dev -c "UPDATE \"User\" SET \"isAdmin\" = true WHERE email = 'tu@email.com';"
   ```

   Cerrá sesión y volvé a entrar. El permiso de admin puede tardar unos minutos en aplicarse.
4. Para ver los datos de la base de forma visual: `npx prisma studio`.

> **Fotos:** las imágenes se guardan en Supabase, no en la base. Con el `.env` de tu socio, lo que subas desde local va al almacenamiento real del proyecto. Usá títulos tipo "Prueba …" y borrá los avisos de prueba al terminar.

## 8. Trabajo diario · 💻 Vos

Cada vez que tu socio (o Claude Code) suba cambios:

```bash
git pull
npm ci                       # solo si cambió package-lock.json
npx prisma migrate deploy    # aplica migraciones nuevas, si las hay
npx prisma generate
npm run dev                  # si estaba corriendo, detenelo (Ctrl+C) y volvé a levantarlo
```

**Reiniciar `npm run dev` después de migrar es obligatorio.** Si no, el servidor sigue con el cliente de Prisma viejo y aparecen errores como "Argument `category` is missing".

Si vos cambiás el schema: `npx prisma migrate dev --name descripcion_corta`, revisás el SQL generado y lo commiteás. **Nunca** `prisma db push`.

## 9. Problemas comunes

| Síntoma | Qué hacer |
|---|---|
| `Port 3000 is in use` | Hay otro `npm run dev` abierto. Cerralo, o Next usa el 3001 solo |
| `Can't reach database server at localhost:5432` | Postgres está detenido: `sudo systemctl start postgresql` |
| `password authentication failed` | La contraseña del `.env` no coincide con la de `postgres`, o tiene símbolos sin codificar |
| `Environment variable not found: DATABASE_URL` | El `.env` no está en la raíz del proyecto o tiene otro nombre (tiene que ser exactamente `.env`) |
| Errores raros de Prisma después de un `git pull` | `npx prisma migrate deploy` → `npx prisma generate` → reiniciar `npm run dev` |
| Estilos o fuentes viejas | Detener el servidor, `rm -rf .next/dev` y volver a levantarlo |
| El login con Google falla en local | La app de Google tiene que tener autorizado `http://localhost:3000` como origen y redirección. Lo configura quien administra la cuenta de Google Cloud; mientras tanto, usá email y contraseña |
| `npm ci` falla con "lockfile out of sync" | Tu `package-lock.json` no coincide con `package.json`: `git checkout package.json package-lock.json` y `git pull`. Si sigue, avisale a tu socio |
