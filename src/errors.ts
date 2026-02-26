export type ValidationError = {
  readonly _tag: 'ValidationError'
  readonly message: string
  readonly issues: readonly string[]
}

export type DbError = { readonly _tag: 'DbError'; readonly message: string; readonly cause?: unknown }

export type DbValidationError = {
  readonly _tag: 'DbValidationError'
  readonly message: string
  readonly issues: readonly string[]
}

export type NotFoundError = { readonly _tag: 'NotFoundError'; readonly message: string; readonly id: number }

export type TtlExpiredError = {
  readonly _tag: 'TtlExpiredError'
  readonly message: string
  readonly expiredAt: Date
}

export type StorageError = ValidationError | DbError | DbValidationError | NotFoundError | TtlExpiredError

export const mkValidationError = (issues: readonly string[]): ValidationError => ({
  _tag: 'ValidationError',
  message: `Validation failed: ${issues.join(', ')}`,
  issues
})

export const mkDbError = (message: string, cause?: unknown): DbError => ({ _tag: 'DbError', message, cause })

export const mkDbValidationError = (issues: readonly string[]): DbValidationError => ({
  _tag: 'DbValidationError',
  message: `Database record failed schema validation: ${issues.join(', ')}`,
  issues
})

export const mkNotFoundError = (id: number): NotFoundError => ({
  _tag: 'NotFoundError',
  message: `Record with id ${id} not found`,
  id
})

export const mkTtlExpiredError = (expiredAt: Readonly<Date>): TtlExpiredError => ({
  _tag: 'TtlExpiredError',
  message: `Record TTL expired at ${expiredAt.toISOString()}`,
  expiredAt
})

export const isStorageError = (e: unknown): e is StorageError => {
  return (
    typeof e === 'object' &&
    e !== null &&
    '_tag' in e &&
    (e._tag === 'ValidationError' ||
      e._tag === 'DbError' ||
      e._tag === 'DbValidationError' ||
      e._tag === 'NotFoundError' ||
      e._tag === 'TtlExpiredError')
  )
}
