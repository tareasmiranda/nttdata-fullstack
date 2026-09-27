# Especificación — Vitrina de productos

Documento revisado que describe cómo debe comportarse la aplicación. Se derivó del mockup (`mockup/index.html`) y de la consigna del Desafío Full Stack — Etapa 1, y se ajustó después de revisar supuestos con el agente.

## 1. Alcance

**Dentro de esta etapa**

- Listar productos del catálogo en cards.
- Buscar productos por nombre.
- Filtrar por categoría y por formato.
- Paginar los resultados.
- Ver el detalle completo de un producto.
- Comunicar estados de carga, sin resultados y error.

**Fuera de esta etapa**

- Carrito, checkout, pagos.
- Cuentas de usuario o autenticación.
- Administración del catálogo (altas, bajas, ediciones).
- Recomendaciones, historial, comparaciones.

## 2. Comportamientos

### 2.1 Listado de productos

- La grilla muestra los productos como cards.
- Cada card incluye: imagen, nombre, categoría padre, formato y precio formateado.
- El número de resultados visibles por página es **12** (4 columnas × 3 filas en escritorio).
- El contador superior indica el rango actual y el total: `Mostrando 13-24 de 4032`.

### 2.2 Búsqueda

- El campo de búsqueda filtra por **nombre** (`name`), insensible a mayúsculas y acentos.
- La búsqueda tiene un **debounce de 300 ms**: solo se consulta al servidor después de que la persona deja de escribir.
- Cambiar la búsqueda reinicia la paginación a la página 1.

### 2.3 Filtros

- **Categoría**: se filtra por el grupo padre (antes de ` > `). Seleccionar “Bodega” incluye `Bodega > Tinto de verano y sangría`.
- **Formato**: coincidencia exacta con la columna `format`.
- Los filtros se combinan entre sí y con la búsqueda mediante AND.
- Las opciones disponibles se cargan desde el backend (`/api/products/filters`) y reflejan los valores realmente presentes en el catálogo.
- Cambiar cualquier filtro reinicia la paginación a la página 1.

### 2.4 Paginación

- Navegación con botones **← Anterior**, números de página y **Siguiente →**.
- Se muestran hasta 5 números contiguos más el primero y el último, separados por `…` cuando hay saltos.
- Los botones `Anterior` / `Siguiente` se deshabilitan en los extremos.
- Hacer clic en una página desplaza la vista suavemente al inicio de la grilla.
- La barra de paginación **desaparece** cuando hay 0 o 1 páginas, o mientras se está cargando, mostrando error, o no hay resultados.

### 2.5 Detalle del producto

- Al hacer clic en una card se abre un diálogo modal (`<dialog>` nativo).
- Muestra: ID, nombre, descripción completa, categoría, formato, unidad de precio, precio actual, precio original, moneda, fecha de extracción y enlace a la ficha de origen.
- El diálogo se cierra con la tecla `Esc`, con el botón `×`, o haciendo clic fuera de la tarjeta.
- Si la imagen no carga, se muestra un placeholder neutro (`placehold.co`).

### 2.6 Estados de la interfaz

| Estado | Cuándo se muestra | Qué se ve |
| --- | --- | --- |
| **Cargando** | Mientras hay una petición en vuelo y no hay datos previos | Spinner + “Cargando productos” |
| **Normal** | El backend respondió con `total > 0` | Grilla de cards + paginación |
| **Sin resultados** | El backend respondió con `total === 0` | Ícono de búsqueda + “Sin resultados” + botón *Limpiar filtros* |
| **Error** | El backend respondió con error de red o 5xx | Ícono de alerta + “No pudimos cargar el catálogo” + botón *Reintentar* |

Reglas:

- Un filtro sin coincidencias **no** es un error: es el estado “Sin resultados”.
- Mientras se carga una página nueva **sobre datos previos**, no se vuelve al spinner: se mantiene la grilla anterior hasta que llegan los datos.
- Los estados “Sin resultados” y “Error” no muestran paginación.

## 3. Contrato de la API

La consigna exige tres operaciones mínimas. Se implementaron esas tres más dos auxiliares.

### `GET /api/products`

Parámetros de query:

| Nombre | Tipo | Default | Descripción |
| --- | --- | --- | --- |
| `page` | int ≥ 1 | 1 | Página solicitada |
| `pageSize` | int 1-100 | 12 | Productos por página |
| `q` | string | — | Búsqueda en `name` (case-insensitive) |
| `category` | string | — | Filtro por categoría padre |
| `format` | string | — | Filtro por formato exacto |

Respuesta:

```json
{
  "items": [ /* hasta pageSize productos */ ],
  "total": 4032,
  "page": 1,
  "pageSize": 12,
  "totalPages": 336
}
```

### `GET /api/products/:id`

Devuelve un producto o `404` si no existe. Devuelve `400` si el id no es un entero.

### `GET /api/products/filters`

Devuelve las opciones disponibles para filtrar:

```json
{
  "categories": ["Aceite, especias y salsas", "Agua y refrescos", "..."],
  "formats": ["Bandeja", "Bote", "Botella", "..."]
}
```

### `GET /api/products/by-ids?ids=1,2,3`

Auxiliar. Devuelve los productos con esos IDs, respetando el orden solicitado. Máximo 200 IDs. Devuelve `400` si se supera ese límite.

## 4. Supuestos tomados

1. El catálogo ya está normalizado en `catalog.sqlite`; la aplicación no realiza migraciones ni escrituras.
2. Las imágenes se referencian por URL absoluta o por una ruta relativa servida por el backend en `/images/*`.
3. La búsqueda solo cubre `name`. No se busca en `description` en esta etapa.
4. La categoría se filtra por el nivel padre (lo anterior a ` > `) porque es como se presenta en la UI.
5. El precio se formatea como moneda CLP sin decimales (`Intl.NumberFormat('es-CL')`).
6. El catálogo no cambia en tiempo de ejecución; las opciones de filtros se cargan una sola vez al arrancar el frontend.
7. La paginación es determinista: `ORDER BY name` como criterio estable.

## 5. Lo que se dejó fuera de esta especificación y por qué

- **Ordenamiento por precio o relevancia**: no lo pide la consigna y añade complejidad a la API.
- **Búsqueda en descripciones**: descartado por ahora para mantener la consulta `LIKE` simple y rápida.
- **Deep links por producto** (`/product/:id`): la API lo soporta pero el frontend no tiene router. Se puede agregar sin cambios de backend.
- **Internacionalización**: toda la UI está en español porque el catálogo lo está.