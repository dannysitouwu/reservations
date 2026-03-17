/**
 * Converts a string to a URL-friendly slug
 * Example: "Tour a Arenal" → "tour-a-arenal"
 */
export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with single
}

/**
 * Converts a slug back to normal text (simple version)
 * Example: "tour-a-arenal" → "tour a arenal"
 */
export function fromSlug(slug: string): string {
  return slug.replace(/-/g, ' ');
}
