# VA-89 · Revisión final de la experiencia mobile (última tarea, después de Mercado Pago)

> **Orden:** es la ÚLTIMA tarea antes del lanzamiento. Va después de la integración con Mercado Pago y TusFacturasAPP, para revisar todo el sitio terminado.

## Objetivo
Comprobar que absolutamente todo funciona bien en celulares y mejorar lo que haga falta para que la experiencia mobile sea cómoda, no solo "que entre en la pantalla".

## Paso 1 · Relevamiento automático
- Script de Playwright que recorra todas las rutas públicas y privadas (con un usuario de prueba logueado y uno admin) en estos anchos: 360, 375, 390, 414 y 768 px. Para cada ruta:
  - captura de página completa;
  - detección de scroll horizontal (`document.documentElement.scrollWidth > innerWidth`);
  - errores de consola;
  - imágenes rotas;
  - elementos táctiles de menos de 44×44 px.
- Lighthouse mobile en: Home, `/planes`, un detalle de aeronave, `/spareparts`, `/services/hangars`, `/planes/compare` y `/publish`.
- Volcar todo en `docs/QA_MOBILE.md`, con una tabla de ruta × problema × severidad (bloqueante / importante / menor) y las capturas en `docs/qa-mobile/`.

## Paso 2 · Checklist de flujos completos (en emulación y luego en celulares reales)
1. Registro, verificación de email, login con email y con Google, recuperar contraseña.
2. Elegir tipo de perfil y editar el perfil. Perfil con página personalizada.
3. Publicar una aeronave, un repuesto y un hangar con fotos sacadas desde la cámara del celular (`accept="image/*"`). Verificar la compresión antes de subir (límite de 4,5 MB de Vercel) y que no se pierdan los datos si se bloquea la pantalla o se cambia de app a mitad del formulario.
4. Pagar el plan con Mercado Pago (cuentas de prueba): ida al checkout, pago aprobado, rechazado y pendiente, vuelta al sitio, publicación activada y factura recibida por mail.
5. Buscar y filtrar en `/planes`, `/spareparts` y `/services/hangars`, con el panel de filtros mobile, chips activos y limpiar filtros.
6. Detalle:
   - galería con swipe y zoom (abrir y cerrar con la X);
   - mapa con gestos táctiles, que no secuestre el scroll de la página;
   - preguntas, favoritos, compartir y descargar PDF (probar especialmente en iOS Safari);
   - recomendaciones en carrusel.
7. Comparador:
   - agregar desde las tarjetas;
   - la bandeja inferior no tapa contenido ni botones y respeta el área segura del iPhone;
   - la tabla se desplaza bien con la columna de etiquetas fija.
8. Explorar por provincia (mapa y selector), tipos de aeronave y guías.
9. Panel del usuario (mis publicaciones, renovar, pausar, preguntas) y panel admin en tablet.
10. Páginas de error, mantenimiento y offline.

## Paso 3 · Problemas típicos a revisar sí o sí
- **Zoom involuntario en iOS** al enfocar inputs: font-size mínimo de 16 px en inputs, selects y textareas.
- **Altura de pantalla**: reemplazar `100vh` por `100dvh`/`svh` donde corresponda (la barra del navegador corta contenido).
- **Teclado** tapando el campo activo o el botón de enviar en formularios largos.
- **Elementos fijos** (header, bandeja del comparador, barras inferiores) con `env(safe-area-inset-bottom)`, y que no se superpongan entre sí.
- **Modales y menús**: bloqueo del scroll del fondo, cierre con gesto o tap afuera, foco correcto.
- **Hover**: nada importante puede depender solo del hover (no existe en touch).
- **Links de contacto**: `tel:` y `https://wa.me/…` funcionando.
- **Carruseles**: swipe fluido y sin enganches con el scroll vertical.
- **Rendimiento en 4G**: imágenes con `sizes` correctos y nada pesado fuera de pantalla.

## Paso 4 · Mejoras de experiencia mobile (proponer y, con mi OK, implementar)
- **Barra de contacto fija** abajo en los detalles (WhatsApp / Preguntar / Favorito) que aparece al pasar la galería.
- **Botón Compartir** con la Web Share API (con copia del link como alternativa).
- **Filtros** en un panel inferior (bottom sheet), con el botón "Ver N resultados".
- **Formulario de publicación**: progreso visible por pasos, guardado de borrador local (con try/catch) y botón "Siguiente" siempre al alcance del pulgar.
- **"Agregar a pantalla de inicio"**: revisar el manifest, los íconos y el theme-color, si no están completos.
- Cualquier otra mejora que surja del relevamiento, priorizada en `docs/QA_MOBILE.md`.

## Paso 5 · Prueba en celulares reales
- Al final, dejarme una lista corta de pasos para que yo pruebe en un iPhone (Safari) y en un Android (Chrome), porque la emulación no detecta todo (teclado, cámara, gestos y Mercado Pago).

## Aceptación
- Cero problemas bloqueantes e importantes abiertos en `docs/QA_MOBILE.md`.
- Sin scroll horizontal en ningún ancho.
- Lighthouse mobile ≥ 85 en las páginas principales.
- Los 10 flujos pasan en emulación.
- La prueba en celulares reales queda documentada con su resultado.
