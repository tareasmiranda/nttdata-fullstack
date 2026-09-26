const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'catalog.sqlite');

if (!fs.existsSync(DB_PATH)) {
  console.error(`❌ No se encontró la base de datos en: ${DB_PATH}`);
  console.error('   Copia tu archivo catalog.sqlite dentro de la carpeta server/.');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'images')));

const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('❌ Error abriendo la base de datos:', err.message);
    process.exit(1);
  }
  console.log(`✅ Base de datos abierta: ${DB_PATH}`);
});

const all = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)))
  );

const get = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)))
  );

// --- Helpers --------------------------------------------------------------

const SELECT_COLS = `
  id, name, description, format, category,
  price, priceUnit, originalPrice, currency,
  imageUrl, productUrl, extractedAt
`;

// Construye la cláusula WHERE + params a partir de los filtros de query.
function buildFilters({ q, category, format }) {
  const where = [];
  const params = [];

  if (q) {
    where.push('LOWER(name) LIKE ?');
    params.push(`%${String(q).toLowerCase()}%`);
  }
  if (category) {
    // "Bodega" matchea "Bodega > Tinto de verano y sangría"
    where.push('(category = ? OR category LIKE ?)');
    params.push(category, `${category} > %`);
  }
  if (format) {
    where.push('format = ?');
    params.push(format);
  }

  const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return { sql, params };
}

// --- Routes ---------------------------------------------------------------

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// GET /api/products?page=1&pageSize=12&q=&category=&format=
// Devuelve SOLO la página solicitada, más totales para paginar.
app.get('/api/products', async (req, res) => {
  try {
    const page     = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 12));
    const offset   = (page - 1) * pageSize;

    const { sql: whereSql, params } = buildFilters(req.query);

    // Total para saber cuántas páginas hay
    const { total } = await get(
      `SELECT COUNT(*) AS total FROM products ${whereSql}`,
      params
    );

    // Solo la rebanada de esta página
    const items = await all(
      `SELECT ${SELECT_COLS}
       FROM products
       ${whereSql}
       ORDER BY name
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    res.json({
      items,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/by-ids?ids=10043,10286,11550
// Devuelve los productos con esos IDs (útil para "carrito", "recientes", etc.)
// IMPORTANTE: debe ir ANTES de /api/products/:id
app.get('/api/products/by-ids', async (req, res) => {
  try {
    const raw = String(req.query.ids || '').trim();
    if (!raw) return res.json([]);

    const ids = raw
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);

    if (ids.length === 0) return res.json([]);
    if (ids.length > 200) {
      return res.status(400).json({ error: 'Máximo 200 IDs por consulta' });
    }

    const placeholders = ids.map(() => '?').join(',');
    const rows = await all(
      `SELECT ${SELECT_COLS} FROM products WHERE id IN (${placeholders})`,
      ids
    );

    // Reordenamos para respetar el orden de los IDs pedidos
    const byId = new Map(rows.map((r) => [r.id, r]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);

    res.json(ordered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/categories  → ["Aceite, especias y salsas", "Agua y refrescos", ...]
app.get('/api/categories', async (_req, res) => {
  try {
    const rows = await all(`
      SELECT DISTINCT
        CASE
          WHEN instr(category, ' > ') > 0
            THEN substr(category, 1, instr(category, ' > ') - 1)
          ELSE category
        END AS name
      FROM products
      WHERE category IS NOT NULL AND category <> ''
      ORDER BY name
    `);
    res.json(rows.map((r) => r.name).filter(Boolean));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/formats  → ["Bandeja", "Bote", ...]
app.get('/api/formats', async (_req, res) => {
  try {
    const rows = await all(`
      SELECT DISTINCT format
      FROM products
      WHERE format IS NOT NULL AND format <> ''
      ORDER BY format
    `);
    res.json(rows.map((r) => r.format).filter(Boolean));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id
app.get('/api/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const row = await get(
      `SELECT ${SELECT_COLS} FROM products WHERE id = ?`,
      [id]
    );
    if (!row) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- Boot -----------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀 API escuchando en http://localhost:${PORT}`);
});