import { spawn } from 'node:child_process';
import { glob } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvironment } from '../src/config/load-env';

const env = loadEnvironment();
const testmo = env.testmo;

if (!testmo.enabled) {
  console.log('Testmo выключен. В yaml окружения поставьте testmo.enabled: true или задайте TESTMO_ENABLED=1.');
  process.exit(0);
}

if (!testmo.url || !testmo.projectId) {
  console.error('Заполните testmo.url и testmo.projectId в файле окружения.');
  process.exit(1);
}

if (!testmo.token) {
  console.error('Нет токена Testmo. Добавьте TESTMO_TOKEN в файл .env.');
  process.exit(1);
}

const files: string[] = [];
for await (const file of glob('reports/**/*.xml')) {
  files.push(path.resolve(file));
}

if (files.length === 0) {
  console.error('Нет файлов reports/**/*.xml. Сначала запустите тесты.');
  process.exit(1);
}

const args = [
  '--yes',
  '@testmo/testmo-cli',
  'automation:run:submit',
  '--instance',
  testmo.url,
  '--project-id',
  String(testmo.projectId),
  '--name',
  process.env.TESTMO_RUN_NAME || `Прогон ${env.name} ${new Date().toISOString()}`,
  '--source',
  process.env.TESTMO_SOURCE || testmo.source,
];

for (const file of files) {
  args.push('--results', file);
}

const child = spawn('npx', args, {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, TESTMO_TOKEN: testmo.token },
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
