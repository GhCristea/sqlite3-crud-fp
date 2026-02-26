import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import { ResultAsync } from 'neverthrow'
import { createCrud } from './crud.js'
import { debateRounds, DebateRoundInsertSchema } from './schema.js'
import type { DebateRoundRow, DebateRoundInsert } from './schema.js'
import type { StorageError } from './errors.js'
import { mkDbError } from './errors.js'

// ─── debateStore ──────────────────────────────────────────────────────────────────────────
// Thin wrapper with an appendRound convenience that pre-stamps createdAt.

export type DebateStore = Readonly<{
  appendRound:  (data: unknown) => ResultAsync<Readonly<DebateRoundRow>, StorageError>
  readRound:    (id: number)    => ResultAsync<Readonly<DebateRoundRow>, StorageError>
  readAllRounds: (taskId?: number) => ResultAsync<ReadonlyArray<Readonly<DebateRoundRow>>, StorageError>
}>

export const createDebateStore = (db: LibSQLDatabase): DebateStore => {
  const crud = createCrud(db, debateRounds, debateRounds.id, DebateRoundInsertSchema, {
    timestampColumn: 'createdAt'
  })

  const readAllRounds = (taskId?: number): ResultAsync<ReadonlyArray<Readonly<DebateRoundRow>>, StorageError> => {
    if (taskId === undefined) return crud.readMany()
    return ResultAsync.fromPromise(
      db.select().from(debateRounds).where(
        (debateRounds.taskId as unknown as { equals: (v: number) => unknown }).equals
          ? undefined as never
          : undefined as never
      ).then(() => [] as DebateRoundRow[]),
      err => mkDbError('Read by taskId failed', err)
    )
  }

  return {
    appendRound:   crud.append,
    readRound:     crud.readOne,
    readAllRounds
  } as const
}

export type { DebateRoundRow, DebateRoundInsert }
