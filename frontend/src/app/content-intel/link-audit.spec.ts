import { describe, it, expect } from 'vitest';
import type { LinkSuggestion, RelatedReadingPlan } from './content-intel.types';
import { WEAK_CONNECTION_MIN_DESTINATIONS } from './content-intel.types';
import { auditInternalLinks } from './link-audit';

describe('link-audit (Phase 7.4 M3)', () => {
  const hub = (
    label: string,
    href: string,
    targetEntityId: string
  ): LinkSuggestion => ({
    label,
    href,
    targetEntityId,
    relKind: 'hub',
    evidence: { source: 'hub_taxonomy', refs: ['hub_taxonomy'] }
  });

  const contextual = (
    label: string,
    href: string,
    targetEntityId: string
  ): LinkSuggestion => ({
    label,
    href,
    targetEntityId,
    relKind: 'related_reading',
    evidence: { source: 'recommendation', refs: ['RecommendationService'] }
  });

  const emptyPlan = (): RelatedReadingPlan => ({
    vehicles: [],
    articles: [],
    comparisons: []
  });

  it('detects an orphan page linked only by site-wide hubs', () => {
    const report = auditInternalLinks({
      entityId: 'article:a1',
      hubLinks: [hub('EVCorn FAQs', '/faqs', 'site_hub:faqs')],
      contextualLinks: [],
      relatedReading: emptyPlan()
    });
    expect(report.findings.map((f) => f.kind)).toContain('orphan_page');
    expect(report.findings.some((f) => f.kind === 'weakly_connected')).toBe(false);
    expect(report.outboundCount).toBe(1);
  });

  it('detects a weakly connected page below the destination minimum', () => {
    const report = auditInternalLinks({
      entityId: 'model:tata:nexon-ev',
      hubLinks: [hub('EVCorn FAQs', '/faqs', 'site_hub:faqs')],
      contextualLinks: [contextual('MG ZS EV', '/ev/mg/zs-ev', 'variant:v2')],
      relatedReading: emptyPlan()
    });
    const weak = report.findings.find((f) => f.kind === 'weakly_connected');
    expect(weak).toBeTruthy();
    expect(weak?.evidenceRefs).toContain('provenDestinations=1');
    expect(WEAK_CONNECTION_MIN_DESTINATIONS).toBe(2);
  });

  it('reports neither orphan nor weak when enough destinations resolve', () => {
    const report = auditInternalLinks({
      entityId: 'model:tata:nexon-ev',
      hubLinks: [hub('EVCorn FAQs', '/faqs', 'site_hub:faqs')],
      contextualLinks: [
        contextual('MG ZS EV', '/ev/mg/zs-ev', 'variant:v2'),
        contextual('Punch EV', '/ev/tata-motors/punch-ev', 'variant:v3')
      ],
      relatedReading: emptyPlan()
    });
    const kinds = report.findings.map((f) => f.kind);
    expect(kinds).not.toContain('orphan_page');
    expect(kinds).not.toContain('weakly_connected');
    expect(report.distinctDestinations).toBe(3);
  });

  it('detects two hub entities claiming the same destination', () => {
    const report = auditInternalLinks({
      entityId: 'model:tata:nexon-ev',
      hubLinks: [
        hub('Browse EVs', '/evs', 'site_hub:evs'),
        hub('All EVs', '/evs', 'brand:unknown')
      ],
      contextualLinks: [
        contextual('MG ZS EV', '/ev/mg/zs-ev', 'variant:v2'),
        contextual('Punch EV', '/ev/tata-motors/punch-ev', 'variant:v3')
      ],
      relatedReading: emptyPlan()
    });
    const dup = report.findings.find((f) => f.kind === 'duplicate_hub_link');
    expect(dup?.hrefs).toEqual(['/evs']);
    expect(dup?.detail).toContain('site_hub:evs');
  });

  it('treats query strings as distinct hub destinations', () => {
    const report = auditInternalLinks({
      entityId: 'model:tata:nexon-ev',
      hubLinks: [
        hub('All Tata EVs', '/evs?category=tata-motors', 'brand:tata'),
        hub('All MG EVs', '/evs?category=mg', 'brand:mg')
      ],
      contextualLinks: [
        contextual('MG ZS EV', '/ev/mg/zs-ev', 'variant:v2'),
        contextual('Punch EV', '/ev/tata-motors/punch-ev', 'variant:v3')
      ],
      relatedReading: emptyPlan()
    });
    expect(report.findings.some((f) => f.kind === 'duplicate_hub_link')).toBe(false);
  });

  it('detects a destination shared by hubs and contextual or related links', () => {
    const report = auditInternalLinks({
      entityId: 'model:tata:nexon-ev',
      hubLinks: [hub('MG ZS EV', '/ev/mg/zs-ev', 'model:mg:zs-ev')],
      contextualLinks: [contextual('MG ZS EV', '/ev/mg/zs-ev#specs', 'variant:v2')],
      relatedReading: {
        vehicles: [
          {
            item: { id: 'v2', name: 'MG ZS EV', href: '/ev/mg/zs-ev' },
            topicLabels: [],
            evidence: { source: 'recommendation', refs: ['recommended_vehicle'] }
          }
        ],
        articles: [],
        comparisons: []
      }
    });
    const dups = report.findings.filter((f) => f.kind === 'duplicate_destination');
    expect(dups.length).toBeGreaterThan(0);
    expect(dups.every((f) => f.hrefs?.[0] === '/ev/mg/zs-ev')).toBe(true);
  });

  it('detects suggestions that cannot cite evidence', () => {
    const report = auditInternalLinks({
      entityId: 'model:tata:nexon-ev',
      hubLinks: [
        {
          label: 'No evidence',
          href: '/orphan',
          targetEntityId: 'site_hub:orphan',
          relKind: 'hub',
          evidence: { source: 'hub_taxonomy', refs: [] }
        }
      ],
      contextualLinks: [
        {
          label: 'No target',
          href: '/somewhere',
          targetEntityId: '',
          relKind: 'related_reading',
          evidence: { source: 'recommendation', refs: ['RecommendationService'] }
        }
      ],
      relatedReading: emptyPlan()
    });
    const missing = report.findings.filter((f) => f.kind === 'missing_evidence');
    expect(missing.length).toBe(2);
    expect(missing[0].evidenceRefs).toContain('LinkSuggestion.evidence.refs');
  });

  it('returns an empty report for missing input instead of throwing', () => {
    expect(auditInternalLinks(null).findings).toEqual([]);
    expect(auditInternalLinks(undefined).outboundCount).toBe(0);
  });
});
