import type { Environment, UserCredential } from '../config/types';

/** Берёт пользователя из yaml текущего окружения. В сценарии пишем имя, не логин и пароль. */
export function getUser(env: Environment, name: string): UserCredential {
  const user = env.users[name];
  if (!user?.username || !user.password) {
    const known = Object.keys(env.users);
    const list = known.length > 0 ? known.join(', ') : 'список пуст';
    throw new Error(
      `В окружении «${env.name}» нет пользователя «${name}». Сейчас заданы: ${list}. Добавьте его в config/environments/${env.name}.yaml, раздел users.`,
    );
  }
  return user;
}
