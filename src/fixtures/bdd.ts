import { createBdd, test as base } from 'playwright-bdd';
import { loadEnvironment } from '../config/load-env';
import { createOneC, type OneCClient } from '../integrations/onec/client';
import { CatalogPage } from '../pages/catalog.page';
import { LoginPage } from '../pages/login.page';
import type { Environment } from '../config/types';

interface Fixtures {
  env: Environment;
  loginPage: LoginPage;
  catalogPage: CatalogPage;
  onec: OneCClient;
}

export const test = base.extend<Fixtures>({
  env: async ({}, use) => {
    await use(loadEnvironment());
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  catalogPage: async ({ page }, use) => {
    await use(new CatalogPage(page));
  },
  onec: async ({ env }, use) => {
    const client = createOneC(env.onec);
    await use(client);
    await client.dispose();
  },
});

export const { Given, When, Then, Before } = createBdd(test);
