import { useEffect, useRef } from 'react';
import { formatPrice } from './utils.js';

const FALLBACK = 'https://placehold.co/600x500/e9eee7/17211b.png?text=PASO';

export default function ProductDialog({ product, onClose }) {
  const ref = useRef(null);

  // Abre / cierra el <dialog> nativo cuando cambia `product`.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (product && !dialog.open) dialog.showModal();
    if (!product && dialog.open) dialog.close();
  }, [product]);

  const handleBackdrop = (e) => {
    if (e.target === ref.current) ref.current.close();
  };

  return (
    <dialog
      className="product-dialog"
      id="product-dialog"
      ref={ref}
      aria-labelledby="detail-title"
      onClose={onClose}
      onClick={handleBackdrop}
    >
      {product && (
        <>
          <button
            className="dialog-close"
            id="dialog-close"
            type="button"
            aria-label="Cerrar detalle"
            onClick={() => ref.current?.close()}
          >
            ×
          </button>

          <div className="detail-grid">
            <div className="detail-image">
              <img
                id="detail-image"
                src={product.imageUrl || FALLBACK}
                alt={product.name}
                onError={(e) => {
                  if (e.currentTarget.dataset.fallback) return;
                  e.currentTarget.dataset.fallback = '1';
                  e.currentTarget.src = FALLBACK;
                }}
              />
            </div>

            <div className="detail-copy">
              <p className="eyebrow" id="detail-id">
                PRODUCTO #{String(product.id)}
              </p>
              <h2 id="detail-title">{product.name}</h2>
              <p className="detail-lead" id="detail-description">
                {product.description}
              </p>

              <dl className="detail-list" id="detail-list">
                <div><dt>Categoría</dt><dd>{product.category}</dd></div>
                <div><dt>Formato</dt><dd>{product.format}</dd></div>
                <div><dt>Unidad de precio</dt><dd>{product.priceUnit}</dd></div>
                <div><dt>Identificador</dt><dd>{String(product.id)}</dd></div>
              </dl>

              <section
                className="product-commerce"
                aria-label="Precio y procedencia de los datos del producto"
              >
                <div className="price-summary">
                  <span className="commerce-label">Precio publicado</span>
                  <strong id="detail-price">
                    {formatPrice(product.price, product.currency)}
                  </strong>
                  <p id="detail-currency">Moneda: {product.currency}</p>
                </div>
                <div className="source-summary">
                  <span className="commerce-label">Dato original</span>
                  <p>
                    <strong id="detail-original-price">
                      Precio original: {formatPrice(product.originalPrice, product.currency)}
                    </strong>
                  </p>
                  <small id="detail-extracted-at">
                    Datos extraídos: {product.extractedAt}
                  </small>
                  <a
                    id="detail-source"
                    href={product.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ver ficha de origen →
                  </a>
                </div>
              </section>
            </div>
          </div>
        </>
      )}
    </dialog>
  );
}