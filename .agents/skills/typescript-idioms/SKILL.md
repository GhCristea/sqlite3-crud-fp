---
name: typescript-idioms
description: "Guidelines for writing TypeScript in sqlite3-crud-fp: const-only, ReadonlyDeep, no any, explicit returns."
---

# Skill: TypeScript Idioms

**Role**: You are writing strict-mode TypeScript in a functional, immutable codebase.

**Purpose**: Maximize type safety, enforce immutability, eliminate side effects.

## 🚫 Never Do

- **NO** `let`. Every binding is `const`.
- **NO** `any`. Use `unknown` + type guards or Zod validation at boundaries.
- **NO** `as Type` assertions unless bridging a poorly-typed external library (comment why).
- **NO** non-null assertions (`!`). Handle `null`/`undefined` explicitly.
- **NO** `void`-returning functions. Every function must return a value.
- **NO** `try/catch` in business logic. Use `ResultAsync` from result.
- **NO** `throw`. Return `errAsync(mkDbError(...))` instead.
- **NO** mutation of returned rows. All outputs are `ReadonlyDeep<T>`.
- **NO** `interface`. Use `type` aliases exclusively.

## ✅ Always Do

- `const` for every binding — no exceptions.
- `ReadonlyDeep<T>` (type-fest) on all row types, error types, and store interfaces.
- `ValueOf<T>` (type-fest) when extracting dynamic property values from a typed record.
- Define types via `z.infer<typeof Schema>` — Zod schema is the source of truth.
- Use `errAsync` / `okAsync` from result for direct short-circuits.
- Arrow functions for all exported functions — no `function` keyword.
- `.andThen()` / `.map()` / `.mapErr()` to compose pipelines — never unwrap mid-chain with `.isOk()`.

## Example

```typescript
// ✅ Correct
const toMs = (v: Date | number): number =>
  typeof v === 'number' ? v : v.getTime()

// ❌ Wrong — let, void return, imperative
let ms: number
const setMs = (v: Date | number): void => { ms = typeof v === 'number' ? v : v.getTime() }
```
