import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { APP_NAME, createApp, roundedAverage, store } from '../src/app.js';

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

  it('version shortens a full commit sha to 7 characters', async () => {
    process.env.APP_COMMIT = 'a1d328a8144f9a5f806c650c2f0a3af4b1e64c65';
    const response = await request(app).get('/version');
    expect(response.body.commit).toBe('a1d328a');
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
    store.nextStudentId = 42;
    store.nextGradeId = 7;
    await request(app).post('/reset');
    expect(store.nextStudentId).toBe(1);
    expect(store.nextGradeId).toBe(1);
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

async function addStudent(name = 'Ion Popescu', group = '1B') {
  return request(app).post('/students').send({ name, group });
}

async function addGrade(student_id: number, subject: string, grade: number) {
  return request(app).post('/grades').send({ student_id, subject, grade });
}

describe('students', () => {
  beforeEach(async () => {
    await request(app).post('/reset');
  });

  it('creates a student with id 1', async () => {
    const response = await addStudent();
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 1, name: 'Ion Popescu', group: '1B' });
  });

  it('numbering restarts from 1 after reset', async () => {
    await addStudent();
    await request(app).post('/reset');
    const response = await addStudent();
    expect(response.body.id).toBe(1);
  });

  it('rejects a student without name', async () => {
    const response = await request(app).post('/students').send({ group: '1B' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation');
  });

  it('rejects a student with empty group', async () => {
    const response = await request(app).post('/students').send({ name: 'Ana', group: '' });
    expect(response.status).toBe(400);
  });

  it('rejects a malformed json body in the standard error format', async () => {
    const response = await request(app)
      .post('/students')
      .set('Content-Type', 'application/json')
      .send('{"name":');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation');
  });

  it('lists students ordered by name, ties by id', async () => {
    await addStudent('Zoe', '1A');
    await addStudent('Ana', '1A');
    await addStudent('Ana', '1B');
    const response = await request(app).get('/students');
    expect(response.body.map((s: { id: number }) => s.id)).toEqual([2, 3, 1]);
  });
});

describe('grades', () => {
  beforeEach(async () => {
    await request(app).post('/reset');
    await addStudent();
  });

  it('creates a grade', async () => {
    const response = await addGrade(1, 'MAP', 9);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: 1, student_id: 1, subject: 'MAP', grade: 9 });
  });

  it('returns 404 for an unknown student and creates nothing', async () => {
    const response = await addGrade(99, 'MAP', 9);
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('not_found');
    const grades = await request(app).get('/students/1/grades');
    expect(grades.body.grades).toEqual([]);
  });

  it.each([0, 11, 7.5, '9', null])('rejects grade %s', async (grade) => {
    const response = await request(app)
      .post('/grades')
      .send({ student_id: 1, subject: 'MAP', grade });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation');
  });

  it('accepts the grade limits 1 and 10', async () => {
    expect((await addGrade(1, 'MAP', 1)).status).toBe(201);
    expect((await addGrade(1, 'MAP', 10)).status).toBe(201);
  });

  it('rejects an empty subject and one longer than 100 characters', async () => {
    expect((await addGrade(1, '', 5)).status).toBe(400);
    expect((await addGrade(1, 'x'.repeat(101), 5)).status).toBe(400);
    expect((await addGrade(1, 'x'.repeat(100), 5)).status).toBe(201);
  });

  it('rejects a missing or non-integer student_id', async () => {
    const missing = await request(app).post('/grades').send({ subject: 'MAP', grade: 5 });
    expect(missing.status).toBe(400);
    expect((await addGrade(1.5, 'MAP', 5)).status).toBe(400);
  });

  it('returns 409 on the sixth grade for the same subject only', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await addGrade(1, 'MAP', 8)).status).toBe(201);
    }
    const sixth = await addGrade(1, 'MAP', 8);
    expect(sixth.status).toBe(409);
    expect(sixth.body.error).toBe('conflict');
    expect((await addGrade(1, 'POO', 8)).status).toBe(201);
  });

  it('the limit is per student', async () => {
    await addStudent('Ana', '1A');
    for (let i = 0; i < 5; i++) await addGrade(1, 'MAP', 8);
    expect((await addGrade(2, 'MAP', 8)).status).toBe(201);
  });
});

describe('student grades and averages', () => {
  beforeEach(async () => {
    await request(app).post('/reset');
    await addStudent();
  });

  it('average is null, not 0, when there are no grades', async () => {
    const response = await request(app).get('/students/1/grades');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ grades: [], average: null });
  });

  it('returns the grades and their average', async () => {
    await addGrade(1, 'MAP', 9);
    await addGrade(1, 'POO', 10);
    const response = await request(app).get('/students/1/grades');
    expect(response.body.grades).toHaveLength(2);
    expect(response.body.average).toBe(9.5);
  });

  it('rounds the average to 2 decimals', async () => {
    await addGrade(1, 'MAP', 10);
    await addGrade(1, 'MAP', 10);
    await addGrade(1, 'MAP', 9);
    const response = await request(app).get('/students/1/grades');
    expect(response.body.average).toBe(9.67);
  });

  it('returns 404 for an unknown or non-numeric student id', async () => {
    expect((await request(app).get('/students/99/grades')).status).toBe(404);
    expect((await request(app).get('/students/abc/grades')).status).toBe(404);
  });

  it('only lists the grades of that student', async () => {
    await addStudent('Ana', '1A');
    await addGrade(1, 'MAP', 5);
    await addGrade(2, 'MAP', 9);
    const response = await request(app).get('/students/2/grades');
    expect(response.body.grades).toHaveLength(1);
    expect(response.body.average).toBe(9);
  });
});

describe('subject report', () => {
  beforeEach(async () => {
    await request(app).post('/reset');
    await addStudent();
    await addStudent('Ana', '1A');
  });

  it('reports average, min, max and count across the whole catalog', async () => {
    await addGrade(1, 'MAP', 9);
    await addGrade(1, 'MAP', 10);
    await addGrade(2, 'MAP', 6);
    await addGrade(2, 'POO', 1);
    const response = await request(app).get('/report').query({ subject: 'MAP' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ subject: 'MAP', average: 8.33, min: 6, max: 10, count: 3 });
  });

  it('answers for a subject without grades instead of failing', async () => {
    const response = await request(app).get('/report').query({ subject: 'MAP' });
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ subject: 'MAP', average: null, min: null, max: null, count: 0 });
  });

  it('requires the subject parameter', async () => {
    const response = await request(app).get('/report');
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('validation');
  });
});

describe('roundedAverage', () => {
  it('rounds ties half up', () => {
    expect(roundedAverage([1, 1, 1, 1, 1, 1, 1, 2])).toBe(1.13);
    expect(roundedAverage([9, 10])).toBe(9.5);
  });

  it('returns null for no values', () => {
    expect(roundedAverage([])).toBeNull();
  });
});
