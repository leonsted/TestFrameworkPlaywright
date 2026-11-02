import type { Page } from '@playwright/test';

/** Общее для всех страниц сайта: открыть адрес и держать ссылку на вкладку. */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async open(path = '/'): Promise<void> {
    await this.page.goto(path);
  }
}
