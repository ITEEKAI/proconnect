import { createApp } from './app.ts';
import { config } from './config.ts';
import { getDb } from './db/database.ts';
import { ensureSeedData } from './db/seed.ts';

getDb();
ensureSeedData();

createApp().listen(config.port, config.host, () => {
  console.log(`[api] ProConnect API listening on http://${config.host}:${config.port}`);
});
