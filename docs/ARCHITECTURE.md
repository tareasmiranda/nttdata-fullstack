# ARCHITECTURE.md — Product Showcase (Etapa 1)

## 1. Overview

The application is a classic three‑tier web app:

- **Frontend:** React + Vite (SPA).
- **Backend:** Node.js + Express (REST API).
- **Database:** SQLite (file‑based, no server).

All parts run locally. The frontend and backend communicate over HTTP. The backend is the only part that talks to the database. The frontend never processes the full catalog; it requests pages, searches, and filters from the API.

## 2. Technology Choices & Rationale

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | React + Vite | React is the most common UI library; Vite gives a fast dev server with hot reload. Both are JavaScript, so the team uses one language across the stack. |
| Backend | Node.js + Express | Express is minimal and well documented. It lets us define API routes in a few lines. |
| Database | SQLite | No separate server, no configuration. The entire database is a single file. Perfect for local development and small catalogs. |
| Data seeding | Node script + `csv-parser` | Reads `data/catalog.csv` and inserts rows into SQLite. |
| HTTP client | `fetch` (native) | No extra dependency for the frontend. |
| Styling | Plain CSS (or a minimal framework) | Keeps the project simple and avoids build complexity. |

**Why not MERN?** MongoDB requires a separate server process. SQLite is simpler and sufficient for this challenge.

## 3. System Components

### 3.1 Frontend (React + Vite)

**Responsibilities**
- Render the UI.
- Manage local UI state (search input, selected filters, current page, selected product).
- Call the backend API with query parameters.
- Display loading, empty, and error states.

**Main components**
- `App` — layout and routing (if using a router) or modal state.
- `SearchBar` — text input, triggers search.
- `FilterSelect` — dropdown(s) for category and format, populated from `/api/products/filters`.
- `ProductGrid` — layout for cards.
- `ProductCard` — image, name, price, one or two attributes.
- `Pagination` — previous/next buttons and page indicator.
- `ProductDetail` — modal or page showing full product info.
- `LoadingState`, `EmptyState`, `ErrorState` — state components.

**State management**
- Simple React state (`useState`, `useEffect`).
- No global state library needed. The URL query string can be used to persist search/filter/page (optional but recommended).

**API communication**
- A small `api.js` module wraps `fetch` calls:
  - `fetchProducts({ search, category, format, page, limit })`
  - `fetchProductById(id)`
  - `fetchFilters()`

### 3.2 Backend (Node.js + Express)

**Responsibilities**
- Expose the three API endpoints.
- Parse query parameters.
- Query SQLite.
- Return JSON with the agreed structure.
- Serve static files if needed (not required; Vite dev server handles frontend).

**Structure**

    server/
    ├── index.js          # Express app, routes
    ├── db.js             # SQLite connection and query helpers
    ├── seed.js           # Reads CSV and populates database
    ├── package.json
    └── database.sqlite   # generated, gitignored

**Routes**
- `GET /api/products` → `getProducts(req, res)`
- `GET /api/products/:id` → `getProductById(req, res)`
- `GET /api/products/filters` → `getFilters(req, res)`

**Data access**
- All SQL lives in `db.js` or in the route handlers.
- Use parameterised queries to avoid SQL injection.
- Search: `WHERE name LIKE ?` with `%term%`.
- Filters: `AND category = ?`, `AND format = ?`.
- Pagination: `LIMIT ? OFFSET ?`.
- Count total rows for pagination metadata.

### 3.3 Database (SQLite)

**Schema**

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      format TEXT,
      price REAL,
      image TEXT
    );

(Adjust column names and types to match `data/README.md`.)

**Seeding**
- `seed.js` reads `data/catalog.csv`.
- Drops and recreates the table (for reproducibility).
- Inserts all rows in a transaction.
- Run with `npm run seed`.

## 4. API Design

### 4.1 `GET /api/products`

**Query parameters**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| search | string | — | Partial match on name (case‑insensitive). |
| category | string | — | Exact match on category. |
| format | string | — | Exact match on format. |
| page | integer | 1 | Page number (1‑based). |
| limit | integer | 20 | Items per page. |

**Response 200**

    {
      "data": [
        {
          "id": 1,
          "name": "Leche entera 1 L",
          "price": 1200,
          "image": "/assets/leche.jpg",
          "category": "Lácteos",
          "format": "1 L"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "total": 4032,
        "totalPages": 202
      }
    }

### 4.2 `GET /api/products/:id`

**Response 200**

    {
      "id": 1,
      "name": "Leche entera 1 L",
      "description": "Leche entera de vaca, 1 litro.",
      "category": "Lácteos",
      "format": "1 L",
      "price": 1200,
      "image": "/assets/leche.jpg"
    }

**Response 404**

    { "error": "Product not found" }

### 4.3 `GET /api/products/filters`

**Response 200**

    {
      "categories": ["Aceites", "Arroz", "Lácteos", "..."],
      "formats": ["1 L", "500 g", "Pack 6", "..."]
    }

## 5. Data Flow

1. User types a search term or selects a filter.
2. Frontend updates its state and calls `GET /api/products?search=...&category=...&page=1`.
3. Backend receives the request, builds a SQL query with `WHERE` and `LIMIT/OFFSET`.
4. SQLite returns the matching rows and total count.
5. Backend formats the response and sends JSON.
6. Frontend receives the page of products and renders cards.
7. User clicks a card → frontend calls `GET /api/products/:id` → detail view opens.

**Pagination flow**
- User clicks "Next" → frontend increments `page` → new API call → grid updates.

**Filter options flow**
- On mount, frontend calls `GET /api/products/filters` → populates dropdowns.

## 6. Directory Structure

    mi-tienda/
    ├── AGENTS.md
    ├── ARCHITECTURE.md
    ├── SPEC.md
    ├── README.md
    ├── .gitignore
    ├── data/
    │   ├── catalog.csv
    │   └── README.md
    ├── server/
    │   ├── index.js
    │   ├── db.js
    │   ├── seed.js
    │   └── package.json
    ├── client/
    │   ├── index.html
    │   ├── src/
    │   │   ├── main.jsx
    │   │   ├── App.jsx
    │   │   ├── api.js
    │   │   └── components/
    │   │       ├── SearchBar.jsx
    │   │       ├── FilterSelect.jsx
    │   │       ├── ProductGrid.jsx
    │   │       ├── ProductCard.jsx
    │   │       ├── Pagination.jsx
    │   │       ├── ProductDetail.jsx
    │   │       └── states/
    │   │           ├── LoadingState.jsx
    │   │           ├── EmptyState.jsx
    │   │           └── ErrorState.jsx
    │   └── package.json
    └── scripts/
        └── verify-api.sh

## 7. Local Execution

### Prerequisites
- Node.js 18+ and npm.

### Steps
1. **Install backend dependencies**

       cd server
       npm install

2. **Seed the database**

       npm run seed

   This reads `../data/catalog.csv` and creates `server/database.sqlite`.

3. **Start the backend**

       npm run dev

   API available at `http://localhost:3000`.

4. **Install frontend dependencies**

       cd ../client
       npm install

5. **Start the frontend**

       npm run dev

   App available at `http://localhost:5173`.

### Verification
- Run `scripts/verify-api.sh` (or `npm run verify` in `server/`) to check the three endpoints.
- Manually test search, filters, pagination, and detail view in the browser.
- Simulate error by stopping the backend and reloading the frontend.

## 8. Verification Strategy

| What | How |
|------|-----|
| API returns products | `curl http://localhost:3000/api/products?limit=2` |
| Search works | `curl "http://localhost:3000/api/products?search=leche"` |
| Filter works | `curl "http://localhost:3000/api/products?category=Lácteos"` |
| Pagination works | `curl "http://localhost:3000/api/products?page=2&limit=10"` |
| Filters endpoint | `curl http://localhost:3000/api/products/filters` |
| Detail endpoint | `curl http://localhost:3000/api/products/1` |
| Frontend states | Manually trigger loading, empty, error in the UI. |
| No invented fields | Review the UI against the CSV columns. |

A script `scripts/verify-api.sh` automates the curl checks and asserts the JSON structure.

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| CSV column names differ from assumptions | Read `data/README.md` first and adjust schema/seed. |
| Large catalog slows queries | SQLite handles 4k rows easily; add indexes on `name`, `category`, `format` if needed. |
| Frontend performs filtering locally | Enforce in code review and AGENTS.md: backend does search/filter/pagination. |
| Invented fields | Strictly map UI to CSV columns; no defaults. |
| Agent edits files manually | AGENTS.md forbids manual edits; all changes via agent. |

## 10. Future Extensions (out of scope for Etapa 1)

- Shopping cart and checkout.
- User authentication.
- Admin panel for product management.
- More filters (brand, price range).
- Server‑side rendering (Next.js) if SEO becomes important.
