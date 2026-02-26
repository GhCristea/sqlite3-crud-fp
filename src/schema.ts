import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createInsertSchema } from 'drizzle-zod'
import type { ReadonlyDeep } from 'type-fest'
import { z } from 'zod'

// ─── Branded column types ───────────────────────────────────────────────────────────────────
// SQLite has no native enums; .$type<T>() brands the column at the TS layer only.

type TaskStatus      = 'pending' | 'debating' | 'completed' | 'archived'
type AgentType       = 'claw' | 'counter_agent'
type DebateRoundType = 'draft' | 'critique' | 'synthesis'

// ─── Tables ────────────────────────────────────────────────────────────────────────────

export const tasks = sqliteTable('tasks', {
  id:          integer('id').primaryKey(),
  title:       text('title').notNull(),
  description: text('description').notNull(),
  status:      text('status').$type<TaskStatus>().notNull().default('pending'),
  createdAt:   integer('created_at', { mode: 'timestamp_ms' }).notNull()
})

export const debateRounds = sqliteTable('debate_rounds', {
  id:        integer('id').primaryKey(),
  taskId:    integer('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  agentType: text('agent_type').$type<AgentType>().notNull(),
  type:      text('type').$type<DebateRoundType>().notNull(),
  content:   text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
})

// ─── Immutable row types ──────────────────────────────────────────────────────────────
// ReadonlyDeep recurses into nested structures (e.g. Date fields like createdAt)
// preventing mutations at any depth after a row is fetched.

export type TaskRow        = ReadonlyDeep<typeof tasks.$inferSelect>
export type DebateRoundRow = ReadonlyDeep<typeof debateRounds.$inferSelect>

// ─── Insert schemas (drizzle-zod) ─────────────────────────────────────────────────────
// Inferred from Drizzle schema via drizzle-zod — single source of truth.
// Left mutable intentionally: callers construct insert objects before passing in.

export const TaskInsertSchema = createInsertSchema(tasks, {
  title:       z.string().min(1),
  description: z.string().min(1),
  status:      z.enum(['pending', 'debating', 'completed', 'archived']).optional()
})

export const DebateRoundInsertSchema = createInsertSchema(debateRounds, {
  agentType: z.enum(['claw', 'counter_agent']),
  type:      z.enum(['draft', 'critique', 'synthesis']),
  content:   z.string().min(1)
})

export type TaskInsert        = z.infer<typeof TaskInsertSchema>
export type DebateRoundInsert = z.infer<typeof DebateRoundInsertSchema>
