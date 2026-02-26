import { eq } from 'drizzle-orm'
import { ResultAsync } from 'neverthrow'
import type { SQLiteTable, SQLiteColumn } from 'drizzle-orm/sqlite-core'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import type { z } from 'zod'
import { mkDbError, mkNotFoundError, mkValidationError, mkTtlExpiredError } from './errors.js'
import type { StorageError } from './errors.js'

// ─── TTL config ─────────────────────────────────────────────────────────────────────────────
// Callers provide either a fixed ms duration or a callback to compute TTL
// per-row. If the record is expired, reads return TtlExpiredError.

export type TtlConfig<TRow> =
  | { readonly type: 'fixed'; readonly ms: number }
  | { readonly type: 'callback'; readonly fn: (row: TRow) => number | null }

// ─── Facade options ─────────────────────────────────────────────────────────────────────

export type CrudOptions<TRow> = Readonly<{
  ttl?: TtlConfig<TRow>
  timestampColumn?: string // column name holding createdAt ms, defaults to 'createdAt'
}>

// ─── Internal TTL check (pure) ───────────────────────────────────────────────────────────

const checkTtl = <TRow extends Record<string, unknown>>(
  row: TRow,
  ttl: TtlConfig<TRow>,
  timestampColumn: string
): boolean => {
  const createdAt = row[timestampColumn]
  if (!(createdAt instanceof Date) && typeof createdAt !== 'number') return false
  const ms = typeof createdAt === 'number' ? createdAt : (createdAt as Date).getTime()
  const ttlMs = ttl.type === 'fixed' ? ttl.ms : ttl.fn(row)
  if (ttlMs === null) return false
  return Date.now() > ms + ttlMs
}

// ─── Generic CRUD factory ───────────────────────────────────────────────────────────────────
// createCrud is append-only: no update/delete ops. Reads check TTL if configured.
// All inputs are typed as `unknown` and validated via the provided Zod schema.

export const createCrud = <
  TTable extends SQLiteTable,
  TInsert extends z.ZodTypeAny,
  TRow extends Record<string, unknown> = Readonly<TTable['$inferSelect']>
>(
  db: LibSQLDatabase,
  table: TTable,
  idColumn: SQLiteColumn,
  insertSchema: TInsert,
  options: CrudOptions<TRow> = {}
) => {
  const tsCol = options.timestampColumn ?? 'createdAt'

  const append = (data: unknown): ResultAsync<Readonly<TRow>, StorageError> => {
    const parsed = insertSchema.safeParse(data)
    if (!parsed.success) {
      return ResultAsync.fromSafePromise(
        Promise.resolve(undefined)
      ).andThen(() =>
        ResultAsync.fromSafePromise(Promise.reject(
          mkValidationError(parsed.error.issues.map(i => i.message))
        ))
      )
    }
    return ResultAsync.fromPromise(
      db.insert(table).values(parsed.data).returning().then(rows => rows[0] as TRow),
      err => mkDbError('Insert failed', err)
    )
  }

  const readOne = (id: number): ResultAsync<Readonly<TRow>, StorageError> =>
    ResultAsync.fromPromise(
      db.select().from(table).where(eq(idColumn, id)).limit(1).then(rows => {
        if (rows.length === 0) throw mkNotFoundError(id)
        return rows[0] as TRow
      }),
      err => {
        const e = err as StorageError
        return e._tag === 'NotFoundError' ? e : mkDbError('Read failed', err)
      }
    ).andThen(row => {
      if (options.ttl && checkTtl(row, options.ttl, tsCol)) {
        const ts = row[tsCol]
        const ms = typeof ts === 'number' ? ts : (ts as Date).getTime()
        const expiredAt = new Date(
          ms + (options.ttl.type === 'fixed' ? options.ttl.ms : (options.ttl.fn(row) ?? 0))
        )
        return ResultAsync.fromSafePromise(Promise.reject(mkTtlExpiredError(expiredAt)))
      }
      return ResultAsync.fromSafePromise(Promise.resolve(row as Readonly<TRow>))
    })

  const readMany = (): ResultAsync<ReadonlyArray<Readonly<TRow>>, StorageError> =>
    ResultAsync.fromPromise(
      db.select().from(table).then(rows => rows as TRow[]),
      err => mkDbError('Read failed', err)
    )

  return { append, readOne, readMany } as const
}
