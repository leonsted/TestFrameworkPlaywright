import { $ } from '@wdio/globals';
import { loadEnvironment } from '../config/load-env';
import { BaseScreen } from './base.screen';

/**
 * Экран входа мобильного приложения.
 * По умолчанию поля ищутся по accessibility id (его задают разработчики приложения).
 * Имена id лежат в yaml: mobile.selectors.
 * Для Android resource-id замените `~` на селектор вида `id=com.app:id/username`.
 */
export class LoginScreen extends BaseScreen {
  private get ids() {
    return loadEnvironment().mobile.selectors;
  }

  get username() {
    return $(`~${this.ids.username}`);
  }

  get password() {
    return $(`~${this.ids.password}`);
  }

  get loginButton() {
    return $(`~${this.ids.loginButton}`);
  }

  async waitUntilOpened(): Promise<void> {
    await this.username.waitForDisplayed({ timeout: 20_000 });
  }

  async shouldShowForm(): Promise<void> {
    await this.username.waitForDisplayed({ timeout: 20_000 });
    const passwordVisible = await this.password.isDisplayed();
    if (!passwordVisible) {
      throw new Error('На экране входа не видно поле пароля. Проверьте mobile.selectors в файле окружения.');
    }
  }

  async signIn(username: string, password: string): Promise<void> {
    await this.username.setValue(username);
    await this.password.setValue(password);
    await this.loginButton.click();
  }
}
