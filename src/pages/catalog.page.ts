import type { Page } from '@playwright/test';
import { Header } from './components/header';
import { BasePage } from './base.page';

export class CatalogPage extends BasePage {
  readonly header: Header;

  constructor(page: Page) {
    super(page);
    this.header = new Header(page);
  }

  async shouldBeOpen(): Promise<void> {
    await this.header.shouldShowTitle('Products');
  }
}
