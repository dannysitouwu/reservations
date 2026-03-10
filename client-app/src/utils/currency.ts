export function formatCurrency(value: number, currencyCode = 'CRC', locale: string = typeof window !== 'undefined' ? navigator.language : 'es-CR') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}
