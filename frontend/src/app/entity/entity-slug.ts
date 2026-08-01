/**
 * Shared slugify for entity identity keys and public href path segments.
 * Matches browse / vehicle-detail / AEO related-vehicle algorithm so existing
 * `/ev/{brand}/{model}` URLs keep resolving.
 */
export function entitySlugify(text: string | null | undefined): string {
  return (text || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
