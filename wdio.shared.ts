import type {} from '@wdio/types';
import { loadEnvironment } from './src/config/load-env';
import type { Environment } from './src/config/types';

export function createMobileConfig(platform: 'android' | 'ios'): WebdriverIO.Config {
  const env = loadEnvironment();
  const target = env.mobile[platform];
  const url = new URL(target.appiumUrl);
  const port = Number(url.port || 4723);

  const config: WebdriverIO.Config = {
    runner: 'local',
    specs: ['./features/native/**/*.feature'],
    maxInstances: 1,
    hostname: url.hostname,
    port,
    path: url.pathname && url.pathname !== '/' ? url.pathname : '/',
    capabilities: [platform === 'android' ? androidCapabilities(env) : iosCapabilities(env)],
    logLevel: 'info',
    connectionRetryCount: 1,
    connectionRetryTimeout: 30_000,
    framework: 'cucumber',
    reporters: [
      'spec',
      [
        'junit',
        {
          outputDir: './reports',
          outputFileFormat: () => `junit-${platform}.xml`,
        },
      ],
    ],
    cucumberOpts: {
      require: ['./src/steps/native/**/*.ts'],
      timeout: 60_000,
      tags: `@${platform} and not @wip`,
    },
  };

  if (env.mobile.startAppium) {
    config.services = [
      [
        'appium',
        {
          args: {
            address: url.hostname,
            port,
          },
        },
      ],
    ];
  }

  return config;
}

function androidCapabilities(env: Environment): WebdriverIO.Capabilities {
  const android = env.mobile.android;
  const caps: WebdriverIO.Capabilities = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': android.deviceName,
    'appium:autoGrantPermissions': true,
    'appium:appPackage': android.appPackage,
    'appium:appActivity': android.appActivity,
  };
  if (android.app) caps['appium:app'] = android.app;
  return caps;
}

function iosCapabilities(env: Environment): WebdriverIO.Capabilities {
  const ios = env.mobile.ios;
  const caps: WebdriverIO.Capabilities = {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': ios.deviceName,
    'appium:platformVersion': ios.platformVersion,
    'appium:bundleId': ios.bundleId,
  };
  if (ios.app) caps['appium:app'] = ios.app;
  return caps;
}
