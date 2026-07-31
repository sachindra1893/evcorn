import { AeoArticleContext, AeoBlockLike, AeoTocItem } from '../aeo.types';

/** Fixed vehicle detail sections — ids must match anchors on the page. */
export const VEHICLE_TOC_SECTIONS: AeoTocItem[] = [
  { id: 'aeo-overview', text: 'Overview', level: 2 },
  { id: 'aeo-variants', text: 'Variants', level: 2 },
  { id: 'aeo-specs', text: 'Specifications', level: 2 }
];

export function generateVehicleToc(): AeoTocItem[] {
  return VEHICLE_TOC_SECTIONS.map((item) => ({ ...item }));
}

/**
 * Article TOC from heading blocks (levels 2–3), preserving block ids for scroll targets.
 */
export function generateArticleToc(ctx: AeoArticleContext): AeoTocItem[] {
  const blocks = ctx.blocks || [];
  return blocks
    .filter((b): b is AeoBlockLike & { data: { text: string; level: number } } => {
      if (b.type !== 'heading' || !b.data) return false;
      const level = b.data['level'];
      const text = b.data['text'];
      return (level === 2 || level === 3) && typeof text === 'string' && !!text.trim();
    })
    .map((b) => ({
      id: typeof b.id === 'string' && b.id ? b.id : slugifyHeading(String(b.data['text'])),
      text: String(b.data['text']).trim(),
      level: Number(b.data['level'])
    }));
}

function slugifyHeading(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '') || 'section';
}
