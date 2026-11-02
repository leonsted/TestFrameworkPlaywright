export interface TestmoRun {
  id: number;
  name: string;
  url?: string;
}

export interface TestmoClientOptions {
  url: string;
  token: string;
  projectId: number;
}

/**
 * Тонкий клиент Testmo.
 * Готовые отчёты JUnit удобнее отправлять командой npm run report:testmo:
 * она вызывает официальный Testmo CLI. Этот класс нужен, если позже
 * понадобится создавать прогон прямо из кода.
 */
export class TestmoClient {
  constructor(private readonly options: TestmoClientOptions) {}

  async createAutomationRun(name: string, source: string): Promise<TestmoRun> {
    const response = await fetch(
      `${this.options.url}/api/v1/projects/${this.options.projectId}/automation/runs`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.options.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ name, source }),
      },
    );
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Testmo не создал прогон (${response.status}). ${details}`.trim());
    }
    const body = (await response.json()) as { id?: number; name?: string; url?: string };
    if (!body.id) throw new Error('Testmo ответил без номера прогона.');
    return { id: body.id, name: body.name || name, url: body.url };
  }
}
