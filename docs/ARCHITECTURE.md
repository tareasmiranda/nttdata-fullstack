# Arquitectura y decisiones

## 1. Vista general

```
┌───────────────────────────┐         ┌──────────────────────────┐
│  Frontend (React + Vite)  │  HTTP   │  Backend (Express)       │
│  localhost:5173           │ ──────► │  localhost:3000          │
│                           │  JSON   │                          │
│  - App.jsx                │         │  - index.js              │
│  - ProductDialog.jsx      │         │  - abre SQLite RO        │
│  - api.js                 │         │  - resuelve filtros      │
└───────────────────────────┘         └────────────┬─────────────┘
                                                   │
                                                   ▼
                                        ┌────────────────────┐
                                        │ catalog.sqlite     │
                                        │ tabla products     │
                                        └────────────────────┘
```

Tres responsabilidades bien separadas:

- **Frontend**: composición visual, estado de la interacción, navegación entre páginas. No conoce SQL ni el esquema de la base de datos.
- **Backend**: filtros, búsqueda, paginación, formato de la respuesta. No conoce React ni el HTML de la vitrina.
- **Base de datos**: fuente de verdad. Se abre en modo solo-lectura; el backend nunca escribe.

El contrato entre frontend y backend son cinco endpoints REST simples, descritos en `docs/SPECIFICATION.md §3`.

## 2. Por qué esta tecnología

| Capa | Elección | Motivo |
| --- | --- | --- |
| Frontend | **React + Vite** | Un solo lenguaje (JS) para todo el proyecto. Vite da hot-reload, proxy de `/api` y build estático sin configuración. |
| Backend | **Node + Express** | Estándar minimalista. Los endpoints se leen de un tirón. |
| DB | **SQLite** | Ya viene provista como `catalog.sqlite`. Sin servidor, sin configuración, sin migraciones. |
| Lenguaje | **JavaScript** | Un solo lenguaje reduce la carga cognitiva del equipo. |

Descartado:

- **MongoDB / Postgres**: agregar un servidor de base de datos no aporta nada a un catálogo de 4.032 filas ya provisto como archivo.
- **Next.js**: introduce SSR y routing que no se aprovechan; el ejercicio no pide SEO ni URLs compartibles.
- **ORM (Prisma, Sequelize)**: una tabla y cuatro consultas `SELECT`. El ORM sería más código que el SQL que reemplaza.

## 3. División del backend

`server/index.js` tiene tres bloques:

1. **Apertura de la base**: `new sqlite3.Database(DB_PATH, OPEN_READONLY)`. Si el archivo no existe, el proceso sale con un mensaje explícito.
2. **Helpers**: `all()` y `get()` envuelven el API callback de `sqlite3` en promesas, y `buildFilters()` centraliza la construcción del `WHERE` para que `GET /api/products` y el `COUNT` compartan exactamente los mismos filtros.
3. **Rutas**: cinco endpoints, cada uno con su `try/catch` que devuelve `500` con el mensaje de error.

La decisión clave es que **la paginación se resuelve en el backend** con `LIMIT ? OFFSET ?`, no en el frontend. El frontend nunca recibe más de 12 productos a la vez, sin importar el tamaño del catálogo.

## 4. División del frontend

- **`App.jsx`**: orquesta el estado (filtros, página, items, status) y renderiza la grilla, la toolbar y la paginación.
- **`ProductDialog.jsx`**: modal de detalle. Usa el `<dialog>` nativo para obtener cierre con `Esc` y backdrop gratis.
- **`api.js`**: única puerta hacia el backend. Si mañana cambia la URL base o se agrega autenticación, se toca solo aquí.
- **`utils.js`**: helpers puros (`formatPrice`, `categoryGroup`), fáciles de testear sin montar React.
- **`styles.css`**: proveniente del mockup, sin modificar salvo dos reglas añadidas al final para que los botones de paginación sean interactivos.

## 5. Manejo de estados

La app tiene tres fuentes de verdad que hay que combinar:

- `status` ∈ {`loading`, `ready`, `error`} → resultado de la última petición.
- `total` → cuántos productos hay en total tras aplicar filtros.
- `items` → los productos de la página actual.

El estado visual se deriva:

```
view =
  status === 'loading' && items.length === 0  →  'cargando'
  status === 'error'                          →  'error'
  status === 'ready' && total === 0           →  'vacio'
  resto                                       →  'normal'
```

La condición `items.length === 0` en la primera rama evita que la grilla parpadee al cambiar de página: mientras haya datos previos se mantienen visibles.

## 6. Supuestos importantes

1. **La base de datos no se versiona en Git** (`.gitignore` incluye `*.sqlite`). Cada persona del equipo la copia manualmente desde el paquete del desafío.
2. **No hay autenticación** ni multiusuario. El servidor es de un solo inquilino.
3. **La base se abre en solo-lectura.** El servidor no crea índices ni escribe nada. Si se quiere acelerar, los índices se agregan manualmente con `sqlite3` (documentado en el README).
4. **La búsqueda es `LIKE '%q%'`**, no full-text. Para 4.032 filas es más que suficiente y evita mantener un índice FTS.
5. **Las opciones de filtros se cargan una sola vez** al montar `App`. El catálogo es estático durante la sesión.

## 7. Flujo de trabajo con el agente

El equipo siguió la secuencia que pide la consigna:

1. El agente transformó el mockup y el PDF en `docs/SPECIFICATION.md`.
2. El equipo revisó la spec y corrigió:
   - El mockup mostraba un contador “de 4.032” hardcodeado; la spec exige que refleje el `total` real.
   - El mockup tenía un conmutador “Referencia de estados” con cuatro botones; la spec mantiene solo tres estados reales (cargando / vacío / error) porque el “normal” es el caso por defecto.
   - El mockup cargaba los 8 productos en memoria; la spec exige paginación server-side.
3. El agente propuso la arquitectura de `docs/ARCHITECTURE.md`.
4. La implementación se autorizó en pasos pequeños:
   - Setup + primeros endpoints.
   - Grilla que consume la API real.
   - Búsqueda y filtros en el backend.
   - Paginación.
   - Estados de UI.
   - Diálogo de detalle.
5. La verificación final está en `docs/VERIFICATION.md`.

Correcciones pedidas al agente durante el desarrollo:

- Los campos `id`, `price` y `originalPrice` son `INTEGER`/`REAL` en el esquema provisto, no `TEXT`. El agente había asumido `TEXT` en la primera iteración; se corrigió el casteo en el frontend (`String(product.id)`) y en la ruta `/api/products/:id` (`Number(req.params.id)`).
- El mockup usaba `1 2 3 … 504` como paginación estática. Se pidió reemplazarla por paginación real calculada desde `totalPages`.
- El agente propuso originalmente cargar todo el catálogo y filtrar en el cliente. Se pidió rehacerlo para que el backend resuelva todo, tal como exige la consigna.
- El estado “Sin resultados” se mostraba mientras se cargaba. Se corrigió para mostrar el spinner hasta tener una respuesta.