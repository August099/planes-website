# VA-151 · Métricas de la cuenta VA (primer nivel)

> **Contexto.** La "Suscripción VA" (cuenta Pro, con Página VA) suma un panel de métricas en el perfil. **Pocas y útiles:** más adelante habrá una **cuenta empresarial** con analytics completos, así que este nivel cubre lo esencial y deja afuera lo avanzado (lista al final).
> **Reemplaza a la parte "avanzada" de VA-98.** La parte básica de VA-98 (vistas correctas para todos) ya está hecha.
> **Regla general:** preguntame antes si se muestra en la web o queda oculto hasta el lanzamiento.

---

## 1. Quién lo ve

- **Interruptor nuevo en el plan:** `includesSellerMetrics` ("Métricas de vendedor") en `/admin/plans`, como la página personalizada. Prendido en "Suscripción VA". Mostrame el SQL de la migración.
- Lo ve quien tiene una suscripción vigente a un plan con ese interruptor, **incluidas las de cortesía**. Si la suscripción termina, el panel se oculta; los datos siguen guardados y vuelven a verse si se suscribe de nuevo.
- **Usuario sin cuenta VA:** sigue viendo lo básico de cada aviso (vistas y contactos), más una línea discreta: "Con la cuenta VA ves la evolución de tus avisos y de dónde llegan tus contactos" → `/plans`. Sin bloquear nada ni insistir.
- Solo el dueño (y los admins). Nunca es público.

## 2. Qué muestra (pestaña "Métricas" en el perfil propio)

**Selector de período:** últimos **7 días** o **30 días** (por defecto 30). No hay otros rangos.

1. **Resumen**, 4 tarjetas, cada una con la variación contra el período anterior ("+18 % vs. 30 días anteriores"; sin flecha si el anterior fue 0):
   - **Vistas** de todos sus avisos;
   - **Contactos**: formulario + clics en WhatsApp, teléfono y email;
   - **Favoritos nuevos**: cuántas personas guardaron sus avisos;
   - **Visitas a tu Página VA** (su perfil público).
2. **Vistas por día:** un gráfico de línea simple, del período elegido. Sin librerías pesadas: SVG propio o algo liviano (medir el JS).
3. **Contactos por canal:** WhatsApp, teléfono, email y formulario, con cantidad y porcentaje (barras horizontales simples).
4. **Rendimiento por aviso:** tabla con título y foto chica, estado, vistas, contactos, favoritos y **tasa de contacto** (contactos ÷ vistas, en %).
   - Ordenable por cada columna; por defecto, por vistas.
   - Marcar el **más visto** y el de **mejor tasa de contacto**.
   - Avisos con 0 vistas en el período: al final, con el texto "Probá mejorar las fotos o el precio" (tono de ayuda).
   - En celular, tarjetas en vez de tabla.

## 3. Reglas de los datos

- Vistas con el mismo criterio de VA-17 (deduplicadas, solo `AIRCRAFT_VIEW` / `SPARE_PART_VIEW`).
- **No se cuentan** las visitas del dueño, de los admins ni de los bots conocidos.
- **Contactos:** revisá qué eventos existen hoy (formulario `Lead`/`SparePartLead`, clics en WhatsApp/teléfono/email) y contame si falta alguno.
- **Visitas a la Página VA:** si no existe un evento `PROFILE_VIEW`, crearlo, con el mismo criterio de deduplicación y sin contar al dueño. Arranca en cero desde que se despliega (aclararlo en la tarjeta: "Desde el dd/mm").
- **Favoritos nuevos:** por fecha de creación del favorito.
- **Privacidad:** solo totales. **Nunca** quién vio, quién guardó ni datos del visitante.
- **Retención:** la comparación usa hasta 60 días hacia atrás. Verificá que `archiveAndPurgeOldAnalytics` no borre eventos de menos de 60 días y contame cuál es la retención actual.
- Consultas agregadas en la base (`GROUP BY`, `date_trunc`), sin traer eventos a memoria, con caché de unos 10 minutos por usuario.
- Hora argentina para los días del gráfico.

## 4. Diseño

- Seguir `docs/DESIGN_GUIDELINES.md`. Primero celular (375 px): tarjetas de a 2, gráfico de ancho completo y avisos en tarjetas.
- Estados vacíos: "Todavía no hay datos de este período", sin gráficos rotos.
- En `/plans`, sumar el ítem **"Métricas de tus avisos"** a la tarjeta de la Suscripción VA, recién cuando esto esté desplegado.

## 5. Aceptación

- Con datos de prueba en la base local, cada número del panel coincide con la consulta SQL directa. Entregame la tabla métrica → panel → SQL.
- Las visitas del dueño no suman.
- Un usuario sin cuenta VA no ve el panel ni puede pedirlo por URL o por la action.
- Sin cambios en el JS de las páginas públicas; el panel carga su gráfico solo en esa pestaña.
- 375 y 1280 px, sin scroll horizontal.

---

## Queda para la cuenta empresarial (no hacer ahora)

- Fuentes de tráfico, UTM y referrers.
- Búsquedas que llevaron a sus avisos y búsquedas sin resultado de su rubro.
- Comparación con el mercado (precio promedio, posición contra avisos similares).
- Provincia o ciudad de los visitantes.
- Veces que se agregó al comparador.
- Rangos de fecha personalizados (90 días, año), exportar CSV y reportes por mail.
- Embudo vista → contacto, alertas, varios usuarios por cuenta.
