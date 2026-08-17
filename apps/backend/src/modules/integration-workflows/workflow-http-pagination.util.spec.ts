import {
  applyHttpPaginationQueryParams,
  httpPaginationItemCount,
  httpPaginationShouldStop,
  httpPaginationTotal,
  parseHttpPaginationConfig,
} from './workflow-http-pagination.util';

describe('workflow-http-pagination', () => {
  it('parses enabled config with defaults', () => {
    const cfg = parseHttpPaginationConfig({ pagination: { enabled: true } });
    expect(cfg).toMatchObject({
      enabled: true,
      pageParam: 'page',
      startPage: 1,
      pageSizeParam: 'pageSize',
      pageSize: 100,
      itemsPath: 'items',
      totalPath: 'total',
    });
  });

  it('returns null when pagination is off', () => {
    expect(parseHttpPaginationConfig({ pagination: { enabled: false } })).toBeNull();
    expect(parseHttpPaginationConfig({})).toBeNull();
  });

  it('overrides page and pageSize query params', () => {
    const cfg = parseHttpPaginationConfig({
      pagination: { enabled: true, pageParam: 'page', pageSizeParam: 'pageSize', pageSize: 100 },
    });
    expect(cfg).not.toBeNull();
    const q = applyHttpPaginationQueryParams(
      [
        { key: 'page', value: '1', enabled: true },
        { key: 'foo', value: 'bar', enabled: true },
      ],
      cfg!,
      3,
    );
    expect(q.find((r) => r.key === 'foo')?.value).toBe('bar');
    expect(q.find((r) => r.key === 'page')?.value).toBe('3');
    expect(q.find((r) => r.key === 'pageSize')?.value).toBe('100');
  });

  it('counts items and total from Dalton-shaped body', () => {
    const body = { items: [{ sku: '1' }, { sku: '2' }], page: 1, pageSize: 25, total: 6 };
    expect(httpPaginationItemCount(body, 'items')).toBe(2);
    expect(httpPaginationTotal(body, 'total')).toBe(6);
  });

  it('stops when page * pageSize covers total', () => {
    expect(
      httpPaginationShouldStop({ page: 1, pageSize: 25, itemCount: 6, total: 6 }),
    ).toBe(true);
  });

  it('stops on empty items', () => {
    expect(
      httpPaginationShouldStop({ page: 2, pageSize: 100, itemCount: 0, total: 11000 }),
    ).toBe(true);
  });

  it('continues when a full page remains', () => {
    expect(
      httpPaginationShouldStop({ page: 1, pageSize: 100, itemCount: 100, total: 11000 }),
    ).toBe(false);
  });
});
