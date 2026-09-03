import fs from 'node:fs';
import path from 'node:path';
import type { Express, RequestHandler } from 'express';
import express from 'express';
import { config } from './config.ts';

/** Serve the Vite production build from the same origin as the API. */
export function attachWebApp(app: Express): void {
  const indexFile = path.join(config.webDist, 'index.html');
  if (!fs.existsSync(indexFile)) return;

  app.use(express.static(config.webDist, { index: false, maxAge: '1h' }));

  const spaFallback: RequestHandler = (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(indexFile);
  };
  app.use(spaFallback);
}
