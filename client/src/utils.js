export function formatPrice(value, currency) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function categoryGroup(category = '') {
  return category.split(' > ')[0];
}