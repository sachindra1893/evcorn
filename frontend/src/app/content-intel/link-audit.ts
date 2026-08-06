/**
 * Phase 7.4 M3 — internal linking audit. Reporting only.
 * Never rewrites links, never touches article HTML, never reorders RecommendationService.
 */

import {
  EDITORIAL_LINK_FINDINGS_MAX,
  InternalLinkAuditReport,
  LinkAuditFinding,
  LinkSuggestion,
  RelatedReadingPlan,
  WEAK_CONNECTION_MIN_DESTINATIONS,
  emptyInternalLinkAuditReport
} from './content-intel.types';
import { isValidLinkSuggestion, normalizeDestinationHref } from './link-canonical';

export interface LinkAuditInput {
  /** Entity the page is about. */
  entityId: string;
  hubLinks: LinkSuggestion[];
  contextualLinks: LinkSuggestion[];
  relatedReading?: RelatedReadingPlan | null;
}

function push(out: LinkAuditFinding[], seen: Set<string>, finding: LinkAuditFinding): void {
  if (out.length >= EDITORIAL_LINK_FINDINGS_MAX) return;
  const key = `${finding.kind}:${finding.affectedEntityId}:${(finding.hrefs || []).join(',')}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(finding);
}

function relatedDestinations(plan: RelatedReadingPlan | null | undefined): string[] {
  const out: string[] = [];
  for (const row of plan?.vehicles || []) {
    if (row.item?.href) out.push(normalizeDestinationHref(row.item.href));
  }
  for (const row of plan?.articles || []) {
    if (row.item?.href) out.push(normalizeDestinationHref(row.item.href));
  }
  for (const row of plan?.comparisons || []) {
    if (row.item?.href) out.push(normalizeDestinationHref(row.item.href));
  }
  return out.filter(Boolean);
}

/**
 * Audit one page's outbound internal links.
 *
 * Hub links are site-wide furniture, so connectivity is measured on contextual /
 * related destinations only — otherwise every page would look well connected.
 */
export function auditInternalLinks(
  input: LinkAuditInput | null | undefined
): InternalLinkAuditReport {
  if (!input?.entityId) return emptyInternalLinkAuditReport();

  const entityId = input.entityId.trim();
  const hubLinks = input.hubLinks || [];
  const contextualLinks = input.contextualLinks || [];
  const findings: LinkAuditFinding[] = [];
  const seen = new Set<string>();

  for (const s of [...hubLinks, ...contextualLinks]) {
    // Report on the unproven suggestion itself, so keep the value un-narrowed.
    if (isValidLinkSuggestion(s) as boolean) continue;
    push(findings, seen, {
      kind: 'missing_evidence',
      affectedEntityId: (s?.targetEntityId || '').trim() || entityId,
      detail: `link suggestion "${(s?.label || '').trim() || 'unnamed'}" lacks href, targetEntityId, or evidence refs`,
      evidenceRefs: ['LinkSuggestion.evidence.refs', 'LinkSuggestion.targetEntityId'],
      hrefs: s?.href ? [s.href] : []
    });
  }

  const hubByHref = new Map<string, string[]>();
  for (const hub of hubLinks) {
    if (!isValidLinkSuggestion(hub)) continue;
    const href = normalizeDestinationHref(hub.href);
    if (!href) continue;
    const owners = hubByHref.get(href) || [];
    owners.push(hub.targetEntityId);
    hubByHref.set(href, owners);
  }
  for (const [href, owners] of hubByHref) {
    if (owners.length < 2) continue;
    push(findings, seen, {
      kind: 'duplicate_hub_link',
      affectedEntityId: entityId,
      detail: `hub destination ${href} is claimed by ${owners.length} entities: ${owners.join(', ')}`,
      evidenceRefs: ['hubLinks.href', 'LinkSuggestion.targetEntityId'],
      hrefs: [href]
    });
  }

  const hubHrefs = new Set(hubByHref.keys());
  const contextualHrefs: string[] = [];
  for (const link of contextualLinks) {
    if (!isValidLinkSuggestion(link)) continue;
    const href = normalizeDestinationHref(link.href);
    if (!href) continue;
    contextualHrefs.push(href);
    if (hubHrefs.has(href)) {
      push(findings, seen, {
        kind: 'duplicate_destination',
        affectedEntityId: link.targetEntityId,
        detail: `${href} renders in both Explore hubs and contextual links`,
        evidenceRefs: ['hubLinks.href', 'contextualLinks.href'],
        hrefs: [href]
      });
    }
  }

  const related = relatedDestinations(input.relatedReading);
  for (const href of related) {
    if (!hubHrefs.has(href)) continue;
    push(findings, seen, {
      kind: 'duplicate_destination',
      affectedEntityId: entityId,
      detail: `${href} renders in both Explore hubs and Related*`,
      evidenceRefs: ['hubLinks.href', 'relatedReading.href'],
      hrefs: [href]
    });
  }

  const provenDestinations = new Set([...contextualHrefs, ...related]);
  const distinctDestinations = new Set([...provenDestinations, ...hubHrefs]).size;

  if (provenDestinations.size === 0) {
    push(findings, seen, {
      kind: 'orphan_page',
      affectedEntityId: entityId,
      detail: 'no contextual or related destinations resolve — only site-wide hubs link out',
      evidenceRefs: ['contextualLinks=0', 'relatedReading=0']
    });
  } else if (provenDestinations.size < WEAK_CONNECTION_MIN_DESTINATIONS) {
    push(findings, seen, {
      kind: 'weakly_connected',
      affectedEntityId: entityId,
      detail: `only ${provenDestinations.size} proven destination(s); minimum is ${WEAK_CONNECTION_MIN_DESTINATIONS}`,
      evidenceRefs: [`provenDestinations=${provenDestinations.size}`]
    });
  }

  return {
    outboundCount: hubLinks.length + contextualLinks.length,
    distinctDestinations,
    findings
  };
}
