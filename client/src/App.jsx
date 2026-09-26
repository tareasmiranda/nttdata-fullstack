import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ProductDialog from './ProductDialog.jsx';
import {
  fetchProducts,
  fetchCategories,
  fetchFormats,
} from './api.js';
import { formatPrice, categoryGroup } from './utils.js';
import './styles.css';

// 4 columnas × 3 filas = 12 productos por página.
const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;
const FALLBACK_IMG = 'https://placehold.co/600x500/e9eee7/17211b.png?text=PASO';

// --- Componentes auxiliares -----------------------------------------------

function ProductCard({ product, onOpen }) {
  return (
    <article className="product-card">
      <button
        className="card-button"
        type="button"
        onClick={() => onOpen(product)}
        aria-label={`Ver detalle de ${product.name}`}
      >
        <span className="image-wrap">
          <img
            src={product.imageUrl || FALLBACK_IMG}
            alt=""
            loading="lazy"
            onError={(e) => {
              if (e.currentTarget.dataset.fallback) return;
              e.currentTarget.dataset.fallback = '1';
              e.currentTarget.src = FALLBACK_IMG;
            }}
          />
          <span className="card-index">#{String(product.id)}</span>
        </span>
        <span className="card-copy">
          <span className="card-type">{categoryGroup(product.category)}</span>
          <strong>{product.name}</strong>
          <span className="card-meta">
            {product.format} <i>•</i> {formatPrice(product.price, product.currency)}
          </span>
          <span className="view-link">
            Ver detalle <span aria-hidden="true">→</span>
          </span>
        </span>
      </button>
    </article>
  );
}

function InlineState({
  modifier = '',
  spinner = false,
  icon,
  title,
  message,
  actionLabel,
  onAction,
}) {
  return (
    <div className={`inline-state ${modifier}`.trim()}>
      <span
        className={`state-icon ${spinner ? 'spinner' : ''}`.trim()}
        aria-hidden="true"
      >
        {icon}
      </span>
      <strong>{title}</strong>
      <p>{message}</p>
      {actionLabel && (
        <button type="button" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  );
}

// Ventana de páginas con "…" cuando hay saltos.
function paginate(current, total) {
  const pages = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }
  pages.push(1);
  if (current > 3) pages.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}

// --- App principal --------------------------------------------------------

export default function App() {
  // Filtros (input controlado)
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [format, setFormat]     = useState('');
  const [page, setPage]         = useState(1);

  // Búsqueda con debounce: lo que realmente se manda al servidor
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Datos de la página actual (NUNCA todo el catálogo)
  const [items, setItems]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus]         = useState('loading'); // loading | ready | error

  // Opciones de los selects (una sola carga, listas pequeñas)
  const [categories, setCategories] = useState([]);
  const [formats, setFormats]       = useState([]);

  const [selected, setSelected] = useState(null);

  // --- Carga de opciones de filtros (una sola vez) -----------------------
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchCategories({ signal: controller.signal }),
      fetchFormats({ signal: controller.signal }),
    ])
      .then(([cats, fmts]) => {
        setCategories(cats);
        setFormats(fmts);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') console.error(err);
      });
    return () => controller.abort();
  }, []);

  // --- Debounce de la búsqueda -------------------------------------------
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1); // nueva búsqueda → volver a la página 1
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  // --- Fetch de la página (depende de page + filtros debounced) ----------
  const reqIdRef = useRef(0);

  const load = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    const controller = new AbortController();
    setStatus('loading');

    try {
      const data = await fetchProducts({
        page,
        pageSize: PAGE_SIZE,
        q: debouncedSearch,
        category,
        format,
        signal: controller.signal,
      });
      if (reqId !== reqIdRef.current) return; // llegó tarde, la ignoramos
      setItems(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setStatus('ready');
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (reqId !== reqIdRef.current) return;
      console.error(err);
      setStatus('error');
    }
  }, [page, debouncedSearch, category, format]);

  useEffect(() => {
    const controller = new AbortController();
    load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, category, format]);

  // --- Handlers de filtros (reset a página 1 en el mismo batch) ----------
  const onCategoryChange = (v) => { setCategory(v); setPage(1); };
  const onFormatChange   = (v) => { setFormat(v);   setPage(1); };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setCategory('');
    setFormat('');
    setPage(1);
  };

  // --- Paginación --------------------------------------------------------
  const pageItems = useMemo(
    () => paginate(page, totalPages),
    [page, totalPages]
  );

  const goTo = (p) => {
    const target = Math.min(Math.max(1, p), totalPages);
    if (target === page) return;
    setPage(target);
    document
      .querySelector('.product-grid')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // --- Estado visual -----------------------------------------------------
  const view =
    status === 'loading' && items.length === 0 ? 'cargando' :
    status === 'error'                          ? 'error'    :
    status === 'ready' && total === 0           ? 'vacio'    :
                                                  'normal';

  const resultCount = useMemo(() => {
    if (view === 'cargando') return 'Cargando catálogo…';
    if (view === 'error')    return 'Error al cargar';
    if (view === 'vacio')    return 'Sin resultados';
    const from = (page - 1) * PAGE_SIZE + 1;
    const to   = Math.min(page * PAGE_SIZE, total);
    const isFiltering = Boolean(debouncedSearch || category || format);
    return isFiltering
      ? `Mostrando ${from}-${to} de ${total} coincidencias`
      : `Mostrando ${from}-${to} de ${total}`;
  }, [view, page, total, debouncedSearch, category, format]);

  return (
    <>
      <header className="site-header">
        <a className="brand" href="/" aria-label="PASO, inicio">
          <span className="brand-mark">P</span>
          <span>PASO</span>
        </a>
        <span className="header-note">CATÁLOGO DE SUPERMERCADO</span>
      </header>

      <main className="catalog-shell">
        <section className="intro-row" aria-labelledby="catalog-title">
          <div>
            <p className="eyebrow">VITRINA / {total || '—'} PRODUCTOS</p>
            <h1 id="catalog-title">Todo lo que necesitas, en un solo lugar</h1>
            <p className="lead">
              Explora el catálogo, filtra por categoría o formato y revisa la
              información de cada producto.
            </p>
          </div>
          <span className="result-count" id="result-count">{resultCount}</span>
        </section>

        <section className="toolbar" aria-label="Herramientas del catálogo">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">Buscar productos</span>
            <input
              id="search"
              type="search"
              placeholder="Buscar por nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          <div className="filters">
            <label>
              <span className="sr-only">Categoría</span>
              <select
                id="category-filter"
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label>
              <span className="sr-only">Formato</span>
              <select
                id="format-filter"
                value={format}
                onChange={(e) => onFormatChange(e.target.value)}
              >
                <option value="">Todos los formatos</option>
                {formats.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="product-grid" id="product-grid" aria-live="polite">
          {view === 'normal' &&
            items.map((p) => (
              <ProductCard key={p.id} product={p} onOpen={setSelected} />
            ))}

          {view === 'cargando' && (
            <InlineState
              spinner
              title="Cargando productos"
              message="Espera mientras consultamos el catálogo."
            />
          )}

          {view === 'vacio' && (
            <InlineState
              modifier="empty"
              icon="⌕"
              title="Sin resultados"
              message="Prueba con otra búsqueda o elimina algunos filtros."
              actionLabel="Limpiar filtros"
              onAction={clearFilters}
            />
          )}

          {view === 'error' && (
            <InlineState
              modifier="error"
              icon="!"
              title="No pudimos cargar el catálogo"
              message="Inténtalo nuevamente en unos momentos."
              actionLabel="Reintentar"
              onAction={load}
            />
          )}
        </section>

        {view === 'normal' && totalPages > 1 && (
          <nav className="pagination" aria-label="Paginación">
            <button
              type="button"
              onClick={() => goTo(page - 1)}
              disabled={page === 1}
            >
              ← Anterior
            </button>

            <div className="pages" aria-label="Páginas">
              {pageItems.map((item, i) =>
                item === '…' ? (
                  <span key={`e-${i}`} className="ellipsis" aria-hidden="true">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    className={item === page ? 'active' : ''}
                    onClick={() => goTo(item)}
                    aria-current={item === page ? 'page' : undefined}
                  >
                    {item}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => goTo(page + 1)}
              disabled={page === totalPages}
            >
              Siguiente →
            </button>
          </nav>
        )}
      </main>

      <ProductDialog product={selected} onClose={() => setSelected(null)} />
    </>
  );
}