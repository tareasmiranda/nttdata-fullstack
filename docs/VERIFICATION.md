# Verificación

Pruebas reproducibles que otra persona puede ejecutar para comprobar que la aplicación cumple la especificación. Todas son de línea de comandos; no se necesita un framework de testing instalado.

## Preparación

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Confirmar que ambos están arriba:

```bash
curl -s http://localhost:3000/api/health
# → {"ok":true}

curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173
# → 200
```

## V1 — La API devuelve páginas, no el catálogo completo

```bash
curl -s "http://localhost:3000/api/products?page=1&pageSize=12" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d['items']), d['total'], d['totalPages'])"
```

**Esperado:** `12 4032 336` (o el total real de tu base). La clave es que `items` tenga exactamente 12 elementos, no 4032.

## V2 — La paginación no repite productos

```bash
curl -s "http://localhost:3000/api/products?page=1&pageSize=12" | python3 -c "import sys,json; print([p['id'] for p in json.load(sys.stdin)['items']])"
curl -s "http://localhost:3000/api/products?page=2&pageSize=12" | python3 -c "import sys,json; print([p['id'] for p in json.load(sys.stdin)['items']])"
```

**Esperado:** las dos listas de IDs son disjuntas.

## V3 — La búsqueda filtra por nombre

```bash
curl -s "http://localhost:3000/api/products?q=mayonesa&pageSize=12" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['total']); [print(p['name']) for p in d['items']]"
```

**Esperado:** el total es menor a 4032, y todos los nombres contienen “mayonesa” (insensible a mayúsculas).

## V4 — El filtro de categoría incluye subcategorías

```bash
curl -s "http://localhost:3000/api/products?category=Bodega&pageSize=50" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['total']); cats=set(p['category'] for p in d['items']); print(cats)"
```

**Esperado:** el total es mayor que 0, y todas las categorías devueltas empiezan con `Bodega >`.

## V5 — Los filtros se combinan

```bash
curl -s "http://localhost:3000/api/products?q=tinto&category=Bodega" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['total'])"

curl -s "http://localhost:3000/api/products?q=tinto" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['total'])"
```

**Esperado:** el primer total es ≤ el segundo. Los filtros se aplican con AND.

## V6 — El endpoint de filtros devuelve opciones reales

```bash
curl -s "http://localhost:3000/api/products/filters" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('categorías:', len(d['categories'])); print('formatos:', len(d['formats'])); print('primeras 3 categorías:', d['categories'][:3])"
```

**Esperado:** listas no vacías. Ninguna categoría contiene ` > ` (se devuelven solo los padres).

## V7 — Producto por ID

```bash
# Tomar un ID real de V2 y consultarlo
curl -s "http://localhost:3000/api/products/11550" \
  | python3 -c "import sys,json; p=json.load(sys.stdin); print(p['id'], p['name'])"

# ID inexistente
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/products/99999999"
```

**Esperado:** la primera llamada imprime el producto; la segunda imprime `404`.

## V8 — by-ids respeta el orden y el límite

```bash
curl -s "http://localhost:3000/api/products/by-ids?ids=11550,10043,10286" \
  | python3 -c "import sys,json; print([p['id'] for p in json.load(sys.stdin)])"

# Probar el límite de 200
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:3000/api/products/by-ids?ids=$(python3 -c "print(','.join(str(i) for i in range(1,202)))")"
```

**Esperado:** la primera imprime `[11550, 10043, 10286]` en ese orden; la segunda imprime `400`.

## V9 — Comportamiento en el navegador

Con `http://localhost:5173` abierto:

| Acción | Resultado esperado |
| --- | --- |
| Cargar la página | Aparece el spinner, luego 12 cards |
| Mirar el contador | Dice “Mostrando 1-12 de 4032” |
| Escribir “mayonesa” en el buscador | Tras ~300 ms se actualiza el contador y la grilla |
| Elegir “Bodega” en el filtro de categoría | La grilla muestra solo productos de esa categoría |
| Pulsar “Siguiente” | Cambia el contador a “Mostrando 13-24 de …” y la grilla se desplaza arriba |
| Buscar “zzzzzzz” | Aparece el estado “Sin resultados” con el botón “Limpiar filtros” |
| Pulsar “Limpiar filtros” | Vuelve la grilla completa en la página 1 |
| Apagar el backend y recargar el navegador | Aparece el estado “Error” con el botón “Reintentar” |
| Encender el backend y pulsar “Reintentar” | La grilla vuelve a cargar |
| Hacer clic en una card | Se abre el diálogo de detalle con la información completa |
| Pulsar `Esc` | El diálogo se cierra |

## V10 — El frontend no descarga el catálogo completo

Abrir las DevTools del navegador → pestaña **Network** → filtrar por `products`.

**Esperado:** cada llamada a `/api/products` devuelve **12 items**, no 4032. Al cambiar de página o escribir en el buscador se dispara una nueva llamada. Nunca hay una llamada que devuelva el catálogo entero.

## Criterios de aceptación

- [x] La API expone `GET /api/products` con paginación, búsqueda y filtros.
- [x] La API expone `GET /api/products/:id`.
- [x] La API expone `GET /api/products/filters`.
- [x] El frontend nunca descarga más de `pageSize` productos a la vez.
- [x] Los estados de carga, sin resultados y error son visibles y distinguibles.
- [x] La paginación es funcional en ambos extremos.
- [x] El detalle de un producto muestra solo información presente en la base.
- [x] Ningún campo se completa con valores inventados.