import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { APP_NAME, createApp, store } from '../src/app.js';

const app = createApp();

describe('common contract', () => {
  it('health returns ok', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body).toHaveProperty('uptime_seconds');
  });

  it('version reads the environment', async () => {
    process.env.APP_COMMIT = 'abc1234';
    const response = await request(app).get('/version');
    expect(response.body.commit).toBe('abc1234');
    expect(response.body.app).toBe(APP_NAME);
    expect(response.body.version).toBeTruthy();
    expect(response.body.built_at).toBeTruthy();
  });

  it('reset returns no content', async () => {
    const response = await request(app).post('/reset');
    expect(response.status).toBe(204);
  });

  it('reset rejects get', async () => {
    const response = await request(app).get('/reset');
    expect(response.status).toBe(404);
  });

  it('reset clears the store', async () => {
    store.nextId = 42;
    await request(app).post('/reset');
    expect(store.nextId).toBe(1);
  });

  it('home returns html', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
  });

  it('unknown route returns not found', async () => {
    const response = await request(app).get('/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('not_found');
  });
});
