import { eq } from 'drizzle-orm'
import { Effect } from 'effect'
import type { SQLiteTable, SQLiteColumn } from 'drizzle-orm/sqlite-core'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import { z } from 'zod'
import { mkDbError, mkNotFoundError, mkValidationError, mkTtlExpiredError, mkDbValidationError } from './errors.js'
import type { ReadonlyDeep } from 'type-fest'

export type TtlConfig<TRow> =
  | { readonly type: 'fixed'; readonly ms: number }
  | { readonly type: 'callback'; readonly fn: (row: TRow) => number | null }

export type CrudOptions<TRow> = { readonly ttl?: TtlConfig<TRow>; readonly timestampColumn?: keyof TRow }

const isTimestamp = (v: unknown): v is Date | number => v instanceof Date || typeof v === 'number'

const toMs = (v: Readonly<Date | number>): number => (typeof v === 'number' ? v : v.getTime())

const checkTtl = <TRow>(row: TRow, ttl: TtlConfig<TRow>, col: keyof TRow): boolean => {
  const raw = row[col]
  if (!isTimestamp(raw)) return false
  const ttlMs = ttl.type === 'fixed' ? ttl.ms : ttl.fn(row)
  if (ttlMs === null) return false
  return Date.now() > toMs(raw) + ttlMs
}

const computeExpiredAt = <TRow>(row: TRow, ttl: TtlConfig<TRow>, col: keyof TRow): Date => {
  const raw = row[col]
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

  const append = (data: unknown) =>
    Effect.gen(function* () {
      const parsed = insertSchema.safeParse(data)
      if (!parsed.success) return yield* Effect.fail(mkValidationError(parsed.error.issues.map(i => i.message)))

      const row = yield* Effect.tryPromise({
        // eslint-disable-next-line functional/functional-parameters
        try: () =>
          db
            .insert(table)
            .values(parsed.data)
            .returning()
            .then(rows => rows[0] as TRow),
        catch: err => mkDbError('Insert failed', err)
      })

      return row
    })

  const readOne = (id: number) =>
    Effect.gen(function* () {
      const rows = yield* Effect.tryPromise({
        // eslint-disable-next-line functional/functional-parameters
        try: () => db.select().from(table).where(eq(idColumn, id)).limit(1),
        catch: err => mkDbError('Read failed', err)
      })

      if (rows.length === 0) return yield* Effect.fail(mkNotFoundError(id))

      const parsed = selectSchema.safeParse(rows[0])
      if (!parsed.success) return yield* Effect.fail(mkDbValidationError(parsed.error.issues.map(i => i.message)))

      const row = parsed.data as TRow

      if (options.ttl && checkTtl(row, options.ttl, tsCol))
        return yield* Effect.fail(mkTtlExpiredError(computeExpiredAt(row, options.ttl, tsCol)))

      return row
    })

  const readMany = (_?: void) =>
    Effect.gen(function* () {
      const rows = yield* Effect.tryPromise({
        // eslint-disable-next-line functional/functional-parameters
        try: () => db.select().from(table),
        catch: err => mkDbError('Read failed', err)
      })

      const parsed = z.array(selectSchema).safeParse(rows)
      if (!parsed.success) return yield* Effect.fail(mkDbValidationError(parsed.error.issues.map(i => i.message)))

      const typedRows = parsed.data as ReadonlyArray<TRow>
      return options.ttl ? typedRows.filter(row => !checkTtl(row, options.ttl!, tsCol)) : typedRows
    })

  const readManyBy = <TCol extends SQLiteColumn>(column: TCol, value: ReadonlyDeep<TCol['_']['data']>) =>
    Effect.gen(function* () {
      const rows = yield* Effect.tryPromise({
        // eslint-disable-next-line functional/functional-parameters
        try: () => db.select().from(table).where(eq(column, value)),
        catch: err => mkDbError('Read by column failed', err)
      })

      const parsed = z.array(selectSchema).safeParse(rows)
      if (!parsed.success) return yield* Effect.fail(mkDbValidationError(parsed.error.issues.map(i => i.message)))

      const typedRows = parsed.data as ReadonlyArray<TRow>
      return options.ttl ? typedRows.filter(row => !checkTtl(row, options.ttl!, tsCol)) : typedRows
    })

  return { append, readOne, readMany, readManyBy } as const
}
