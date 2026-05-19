import {
  buildSearchAttempts,
  extractProductSearchQuery,
  fallbackReply,
  refineSearchQueryForCatalog,
  shouldUseMergedCatalogSearch,
} from './storefront-chat.helpers';

describe('extractProductSearchQuery', () => {
  it('toma el último mensaje de usuario', () => {
    expect(
      extractProductSearchQuery([
        { role: 'user', content: 'hola' },
        { role: 'assistant', content: 'hola qué tal' },
        { role: 'user', content: '  filtro de aceite corolla 2020  ' },
      ]),
    ).toBe('filtro de aceite corolla 2020');
  });

  it('devuelve vacío si no hay usuario', () => {
    expect(extractProductSearchQuery([{ role: 'assistant', content: 'x' }])).toBe('');
  });
});

describe('fallbackReply', () => {
  it('lista productos si hay hints', () => {
    const r = fallbackReply('aceite', [{ id: '1', name: 'Aceite 5w30', sku: 'X1' }], 'Mi tienda');
    expect(r).toContain('Aceite 5w30');
    expect(r).toContain('Mi tienda');
  });
});

describe('refineSearchQueryForCatalog', () => {
  it('quita muletillas y deja términos útiles', () => {
    expect(refineSearchQueryForCatalog('tienes pastillas de freno')).toBe('pastillas freno');
  });

  it('devuelve vacío para saludo sin término de refacción', () => {
    expect(refineSearchQueryForCatalog('hola que tal como estas')).toBe('');
  });
});

describe('buildSearchAttempts', () => {
  it('incluye sinónimos para balatas', () => {
    const a = buildSearchAttempts('balatas');
    expect(a).toContain('pastillas de freno');
    expect(a).toContain('pastillas freno');
  });

  it('expande triángulo / vía a términos de catálogo', () => {
    const a = buildSearchAttempts('triangulito rojo en la via');
    expect(a).toContain('triangulo emergencia');
    expect(a).toContain('triangulo');
  });
});

describe('shouldUseMergedCatalogSearch', () => {
  it('activa para descripciones coloquiales largas o “me refiero”', () => {
    expect(shouldUseMergedCatalogSearch('me refiero al triangulito rojo')).toBe(true);
    expect(shouldUseMergedCatalogSearch('una dos tres cuatro cinco seis siete ocho nueve diez')).toBe(true);
  });

  it('no activa para consultas cortas típicas', () => {
    expect(shouldUseMergedCatalogSearch('aceite 5w30')).toBe(false);
    expect(shouldUseMergedCatalogSearch('balatas corolla')).toBe(false);
  });
});
