# PASO — Vitrina de productos

[Especificación](https://github.com/USERNAME/tareasmiranda/nttdata-fullstack/main/docs/SPECIFICATION.md) | [Arquitectura](https://github.com/tareasmiranda/nttdata-fullstack/main/docs/ARCHITECTURE.md) | [Verificación](https://github.com/tareasmiranda/nttdata-fullstack/blob/main/docs/VERIFICATION.md) | [SPEC.md](https://github.com/tareasmiranda/nttdata-fullstack/blob/main/SPEC.md)

Aplicación Full Stack que expone el catálogo de supermercado (4.032 productos) del Desafío Full Stack — Etapa 1. El backend lee `catalog.sqlite`, resuelve búsqueda, filtros y paginación, y el frontend consume esa API mostrando una vitrina de cards paginada.

## Inicio rápido

Requisitos: **Node.js ≥ 20** y **npm ≥ 10** (probado con npm 12). No se necesita instalar SQLite por separado.

```bash
# 1. Clonar
git clone https://github.com/USERNAME/my-shop.git
cd my-shop

# 2. Copiar la base de datos del catálogo
cp /ruta/a/catalog.sqlite server/catalog.sqlite

# 3. Instalar dependencias del proyecto raíz (concurrently, etc.)
npm install

# 4. Instalar dependencias del servidor y del cliente
npm run install:all

# 5. Aprobar scripts nativos (una sola vez, npm 12+)
cd server && npm install-scripts approve sqlite3 && npm install && cd ..
cd client && npm install-scripts approve esbuild  && npm install && cd ..

# 6. Arrancar backend + frontend con un solo comando
npm run dev
```

Abrir **http://localhost:5173** en el navegador.

| Servicio | URL | Descripción |
| --- | --- | --- |
| Frontend | http://localhost:5173 | Vitrina React servida por Vite |
| Backend  | http://localhost:3000 | API Express |
| API ejemplo | http://localhost:3000/api/products?page=1&pageSize=12 | Primera página de productos |

### Comandos disponibles

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Arranca backend y frontend en paralelo |
| `npm run dev:server` | Solo el backend (`http://localhost:3000`) |
| `npm run dev:client` | Solo el frontend (`http://localhost:5173`) |
| `npm run install:all` | Instala `server/` y `client/` |
| `npm run build` | Compila el frontend a `client/dist/` |

Si `npm run dev` falla con `concurrently not found`, falta el paso **3** (`npm install` en la raíz). Si falla con `sqlite3` o `esbuild` bloqueados, falta el paso **5**.

## Estructura

```
my-shop/
├── server/                  # API Express + SQLite
│   ├── index.js             # endpoints /api/*
│   ├── catalog.sqlite       # base de datos (no versionada)
│   └── package.json
├── client/                  # Frontend React + Vite
│   ├── src/
│   │   ├── App.jsx          # vitrina, filtros, paginación
│   │   ├── ProductDialog.jsx
│   │   ├── api.js
│   │   ├── utils.js
│   │   └── styles.css
│   └── package.json
├── docs/
│   ├── SPECIFICATION.md     # comportamiento acordado
│   ├── ARCHITECTURE.md      # decisiones y supuestos
│   └── VERIFICATION.md      # pruebas reproducibles
├── AGENTS.md                # instrucciones persistentes para el agente
└── README.md
```

## API

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `GET` | `/api/products?page=&pageSize=&q=&category=&format=` | Página de productos filtrada. Devuelve `{ items, total, page, pageSize, totalPages }`. |
| `GET` | `/api/products/:id` | Producto individual por ID. |
| `GET` | `/api/products/by-ids?ids=1,2,3` | Productos por lista de IDs (hasta 200). |
| `GET` | `/api/products/filters` | Opciones disponibles para filtrar: `{ categories, formats }`. |
| `GET` | `/api/health` | Chequeo de vida del servidor. |

Ejemplo:

```bash
curl "http://localhost:3000/api/products?page=2&pageSize=12&q=mayo"
```

## Esquema de la base de datos

La tabla `products` en `catalog.sqlite` ya viene provista y **no se modifica** — el servidor la abre en modo solo-lectura.

| Columna | Tipo | Descripción |
| --- | --- | --- |
| `id` | INTEGER PRIMARY KEY | Identificador del producto |
| `name` | TEXT | Nombre |
| `description` | TEXT | Descripción y alérgenos |
| `format` | TEXT | Envase (Bote, Lata, Tarro, …) |
| `category` | TEXT | Categoría con jerarquía `Padre > Hijo` |
| `price` | REAL | Precio actual en CLP |
| `priceUnit` | TEXT | Unidad de precio (`/ud.`, `/pack`) |
| `originalPrice` | REAL | Precio sin descuento |
| `currency` | TEXT | Moneda (`CLP`) |
| `imageUrl` | TEXT | URL o ruta de la imagen |
| `productUrl` | TEXT | Ficha de origen del producto |
| `extractedAt` | TEXT | Fecha de extracción del dato |

## Evidencias del desafío

Esta es la correspondencia entre lo que pide la consigna y dónde encontrarlo:

| Evidencia | Archivo |
| --- | --- |
| 1. Aplicación y ejecución | Este README + `server/` + `client/` |
| 2. Especificación | [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md) |
| 3. Arquitectura y decisiones | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) |
| 4. Arnés básico | [`SPEC.md`](SPEC.md) + [`docs/VERIFICATION.md`](docs/VERIFICATION.md) |

## Uso del agente

Todos los cambios en el código fueron realizados por un agente de IA guiado por las instrucciones persistentes de [`SPEC.md`](SPEC.md). Las decisiones y revisiones humanas se documentan en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) y [`docs/SPECIFICATION.md`](docs/SPECIFICATION.md).
