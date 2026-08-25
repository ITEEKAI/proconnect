import { createApp } from './app.ts';
import { config } from './config.ts';
import { getDb } from './db/database.ts';
import { ensureSeedData } from './db/seed.ts';

getDb();
ensureSeedData();

if (config.isProduction && config.usingDefaultAuthSecret) {
  console.warn('[api] AUTH_SECRET is using the development default. Set a real secret before going live.');
}

createApp().listen(config.port, config.host, () => {
  console.log(`[api] SimplyServices listening on http://${config.host}:${config.port}`);
  console.log(`[api] Payments: ${config.paymentsProvider}`);
});
