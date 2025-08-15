import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: text('created_at').default(sql`(datetime('now'))`)
});

export const presets = sqliteTable('presets', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  packages: text('packages').notNull(),
  npmtrendsUrl: text('npmtrends_url').notNull(),
  ownerId: text('owner_id').notNull().references(() => users.id),
  likesCount: integer('likes_count').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`)
});

export const likes = sqliteTable('likes', {
  userId: text('user_id').notNull().references(() => users.id),
  presetId: text('preset_id').notNull().references(() => presets.id),
  createdAt: text('created_at').default(sql`(datetime('now'))`)
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.userId, table.presetId] })
  }
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Preset = typeof presets.$inferSelect;
export type NewPreset = typeof presets.$inferInsert;
export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;