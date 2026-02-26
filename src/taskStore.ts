import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import { createCrud } from './crud.js'
import { tasks, TaskInsertSchema } from './schema.js'
import type { TaskRow, TaskInsert } from './schema.js'
import type { StorageError } from './errors.js'
import type { ResultAsync } from 'neverthrow'

// ─── taskStore ─────────────────────────────────────────────────────────────────────────────
// Thin wrapper binding the generic crud facade to the tasks table.
// appendTask validates input via TaskInsertSchema (drizzle-zod inferred).

export type TaskStore = Readonly<{
  appendTask:  (data: unknown) => ResultAsync<Readonly<TaskRow>, StorageError>
  readTask:    (id: number)    => ResultAsync<Readonly<TaskRow>, StorageError>
  readAllTasks: ()              => ResultAsync<ReadonlyArray<Readonly<TaskRow>>, StorageError>
}>

export const createTaskStore = (db: LibSQLDatabase): TaskStore => {
  const crud = createCrud(db, tasks, tasks.id, TaskInsertSchema, {
    timestampColumn: 'createdAt'
  })
  return {
    appendTask:   crud.append,
    readTask:     crud.readOne,
    readAllTasks: crud.readMany
  } as const
}

export type { TaskRow, TaskInsert }
