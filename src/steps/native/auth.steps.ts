import { Given, Then, When } from '@cucumber/cucumber';
import { getUser } from '../../data/users';
import { loadEnvironment } from '../../config/load-env';
import { LoginScreen } from '../../screens/login.screen';

const screen = () => new LoginScreen();

Given('открыт экран входа', async () => {
  await screen().waitUntilOpened();
});

When('пользователь входит в приложение как {string}', async (name: string) => {
  const user = getUser(loadEnvironment(), name);
  await screen().signIn(user.username, user.password);
});

Then('на экране входа видны поля логина и пароля', async () => {
  await screen().shouldShowForm();
});
