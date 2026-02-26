# sqlite3-crud-fp

A minimal, functional, append-only CRUD facade for Drizzle ORM with SQLite3 — local-first, type-safe, immutable.

## Stack

- **Runtime**: Node.js + TypeScript (strict mode, ESM-only)
- **Package manager**: npm
- **Database**: SQLite3 via `@libsql/client` + `drizzle-orm`
- **Validation**: `drizzle-zod` + `zod` — schema is the single source of truth
- **Error handling**: `effect` — `Data.TaggedError` everywhere
- **Immutability**: `type-fest` `ReadonlyDeep<T>` on all returned types
- **Validation gate**: `npm run typecheck && npm run lint && npm run test`

## 🚨 Mandatory Standards (Functional Core)

This library enforces a strict functional programming paradigm. **You must follow these at all times:**

1. **`effect`**: ALL async operations that can fail return `Data.TaggedError`. No `try/catch` in business logic. No `throw`.
2. **`ReadonlyDeep`** (type-fest): ALL row types and error types are `ReadonlyDeep<T>`. No mutable outputs.
3. **`const`-only**: No `let`. No variable reassignment. Every function must return a value — no void side-effectful functions.
4. **`zod` + `drizzle-zod`**: All insert inputs are `unknown` at the boundary, validated via inferred Zod schemas before touching the DB.
5. **Append-only**: No `update` or `delete` operations. Records are immutable once written.

## Domain Skills

When working on a specific domain, load the matching skill from `.agents/skills/`:

- **Drizzle ORM patterns** (table definitions, query builder, migrations) → `drizzle-orm`
- **TypeScript safety** (no `any`, `ReadonlyDeep`, `const`-only, Result types) → `typescript-idioms`
- **Runtime boundaries** (Zod parsing at all I/O edges) → `zod-validation`
- **Error handling** (effect pipelines, discriminated unions) → `effect`
- **Testing** (Vitest conventions, in-memory SQLite) → `vitest-testing`

## Principles

- **KISS**: No abstraction layers beyond what is needed.
- **YAGNI**: No features added speculatively. Every export must be used.
- **Separation of Concerns**: Schema → Validators → Facade → Stores. Each layer has one job.
