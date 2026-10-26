import { Router } from 'express';
import { publicMarketplaceConfig } from '../business/marketplace.ts';

export const marketplaceRouter = Router();

marketplaceRouter.get('/config', (_req, res) => {
  res.json({ marketplace: publicMarketplaceConfig() });
});

