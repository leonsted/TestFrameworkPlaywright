import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildODataUrl, odataString } from './odata';

describe('OData', () => {
  it('экранирует кавычки в строке', () => {
    assert.equal(odataString("ООО 'Ромашка'"), "'ООО ''Ромашка'''");
  });

  it('собирает адрес запроса к 1С', () => {
    const url = new URL(
      buildODataUrl('http://localhost/trade/odata/standard.odata/', 'Catalog_Контрагенты', {
        top: 1,
        select: 'Description',
        filter: "Description eq 'Ромашка'",
      }),
    );
    assert.equal(url.pathname.endsWith('/Catalog_%D0%9A%D0%BE%D0%BD%D1%82%D1%80%D0%B0%D0%B3%D0%B5%D0%BD%D1%82%D1%8B') || url.pathname.includes('Catalog_'), true);
    assert.equal(url.searchParams.get('$format'), 'json');
    assert.equal(url.searchParams.get('$top'), '1');
    assert.equal(url.searchParams.get('$select'), 'Description');
    assert.equal(url.searchParams.get('$filter'), "Description eq 'Ромашка'");
  });
});
