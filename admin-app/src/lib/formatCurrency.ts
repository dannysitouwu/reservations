export function formatCurrency(value: number, locale: string = 'es-CR', currency: string = 'CRC') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}
