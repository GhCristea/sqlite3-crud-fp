import type { ReadonlyDeep } from 'type-fest'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import type { ResultAsync } from 'neverthrow'
import { createCrud } from './crud.js'
import { tasks, TaskInsertSchema } from './schema.js'
import type { TaskRow, TaskInsert } from './schema.js'
import type { StorageError } from './errors.js'

// ─── TaskStore ────────────────────────────────────────────────────────────────────────────
// ReadonlyDeep on all return types — rows are frozen at every nesting depth.
// createTaskStore is a pure factory: const-only, single return value.

export type TaskStore = ReadonlyDeep<{
  appendTask:   (data: unknown) => ResultAsync<TaskRow, StorageError>
  readTask:     (id: number)    => ResultAsync<TaskRow, StorageError>
  readAllTasks: ()              => ResultAsync<ReadonlyArray<TaskRow>, StorageError>
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
