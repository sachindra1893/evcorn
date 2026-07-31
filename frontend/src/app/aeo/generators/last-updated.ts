import { IsoDateString } from '../aeo.types';

export interface DatedEntity {
  updatedAt?: string;
  publishedAt?: string;
  publishAt?: string;
  createdAt?: string;
}

/**
 * Prefer updatedAt → publishedAt/publishAt → createdAt.
 * Returns ISO string or undefined when no date is available.
 */
export function resolveLastUpdated(entity: DatedEntity | null | undefined): IsoDateString | undefined {
  if (!entity) return undefined;
  const candidates = [entity.updatedAt, entity.publishedAt, entity.publishAt, entity.createdAt];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      const parsed = Date.parse(value);
      if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
      return value.trim();
    }
  }
  return undefined;
}

/** Latest usable timestamp across sibling variants (model page). */
export function resolveLastUpdatedFromVariants(
  variants: DatedEntity[] | null | undefined
): IsoDateString | undefined {
  if (!variants?.length) return undefined;
  let bestMs = -1;
  let bestIso: string | undefined;
  for (const v of variants) {
    const iso = resolveLastUpdated(v);
    if (!iso) continue;
    const ms = Date.parse(iso);
    if (!Number.isNaN(ms) && ms >= bestMs) {
      bestMs = ms;
      bestIso = iso;
    } else if (Number.isNaN(ms) && !bestIso) {
      bestIso = iso;
    }
  }
  return bestIso;
}

/** Human-readable date for UI (never invents a date). */
export function formatLastUpdatedLabel(iso: IsoDateString | undefined): string | undefined {
  if (!iso) return undefined;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return undefined;
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(ms));
}
