import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { parse } from 'yaml';
import type {
  AndroidTarget,
  Environment,
  IosTarget,
  MobileSelectors,
  OneCConfig,
  TestmoConfig,
  UserCredential,
} from './types';

dotenv.config();

let cached: Environment | undefined;
let cachedKey = '';

/** Сбрасывает кэш. Нужен тестам загрузчика и если TEST_ENV поменяли в том же процессе. */
export function resetEnvironmentCache(): void {
  cached = undefined;
  cachedKey = '';
}

export function loadEnvironment(): Environment {
  const name = (process.env.TEST_ENV || 'dev').trim();
  if (cached && cachedKey === name) return cached;
  cached = readEnvironment(name);
  cachedKey = name;
  return cached;
}

export function environmentFile(name: string): string {
  assertEnvironmentName(name);
  return path.resolve('config', 'environments', `${name}.yaml`);
}

function readEnvironment(name: string): Environment {
  assertEnvironmentName(name);
  const file = environmentFile(name);
  if (!fs.existsSync(file)) {
    const known = listEnvironments().join(', ') || 'пока нет файлов';
    throw new Error(
      `Нет окружения «${name}». Сейчас есть: ${known}. Создайте файл config/environments/${name}.yaml или укажите другое имя в TEST_ENV.`,
    );
  }

  const raw = parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object') {
    throw new Error(`Файл ${file} пустой. Посмотрите config/environments/dev.yaml как образец.`);
  }

  const webBaseUrl = requireUrl(raw.web, 'web.baseUrl', file);
  const mobileWebRaw = asRecord(raw.mobileWeb);
  const mobileWebBaseUrl = stringOrEmpty(mobileWebRaw?.baseUrl) || webBaseUrl;

  return {
    name,
    web: { baseUrl: webBaseUrl },
    mobileWeb: { baseUrl: mobileWebBaseUrl },
    mobile: readMobile(asRecord(raw.mobile)),
    users: readUsers(raw.users),
    onec: readOneC(asRecord(raw.onec)),
    testmo: readTestmo(asRecord(raw.testmo)),
  };
}

function readMobile(raw: Record<string, unknown> | undefined): Environment['mobile'] {
  const android = asRecord(raw?.android);
  const ios = asRecord(raw?.ios);
  const selectors = asRecord(raw?.selectors);
  return {
    startAppium: raw?.startAppium === true,
    selectors: {
      username: stringOrEmpty(selectors?.username) || 'username',
      password: stringOrEmpty(selectors?.password) || 'password',
      loginButton: stringOrEmpty(selectors?.loginButton) || 'login',
    } satisfies MobileSelectors,
    android: {
      deviceName: stringOrEmpty(android?.deviceName) || 'Android Emulator',
      appPackage: stringOrEmpty(android?.appPackage),
      appActivity: stringOrEmpty(android?.appActivity),
      app: stringOrEmpty(android?.app),
      appiumUrl: stringOrEmpty(android?.appiumUrl) || 'http://127.0.0.1:4723/',
    } satisfies AndroidTarget,
    ios: {
      deviceName: stringOrEmpty(ios?.deviceName) || 'iPhone 16',
      platformVersion: stringOrEmpty(ios?.platformVersion) || '18.0',
      bundleId: stringOrEmpty(ios?.bundleId),
      app: stringOrEmpty(ios?.app),
      appiumUrl: stringOrEmpty(ios?.appiumUrl) || 'http://127.0.0.1:4723/',
    } satisfies IosTarget,
  };
}

function readUsers(raw: unknown): Record<string, UserCredential> {
  if (raw === undefined) return {};
  const record = asRecord(raw);
  if (!record) throw new Error('Раздел users в yaml должен быть списком имён, а не строкой.');
  const users: Record<string, UserCredential> = {};
  for (const [name, value] of Object.entries(record)) {
    const user = asRecord(value);
    users[name] = {
      username: resolveValue(stringOrEmpty(user?.username), stringOrEmpty(user?.usernameEnv), `users.${name}.username`),
      password: resolveValue(stringOrEmpty(user?.password), stringOrEmpty(user?.passwordEnv), `users.${name}.password`),
    };
  }
  return users;
}

function readOneC(raw: Record<string, unknown> | undefined): OneCConfig {
  const mode = stringOrEmpty(raw?.mode) || 'off';
  if (mode === 'off') return { mode: 'off' };
  if (mode === 'http') {
    return {
      mode: 'http',
      baseUrl: resolveValue(stringOrEmpty(raw?.baseUrl), stringOrEmpty(raw?.baseUrlEnv), 'onec.baseUrl', true),
      httpServiceBaseUrl: resolveValue(
        stringOrEmpty(raw?.httpServiceBaseUrl),
        stringOrEmpty(raw?.httpServiceBaseUrlEnv),
        'onec.httpServiceBaseUrl',
        true,
      ),
      username: resolveValue(stringOrEmpty(raw?.username), stringOrEmpty(raw?.usernameEnv), 'onec.username', true),
      password: resolveValue(stringOrEmpty(raw?.password), stringOrEmpty(raw?.passwordEnv), 'onec.password', true),
      timeoutMs: numberOr(raw?.timeoutMs, 30_000),
      catalogs: readStringMap(raw?.catalogs),
    };
  }
  if (mode === 'sql') {
    return {
      mode: 'sql',
      server: requirePlain(stringOrEmpty(raw?.server), 'onec.server'),
      port: numberOr(raw?.port, 1433),
      database: requirePlain(stringOrEmpty(raw?.database), 'onec.database'),
      username: resolveValue(stringOrEmpty(raw?.username), stringOrEmpty(raw?.usernameEnv), 'onec.username'),
      password: resolveValue(stringOrEmpty(raw?.password), stringOrEmpty(raw?.passwordEnv), 'onec.password'),
      timeoutMs: numberOr(raw?.timeoutMs, 30_000),
      encrypt: raw?.encrypt === true,
      trustServerCertificate: raw?.trustServerCertificate !== false,
      queries: readStringMap(raw?.queries),
    };
  }
  throw new Error(`onec.mode «${mode}» не поддерживается. Допустимо: off, http, sql.`);
}

function readTestmo(raw: Record<string, unknown> | undefined): TestmoConfig {
  return {
    enabled: raw?.enabled === true || process.env.TESTMO_ENABLED === '1',
    url: stringOrEmpty(raw?.url).replace(/\/$/, ''),
    projectId: numberOr(raw?.projectId, 0),
    token: process.env[stringOrEmpty(raw?.tokenEnv) || 'TESTMO_TOKEN'] || '',
    source: stringOrEmpty(raw?.source) || 'ui',
  };
}

function readStringMap(raw: unknown): Record<string, string> {
  const record = asRecord(raw);
  if (!record) return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = String(value ?? '').trim();
  }
  return result;
}

function requireUrl(section: unknown, label: string, file: string): string {
  const record = asRecord(section);
  const value = stringOrEmpty(record?.baseUrl);
  if (!value) {
    throw new Error(`В ${file} не заполнен ${label}. Пример: https://example.com`);
  }
  return value.replace(/\/$/, '');
}

function resolveValue(literal: string, envName: string, label: string, optional = false): string {
  if (envName) {
    const fromEnv = process.env[envName];
    if (fromEnv) return fromEnv;
    if (optional) return '';
    throw new Error(
      `Для «${label}» нужна переменная ${envName}. Добавьте её в файл .env (образец лежит в .env.example).`,
    );
  }
  if (literal.includes('${')) {
    return literal.replace(/\$\{([A-Z0-9_]+)\}/g, (_match, name: string) => {
      const fromEnv = process.env[name];
      if (!fromEnv) {
        throw new Error(`Не задана переменная ${name} (её просит ${label}). Добавьте её в файл .env.`);
      }
      return fromEnv;
    });
  }
  if (!literal && !optional) {
    throw new Error(`Не заполнено поле «${label}» в файле окружения.`);
  }
  return literal;
}

function requirePlain(value: string, label: string): string {
  if (!value) throw new Error(`Не заполнено поле «${label}» в файле окружения.`);
  return value;
}

function assertEnvironmentName(name: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error(`Имя окружения «${name}» может содержать только буквы, цифры, «-» и «_».`);
  }
}

function listEnvironments(): string[] {
  const dir = path.resolve('config', 'environments');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => file.replace(/\.yaml$/, ''));
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function numberOr(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
