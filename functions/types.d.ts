// Cloudflare Pages Functions types
interface PagesFunction<Env = unknown> {
  (ctx: EventContext<Env, any, Record<string, unknown>>): Response | Promise<Response>;
}

interface EventContext<Env, CF, Data> {
  request: Request;
  env: Env;
  params: Record<string, string>;
  data: Data;
  user?: User;
}

// D1 Database types
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1ExecResult>;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

interface D1PreparedStatement {
  bind(...params: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<{ results: T[]; success: boolean }>;
}

interface D1Result {
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
}

interface D1ExecResult {
  count: number;
  duration: number;
}

// KV types
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

// User type
interface User {
  id: string;
  name: string;
  avatar_url: string;
  created_at: string;
}