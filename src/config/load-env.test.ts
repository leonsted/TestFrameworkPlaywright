import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { loadEnvironment, resetEnvironmentCache } from './load-env';

const previous = {
  TEST_ENV: process.env.TEST_ENV,
  APP_USER: process.env.APP_USER,
  APP_PASSWORD: process.env.APP_PASSWORD,
};

afterEach(() => {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetEnvironmentCache();
});

describe('окружения', () => {
  it('по умолчанию открывает учебный сайт', () => {
    delete process.env.TEST_ENV;
    resetEnvironmentCache();
    const env = loadEnvironment();
    assert.equal(env.name, 'dev');
    assert.equal(env.web.baseUrl, 'https://www.saucedemo.com');
    assert.equal(env.users.standard?.username, 'standard_user');
    assert.equal(env.onec.mode, 'off');
  });

  it('не принимает чужое имя файла', () => {
    process.env.TEST_ENV = '../secret';
    resetEnvironmentCache();
    assert.throws(() => loadEnvironment(), /может содержать только буквы/);
  });

  it('сообщает, если файла окружения нет', () => {
    process.env.TEST_ENV = 'missing-env';
    resetEnvironmentCache();
    assert.throws(() => loadEnvironment(), /Нет окружения «missing-env»/);
  });

  it('на stage просит учётку из .env', () => {
    delete process.env.APP_USER;
    delete process.env.APP_PASSWORD;
    process.env.TEST_ENV = 'stage';
    resetEnvironmentCache();
    assert.throws(() => loadEnvironment(), /APP_USER/);
  });
});
