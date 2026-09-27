# Proceso de trabajo con IA y verificación

Este documento reemplaza al "arnés agéntico" que la consigna sugiere como evidencia. No se usó un agente autónomo: se trabajó en conversación iterativa con **DeepSeek** (chat), donde cada paso del desarrollo —del mockup a la app funcional— se pidió y revisó individualmente. Abajo quedan registrados los prompts persistentes que guiaron el trabajo, las correcciones que hubo que hacer y los comandos reproducibles para verificar que la app cumple la especificación.

## 1. Cómo se trabajó

En lugar de delegar el ciclo completo (leer → planificar → editar → testear) a un agente que corre en el repositorio, cada iteración fue:

1. **Describir el estado actual** de la app (qué archivo, qué hacía, qué faltaba).
2. **Pedir un cambio acotado** — nunca "hazme el proyecto entero".
3. **Leer el código devuelto** y, cuando hubo dudas, preguntar en lugar de aceptar.
4. **Probar la app localmente** (arrancar `npm run dev`, usar la UI, mirar DevTools → Network).
5. **Volver a pedir** con el error concreto o el comportamiento faltante.

Es el mismo ciclo de "dirigir, limitar, verificar" que plantea la consigna, sólo que la ejecución y el diff fueron manuales en vez de automatizados.

## 2. Instrucciones persistentes que se usaron

Estas son las reglas que se mantuvieron constantes en cada interacción y que, si se hubiera usado un agente real, irían en un `AGENTS.md`:

- **No inventar campos.** Toda la información mostrada debe venir de la base `catalog.sqlite`. Si un campo está vacío, se muestra vacío (o un placeholder), no un valor plausible.
- **La búsqueda, los filtros y la paginación viven en el backend.** El frontend nunca descarga el catálogo completo.
- **Reutilizar el CSS del mockup.** No se inventan clases nuevas si ya existe una equivalente en `mockup/styles.css`.
- **Un cambio por iteración.** No refactorizar mientras se agrega una feature.
- **Cada respuesta debe indicar qué archivo cambia y por qué.** Si algo no está claro, preguntar antes de asumir.
- **La base se abre en solo lectura.** Cualquier consulta que intente escribir es un error de diseño.

## 3. Iteraciones registradas

Resumen de los pasos que llevaron del mockup a la app final. Cada uno se validó antes de pasar al siguiente.

| # | Pedido | Qué se verificó antes de continuar |
| --- | --- | --- |
| 1 | Convertir el mockup a React, manteniendo el HTML y el CSS originales. | Que la UI se viera igual al mockup al abrir `:5173`. |
| 2 | Reemplazar el array hardcodeado por un `fetch` a `/api/products`. | Que en DevTools → Network apareciera la petición a `:3000` y que la grilla se poblara. |
| 3 | Implementar el backend Express contra `catalog.sqlite` (sin seed, sin create table). | Que `sqlite3 server/catalog.sqlite "SELECT COUNT(*) FROM products;"` diera el número esperado y `GET /api/products` devolviera filas reales. |
| 4 | Mover búsqueda, filtros y paginación al servidor. | Que cada click de paginación hiciera una sola petición con `page` y `pageSize`, no un `SELECT *`. |
| 5 | Agregar `GET /api/products/filters` para poblar los `<select>`. | Que las opciones coincidieran con `SELECT DISTINCT` de la base. |
| 6 | Quitar el conmutador "Referencia de estados" del mockup. | Que la UI no mostrara más los botones de demo y que los tres estados aparecieran por condiciones reales (red lenta, búsqueda sin resultados, servidor caído). |
| 7 | Paginación real de 3 filas × 4 columnas. | Que en pantalla hubiera 12 cards, que "Siguiente" avanzara al grupo correcto y que el contador dijera "Mostrando 13-24 de N". |

### Correcciones concretas que hubo que pedir

- **IDs como números vs strings.** La base usa `INTEGER PRIMARY KEY`; el primer borrador del frontend trataba `id` como string y el detalle no encontraba el producto. Corrección: `String(product.id)` sólo para mostrar, comparación numérica en la API.
- **`pageSize` en el contrato.** La primera versión del endpoint no lo devolvía; el frontend no podía calcular la ventana de páginas. Corrección: incluirlo en la respuesta junto a `total` y `totalPages`.
- **Rutas relativas en `imageUrl`.** El catálogo de ejemplo traía `assets/10043.jpg`, que no resuelve desde React. Corrección: montar `/images` como estático en Express y normalizar las rutas a `/images/...`.
- **`npm install:all` no instalaba `concurrently`.** El script del root sólo instalaba los hijos. Corrección: documentar `npm install` previo en el README.
- **`allowScripts` en npm 12.** `sqlite3` y `esbuild` quedaban bloqueados silenciosamente. Corrección: `npm install-scripts approve <pkg>` dentro de cada carpeta y commitear el campo resultante.

## 4. Verificación

Comandos reproducibles para comprobar que la app cumple la especificación. Cualquier persona con el repo clonado puede correrlos.

### 4.1 La base responde

```bash
cd server
sqlite3 catalog.sqlite "SELECT COUNT(*) FROM products;"
# → 4032 (o el número real de tu catálogo)

sqlite3 catalog.sqlite "SELECT id, name, price FROM products LIMIT 3;"
# → tres filas reales
```

### 4.2 Los endpoints cumplen el contrato

```bash
# Página por defecto: 12 items, total real
curl -s "http://localhost:3000/api/products" | jq '{count: (.items|length), total, totalPages}'
# → { "count": 12, "total": 4032, "totalPages": 336 }

# Página 2 devuelve productos distintos a la página 1
curl -s "http://localhost:3000/api/products?page=1" | jq '.items[0].id'
curl -s "http://localhost:3000/api/products?page=2" | jq '.items[0].id'
# → IDs distintos

# Búsqueda: nombres que contienen "mayonesa"
curl -s "http://localhost:3000/api/products?q=mayonesa" | jq '.total'
# → algún número > 0

# Filtro: categoría raíz
curl -s "http://localhost:3000/api/products?category=Bodega" | jq '.total'
# → algún número > 0

# Filtros disponibles
curl -s "http://localhost:3000/api/products/filters" | jq '.categories | length, .formats | length'
```

### 4.3 El frontend no descarga todo el catálogo

1. Abrir http://localhost:5173 con DevTools → Network abierto.
2. Filtrar por `api/products`.
3. Al cambiar de página o escribir en el buscador, verificar que cada petición pesa **unos pocos KB** (12 items), no cientos.
4. Ver que el payload contiene `items`, `total`, `page`, `pageSize`, `totalPages`.

### 4.4 Los tres estados aparecen de verdad

| Estado | Cómo provocarlo |
| --- | --- |
| Cargando | Abrir DevTools → Network → Throttling "Slow 3G", recargar la página. |
| Sin resultados | Buscar `zzzzzzzz` en el campo de búsqueda. |
| Error | Detener el servidor (`Ctrl+C` en la terminal del backend) y recargar el frontend. Debe aparecer el mensaje "No pudimos cargar el catálogo" con botón "Reintentar". |

### 4.5 El detalle muestra datos reales

1. Abrir cualquier producto.
2. Confirmar en el diálogo que el enlace "Ver ficha de origen →" apunta a una URL real (columna `productUrl` de la base).
3. Cerrar con Escape, con la × y con clic fuera; los tres deben funcionar.