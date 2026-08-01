import {
  articleEntityId,
  brandEntityId,
  modelEntityId,
  resolveModelName,
  variantEntityId
} from './entity-id';
import { modelHref } from './entity-href';

describe('entity-id — stable deterministic identity', () => {
  it('builds brand / variant / article ids from persisted keys', () => {
    expect(brandEntityId('tata')).toBe('brand:tata');
    expect(variantEntityId('tata-nexon-lr')).toBe('variant:tata-nexon-lr');
    expect(articleEntityId('64f0abc123')).toBe('article:64f0abc123');
  });

  it('returns empty string for missing ids (failure-safe)', () => {
    expect(brandEntityId('')).toBe('');
    expect(variantEntityId(undefined)).toBe('');
    expect(articleEntityId(null)).toBe('');
    expect(modelEntityId('', { parentModel: 'Nexon EV' })).toBe('');
    expect(modelEntityId('tata', {})).toBe('');
  });

  it('resolves model name: parentModel wins over dirty modelSlug', () => {
    expect(
      resolveModelName({
        parentModel: 'Nexon EV',
        modelSlug: 'wrong-stale-slug',
        name: 'Nexon EV::LR'
      })
    ).toBe('Nexon EV');
  });

  it('falls back to packed name then modelSlug', () => {
    expect(resolveModelName({ name: 'ZS EV::Exclusive', modelSlug: 'zs' })).toBe('ZS EV');
    expect(resolveModelName({ modelSlug: 'xuv400' })).toBe('xuv400');
  });

  it('model id is stable when modelSlug disagrees with parentModel (regression)', () => {
    const brandId = 'tata';
    const fromParent = modelEntityId(brandId, {
      parentModel: 'Nexon EV',
      modelSlug: 'nexon'
    });
    const fromParentOnly = modelEntityId(brandId, { parentModel: 'Nexon EV' });
    const withStaleSlug = modelEntityId(brandId, {
      parentModel: 'Nexon EV',
      modelSlug: 'completely-different'
    });

    expect(fromParent).toBe('model:tata:nexon-ev');
    expect(fromParentOnly).toBe('model:tata:nexon-ev');
    expect(withStaleSlug).toBe('model:tata:nexon-ev');
  });

  it('model id uses categoryId, not brand display name / brandSlug', () => {
    const id = modelEntityId('tata', { parentModel: 'Nexon EV' });
    expect(id).toBe('model:tata:nexon-ev');
    expect(id).not.toContain('tata-motors');
  });

  it('same model across variants shares one entity id', () => {
    const a = modelEntityId('tata', {
      parentModel: 'Nexon EV',
      name: 'Nexon EV::MR',
      modelSlug: 'nexon-ev'
    });
    const b = modelEntityId('tata', {
      parentModel: 'Nexon EV',
      name: 'Nexon EV::LR',
      modelSlug: 'nexon'
    });
    expect(a).toBe(b);
  });

  it('article slug changes must not change article entity id', () => {
    const id = articleEntityId('art-1');
    expect(id).toBe('article:art-1');
    // slug is an alias only — identity stays on persisted article id
    expect(articleEntityId('art-1')).toBe(id);
  });

  it('href / brandName changes do not change model entity id', () => {
    const identity = modelEntityId('tata', {
      parentModel: 'Nexon EV',
      modelSlug: 'stale'
    });

    const hrefA = modelHref({
      brandName: 'Tata Motors',
      parentModel: 'Nexon EV'
    });
    const hrefB = modelHref({
      brandSlug: 'tata',
      parentModel: 'Nexon EV'
    });

    expect(identity).toBe('model:tata:nexon-ev');
    expect(hrefA).toBe('/ev/tata-motors/nexon-ev');
    expect(hrefB).toBe('/ev/tata/nexon-ev');
    // Identity stays on brandId + parentModel even when public brand path differs
    expect(modelEntityId('tata', { parentModel: 'Nexon EV' })).toBe(identity);
  });

  it('is deterministic across repeated calls', () => {
    const input = { parentModel: 'XUV400', modelSlug: 'xuv-400-old' };
    expect(modelEntityId('mahindra', input)).toBe(modelEntityId('mahindra', input));
    expect(modelEntityId('mahindra', input)).toBe('model:mahindra:xuv400');
  });
});
