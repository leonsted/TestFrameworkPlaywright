export interface ODataQuery {
  top?: number;
  filter?: string;
  select?: string;
  count?: boolean;
}

/** Собирает адрес запроса к OData 1С. Поле filter уже должно быть готовой строкой OData. */
export function buildODataUrl(baseUrl: string, entity: string, query: ODataQuery = {}): string {
  const url = new URL(baseUrl);
  const folder = url.pathname.replace(/\/$/, '');
  url.pathname = `${folder}/${entity}`;
  url.search = '';
  url.searchParams.set('$format', 'json');
  if (query.top !== undefined) url.searchParams.set('$top', String(query.top));
  if (query.filter) url.searchParams.set('$filter', query.filter);
  if (query.select) url.searchParams.set('$select', query.select);
  if (query.count) url.searchParams.set('$count', 'true');
  return url.toString();
}

/** Оборачивает строку в кавычки OData и удваивает одинарные кавычки внутри. */
export function odataString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
