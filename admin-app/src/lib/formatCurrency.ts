export function formatCurrency(value: number, currency: string = 'USD', locale: string = 'es-CR') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}
