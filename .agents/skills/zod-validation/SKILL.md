---
name: zod-validation
description: "Parse all unknown inputs at I/O boundaries using Zod schemas derived from Drizzle tables."
---

# Skill: Zod Validation

**Role**: You are enforcing runtime safety at every data entry point.

**Purpose**: No unvalidated `unknown` data ever reaches the database layer.

## Patterns

- **Boundary rule**: All public-facing functions accept `unknown`. Parse with `.safeParse()` before use.
- **Schema source**: Use `createInsertSchema(table, overrides)` from `drizzle-zod` — do not hand-write insert schemas.
- **`safeParse` not `parse`**: Always use `.safeParse()`. On failure, return `errAsync(mkValidationError(issues))`.
- **Readonly outputs**: Use `.readonly()` on Zod schemas where output immutability at the type level is needed.
- **No double-validation**: Validate once at the facade boundary (`crud.ts`). Stores must not re-validate.

## Example

```typescript
const append = (data: unknown): ResultAsync<ReadonlyDeep<TRow>, StorageError> => {
  const parsed = insertSchema.safeParse(data)
  if (!parsed.success) {
    return errAsync(mkValidationError(parsed.error.issues.map(i => i.message)))
  }
  return ResultAsync.fromPromise(
    db.insert(table).values(parsed.data).returning().then(rows => rows[0] as ReadonlyDeep<TRow>),
    err => mkDbError('Insert failed', err)
  )
}
```
