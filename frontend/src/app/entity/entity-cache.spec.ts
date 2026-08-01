import {
  ENTITY_GRAPH_CACHE_MAX_ENTRIES,
  clearEntityGraphCache,
  entityGraphCacheSize,
  getCachedEntityGraph,
  setCachedEntityGraph
} from './entity-cache';
import { EMPTY_ENTITY_GRAPH } from './entity-graph';

describe('EntityGraphCache', () => {
  beforeEach(() => clearEntityGraphCache());

  it('stores derived graphs by entityId+version only', () => {
    const graph = {
      nodes: [{ type: 'article' as const, id: 'article:a1', name: 'A', attrs: {} }],
      edges: []
    };
    setCachedEntityGraph('article:a1', '2026-07-01', graph);
    expect(getCachedEntityGraph('article:a1', '2026-07-01')).toBe(graph);
    expect(getCachedEntityGraph('article:a1', '2026-07-02')).toBeUndefined();
  });

  it('evicts oldest entries when over max size', () => {
    for (let i = 0; i < ENTITY_GRAPH_CACHE_MAX_ENTRIES + 5; i++) {
      setCachedEntityGraph(`id-${i}`, 't', EMPTY_ENTITY_GRAPH);
    }
    expect(entityGraphCacheSize()).toBe(ENTITY_GRAPH_CACHE_MAX_ENTRIES);
    expect(getCachedEntityGraph('id-0', 't')).toBeUndefined();
    expect(getCachedEntityGraph(`id-${ENTITY_GRAPH_CACHE_MAX_ENTRIES + 4}`, 't')).toBe(
      EMPTY_ENTITY_GRAPH
    );
  });
});
