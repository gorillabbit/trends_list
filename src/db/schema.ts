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
}, (table) => [
  primaryKey({ columns: [table.userId, table.presetId] })
]);

export const packages = sqliteTable('packages', {
  id: text('id').primaryKey(), // package name (e.g., "react", "@types/node")
  name: text('name').notNull(),
  description: text('description'),
  weeklyDownloads: integer('weekly_downloads').default(0),
  repository: text('repository'),
  homepage: text('homepage'),
  lastUpdate: text('last_update').default(sql`(datetime('now'))`),
  createdAt: text('created_at').default(sql`(datetime('now'))`)
});

export const presetPackages = sqliteTable('preset_packages', {
  presetId: text('preset_id').notNull().references(() => presets.id),
  packageId: text('package_id').notNull().references(() => packages.id),
  createdAt: text('created_at').default(sql`(datetime('now'))`)
}, (table) => [
  primaryKey({ columns: [table.presetId, table.packageId] })
]);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Preset = typeof presets.$inferSelect;
export type NewPreset = typeof presets.$inferInsert;
export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;
export type Package = typeof packages.$inferSelect;
export type NewPackage = typeof packages.$inferInsert;
export type PresetPackage = typeof presetPackages.$inferSelect;
export type NewPresetPackage = typeof presetPackages.$inferInsert;