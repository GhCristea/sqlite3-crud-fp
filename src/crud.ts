import { eq } from 'drizzle-orm'
import { errAsync, okAsync, ResultAsync } from 'neverthrow'
import type { SQLiteTable, SQLiteColumn } from 'drizzle-orm/sqlite-core'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import { z } from 'zod'
import {
  mkDbError,
  mkNotFoundError,
  mkValidationError,
  mkTtlExpiredError,
  mkDbValidationError,
  isStorageError
} from './errors.js'
import type { ReadonlyDeep } from 'type-fest'

export type TtlConfig<TRow> =
  | { readonly type: 'fixed'; readonly ms: number }
  | { readonly type: 'callback'; readonly fn: (row: TRow) => number | null }

export type CrudOptions<TRow> = { readonly ttl?: TtlConfig<TRow>; readonly timestampColumn?: keyof TRow }

const isTimestamp = (v: unknown) => v instanceof Date || typeof v === 'number'

const toMs = (v: Readonly<Date | number>) => (typeof v === 'number' ? v : v.getTime())

const checkTtl = <TRow>(row: TRow, ttl: TtlConfig<TRow>, timestampColumn: keyof TRow) => {
  const raw = row[timestampColumn]
  if (!isTimestamp(raw)) return false
  const ttlMs = ttl.type === 'fixed' ? ttl.ms : ttl.fn(row)
  if (ttlMs === null) return false
  return Date.now() > toMs(raw) + ttlMs
}

const computeExpiredAt = <TRow>(row: TRow, ttl: TtlConfig<TRow>, timestampColumn: keyof TRow) => {
  const raw = row[timestampColumn]
  const ms = isTimestamp(raw) ? toMs(raw) : 0
  const ttlMs = ttl.type === 'fixed' ? ttl.ms : (ttl.fn(row) ?? 0)
  return new Date(ms + ttlMs)
}

export const createCrud = <
  TTable extends SQLiteTable,
  TInsert extends z.ZodType<TTable['$inferInsert']>,
  TSelect extends z.ZodType<TTable['$inferSelect']>,
  TRow extends Record<string, unknown>
>(
  db: ReadonlyDeep<LibSQLDatabase>,
  table: TTable,
  idColumn: ReadonlyDeep<SQLiteColumn>,
  insertSchema: TInsert,
  selectSchema: TSelect,
  options: CrudOptions<TRow> = {}
) => {
  const tsCol = (options.timestampColumn ?? 'createdAt') as keyof TRow

  const append = (data: unknown) => {
    const parsed = insertSchema.safeParse(data)
    if (!parsed.success) return errAsync(mkValidationError(parsed.error.issues.map(i => i.message)))

    return ResultAsync.fromPromise(
      db
        .insert(table)
        .values(parsed.data)
        .returning()
        .then(rows => rows[0]),
      err => mkDbError('Insert failed', err)
    )
  }

  const readOne = (id: number) =>
    ResultAsync.fromPromise(
      db
        .select()
        .from(table)
        .where(eq(idColumn, id))
        .limit(1)
        .then(rows => {
          if (rows.length === 0) return Promise.reject(mkNotFoundError(id))

          const parsed = selectSchema.safeParse(rows[0])
          if (!parsed.success) {
            return Promise.reject(mkDbValidationError(parsed.error.issues.map(i => i.message)))
          }

          return parsed.data as TRow
        }),
      err => {
        return isStorageError(err) ? err : mkDbError('Read failed', err)
      }
    ).andThen(row => {
      if (options.ttl && checkTtl(row, options.ttl, tsCol)) {
        return errAsync(mkTtlExpiredError(computeExpiredAt(row, options.ttl, tsCol)))
      }
      return okAsync(row)
    })

  const readMany = (_?: void) =>
    ResultAsync.fromPromise(
      db
        .select()
        .from(table)
        .then(rows => {
          const parsed = z.array(selectSchema).safeParse(rows)
          if (!parsed.success) {
            return Promise.reject(mkDbValidationError(parsed.error.issues.map(i => i.message)))
          }

          const typedRows = parsed.data as ReadonlyArray<TRow>
          if (!options.ttl) return typedRows
          return typedRows.filter(row => !checkTtl(row, options.ttl!, tsCol))
        }),
      err => {
        return isStorageError(err) ? err : mkDbError('Read failed', err)
      }
    )

  const readManyBy = <TCol extends SQLiteColumn>(column: TCol, value: ReadonlyDeep<TCol['_']['data']>) =>
    ResultAsync.fromPromise(
      db
        .select()
        .from(table)
        .where(eq(column, value))
        .then(rows => {
          const parsed = z.array(selectSchema).safeParse(rows)
          if (!parsed.success) {
            return Promise.reject(mkDbValidationError(parsed.error.issues.map(i => i.message)))
          }

          const typedRows = parsed.data as ReadonlyArray<TRow>
          if (!options.ttl) return typedRows
          return typedRows.filter(row => !checkTtl(row, options.ttl!, tsCol))
        }),
      err => {
        return isStorageError(err) ? err : mkDbError('Read by column failed', err)
      }
    )

  return { append, readOne, readMany, readManyBy } as const
}
