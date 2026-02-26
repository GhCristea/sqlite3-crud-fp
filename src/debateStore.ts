import type { ReadonlyDeep } from 'type-fest'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import type { ResultAsync } from 'neverthrow'
import { createCrud } from './crud.js'
import { debateRounds, DebateRoundInsertSchema } from './schema.js'
import type { DebateRoundRow, DebateRoundInsert } from './schema.js'
import type { StorageError } from './errors.js'

// ─── DebateStore ─────────────────────────────────────────────────────────────────────────
// ReadonlyDeep on all return types — rows frozen at every nesting depth.
// readAllRounds delegates filtering entirely to the crud facade.

export type DebateStore = ReadonlyDeep<{
  appendRound:   (data: unknown)   => ResultAsync<DebateRoundRow, StorageError>
  readRound:     (id: number)      => ResultAsync<DebateRoundRow, StorageError>
  readAllRounds: (taskId?: number) => ResultAsync<ReadonlyArray<DebateRoundRow>, StorageError>
}>

export const createDebateStore = (db: LibSQLDatabase): DebateStore => {
  const crud = createCrud(db, debateRounds, debateRounds.id, DebateRoundInsertSchema, {
    timestampColumn: 'createdAt'
  })

  const readAllRounds = (taskId?: number): ResultAsync<ReadonlyArray<DebateRoundRow>, StorageError> =>
    taskId === undefined
      ? crud.readMany()
      : crud.readManyBy(debateRounds.taskId, taskId)

  return {
    appendRound:   crud.append,
    readRound:     crud.readOne,
    readAllRounds
  } as const
}

export type { DebateRoundRow, DebateRoundInsert }
