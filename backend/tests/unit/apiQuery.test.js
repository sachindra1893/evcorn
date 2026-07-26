const { parseQueryParams, buildVehicleFilterQuery, formatResponse } = require('../../utils/apiQuery');

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
