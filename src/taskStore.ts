import type { ReadonlyDeep } from 'type-fest'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import { createCrud } from './crud.js'
import { tasks, TaskInsertSchema, TaskSelectSchema, type TaskRow } from './schema.js'

export const createTaskStore = (db: ReadonlyDeep<LibSQLDatabase>) => {
  const crud = createCrud<typeof tasks, typeof TaskInsertSchema, typeof TaskSelectSchema, TaskRow>(
    db,
    tasks,
    tasks.id,
    TaskInsertSchema,
    TaskSelectSchema,
    { timestampColumn: 'createdAt' }
  )

  return { appendTask: crud.append, readTask: crud.readOne, readAllTasks: crud.readMany } as const
}

export type { TaskRow }
