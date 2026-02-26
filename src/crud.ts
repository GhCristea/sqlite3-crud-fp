import { eq } from 'drizzle-orm'
import { errAsync, okAsync, ResultAsync } from 'neverthrow'
import type { ReadonlyDeep, ValueOf } from 'type-fest'
import type { SQLiteTable, SQLiteColumn } from 'drizzle-orm/sqlite-core'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import type { z } from 'zod'
import { mkDbError, mkNotFoundError, mkValidationError, mkTtlExpiredError } from './errors.js'
import type { StorageError } from './errors.js'

// ─── TTL config ────────────────────────────────────────────────────────────────────────────
// ReadonlyDeep freezes the entire config tree including the callback fn reference.
// Callers provide either a fixed ms duration or a per-row callback.
// If a record is expired, readOne returns TtlExpiredError.

export type TtlConfig<TRow> = ReadonlyDeep<
  | { type: 'fixed';    ms: number }
  | { type: 'callback'; fn: (row: TRow) => number | null }
>

// ─── Facade options ─────────────────────────────────────────────────────────────────────
// ReadonlyDeep instead of manual Readonly<{...}> — consistent with error types.

export type CrudOptions<TRow> = ReadonlyDeep<{
  ttl?: TtlConfig<TRow>
  timestampColumn?: string
}>

// ─── Timestamp type guard (pure) ──────────────────────────────────────────────────────────────
// ValueOf<TRow> types the extracted column value without unsafe `as` casts.
// The guard narrows it to `Date | number` before arithmetic.

const isTimestamp = (v: unknown): v is Date | number =>
  v instanceof Date || typeof v === 'number'

const toMs = (v: Date | number): number =>
  typeof v === 'number' ? v : v.getTime()

// ─── TTL check (pure) ──────────────────────────────────────────────────────────────────────────

const checkTtl = <TRow extends Record<string, unknown>>(
  row: TRow,
  ttl: TtlConfig<TRow>,
  timestampColumn: string
): boolean => {
  const raw: ValueOf<TRow> = row[timestampColumn] as ValueOf<TRow>
  if (!isTimestamp(raw)) return false
  const ttlMs = ttl.type === 'fixed' ? ttl.ms : ttl.fn(row)
  if (ttlMs === null) return false
  return Date.now() > toMs(raw) + ttlMs
}

const computeExpiredAt = <TRow extends Record<string, unknown>>(
  row: TRow,
  ttl: TtlConfig<TRow>,
  timestampColumn: string
): Date => {
  const raw: ValueOf<TRow> = row[timestampColumn] as ValueOf<TRow>
  const ms = isTimestamp(raw) ? toMs(raw) : 0
  const ttlMs = ttl.type === 'fixed' ? ttl.ms : (ttl.fn(row) ?? 0)
  return new Date(ms + ttlMs)
}

// ─── Generic CRUD factory ───────────────────────────────────────────────────────────────────
// Append-only: no update/delete ops by design.
// All inputs typed as `unknown`, validated via the provided Zod schema.
// All outputs are ReadonlyDeep — no post-fetch mutations possible.

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
  const tsCol = options.timestampColumn ?? 'createdAt'

  // ─── append ─────────────────────────────────────────────────────────────────────────────
  const append = (data: unknown): ResultAsync<ReadonlyDeep<TRow>, StorageError> => {
    const parsed = insertSchema.safeParse(data)
    if (!parsed.success) {
      // errAsync: direct neverthrow short-circuit — no double-promise wrapping
      return errAsync(mkValidationError(parsed.error.issues.map(i => i.message)))
    }
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
      if (options.ttl && checkTtl(row as Record<string, unknown>, options.ttl, tsCol)) {
        return errAsync(mkTtlExpiredError(computeExpiredAt(row as Record<string, unknown>, options.ttl, tsCol)))
      }
      return okAsync(row)
    })

  // ─── readMany ───────────────────────────────────────────────────────────────────────────
  const readMany = (): ResultAsync<ReadonlyArray<ReadonlyDeep<TRow>>, StorageError> =>
    ResultAsync.fromPromise(
      db.select().from(table).then(rows => rows as ReadonlyDeep<TRow>[]),
      err => mkDbError('Read failed', err)
    )

  return { append, readOne, readMany } as const
}
