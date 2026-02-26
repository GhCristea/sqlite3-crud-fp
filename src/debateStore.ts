import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import { createCrud } from './crud.js'
import { debateRounds, DebateRoundInsertSchema, DebateRoundSelectSchema, type DebateRoundRow } from './schema.js'
import type { ReadonlyDeep } from 'type-fest'

export const createDebateStore = (db: ReadonlyDeep<LibSQLDatabase>) => {
  const crud = createCrud(db, debateRounds, debateRounds.id, DebateRoundInsertSchema, DebateRoundSelectSchema, {
    timestampColumn: 'createdAt'
  })

  const readAllRounds = (taskId?: number) =>
    taskId === undefined ? crud.readMany() : crud.readManyBy(debateRounds.taskId, taskId)

  return { appendRound: crud.append, readRound: crud.readOne, readAllRounds } as const
}

export type { DebateRoundRow }
