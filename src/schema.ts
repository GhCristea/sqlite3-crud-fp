import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import { z } from 'zod'

type TaskStatus = 'pending' | 'debating' | 'completed' | 'archived'
type AgentType = 'claw' | 'counter_agent'
type DebateRoundType = 'draft' | 'critique' | 'synthesis'

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status').$type<TaskStatus>().notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
})

export const debateRounds = sqliteTable('debate_rounds', {
  id: integer('id').primaryKey(),
  taskId: integer('task_id')
    .notNull()
    .references(() => tasks.id, { onDelete: 'cascade' }),
  agentType: text('agent_type').$type<AgentType>().notNull(),
  type: text('type').$type<DebateRoundType>().notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
})

export type TaskRow = typeof tasks.$inferSelect
export type DebateRoundRow = typeof debateRounds.$inferSelect

export const TaskSelectSchema = createSelectSchema(tasks, {
  status: z.enum(['pending', 'debating', 'completed', 'archived'])
})
export const DebateRoundSelectSchema = createSelectSchema(debateRounds, {
  agentType: z.enum(['claw', 'counter_agent']),
  type: z.enum(['draft', 'critique', 'synthesis'])
})

export const TaskInsertSchema = createInsertSchema(tasks, {
  title: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(['pending', 'debating', 'completed', 'archived']).optional()
})

export const DebateRoundInsertSchema = createInsertSchema(debateRounds, {
  agentType: z.enum(['claw', 'counter_agent']),
  type: z.enum(['draft', 'critique', 'synthesis']),
  content: z.string().min(1)
})

export type TaskInsert = z.infer<typeof TaskInsertSchema>
export type DebateRoundInsert = z.infer<typeof DebateRoundInsertSchema>
