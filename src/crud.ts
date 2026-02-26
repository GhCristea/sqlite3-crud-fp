import { eq } from 'drizzle-orm'
import { z } from 'zod'
import type { SQLiteTable, SQLiteColumn } from 'drizzle-orm/sqlite-core'
import type { LibSQLDatabase } from 'drizzle-orm/libsql'
import type { ReadonlyDeep } from 'type-fest'
import { fromPromise, flatMapAsync, errAsync, okAsync } from './result'
import { mkDbError, mkNotFoundError, mkValidationError, mkTtlExpiredError, mkDbValidationError } from './errors'

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
  TSelect extends z.ZodType<TTable['$inferSelect']>
>(
  db: ReadonlyDeep<LibSQLDatabase>,
  table: TTable,
  idColumn: ReadonlyDeep<SQLiteColumn>,
  insertSchema: TInsert,
  selectSchema: TSelect,
  { ttl, timestampColumn }: CrudOptions<TTable['_']['columns']> = {}
) => {
  const tsCol = timestampColumn ?? 'createdAt'

  const append = (data: unknown) => {
    const parsed = insertSchema.safeParse(data)
    if (!parsed.success) return errAsync(mkValidationError(parsed.error.issues.map(i => i.message)))

    return fromPromise(
      db
        .insert(table)
        .values(parsed.data)
        .returning()
        .then(rows => rows[0]),
      err => mkDbError('Insert failed', err)
    )
  }

  const readOne = (id: number) => {
    const query = fromPromise(db.select().from(table).where(eq(idColumn, id)).limit(1), err =>
      mkDbError('Read failed', err)
    )

    return flatMapAsync(query, rows => {
      if (rows.length === 0) return errAsync(mkNotFoundError(id))

      const parsed = selectSchema.safeParse(rows[0])
      if (!parsed.success) return errAsync(mkDbValidationError(parsed.error.issues.map(i => i.message)))

      if (ttl && checkTtl(parsed.data, ttl, tsCol))
        return errAsync(mkTtlExpiredError(computeExpiredAt(parsed.data, ttl, tsCol)))

      return okAsync(parsed.data)
    })
  }

  const readMany = (_?: void) => {
    const query = fromPromise(db.select().from(table), err => mkDbError('Read failed', err))

    return flatMapAsync(query, rows => {
      const parsed = z.array(selectSchema).safeParse(rows)
      if (!parsed.success) return errAsync(mkDbValidationError(parsed.error.issues.map(i => i.message)))

      return okAsync(ttl ? parsed.data.filter(r => !checkTtl(r, ttl, tsCol)) : parsed.data)
    })
  }

  const readManyBy = <TCol extends SQLiteColumn>(column: TCol, value: ReadonlyDeep<TCol['_']['data']>) => {
    const query = fromPromise(db.select().from(table).where(eq(column, value)), err =>
      mkDbError('Read by column failed', err)
    )

    return flatMapAsync(query, rows => {
      const parsed = z.array(selectSchema).safeParse(rows)
      if (!parsed.success) return errAsync(mkDbValidationError(parsed.error.issues.map(i => i.message)))

      return okAsync(ttl ? parsed.data.filter(r => !checkTtl(r, ttl, tsCol)) : parsed.data)
    })
  }

  return { append, readOne, readMany, readManyBy } as const
}
