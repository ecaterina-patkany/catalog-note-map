// Starter skeleton for the MAP project.
// Implements only the common contract: /health, /version, / and /reset.
// Add the routes required by your assigned theme in this file or in separate modules.

import express, { type Express, type Request, type Response } from 'express';

export const APP_NAME = 'map-project';
export const APP_VERSION = '0.1.0';

const startedAt = process.hrtime.bigint();

/**
 * Holds the application data in memory.
 * Everything is lost when the container restarts.
 * Add your theme's structures here.
 */
export class Store {
  nextId = 1;
  // example: contacts = new Map<number, Contact>();

  reset(): void {
    this.nextId = 1;
  }
}

export const store = new Store();

function env(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function uptimeSeconds(): number {
  return Number((process.hrtime.bigint() - startedAt) / 1_000_000_000n);
}

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptime_seconds: uptimeSeconds() });
  });

  app.get('/version', (_req: Request, res: Response) => {
    res.json({
      app: APP_NAME,
      version: APP_VERSION,
      commit: env('APP_COMMIT', 'dev'),
      built_at: env('APP_BUILT_AT', 'unknown'),
    });
  });

  app.post('/reset', (_req: Request, res: Response) => {
    store.reset();
    res.status(204).send();
  });

  app.get('/', (_req: Request, res: Response) => {
    res.type('html').send(`<!DOCTYPE html>
<html lang="ro"><head><meta charset="utf-8"><title>${APP_NAME}</title></head>
<body>
<h1>${APP_NAME}</h1>
<p>Autor: NUME PRENUME, grupa GRUPA</p>
<p>Tema: NUMARUL TEMEI</p>
<p>Versiune: ${APP_VERSION}, commit ${env('APP_COMMIT', 'dev')}</p>
</body></html>`);
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'not_found', message: 'route does not exist' });
  });

  return app;
}
