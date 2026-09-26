import { useState, useEffect } from 'react';

function ProductList() {
  // products starts as an empty list
  const [products, setProducts] = useState([]);

  // This runs once when the component first appears
  useEffect(() => {
    fetch('http://localhost:3000/api/products')
      .then((response) => response.json())
      .then((data) => {
        setProducts(data);
      })
      .catch((error) => {
        console.error('Could not fetch products:', error);
      });
  }, []);

  return (
    <div>
      <h1>My Shop</h1>

      {products.length === 0 ? (
        <p>Loading products...</p>
      ) : (
        <ul>
          {products.map((product) => (
            <li key={product.id}>
              {product.name} — ${product.price}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ProductList;
