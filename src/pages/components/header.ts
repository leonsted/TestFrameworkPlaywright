import { expect, type Page } from '@playwright/test';

/** Кусок страницы, который встречается в нескольких местах. Сценарии его не знают. */
export class Header {
  constructor(private readonly page: Page) {}

  async shouldShowTitle(title: string): Promise<void> {
    await expect(this.page.getByTestId('title')).toHaveText(title);
  }
}
