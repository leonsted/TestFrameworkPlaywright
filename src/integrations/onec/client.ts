import type { OneCConfig, OneCHttpConfig, OneCSqlConfig } from '../../config/types';
import { OneCError } from './errors';
import { buildODataUrl, odataString } from './odata';

export interface OneCClient {
  readonly mode: OneCConfig['mode'];
  checkConnection(): Promise<string>;
  findCounterparty(name: string): Promise<boolean>;
  /** Вызов опубликованного HTTP-сервиса 1С. Через SQL запись намеренно недоступна. */
  callService(path: string, body: unknown): Promise<unknown>;
  dispose(): Promise<void>;
}

export function createOneC(config: OneCConfig): OneCClient {
  if (config.mode === 'http') return new HttpOneC(config);
  if (config.mode === 'sql') return new SqlOneC(config);
  return new DisabledOneC();
}

class DisabledOneC implements OneCClient {
  readonly mode = 'off' as const;

  checkConnection(): Promise<string> {
    return Promise.resolve(
      '1С выключена: в файле окружения стоит onec.mode: off. Для проверки поставьте http или sql.',
    );
  }

  findCounterparty(): Promise<boolean> {
    return Promise.reject(
      new OneCError('1С выключена. В config/environments/<окружение>.yaml поставьте onec.mode: http или sql и заполните адрес.'),
    );
  }

  callService(): Promise<unknown> {
    return this.findCounterparty().then(() => undefined);
  }

  dispose(): Promise<void> {
    return Promise.resolve();
  }
}

class HttpOneC implements OneCClient {
  readonly mode = 'http' as const;

  constructor(private readonly config: OneCHttpConfig) {}

  async checkConnection(): Promise<string> {
    this.assertConfigured();
    const response = await this.request(this.config.baseUrl);
    if (response.status === 401) {
      throw new OneCError('1С отклонила логин или пароль. Проверьте ONEC_USER и ONEC_PASSWORD в файле .env.');
    }
    if (!response.ok) {
      throw new OneCError(`1С ответила кодом ${response.status} на адрес ${this.config.baseUrl}.`);
    }
    return `Связь с 1С по HTTP есть: ${this.config.baseUrl}`;
  }

  async findCounterparty(name: string): Promise<boolean> {
    this.assertConfigured();
    const entity = this.config.catalogs.counterparty;
    if (!entity) {
      throw new OneCError(
        'Не задан справочник контрагентов. Добавьте в yaml: onec.catalogs.counterparty: Catalog_Контрагенты (точное имя смотрите в OData 1С).',
      );
    }
    const url = buildODataUrl(this.config.baseUrl, entity, {
      top: 1,
      select: 'Description,Ref_Key',
      filter: `Description eq ${odataString(name)}`,
    });
    const response = await this.request(url);
    if (response.status === 401) {
      throw new OneCError('1С отклонила логин или пароль. Проверьте ONEC_USER и ONEC_PASSWORD в файле .env.');
    }
    if (!response.ok) {
      throw new OneCError(`Не удалось прочитать «${entity}» из 1С. Код ответа: ${response.status}.`);
    }
    const body = (await response.json()) as { value?: unknown[] };
    return Array.isArray(body.value) && body.value.length > 0;
  }

  async callService(servicePath: string, body: unknown): Promise<unknown> {
    if (!this.config.httpServiceBaseUrl) {
      throw new OneCError(
        'Не задан onec.httpServiceBaseUrl. Это адрес HTTP-сервиса 1С, через который тесты создают данные.',
      );
    }
    const url = new URL(servicePath.replace(/^\//, ''), `${this.config.httpServiceBaseUrl.replace(/\/$/, '')}/`);
    const response = await this.request(url.toString(), {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new OneCError(`HTTP-сервис 1С ответил ${response.status} на ${url}.`);
    }
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  dispose(): Promise<void> {
    return Promise.resolve();
  }

  private assertConfigured(): void {
    if (!this.config.baseUrl) {
      throw new OneCError('Не заполнен onec.baseUrl. Укажите адрес OData, например http://server/base/odata/standard.odata');
    }
  }

  private async request(url: string, extra: RequestInit = {}): Promise<Response> {
    const headers = new Headers(extra.headers);
    headers.set('Accept', 'application/json');
    if (this.config.username || this.config.password) {
      const token = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      headers.set('Authorization', `Basic ${token}`);
    }
    try {
      return await fetch(url, {
        ...extra,
        headers,
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new OneCError(
        `Не удалось обратиться к 1С (${url}). Проверьте, что база опубликована и компьютер её видит. Подробности: ${reason}`,
      );
    }
  }
}

interface SqlRequest {
  input(name: string, type: unknown, value: string): SqlRequest;
  query<T>(command: string): Promise<{ recordset?: T[] }>;
}

interface SqlPool {
  connected: boolean;
  connect(): Promise<SqlPool>;
  request(): SqlRequest;
  close(): Promise<void>;
}

interface MssqlModule {
  ConnectionPool: new (config: Record<string, unknown>) => SqlPool;
  NVarChar: unknown;
}

class SqlOneC implements OneCClient {
  readonly mode = 'sql' as const;
  private pool: SqlPool | undefined;

  constructor(private readonly config: OneCSqlConfig) {}

  async checkConnection(): Promise<string> {
    const pool = await this.connect();
    await pool.request().query('SELECT 1 AS ok');
    return `Связь с SQL Server 1С есть: ${this.config.server}/${this.config.database}`;
  }

  async findCounterparty(name: string): Promise<boolean> {
    const rows = await this.runNamedQuery('counterpartyByName', { name });
    return rows.length > 0;
  }

  callService(): Promise<unknown> {
    return Promise.reject(
      new OneCError(
        'Запись в базу 1С через SQL отключена: так легко сломать базу. Для подготовки данных опубликуйте HTTP-сервис и переключите onec.mode на http.',
      ),
    );
  }

  async dispose(): Promise<void> {
    if (!this.pool) return;
    await this.pool.close();
    this.pool = undefined;
  }

  private async runNamedQuery(name: string, params: Record<string, string>): Promise<Record<string, unknown>[]> {
    const query = this.config.queries[name];
    if (!query) {
      throw new OneCError(
        `Нет запроса «${name}». Добавьте его в onec.queries файла окружения. Имя таблицы вида _Reference… подскажет разработчик 1С.`,
      );
    }
    if (!/^\s*select\b/i.test(query)) {
      throw new OneCError(`Запрос «${name}» должен только читать данные и начинаться с SELECT.`);
    }
    const pool = await this.connect();
    const request = pool.request();
    const sql = await loadMssql();
    for (const [key, value] of Object.entries(params)) {
      request.input(key, sql.NVarChar, value);
    }
    const result = await request.query<Record<string, unknown>>(query);
    return result.recordset ?? [];
  }

  private async connect(): Promise<SqlPool> {
    if (this.pool?.connected) return this.pool;
    const sql = await loadMssql();
    const pool = new sql.ConnectionPool({
      server: this.config.server,
      port: this.config.port,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      connectionTimeout: this.config.timeoutMs,
      requestTimeout: this.config.timeoutMs,
      options: {
        encrypt: this.config.encrypt,
        trustServerCertificate: this.config.trustServerCertificate,
      },
    });
    try {
      await pool.connect();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new OneCError(
        `Не удалось подключиться к SQL Server ${this.config.server}, база «${this.config.database}». Подробности: ${reason}`,
      );
    }
    this.pool = pool;
    return pool;
  }
}

async function loadMssql(): Promise<MssqlModule> {
  const imported = (await import('mssql')) as { default?: MssqlModule } & Partial<MssqlModule>;
  const sql = imported.default ?? (imported as MssqlModule);
  if (!sql.ConnectionPool) {
    throw new OneCError('Пакет mssql установлен, но не удалось его подключить. Выполните npm install ещё раз.');
  }
  return sql;
}
