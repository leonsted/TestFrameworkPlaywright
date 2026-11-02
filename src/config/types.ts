export interface UserCredential {
  username: string;
  password: string;
}

export interface MobileSelectors {
  username: string;
  password: string;
  loginButton: string;
}

export interface AndroidTarget {
  deviceName: string;
  appPackage: string;
  appActivity: string;
  /** Путь к apk. Пусто — открываем уже установленное приложение. */
  app: string;
  appiumUrl: string;
}

export interface IosTarget {
  deviceName: string;
  platformVersion: string;
  bundleId: string;
  /** Путь к .app или .ipa. Пусто — открываем уже установленное приложение. */
  app: string;
  appiumUrl: string;
}

export interface OneCHttpConfig {
  mode: 'http';
  baseUrl: string;
  /** Адрес HTTP-сервиса 1С для создания данных, если он опубликован отдельно от OData. */
  httpServiceBaseUrl: string;
  username: string;
  password: string;
  timeoutMs: number;
  /** Человеческое имя → имя объекта OData, например counterparty: Catalog_Контрагенты */
  catalogs: Record<string, string>;
}

export interface OneCSqlConfig {
  mode: 'sql';
  server: string;
  port: number;
  database: string;
  username: string;
  password: string;
  timeoutMs: number;
  encrypt: boolean;
  trustServerCertificate: boolean;
  /** Имя запроса → текст SELECT. Параметры вида @name передаются отдельно, не склеиваются в текст. */
  queries: Record<string, string>;
}

export interface OneCOffConfig {
  mode: 'off';
}

export type OneCConfig = OneCHttpConfig | OneCSqlConfig | OneCOffConfig;

export interface TestmoConfig {
  enabled: boolean;
  url: string;
  projectId: number;
  token: string;
  /** Откуда пришёл прогон: web, mobile-web, android, ios */
  source: string;
}

export interface Environment {
  name: string;
  web: { baseUrl: string };
  mobileWeb: { baseUrl: string };
  mobile: {
    startAppium: boolean;
    selectors: MobileSelectors;
    android: AndroidTarget;
    ios: IosTarget;
  };
  users: Record<string, UserCredential>;
  onec: OneCConfig;
  testmo: TestmoConfig;
}
