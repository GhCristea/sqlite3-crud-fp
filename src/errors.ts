// ─── StorageError discriminated union ─────────────────────────────────────────────────────────
// Pure constructors — no classes, no throws, no side effects.
// Consumers narrow via the `_tag` discriminant.

export type ValidationError = Readonly<{
  _tag: 'ValidationError'
  message: string
  issues: ReadonlyArray<string>
}>

export type DbError = Readonly<{
  _tag: 'DbError'
  message: string
  cause?: unknown
}>

export type NotFoundError = Readonly<{
  _tag: 'NotFoundError'
  message: string
  id: number
}>

export type TtlExpiredError = Readonly<{
  _tag: 'TtlExpiredError'
  message: string
  expiredAt: Date
}>

export type StorageError = ValidationError | DbError | NotFoundError | TtlExpiredError

// ─── Pure constructors ──────────────────────────────────────────────────────────────────────

export const mkValidationError = (
  issues: ReadonlyArray<string>
): ValidationError => ({
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
