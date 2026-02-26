import type { ReadonlyDeep } from 'type-fest'

// ─── StorageError discriminated union ────────────────────────────────────────────────────────
// ReadonlyDeep replaces manual Readonly<{...}> per field — recursively freezes
// nested structures (e.g. Date, arrays, cause objects) at the type level.
// Consumers narrow via the `_tag` discriminant.

export type ValidationError = ReadonlyDeep<{
  _tag: 'ValidationError'
  message: string
  issues: string[]
}>

export type DbError = ReadonlyDeep<{
  _tag: 'DbError'
  message: string
  cause?: unknown
}>

export type NotFoundError = ReadonlyDeep<{
  _tag: 'NotFoundError'
  message: string
  id: number
}>

export type TtlExpiredError = ReadonlyDeep<{
  _tag: 'TtlExpiredError'
  message: string
  expiredAt: Date
}>

export type StorageError = ValidationError | DbError | NotFoundError | TtlExpiredError

// ─── Pure constructors ───────────────────────────────────────────────────────────────────
// No classes, no throws, no side effects.

export const mkValidationError = (issues: readonly string[]): ValidationError => ({
  _tag: 'ValidationError',
  message: `Validation failed: ${issues.join(', ')}`,
  issues
})

export const mkDbError = (message: string, cause?: unknown): DbError => ({
  _tag: 'DbError',
  message,
  cause
})

export const mkNotFoundError = (id: number): NotFoundError => ({
  _tag: 'NotFoundError',
  message: `Record with id ${id} not found`,
  id
})

export const mkTtlExpiredError = (expiredAt: Date): TtlExpiredError => ({
  _tag: 'TtlExpiredError',
  message: `Record TTL expired at ${expiredAt.toISOString()}`,
  expiredAt
})
