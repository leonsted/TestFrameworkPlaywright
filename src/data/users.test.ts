import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getUser } from './users';
import type { Environment } from '../config/types';

const env = {
  name: 'dev',
  users: {
    standard: { username: 'a', password: 'b' },
  },
} as unknown as Environment;

describe('пользователи', () => {
  it('находит пользователя по имени из сценария', () => {
    assert.deepEqual(getUser(env, 'standard'), { username: 'a', password: 'b' });
  });

  it('подсказывает, каких пользователей уже завели', () => {
    assert.throws(() => getUser(env, 'admin'), /нет пользователя «admin»/);
    assert.throws(() => getUser(env, 'admin'), /standard/);
  });
});
