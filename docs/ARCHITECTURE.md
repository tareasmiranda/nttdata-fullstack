# Arquitectura y decisiones

Cómo se dividió la solución, por qué y qué supuestos se tomaron.

## 1. División general
Se buscaba una estructura sencilla y luego de consultarlo con la IA, resulta que se puede mantener un servidor de API junto con la base de datos SQLite. Opuesto a tener algo estilo Nginx + NodeJS + Posgres + Servidor BD. Se buscaba simplicidad, a lo que se decidió en:
```
┌────────────────────┐         ┌────────────────────┐         ┌──────────────┐
│   Frontend         │  HTTP   │   API Express      │  SQL    │   SQLite     │
│  React + Vite      │ ──────► │   Node.js          │ ──────► │ catalog.db   │
│  localhost:5173    │  /api   │   localhost:3000   │         │ (server/)    │
└────────────────────┘         └────────────────────┘         └──────────────┘
```

## 2. Por qué este stack especificamente

Es sencillamente su rapidéz, Vite es demasiado rápido para el usuario final.

- **SQLite**: Es la base de datos más sencilla de implementar, en vez de PostgreSQL que requiere más configuración
- **Express**: Elejido luego de elejir REACT, ya que así se puede trabajar todo en el mismo lenguaje: JavaScript.
- **React + Vite**: Una de las formas más rápidas y sencillas de "lanzar", muy rápido.

## 3. Decisiones importantes

### 3.1 Búsqueda, filtros y paginación en el backend

Al comienzo se cargaban todos los registros, luego al ver las especificaciones lo cambiamos a que solo se cargue lo que muestra en pantalla y se crearon más lineas en la API.

### 3.2 Endpoint de filtros dedicado

`GET /api/products/filters` devuelve las categorías raíz y los formatos distintos. Se prefirió a derivarlos desde un `SELECT *` inicial porque: (a) respeta la regla de no descargar el catálogo, y (b) separa conceptualmente "qué se puede filtrar" de "qué hay en esta página".

### 3.3 Categoría raíz como unidad de filtro

La columna `category` viene con forma `"Categoría > Subcategoría"`. El filtro por `<select>` usa la categoría raíz (antes del ` > `) porque ofrece un número manejable de opciones; la subcategoría sigue visible en el detalle. El WHERE usa `category = ? OR category LIKE '? > %'` para cubrir ambas formas sin `split` en SQL.

### 3.4 `imageUrl` y espacios en blanco

La base puede traer URLs completas (`https://...`), cuando no:
En el cliente, un `onError` muestra un placeholder si la imagen no carga. Esto evita que un catálogo parcial rompa la grilla.

### 3.5 Debounce de búsqueda de 300 ms

Sin debounce, escribir "mayonesa" dispararía ocho peticiones. 300 ms es el punto donde la respuesta se siente inmediata pero se evita el ruido de red. Se acompaña de un guard por `reqId` para descartar respuestas que llegan tarde cuando el usuario cambia de intención rápido (Full IA esto).

### 3.6 Tamaño de página 12

4 columnas × 3 filas en escritorio, 6 filas en móvil (2 columnas). Es un número fijo, no se adapta al viewport: cambiar `pageSize` según el ancho haría que la misma URL devuelva páginas distintas según el dispositivo, complicando el enlace directo.

### 3.7 `id` como `INTEGER` en la API

La tabla usa `INTEGER PRIMARY KEY`, así que la API valida con `Number.isInteger` y devuelve 400 si el parámetro no es entero. El frontend convierte a string solo para mostrar (`#{String(id)}`).

## 4. Supuestos que se tomaron y podrían revisarse

- **Orden alfabético por `name`** como criterio de paginación. No fue pedido; se eligió porque es estable y predecible. Si en una etapa futura se agrega orden por precio, hay que mantener un `ORDER BY` determinista para que la paginación no salte filas.
- **Base de datos disponible** Cualquier persona que clone el repo tendra acceso a la base de datos. Security issues.
- **Sin CORS en producción**. CORS está habilitado abierto porque frontend y backend corren en puertos distintos en desarrollo. En producción conviene restringirlo al origen del frontend. Algo que la inteligencia artificial sugirió varias veces.
