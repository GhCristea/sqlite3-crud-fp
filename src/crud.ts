import { eq } from 'drizzle-orm'
import { errAsync, okAsync, ResultAsync } from 'neverthrow'
import type { ReadonlyDeep } from 'type-fest'
import type { SQLiteTable, SQLiteColumn } from 'drizzle-orm/sqlite-core'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import type { z } from 'zod'
import { mkDbError, mkNotFoundError, mkValidationError, mkTtlExpiredError } from './errors.js'
import type { StorageError } from './errors.js'

// ─── TTL config ────────────────────────────────────────────────────────────────────────────

export type TtlConfig<TRow> = ReadonlyDeep<
  | { type: 'fixed';    ms: number }
  | { type: 'callback'; fn: (row: TRow) => number | null }
>

// ─── Facade options ─────────────────────────────────────────────────────────────────────
// timestampColumn is strictly constrained to keys of TRow to prevent typos.

export type CrudOptions<TRow> = ReadonlyDeep<{
  ttl?: TtlConfig<TRow>
  timestampColumn?: keyof TRow
}>

// ─── Timestamp type guard (pure) ──────────────────────────────────────────────────────────────

const isTimestamp = (v: unknown): v is Date | number =>
  v instanceof Date || typeof v === 'number'

const toMs = (v: Date | number): number =>
  typeof v === 'number' ? v : v.getTime()

// ─── TTL check (pure) ──────────────────────────────────────────────────────────────────────────

const checkTtl = <TRow extends Record<string, unknown>>(
  row: TRow,
  ttl: TtlConfig<TRow>,
  timestampColumn: keyof TRow
): boolean => {
  const raw = row[timestampColumn]
  if (!isTimestamp(raw)) return false
  const ttlMs = ttl.type === 'fixed' ? ttl.ms : ttl.fn(row)
  if (ttlMs === null) return false
  return Date.now() > toMs(raw) + ttlMs
}

const computeExpiredAt = <TRow extends Record<string, unknown>>(
  row: TRow,
  ttl: TtlConfig<TRow>,
  timestampColumn: keyof TRow
): Date => {
  const raw = row[timestampColumn]
  const ms = isTimestamp(raw) ? toMs(raw) : 0
  const ttlMs = ttl.type === 'fixed' ? ttl.ms : (ttl.fn(row) ?? 0)
  return new Date(ms + ttlMs)
}

// ─── Generic CRUD factory ───────────────────────────────────────────────────────────────────

export const createCrud = <
  TTable extends SQLiteTable,
  TInsert extends z.ZodTypeAny,
  TRow extends Record<string, unknown> = ReadonlyDeep<TTable['$inferSelect']>
>(
  db: LibSQLDatabase,
  table: TTable,
  idColumn: SQLiteColumn,
  insertSchema: TInsert,
  options: CrudOptions<TRow> = {}
) => {
  const tsCol = (options.timestampColumn ?? 'createdAt') as keyof TRow

  // ─── append ─────────────────────────────────────────────────────────────────────────────
  const append = (data: unknown): ResultAsync<ReadonlyDeep<TRow>, StorageError> => {
    const parsed = insertSchema.safeParse(data)
    if (!parsed.success) return errAsync(mkValidationError(parsed.error.issues.map(i => i.message)))
    
    return ResultAsync.fromPromise(
      db.insert(table).values(parsed.data).returning().then(rows => rows[0] as ReadonlyDeep<TRow>),
      err => mkDbError('Insert failed', err)
    )
  }

  // ─── readOne ────────────────────────────────────────────────────────────────────────────
  const readOne = (id: number): ResultAsync<ReadonlyDeep<TRow>, StorageError> =>
    ResultAsync.fromPromise(
      db.select().from(table).where(eq(idColumn, id)).limit(1).then(rows => {
        if (rows.length === 0) throw mkNotFoundError(id)
        return rows[0] as ReadonlyDeep<TRow>
      }),
      err => {
        const e = err as StorageError
        return e._tag === 'NotFoundError' ? e : mkDbError('Read failed', err)
      }
    ).andThen(row => {
      if (options.ttl && checkTtl(row as TRow, options.ttl, tsCol)) {
        return errAsync(mkTtlExpiredError(computeExpiredAt(row as TRow, options.ttl, tsCol)))
      }
      return okAsync(row)
    })

  // ─── readMany ───────────────────────────────────────────────────────────────────────────
  const readMany = (): ResultAsync<ReadonlyArray<ReadonlyDeep<TRow>>, StorageError> =>
    ResultAsync.fromPromise(
      db.select().from(table).then(rows => {
        const typedRows = rows as ReadonlyDeep<TRow>[]
        if (!options.ttl) return typedRows
        return typedRows.filter(row => !checkTtl(row as TRow, options.ttl!, tsCol))
      }),
      err => mkDbError('Read failed', err)
    )

  // ─── readManyBy ─────────────────────────────────────────────────────────────────────────
  // Centralizes Drizzle eq() queries so stores don't bypass TTL or leak ORM internals.
  const readManyBy = <TCol extends SQLiteColumn>(
    column: TCol,
    value: TCol['_']['data']
  ): ResultAsync<ReadonlyArray<ReadonlyDeep<TRow>>, StorageError> =>
    ResultAsync.fromPromise(
      db.select().from(table).where(eq(column, value)).then(rows => {
        const typedRows = rows as ReadonlyDeep<TRow>[]
        if (!options.ttl) return typedRows
        return typedRows.filter(row => !checkTtl(row as TRow, options.ttl!, tsCol))
      }),
      err => mkDbError('Read by column failed', err)
    )

  return { append, readOne, readMany, readManyBy } as const
}
