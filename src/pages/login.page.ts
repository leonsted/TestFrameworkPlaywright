import { expect } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  async open(): Promise<void> {
    await super.open('/');
  }

  async signIn(username: string, password: string): Promise<void> {
    await this.page.getByTestId('username').fill(username);
    await this.page.getByTestId('password').fill(password);
    await this.page.getByTestId('login-button').click();
  }

  async shouldShowLoginError(): Promise<void> {
    const error = this.page.getByTestId('error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('Epic sadface');
  }
}
