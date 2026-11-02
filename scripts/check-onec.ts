import { loadEnvironment } from '../src/config/load-env';
import { createOneC } from '../src/integrations/onec/client';

const env = loadEnvironment();
const client = createOneC(env.onec);

try {
  const message = await client.checkConnection();
  console.log(message);
  if (env.onec.mode === 'off') process.exitCode = 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.dispose();
}
