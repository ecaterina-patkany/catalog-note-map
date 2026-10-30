// Starter skeleton for the MAP project.
// Implements only the common contract: /health, /version, / and /reset.
// Add the routes required by your assigned theme in this file or in separate modules.

import express, {
  type ErrorRequestHandler,
  type Express,
  type Request,
  type Response,
} from 'express';

export const APP_NAME = 'catalog-note-map';
export const APP_VERSION = '0.1.0';

const startedAt = process.hrtime.bigint();

export const MAX_GRADES_PER_SUBJECT = 5;
const MIN_GRADE = 1;
const MAX_GRADE = 10;
const MAX_SUBJECT_LENGTH = 100;

export interface Student {
  id: number;
  name: string;
  group: string;
}

export interface Grade {
  id: number;
  student_id: number;
  subject: string;
  grade: number;
}

/**
 * Holds the application data in memory.
 * Everything is lost when the container restarts.
 */
export class Store {
  nextStudentId = 1;
  nextGradeId = 1;
  students = new Map<number, Student>();
  grades: Grade[] = [];

  reset(): void {
    this.nextStudentId = 1;
    this.nextGradeId = 1;
    this.students.clear();
    this.grades = [];
  }
}

export const store = new Store();

function env(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

// The contract asks for the short SHA; CI passes the full 40-character one.
function shortCommit(): string {
  return env('APP_COMMIT', 'dev').slice(0, 7);
}

/**
 * Average of integer grades rounded to 2 decimals, half up.
 * Works on integers only, so 0.125 style ties are exact (floating point would not be).
 */
export function roundedAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  const count = values.length;
  return Math.floor((200 * sum + count) / (2 * count)) / 100;
}

function sendError(res: Response, status: number, error: string, message: string): void {
  res.status(status).json({ error, message });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
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
      commit: shortCommit(),
      built_at: env('APP_BUILT_AT', 'unknown'),
    });
  });

  app.post('/students', (req: Request, res: Response) => {
    const body: unknown = req.body;
    if (!isPlainObject(body) || !isNonEmptyString(body.name) || !isNonEmptyString(body.group)) {
      sendError(res, 400, 'validation', 'name and group are required non-empty strings');
      return;
    }
    const student: Student = { id: store.nextStudentId++, name: body.name, group: body.group };
    store.students.set(student.id, student);
    res.status(201).json(student);
  });

  app.get('/students', (_req: Request, res: Response) => {
    const students = [...store.students.values()].sort((a, b) => {
      if (a.name !== b.name) return a.name < b.name ? -1 : 1;
      return a.id - b.id;
    });
    res.json(students);
  });

  app.post('/grades', (req: Request, res: Response) => {
    const body: unknown = req.body;
    if (!isPlainObject(body)) {
      sendError(res, 400, 'validation', 'student_id, subject and grade are required');
      return;
    }
    const { student_id: studentId, subject, grade } = body;
    if (typeof studentId !== 'number' || !Number.isInteger(studentId)) {
      sendError(res, 400, 'validation', 'student_id must be an integer');
      return;
    }
    if (
      typeof subject !== 'string' ||
      subject.length < 1 ||
      subject.length > MAX_SUBJECT_LENGTH
    ) {
      sendError(res, 400, 'validation', `subject must be 1-${MAX_SUBJECT_LENGTH} characters`);
      return;
    }
    if (
      typeof grade !== 'number' ||
      !Number.isInteger(grade) ||
      grade < MIN_GRADE ||
      grade > MAX_GRADE
    ) {
      sendError(res, 400, 'validation', `grade must be an integer between ${MIN_GRADE} and ${MAX_GRADE}`);
      return;
    }
    if (!store.students.has(studentId)) {
      sendError(res, 404, 'not_found', 'student does not exist');
      return;
    }
    const sameSubject = store.grades.filter(
      (entry) => entry.student_id === studentId && entry.subject === subject,
    );
    if (sameSubject.length >= MAX_GRADES_PER_SUBJECT) {
      sendError(
        res,
        409,
        'conflict',
        `a student can have at most ${MAX_GRADES_PER_SUBJECT} grades per subject`,
      );
      return;
    }
    const created: Grade = {
      id: store.nextGradeId++,
      student_id: studentId,
      subject,
      grade,
    };
    store.grades.push(created);
    res.status(201).json(created);
  });

  app.get('/students/:id/grades', (req: Request, res: Response) => {
    const id = /^\d+$/.test(req.params.id) ? Number(req.params.id) : NaN;
    if (!store.students.has(id)) {
      sendError(res, 404, 'not_found', 'student does not exist');
      return;
    }
    const grades = store.grades.filter((entry) => entry.student_id === id);
    res.json({ grades, average: roundedAverage(grades.map((entry) => entry.grade)) });
  });

  app.get('/report', (req: Request, res: Response) => {
    const subject = req.query.subject;
    if (typeof subject !== 'string' || subject.length < 1 || subject.length > MAX_SUBJECT_LENGTH) {
      sendError(res, 400, 'validation', `subject is required, 1-${MAX_SUBJECT_LENGTH} characters`);
      return;
    }
    const values = store.grades.filter((entry) => entry.subject === subject).map((entry) => entry.grade);
    res.json({
      subject,
      average: roundedAverage(values),
      min: values.length ? Math.min(...values) : null,
      max: values.length ? Math.max(...values) : null,
      count: values.length,
    });
  });

  app.post('/reset', (_req: Request, res: Response) => {
    store.reset();
    res.status(204).send();
  });

  app.get('/', (_req: Request, res: Response) => {
    res.type('html').send(
      `<!DOCTYPE html>
          <html lang="ro"><head><meta charset="utf-8"><title>${APP_NAME}</title></head>
            <body>
              <h1>${APP_NAME}</h1>
              <p>Autor: PATKANY ECATERINA, grupa 2.1</p>
              <p>Tema: 3</p>
              <p>Versiune: ${APP_VERSION}, commit ${shortCommit()}</p>
            </body>
        </html>
    `);
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'not_found', message: 'route does not exist' });
  });

  // Malformed JSON bodies must follow the standard error format too.
  const jsonErrorHandler: ErrorRequestHandler = (err, _req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
      sendError(res, 400, 'validation', 'request body is not valid JSON');
      return;
    }
    next(err);
  };
  app.use(jsonErrorHandler);

  return app;
}
