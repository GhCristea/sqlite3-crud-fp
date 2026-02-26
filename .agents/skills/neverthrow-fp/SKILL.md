---
name: neverthrow-fp
description: "Railway-oriented error handling via neverthrow ResultAsync and StorageError discriminated union."
---

# Skill: Neverthrow FP

**Role**: You are composing async operations that can fail without ever throwing.

**Purpose**: All expected failures are values — typed, exhaustive, and composable.

## Core Types

```typescript
import { ResultAsync, errAsync, okAsync } from 'neverthrow'
import type { StorageError } from './errors.js'
// StorageError = ValidationError | DbError | NotFoundError | TtlExpiredError
// Narrow via _tag discriminant
```

## Patterns

- **`errAsync`**: Short-circuit with a typed error — replaces `return Promise.reject()`.
- **`okAsync`**: Wrap a known-good value — replaces `return Promise.resolve()`.
- **`ResultAsync.fromPromise(promise, mapErr)`**: Wrap any Promise that can reject.
- **`.andThen()`**: Chain dependent async steps — short-circuits on first `Err`.
- **`.map()`**: Transform `Ok` value without async — stays in the railway.
- **`.mapErr()`**: Transform the `Err` type — use for re-mapping at layer boundaries.
- **Never** call `.isOk()` mid-chain as a guard. Compose instead.

## Narrowing StorageError

Use `_tag` to discriminate — compatible with `ts-pattern` if needed:

```typescript
result.match(
  row  => console.log(row),
  err  => {
    if (err._tag === 'NotFoundError')  return console.warn(`Not found: ${err.id}`)
    if (err._tag === 'TtlExpiredError') return console.warn(`Expired: ${err.expiredAt}`)
    if (err._tag === 'ValidationError') return console.error(err.issues)
    console.error(err.message) // DbError fallback
  }
)
```

## TTL Pipeline Example

```typescript
const readOne = (id: number): ResultAsync<ReadonlyDeep<TRow>, StorageError> =>
  ResultAsync.fromPromise(
    db.select().from(table).where(eq(idCol, id)).limit(1).then(rows => {
      if (rows.length === 0) throw mkNotFoundError(id)
      return rows[0] as ReadonlyDeep<TRow>
    }),
    err => {
      const e = err as StorageError
      return e._tag === 'NotFoundError' ? e : mkDbError('Read failed', err)
    }
  ).andThen(row =>
    isExpired(row) ? errAsync(mkTtlExpiredError(expiredAt(row))) : okAsync(row)
  )
```
