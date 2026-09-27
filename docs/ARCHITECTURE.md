# Arquitectura y decisiones

Cómo se dividió la solución, por qué y qué supuestos se tomaron.

## 1. División general

```
┌────────────────────┐         ┌────────────────────┐         ┌──────────────┐
│   Frontend (SPA)   │  HTTP   │   API Express      │  SQL    │   SQLite     │
│  React + Vite      │ ──────► │   Node.js          │ ──────► │ catalog.db   │
│  localhost:5173    │  /api   │   localhost:3000   │ readonly│ (server/)    │
└────────────────────┘         └────────────────────┘         └──────────────┘
```

Tres responsabilidades claras:

- **Frontend**: presentar, capturar intención del usuario (búsqueda, filtro, página) y mostrar estados. No conoce el SQL ni el esquema.
- **API**: aplicar búsqueda, filtros y paginación sobre la base; exponer un contrato estable en JSON; no renderiza ni almacena estado de sesión.
- **Base de datos**: persistencia. Se abre en modo solo lectura para eliminar por diseño cualquier riesgo de mutación accidental del catálogo entregado.

## 2. Por qué este stack

El criterio declarado en la consigna es coherencia con el problema, no popularidad. Las razones concretas:

- **SQLite**: el catálogo ya venía como un archivo. No tiene sentido levantar Postgres o MySQL para leer 4.000 filas estáticas desde disco. SQLite resuelve el problema sin un proceso adicional ni configuración de red, y `OPEN_READONLY` hace explícito que la app no escribe.
- **Express**: la API tiene cinco rutas, todas lecturas con filtros. Express permite escribirlas sin imponer capas que no aportan a esta etapa.
- **React + Vite**: el mockup ya está planteado como una SPA con estados de UI claros (cargando, vacío, error). React hace explícitos esos estados y Vite da un ciclo de desarrollo rápido sin configuración.

No se incorporaron ORMs, capas de caché, GraphQL ni SSR porque ninguno resuelve un problema presente en la Etapa 1.

## 3. Decisiones importantes

### 3.1 Búsqueda, filtros y paginación en el backend

La consigna lo pide explícitamente. Consecuencia de diseño: el frontend **nunca** mantiene el catálogo en memoria. El estado del cliente contiene únicamente los 12 productos de la página actual más los metadatos de paginación. Se decidió desde el principio para que el cliente escale igual si el catálogo crece de 4.000 a 400.000 filas.

### 3.2 Contrato de respuesta paginada

`GET /api/products` devuelve un objeto con `items`, `total`, `page`, `pageSize` y `totalPages`, no un array desnudo. Sin `total` el frontend no puede calcular el número de páginas, y pedirlo en una llamada separada sería una carrera innecesaria.

### 3.3 Endpoint de filtros dedicado

`GET /api/products/filters` devuelve las categorías raíz y los formatos distintos. Se prefirió a derivarlos desde un `SELECT *` inicial porque: (a) respeta la regla de no descargar el catálogo, y (b) separa conceptualmente "qué se puede filtrar" de "qué hay en esta página".

### 3.4 Categoría raíz como unidad de filtro

La columna `category` viene con forma `"Categoría > Subcategoría"`. El filtro por `<select>` usa la categoría raíz (antes del ` > `) porque ofrece un número manejable de opciones; la subcategoría sigue visible en el detalle. El WHERE usa `category = ? OR category LIKE '? > %'` para cubrir ambas formas sin `split` en SQL.

### 3.5 `imageUrl` puede ser absoluta o relativa

La base puede traer URLs completas (`https://...`) o rutas tipo `assets/10043.jpg`. Se decidió:
- Servir `/images` como estático desde Express.
- Normalizar en la base las rutas relativas a `/images/...` cuando haga falta.
- En el cliente, un `onError` muestra un placeholder si la imagen no carga. Esto evita que un catálogo parcial rompa la grilla.

### 3.6 Debounce de búsqueda de 300 ms

Sin debounce, escribir "mayonesa" dispararía ocho peticiones. 300 ms es el punto donde la respuesta se siente inmediata pero se evita el ruido de red. Se acompaña de un guard por `reqId` para descartar respuestas que llegan tarde cuando el usuario cambia de intención rápido.

### 3.7 Tamaño de página 12

4 columnas × 3 filas en escritorio, 6 filas en móvil (2 columnas). Es un número fijo, no se adapta al viewport: cambiar `pageSize` según el ancho haría que la misma URL devuelva páginas distintas según el dispositivo, complicando el enlace directo.

### 3.8 `id` como `INTEGER` en la API

La tabla usa `INTEGER PRIMARY KEY`, así que la API valida con `Number.isInteger` y devuelve 400 si el parámetro no es entero. El frontend convierte a string solo para mostrar (`#{String(id)}`).

## 4. Supuestos que se tomaron y podrían revisarse

- **Orden alfabético por `name`** como criterio de paginación. No fue pedido; se eligió porque es estable y predecible. Si en una etapa futura se agrega orden por precio, hay que mantener un `ORDER BY` determinista para que la paginación no salte filas.
- **Imágenes no versionadas en el repositorio**. Se asume que la columna `imageUrl` apunta a URLs accesibles o a archivos servidos localmente. Commitear miles de imágenes al repo no escala.
- **Base de datos no versionada**. `catalog.sqlite` está en `.gitignore`. Cualquier persona que clone el repo debe traerla aparte. Si esto molesta en un futuro, la alternativa es exportar el catálogo a un `.sql` y cargarlo en el primer arranque.
- **Sin CORS en producción**. CORS está habilitado abierto porque frontend y backend corren en puertos distintos en desarrollo. En producción conviene restringirlo al origen del frontend.

## 5. Lo que se dejó fuera a propósito

No es falta de tiempo, es decisión:

- No hay capa de repositorios ni servicios. Con cinco rutas de lectura, una capa extra sólo agrega archivos que hay que leer para entender lo mismo.
- No hay ORM. El SQL de esta app cabe en una pantalla y es más claro que su equivalente en cualquier ORM.
- No hay tests automatizados con framework. En su lugar hay comandos de verificación reproducibles (ver `AI-WORKFLOW.md`). Agregar Jest o Vitest para tres endpoints de lectura no se justifica en esta etapa.
- No hay Docker. La aplicación se levanta con dos comandos de npm y no depende de servicios externos.