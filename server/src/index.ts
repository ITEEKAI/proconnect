import { createApp } from './app.ts';
import { config } from './config.ts';
import { getDb } from './db/database.ts';
import { ensureSeedData } from './db/seed.ts';

getDb();
ensureSeedData();

if (config.isProduction && config.usingDefaultAuthSecret) {
  console.warn('[api] AUTH_SECRET is using the development default. Set a real secret before going live.');
}

const port = Number(process.env.PORT) || 4000;

createApp().listen(port, '0.0.0.0', () => {
  console.log(`[api] ProConnect API listening on port ${port}`);
  console.log(`[api] Payments: ${config.paymentsProvider}`);
  console.log(`[api] Database: ${config.databasePath}`);
});
