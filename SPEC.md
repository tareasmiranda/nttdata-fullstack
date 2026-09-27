# SPEC.md — Product Showcase (Etapa 1)

## 1. Purpose

Build a minimal full‑stack web application that lets visitors explore a supermarket catalog of 4,032 products. The app must expose a frontend, a backend API, and a database. Search, filtering, and pagination must be handled by the backend. Only data present in `data/catalog.csv` may be shown; no invented fields.

## 2. Scope

### In scope
- Product grid with cards showing image, name, price, and some attributes.
- Search by product name.
- Filter by at least one attribute (category is mandatory; format is optional).
- Pagination (next / previous page).
- Product detail view.
- Loading, empty, and error states.

### Out of scope
- Cart, checkout, payments, product administration.
- User accounts or authentication.
- Any feature not explicitly listed above.

## 3. Glossary

| Term | Meaning |
|------|---------|
| Product | A row from `catalog.csv`. |
| Card | UI element showing a product summary. |
| Attribute | Any column from the CSV other than id, name, description, price, image. Examples: category, format. |
| Page | A subset of products returned by the API. |
| Filter | Restriction on one or more attributes. |

## 4. User Stories & Acceptance Criteria

### US‑01 — View product grid
**As a** visitor,  
**I want** to see a grid of product cards,  
**so that** I can browse the catalog.

**Acceptance criteria**
- Each card shows at least: image, name, price.
- Cards are laid out in a responsive grid.
- Only products from the current page are displayed.
- The grid loads data from `GET /api/products`.

### US‑02 — Search by name
**As a** visitor,  
**I want** to search products by name,  
**so that** I can find specific items.

**Acceptance criteria**
- A search input is visible above the grid.
- Typing and submitting (or debouncing) updates the results.
- The backend performs the search; the frontend sends a `search` query parameter.
- If no products match, the empty state is shown.

### US‑03 — Filter by attribute
**As a** visitor,  
**I want** to filter products by category (and optionally format),  
**so that** I can narrow down the catalog.

**Acceptance criteria**
- At least one filter control (category) is present.
- Filter options come from `GET /api/products/filters`.
- Selecting a filter updates the results.
- The backend applies the filter; the frontend sends `category` and/or `format` query parameters.
- Filters can be combined with search.

### US‑04 — Paginate results
**As a** visitor,  
**I want** to move between pages of results,  
**so that** I can browse the entire catalog.

**Acceptance criteria**
- Previous and next buttons (or pagination controls) are visible.
- The current page and total pages are indicated.
- The backend returns pagination metadata.
- Changing page updates the grid without reloading the whole page.

### US‑05 — View product detail
**As a** visitor,  
**I want** to select a product and see its full information,  
**so that** I can decide if it interests me.

**Acceptance criteria**
- Clicking a card opens a detail view (modal or separate page).
- The detail view fetches `GET /api/products/:id`.
- All available fields for that product are shown (name, description, category, format, price, image, etc.).
- A way to close or return to the grid is provided.

### US‑06 — Understand application states
**As a** visitor,  
**I want** to know when the app is loading, has no results, or has an error,  
**so that** I am not confused.

**Acceptance criteria**
- **Loading:** a visible indicator while data is being fetched.
- **Empty:** a clear message when no products match the search/filters.
- **Error:** a clear message and a retry option when the API fails.

## 5. Functional Requirements

### FR‑01 API endpoints
The backend MUST expose exactly these three operations:

1. `GET /api/products`
   - Query parameters:
     - `search` (string, optional) — matches product name (case‑insensitive, partial match).
     - `category` (string, optional) — exact match on category.
     - `format` (string, optional) — exact match on format.
     - `page` (integer, optional, default 1) — page number.
     - `limit` (integer, optional, default 20) — items per page.
   - Response:

     {
       "data": [ { "id": 1, "name": "...", "price": 0, "image": "...", "category": "..." } ],
       "pagination": {
         "page": 1,
         "limit": 20,
         "total": 4032,
         "totalPages": 202
       }
     }

   - Product summary MUST include: `id`, `name`, `price`, `image`, and at least one attribute (e.g., `category`).

2. `GET /api/products/:id`
   - Response: full product object with all CSV columns.
   - If not found: `404` with `{ "error": "Product not found" }`.

3. `GET /api/products/filters`
   - Response:

     {
       "categories": ["...", "..."],
       "formats": ["...", "..."]
     }

   - Lists are unique values from the catalog.

### FR‑02 Backend responsibilities
- Read the catalog from SQLite.
- Apply search, filters, and pagination using SQL (`WHERE`, `LIMIT`, `OFFSET`).
- Return only the requested page of products.
- Never send the entire catalog to the frontend.

### FR‑03 Frontend responsibilities
- Call the API with the correct query parameters.
- Render cards, detail view, and state indicators.
- Do NOT perform search, filtering, or pagination locally.

### FR‑04 Data integrity
- Only fields present in `catalog.csv` may be displayed.
- No default or placeholder values for missing data.
- If a field is empty in the CSV, it should be shown as empty or omitted, not invented.

## 6. Non‑Functional Requirements

- **Performance:** API response for a page should be under 500 ms locally.
- **Usability:** responsive layout, clear labels, keyboard‑accessible controls where possible.
- **Maintainability:** code organised into frontend and backend folders; clear separation of concerns.
- **Portability:** runs locally with `npm install` and `npm run dev` on any OS with Node.js.
- **Reproducibility:** a `README.md` explains how to seed the database, start the backend, start the frontend, and run verification.

## 7. UI States

| State | Trigger | Expected UI |
|-------|---------|-------------|
| Loading | API request in progress | Spinner or skeleton cards. |
| Empty | API returns `data: []` | Message: "No se encontraron productos." |
| Error | API request fails (network, 5xx) | Message: "Ocurrió un error." + Retry button. |
| Success | API returns products | Grid of cards + pagination. |

## 8. Assumptions & Open Questions

### Assumptions
- The CSV columns are: `id`, `name`, `description`, `category`, `format`, `price`, `image`. (Verify against `data/README.md` and adjust.)
- Price is in Chilean pesos (CLP) and is displayed as an integer with thousands separators.
- Images are local paths or URLs provided in the CSV.
- Default page size is 20.
- Category is the mandatory filter; format is optional.
- Detail view is a modal or a separate route.

### Open questions
- Are there any other filterable attributes (e.g., brand, size)?
- Should search be case‑insensitive and accent‑insensitive? (Assumed yes.)
- Should pagination be numbered or only previous/next? (Assumed previous/next with page indicator.)

## 9. Verification Checklist

- [ ] `GET /api/products?limit=2` returns 2 products and pagination metadata.
- [ ] `GET /api/products?search=leche` returns only products whose name contains "leche".
- [ ] `GET /api/products?category=Lácteos` returns only products in that category.
- [ ] `GET /api/products?page=2&limit=10` returns the correct slice.
- [ ] `GET /api/products/filters` returns non‑empty lists of categories and formats.
- [ ] `GET /api/products/1` returns a full product or 404.
- [ ] Frontend shows loading, empty, and error states when simulated.
- [ ] Clicking a card opens the detail view with full information.
- [ ] No invented fields appear in the UI.
