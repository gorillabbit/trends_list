import { drizzle } from 'drizzle-orm/d1';
import { D1Database } from '@cloudflare/workers-types/experimental';
import * as schema from './schema';

export function createDB(d1: D1Database) {
  return drizzle(d1, { schema });
}

export * from './schema';
export type DrizzleDB = ReturnType<typeof createDB>;