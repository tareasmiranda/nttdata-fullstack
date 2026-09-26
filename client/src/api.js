// Con el proxy de Vite, "/api/..." llega al backend sin CORS.
// Para separar frontend y backend, define VITE_API_URL en un .env.
const API_URL = import.meta.env.VITE_API_URL ?? '';

/**
 * Pide UNA página de productos al servidor, ya filtrada.
 * @returns {Promise<{items: any[], total: number, page: number, pageSize: number, totalPages: number}>}
 */
export async function fetchProducts({
  page = 1,
  pageSize = 12,
  q = '',
  category = '',
  format = '',
  signal,
} = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('pageSize', String(pageSize));
  if (q)        params.set('q', q);
  if (category) params.set('category', category);
  if (format)   params.set('format', format);

  const res = await fetch(`${API_URL}/api/products?${params.toString()}`, {
    signal,
  });
  if (!res.ok) throw new Error(`API respondió ${res.status}`);
  return res.json();
}

/** Productos por lista de IDs. */
export async function fetchProductsByIds(ids = [], { signal } = {}) {
  if (!ids.length) return [];
  const params = new URLSearchParams();
  params.set('ids', ids.join(','));
  const res = await fetch(
    `${API_URL}/api/products/by-ids?${params.toString()}`,
    { signal }
  );
  if (!res.ok) throw new Error(`API respondió ${res.status}`);
  return res.json();
}

export async function fetchCategories({ signal } = {}) {
  const res = await fetch(`${API_URL}/api/categories`, { signal });
  if (!res.ok) throw new Error(`API respondió ${res.status}`);
  return res.json();
}

export async function fetchFormats({ signal } = {}) {
  const res = await fetch(`${API_URL}/api/formats`, { signal });
  if (!res.ok) throw new Error(`API respondió ${res.status}`);
  return res.json();
}