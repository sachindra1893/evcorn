/**
 * Phase 7.4 — Content freshness from publishAt / updatedAt / status only.
 * Reuses AEO date resolution order; does not invent dates or rewrite CTAs.
 *
 * Documented thresholds (architecture §9.2; constants, not CMS):
 * - fresh:  ageDays ≤ 90
 * - aging:  91–180
 * - stale:  > 180, or vehicle status=Discontinued (editorial flag)
 * - unknown: no usable date
 */

import {
  resolveLastUpdated,
  resolveLastUpdatedFromVariants
} from '../aeo/generators/last-updated';
import type { VehicleLike } from '../entity/entity-normalize';
import type { FreshnessSignal, IsoDateString } from './content-intel.types';
import { emptyFreshnessSignal } from './content-intel.types';

export const FRESHNESS_FRESH_MAX_DAYS = 90;
export const FRESHNESS_AGING_MAX_DAYS = 180;

export interface FreshnessInput {
  updatedAt?: string | null;
  publishedAt?: string | null;
  publishAt?: string | null;
  createdAt?: string | null;
  status?: string | null;
}

function ageDaysFrom(iso: string, nowMs: number): number | undefined {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return undefined;
  const days = Math.floor((nowMs - ms) / (24 * 60 * 60 * 1000));
  return days < 0 ? 0 : days;
}

function stateFromAge(ageDays: number): FreshnessSignal['state'] {
  if (ageDays <= FRESHNESS_FRESH_MAX_DAYS) return 'fresh';
  if (ageDays <= FRESHNESS_AGING_MAX_DAYS) return 'aging';
  return 'stale';
}

/**
 * Derive freshness from CMS date fields + optional status.
 * `now` injectable for deterministic tests.
 */
export function deriveFreshness(
  input: FreshnessInput | null | undefined,
  now?: IsoDateString
): FreshnessSignal {
  if (!input) return emptyFreshnessSignal();

  const lastUpdated = resolveLastUpdated({
    updatedAt: input.updatedAt || undefined,
    publishedAt: input.publishedAt || undefined,
    publishAt: input.publishAt || undefined,
    createdAt: input.createdAt || undefined
  });

  const reasons: string[] = [];
  const status = (input.status || '').trim();
  if (status) {
    if (status.toLowerCase() === 'scheduled') {
      reasons.push('status=scheduled');
    }
    if (status.toLowerCase() === 'discontinued') {
      reasons.push('status=Discontinued');
    }
  }

  if (!lastUpdated) {
    return {
      state: status.toLowerCase() === 'discontinued' ? 'stale' : 'unknown',
      editorialPriority:
        status.toLowerCase() === 'discontinued' ? 'review' : undefined,
      reasons: reasons.length ? reasons : ['no usable publishAt/updatedAt']
    };
  }

  const nowMs = now ? Date.parse(now) : Date.now();
  const ageDays = Number.isNaN(nowMs) ? undefined : ageDaysFrom(lastUpdated, nowMs);

  if (ageDays === undefined) {
    return {
      lastUpdated,
      state: 'unknown',
      reasons: [...reasons, 'unparseable lastUpdated']
    };
  }

  let state = stateFromAge(ageDays);
  if (status.toLowerCase() === 'discontinued') {
    state = 'stale';
  }

  if (ageDays > FRESHNESS_AGING_MAX_DAYS) {
    reasons.push(`updatedAt > ${FRESHNESS_AGING_MAX_DAYS}d`);
  } else if (ageDays > FRESHNESS_FRESH_MAX_DAYS) {
    reasons.push(`updatedAt ${FRESHNESS_FRESH_MAX_DAYS + 1}–${FRESHNESS_AGING_MAX_DAYS}d`);
  } else {
    reasons.push(`updatedAt ≤ ${FRESHNESS_FRESH_MAX_DAYS}d`);
  }

  let editorialPriority: FreshnessSignal['editorialPriority'];
  if (state === 'stale') editorialPriority = 'urgent';
  else if (state === 'aging') editorialPriority = 'review';
  else editorialPriority = 'none';

  return {
    lastUpdated,
    ageDays,
    state,
    editorialPriority,
    reasons
  };
}

function asDated(
  entity: VehicleLike | null | undefined
): { updatedAt?: string; publishedAt?: string; createdAt?: string } | undefined {
  if (!entity) return undefined;
  return {
    updatedAt: entity.updatedAt || undefined
  };
}

/** Vehicle model page: prefer latest among sibling variants. */
export function deriveVehicleFreshness(
  variants: VehicleLike[] | null | undefined,
  selected?: VehicleLike | null,
  now?: IsoDateString
): FreshnessSignal {
  const datedVariants = (variants || []).map((v) => asDated(v)!).filter(Boolean);
  const lastUpdated =
    resolveLastUpdatedFromVariants(datedVariants) ||
    resolveLastUpdated(asDated(selected));

  const status =
    (selected?.status || '').trim() ||
    (variants || []).map((v) => (v.status || '').trim()).find(Boolean) ||
    '';

  return deriveFreshness(
    {
      updatedAt: lastUpdated,
      status
    },
    now
  );
}
