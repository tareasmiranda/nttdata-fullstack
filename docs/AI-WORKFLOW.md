# Proceso de trabajo con IA y verificación

No se usó un agente autónomo: se trabajó en conversación iterativa con **DeepSeek** (chat), donde cada paso del desarrollo —del mockup a la app funcional— se pidió y revisó individualmente. 

## 1. Cómo se trabajó

En lugar de delegar el ciclo completo (leer → planificar → editar → testear) a un agente que corre en el repositorio (debido a que ni uno de nosotros poseía uno), cada iteración fue:

1. **Describir el estado actual**
2. **Pedir un cambio acotado**
3. **Probar la app localmente**


## 2. Iteraciones registradas

Resumen de los pasos que llevaron del mockup a la app final. Cada uno se validó antes de pasar al siguiente.

| # | Pedido | Qué se verificó antes de continuar |
| --- | --- | --- |
| 1 | Convertir el mockup a React, manteniendo el HTML y el CSS originales. | Que la UI se viera igual al mockup al abrir `:5173`. |
| 2 | Reemplazar el array hardcodeado por un `fetch` a `/api/products`. | Que en DevTools → Network apareciera la petición a `:3000` y que la grilla se poblara. |
| 3 | Implementar el backend Express contra `catalog.sqlite` (originalmente seed, con create table). | Que `sqlite3 server/catalog.sqlite "SELECT COUNT(*) FROM products;"` diera el número esperado y `GET /api/products` devolviera filas reales. |
| 4 | Mover búsqueda, filtros y paginación al servidor. | Que cada click de paginación hiciera una sola petición con `page` y `pageSize`, no un `SELECT *`. |
| 5 | Agregar `GET /api/products/filters` para poblar los `<select>`. | Que las opciones coincidieran con `SELECT DISTINCT` de la base. |
| 6 | Quitar el conmutador "Referencia de estados" del mockup. | Que la UI no mostrara más los botones de demo y que los tres estados aparecieran por condiciones reales (red lenta, búsqueda sin resultados, servidor caído). |
| 7 | Paginación real de 3 filas × 4 columnas. | Que en pantalla hubiera 12 páginas, que "Siguiente" avanzara al grupo correcto y que el contador dijera "Mostrando 13-24 de N". |

### Correcciones concretas que hubo que pedir

- **IDs como números vs strings.** Catálogo originalmente posee ids con decimales, la IA para resolver esto convierte a string y el detalle no encontraba el producto, al final se optó por usar una expresión regular para quitar el decimal.
- **`npm install:all` no instalaba `concurrently`.** La IA generó un package.json en root, para instalar todo de inmediato, pero usa un módulo llamado concurrently. El script del root sólo instalaba los hijos. Corrección: documentar `npm install` previo en el README. Deben existir soluciones más elegantes, pero no tenemos tanta experiencia con node.
- **`allowScripts` en npm 12.** `sqlite3` y `esbuild` quedaban bloqueados silenciosamente. Corrección: `npm install-scripts approve <pkg>` dentro de cada carpeta y commitear el campo resultante, eso genera una sección para que si lo permita dentro de package.

## 3. Verificación (Generado con IA)

Comandos reproducibles para comprobar que la app cumple la especificación. Cualquier persona con el repo clonado puede correrlos.

### 3.1 La base responde

```bash
cd server
sqlite3 catalog.sqlite "SELECT COUNT(*) FROM products;"
# → 4032 (o el número real de tu catálogo)

sqlite3 catalog.sqlite "SELECT id, name, price FROM products LIMIT 3;"
# → tres filas reales
```

### 3.2 Los endpoints cumplen el contrato

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

### 3.3 El frontend no descarga todo el catálogo

1. Abrir http://localhost:5173 con DevTools → Network abierto.
2. Filtrar por `api/products`.
3. Al cambiar de página o escribir en el buscador, verificar que cada petición pesa **unos pocos KB** (12 items), no cientos.
4. Ver que el payload contiene `items`, `total`, `page`, `pageSize`, `totalPages`.

### 3.4 Los tres estados aparecen de verdad

| Estado | Cómo provocarlo |
| --- | --- |
| Cargando | Abrir DevTools → Network → Throttling "Slow 3G", recargar la página. |
| Sin resultados | Buscar `zzzzzzzz` en el campo de búsqueda. |
| Error | Detener el servidor (`Ctrl+C` en la terminal del backend) y recargar el frontend. Debe aparecer el mensaje "No pudimos cargar el catálogo" con botón "Reintentar". |

### 3.5 El detalle muestra datos reales

1. Abrir cualquier producto.
2. Confirmar en el diálogo que el enlace "Ver ficha de origen →" apunta a una URL real (columna `productUrl` de la base).
3. Cerrar con Escape, con la × y con clic fuera; los tres deben funcionar.
