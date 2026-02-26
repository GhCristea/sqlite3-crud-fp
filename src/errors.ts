/* eslint-disable functional/no-classes */
import { Data } from 'effect'

export class ValidationError extends Data.TaggedError('ValidationError')<{ readonly issues: readonly string[] }> {
  readonly message = `Validation failed: ${this.issues.join(', ')}`
}

export class DbError extends Data.TaggedError('DbError')<{ readonly message: string; readonly cause?: unknown }> {}

export class DbValidationError extends Data.TaggedError('DbValidationError')<{
  readonly issues: readonly string[]
}> {
  readonly message = `Database record failed schema validation: ${this.issues.join(', ')}`
}

export class NotFoundError extends Data.TaggedError('NotFoundError')<{ readonly id: number }> {
  readonly message = `Record with id ${this.id} not found`
}

export class TtlExpiredError extends Data.TaggedError('TtlExpiredError')<{ readonly expiredAt: Date }> {
  readonly message = `Record TTL expired at ${this.expiredAt.toISOString()}`
}

export const mkValidationError = (issues: readonly string[]): ValidationError => new ValidationError({ issues })

export const mkDbError = (message: string, cause?: unknown): DbError => new DbError({ message, cause })

export const mkDbValidationError = (issues: readonly string[]): DbValidationError =>
  new DbValidationError({ issues })

export const mkNotFoundError = (id: number): NotFoundError => new NotFoundError({ id })

export const mkTtlExpiredError = (expiredAt: Readonly<Date>): TtlExpiredError =>
  new TtlExpiredError({ expiredAt: expiredAt as Date })
export type StorageError = ValidationError | DbError | DbValidationError | NotFoundError | TtlExpiredError

export const isStorageError = (e: unknown): e is StorageError =>
  e instanceof ValidationError ||
  e instanceof DbError ||
  e instanceof DbValidationError ||
  e instanceof NotFoundError ||
  e instanceof TtlExpiredError
