---
name: drizzle-orm
description: "SQLite3 queries via Drizzle query builder + drizzle-zod for schema-driven validation."
---

# Skill: Drizzle ORM

**Role**: You are writing append-only SQLite3 queries using Drizzle's type-safe query builder.

**Purpose**: Schema is the single source of truth. All insert schemas derived via `drizzle-zod`. No raw SQL in application code.

## Patterns

- **Query builder only**: Use `db.select()`, `db.insert()`. Never write raw SQL strings in `src/`.
- **Schema as source of truth**: Tables defined in `src/schema.ts`. Insert schemas derived via `createInsertSchema()` from `drizzle-zod`.
- **Append-only**: No `db.update()` or `db.delete()` calls. Records are immutable once written.
- **Row types**: Always `ReadonlyDeep<typeof table.$inferSelect>` — never mutable.
- **Migrations**: Generate with `npm run db:generate`, commit SQL files to version control. Never run migrations in application code.
- **Filtering**: Use `eq()`, `and()`, `or()` from `drizzle-orm` — never string interpolation.

## Example

```typescript
// src/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createInsertSchema } from 'drizzle-zod'
import type { ReadonlyDeep } from 'type-fest'

export const tasks = sqliteTable('tasks', {
  id:        integer('id').primaryKey(),
  title:     text('title').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
})

export type TaskRow         = ReadonlyDeep<typeof tasks.$inferSelect>
export const TaskInsertSchema = createInsertSchema(tasks, { title: z.string().min(1) })

// src/crud.ts
const row = await db.insert(tasks).values(parsed).returning()
```
