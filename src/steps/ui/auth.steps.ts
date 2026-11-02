import { expect } from '@playwright/test';
import { getUser } from '../../data/users';
import { Before, Given, Then, When, test } from '../../fixtures/bdd';

Before(async ({ env, $testInfo }) => {
  $testInfo.annotations.push({ type: 'окружение', description: env.name });
});

Given('открыта страница входа', async ({ loginPage }) => {
  await loginPage.open();
});

When('пользователь входит как {string}', async ({ loginPage, env }, name: string) => {
  const user = getUser(env, name);
  await loginPage.signIn(user.username, user.password);
});

When(
  'пользователь вводит логин {string} и пароль {string}',
  async ({ loginPage }, username: string, password: string) => {
    await loginPage.signIn(username, password);
  },
);

Then('он видит каталог товаров', async ({ catalogPage }) => {
  await catalogPage.shouldBeOpen();
});

Then('он видит сообщение об ошибке входа', async ({ loginPage }) => {
  await loginPage.shouldShowLoginError();
});

Then('в 1С есть контрагент {string}', async ({ onec }, name: string) => {
  test.skip(
    onec.mode === 'off',
    '1С выключена в файле окружения. Поставьте onec.mode: http или sql и укажите адрес.',
  );
  const found = await onec.findCounterparty(name);
  expect(found, `В 1С не найден контрагент «${name}».`).toBeTruthy();
});
