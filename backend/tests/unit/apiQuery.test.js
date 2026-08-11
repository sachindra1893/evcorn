const { parseQueryParams, buildVehicleFilterQuery, buildArticleFilterQuery, formatResponse } = require('../../utils/apiQuery');

describe('API Query Utilities (Unit Tests)', () => {
  describe('parseQueryParams()', () => {
    it('should parse valid pagination, sort, fields, and envelope flags', () => {
      const query = { page: '2', limit: '10', sort: 'name', fields: 'id,name', format: 'envelope' };
      const parsed = parseQueryParams(query);

      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(10);
      expect(parsed.sort).toEqual({ name: 1 });
      expect(parsed.projection).toEqual({ id: 1, name: 1 });
      expect(parsed.formatEnvelope).toBe(true);
    });

    it('should enforce maximum limit of 100', () => {
      const query = { limit: '500' };
      const parsed = parseQueryParams(query);
      expect(parsed.limit).toBe(100);
    });

    it('should handle missing query parameters gracefully', () => {
      const parsed = parseQueryParams({});
      expect(parsed.page).toBeUndefined();
      expect(parsed.limit).toBeUndefined();
      expect(parsed.sort).toBeNull();
      expect(parsed.projection).toBeNull();
      expect(parsed.formatEnvelope).toBe(false);
    });
  });

  describe('buildVehicleFilterQuery()', () => {
    it('should construct filter query with categoryId and text search regex', () => {
      const filter = buildVehicleFilterQuery({ categoryId: 'tata', search: 'nexon' });
      expect(filter.categoryId).toBe('tata');
      expect(filter.$or).toBeDefined();
      expect(filter.$or.length).toBeGreaterThan(0);
    });


  });

  describe('buildArticleFilterQuery() — Root-Cause Cluster A regression tests', () => {
    it('should tolerate articles missing publishAt/status instead of silently excluding them', () => {
      // Regression test for the "invisible articles" bug: a document with a
      // real, valid `status: 'published'` and `publishAt` in the past MUST be
      // matched by this filter — but so must a legacy document where either
      // field is entirely absent from the stored document.
      const filter = buildArticleFilterQuery({});

      expect(filter.active).toBe(true);
      expect(filter.$or).toBeUndefined();
      expect(Array.isArray(filter.$and)).toBe(true);
      expect(filter.$and).toHaveLength(2);

      const statusClause = filter.$and.find(c => c.$or.some(o => 'status' in o));
      expect(statusClause.$or).toContainEqual({ status: 'published' });
      expect(statusClause.$or).toContainEqual({ status: { $exists: false } });

      const publishAtClause = filter.$and.find(c => c.$or.some(o => 'publishAt' in o));
      expect(publishAtClause.$or).toContainEqual({ publishAt: { $exists: false } });
      expect(publishAtClause.$or[0].publishAt.$lte).toBeInstanceOf(Date);
    });

    it('should ignore client admin=true without elevated option (Phase 7)', () => {
      const filter = buildArticleFilterQuery({ admin: 'true' });
      expect(filter.active).toBe(true);
      expect(Array.isArray(filter.$and)).toBe(true);
      expect(filter.$and.length).toBeGreaterThanOrEqual(2);
    });

    it('should allow elevated listing to skip public status/publishAt filters', () => {
      const filter = buildArticleFilterQuery({ admin: 'true' }, { elevated: true });
      expect(filter.active).toBeUndefined();
      expect(filter.$and).toBeUndefined();
      expect(filter.$or).toBeUndefined();
    });

    it('should ignore draft status probes on public listings (Phase 7)', () => {
      const filter = buildArticleFilterQuery({ status: 'draft' });
      expect(filter.status).toBeUndefined();
      expect(filter.active).toBe(true);
      expect(Array.isArray(filter.$and)).toBe(true);
    });

    it('should honor status when elevated is true', () => {
      const filter = buildArticleFilterQuery({ status: 'draft' }, { elevated: true });
      expect(filter.status).toBe('draft');
      expect(filter.$and).toBeUndefined();
    });

    it('should combine the default tolerant filter with a search regex via $and', () => {
      const filter = buildArticleFilterQuery({ search: 'nexon' });
      expect(Array.isArray(filter.$and)).toBe(true);
      expect(filter.$and).toHaveLength(3);
      const searchClause = filter.$and.find(c => c.$or.some(o => 'title' in o));
      expect(searchClause.$or.some(o => o.title instanceof RegExp)).toBe(true);
    });

    it('should escape regex metacharacters in search (ReDoS guard)', () => {
      const filter = buildArticleFilterQuery({ search: 'a+b(c)' });
      const searchClause = filter.$and.find(c => c.$or.some(o => 'title' in o));
      expect(searchClause.$or[0].title.source).toBe('a\\+b\\(c\\)');
    });

    it('should combine elevated status with a search regex via top-level $or', () => {
      const filter = buildArticleFilterQuery(
        { status: 'published', search: 'nexon' },
        { elevated: true }
      );
      expect(filter.status).toBe('published');
      expect(filter.$and).toBeUndefined();
      expect(Array.isArray(filter.$or)).toBe(true);
      expect(filter.$or.some(o => o.title instanceof RegExp)).toBe(true);
    });

    it('should filter by category when provided', () => {
      const filter = buildArticleFilterQuery({ category: 'Tata' });
      expect(filter.categoryId).toBe('tata');
    });
  });

  describe('formatResponse()', () => {
    it('should format paginated data inside standardized envelope when formatEnvelope is true', () => {
      const dtos = [{ id: 'nexon-ev', name: 'Tata Nexon EV' }];
      const meta = { page: 1, limit: 10, total: 1, pages: 1 };
      const envelope = formatResponse(dtos, meta, true);

      expect(envelope).toEqual({
        success: true,
        data: dtos,
        meta: meta
      });
    });

    it('should return raw DTO array when formatEnvelope is false for 100% backward compatibility', () => {
      const dtos = [{ id: 'nexon-ev', name: 'Tata Nexon EV' }];
      const res = formatResponse(dtos, null, false);
      expect(res).toEqual(dtos);
    });
  });
});
