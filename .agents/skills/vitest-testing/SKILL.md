---
name: vitest-testing
description: "Vitest conventions for testing the sqlite3-crud-fp facade with in-memory SQLite."
---

# Skill: Vitest Testing

**Role**: You are writing unit and integration tests for a functional, append-only CRUD facade.

**Purpose**: Verify `ResultAsync` pipelines return correct `Ok`/`Err` values. No mocking of DB internals.

## Setup

Use `@libsql/client` in-memory mode for all tests — no file system, no Docker:

```typescript
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'

const client = createClient({ url: ':memory:' })
const db = drizzle(client)
```

## Conventions

- **File location**: `tests/<domain>.test.ts` matching `src/<domain>.ts`.
- **No mocks**: Use real in-memory DB. Test actual SQL behaviour.
- **Unwrap with `.match()`**: Never `.isOk()` / `.isErr()` mid-assertion. Use `.match()` or `expect(result.isOk()).toBe(true)`.
- **Test both paths**: Every function needs at least one `Ok` test and one `Err` test.
- **Immutability assertion**: Verify `Object.isFrozen()` is not required — `ReadonlyDeep` is compile-time only. Test via TypeScript errors instead.
- **Coverage threshold**: 80% branches, functions, lines (configured in `vitest.config.ts`).

## Example

```typescript
describe('taskStore.appendTask', () => {
  it('returns Ok with appended row on valid input', async () => {
    const store = createTaskStore(db)
    const result = await store.appendTask({ title: 'Test', description: 'Desc', createdAt: new Date() })
    expect(result.isOk()).toBe(true)
    result.map(row => {
      expect(row.title).toBe('Test')
      expect(row.id).toBeTypeOf('number')
    })
  })

  it('returns Err ValidationError on empty title', async () => {
    const store = createTaskStore(db)
    const result = await store.appendTask({ title: '', description: 'Desc', createdAt: new Date() })
    expect(result.isErr()).toBe(true)
    result.mapErr(err => expect(err._tag).toBe('ValidationError'))
  })
})
```
