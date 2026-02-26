// ─── Public API ────────────────────────────────────────────────────────────────────────────
// Single import surface. Consumers should only need this file.

// Stores
export { createTaskStore }   from './taskStore.js'
export { createDebateStore } from './debateStore.js'
export type { TaskStore }    from './taskStore.js'
export type { DebateStore }  from './debateStore.js'

// Row + insert types
export type { TaskRow, TaskInsert }               from './schema.js'
export type { DebateRoundRow, DebateRoundInsert } from './schema.js'

// Schemas (for external validators / testing)
export { TaskInsertSchema, DebateRoundInsertSchema } from './schema.js'

// Error types + constructors
export type { StorageError, ValidationError, DbError, NotFoundError, TtlExpiredError } from './errors.js'
export { mkValidationError, mkDbError, mkNotFoundError, mkTtlExpiredError }            from './errors.js'

// Generic CRUD factory (for custom tables)
export { createCrud }      from './crud.js'
export type { TtlConfig, CrudOptions } from './crud.js'
