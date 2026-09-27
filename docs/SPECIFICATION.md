# Especificación — Vitrina de productos

Documento revisado de comportamientos que la aplicación debe cumplir. Escrito a partir del mockup (`mockup/index.html`)

## 1. Objetivo

Permitir que una persona explore un catálogo de supermercado de aproximadamente 4.000 productos sin descargar el catálogo completo, encontrando lo que busca mediante búsqueda, filtros y paginación.

## 2. Alcance

**Dentro:**
- Vitrina en páginas, con imagen, nombre, categoría, formato y precio.
- Búsqueda por nombre.
- Filtro por categoría y por formato.
- Paginación de 12 productos por página (4 columnas × 3 filas en escritorio).
- Detalle de producto en un diálogo modal.
- Estados: cargando, sin resultados, error.

## 3. Comportamientos esperados

### 3.1 Listado de productos

- Al abrir la aplicación, se muestran los primeros 12 productos del catálogo ordenados por nombre.
- Cada card muestra: imagen (`imageUrl`), ID (`#<id>`), categoría raíz (parte antes de ` > `), nombre, formato y precio formateado en CLP (ya viene en CLP pero con decimales).
- La grilla ocupa 4 columnas en escritorio, 2 en tablet y 2 en móvil.

### 3.2 Búsqueda

- El campo de búsqueda filtra por coincidencia parcial en el nombre, insensible a mayúsculas y acentos.
- La búsqueda se ejecuta con un debounce de 300 ms desde la última pulsación.
- Cada nueva búsqueda resetea la paginación a la página 1.

### 3.3 Filtros

- Dos `<select>`: uno por categoría raíz, otro por formato.
- Las opciones se cargan una sola vez desde `GET /api/products/filters` (no se derivan del catálogo en el cliente).
- Categoría y formato se pueden combinar entre sí y con la búsqueda.
- Cualquier cambio de filtro resetea la paginación a la página 1.

### 3.4 Paginación

- Tamaño de página fijo: 12.
- Controles: "← Anterior", ventana de números con `…` cuando hay saltos, "Siguiente →".
- Anterior y Siguiente se deshabilitan en los extremos.
- Al cambiar de página, la grilla se desplaza suavemente al inicio.
- El total de páginas se calcula en el backend (`Math.ceil(total / pageSize)`) y se comunica al cliente.

### 3.5 Detalle de producto

- Al hacer clic en una card se abre un `<dialog>` nativo con: imagen grande, ID, nombre, descripción completa, categoría, formato, unidad de precio, precio publicado, precio original, fecha de extracción y enlace a la ficha de origen.
- Se cierra con el botón ×, con Escape, o haciendo clic fuera del diálogo.

### 3.6 Estados

| Estado | Cuándo se muestra |
| --- | --- |
| Cargando | Mientras la primera petición de la página está en curso. |
| Sin resultados | El backend responde con `total = 0` para la búsqueda/filtros actuales. |
| Error | La petición falla (red, 500, timeout). Se ofrece botón "Reintentar". |
| Normal | Hay al menos un resultado para la página actual. |

## 4. Contrato de la API

La búsqueda, los filtros y la paginación **deben** resolverse en el backend. El frontend no debería descargar todo.
Claro que con el tamaño se puede y no demora mucho, pero no es ideal si se despliega hacia varios usuarios.

### `GET /api/products`

Parámetros de query:
- `page` (int, ≥ 1, default 1)
- `pageSize` (int, 1–100, default 12)
- `q` (string, opcional)
- `category` (string, opcional — matchea categoría raíz)
- `format` (string, opcional)

Respuesta:
```json
{
  "items": [ /* productos de esta página */ ],
  "total": 4032,
  "page": 1,
  "pageSize": 12,
  "totalPages": 336
}
```

### `GET /api/products/:id`

- `:id` es entero (la tabla usa `INTEGER PRIMARY KEY`).
- 404 si no existe, 400 si el parámetro no es un entero.

### `GET /api/products/filters`

```json
{
  "categories": ["Aceite, especias y salsas", "Agua y refrescos", ...],
  "formats": ["Bandeja", "Bote", "Botella", ...]
}
```

## 5. Fuente de datos

- Base SQLite `server/catalog.sqlite`.
- Tabla `products` con columnas: `id` (INTEGER PK), `name`, `description`, `format`, `category`, `price` (REAL), `priceUnit`, `originalPrice` (REAL), `currency`, `imageUrl`, `productUrl`, `extractedAt`.
- No se completan campos con valores inventados: si `imageUrl` está vacío o falla, se muestra un placeholder genérico (Que hasta ahora no ha pasado).
