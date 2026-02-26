---
description: "Code review of changes against functional, immutability, and YAGNI standards."
---

# Workflow: Code Review (/review)

## Phase 1: Context Gathering

1. Review what files changed.
2. Ask for the intent behind the changes if unclear.

## Phase 2: Automated Validation

```bash
npm run typecheck
npm run lint
npm run test:coverage
```

## Phase 3: Alignment Check

Evaluate changes against core principles:

1. **Immutability**: Any mutable output? `let` bindings? Missing `ReadonlyDeep`? Load `typescript-idioms` skill.
2. **Result Audit**: Any `throw` in business logic? Any `try/catch` outside of `ResultAsync.fromPromise`? Load `neverthrow-fp` skill.
3. **Append-only**: Any `update` or `delete` operations introduced?
4. **YAGNI**: Any abstraction added speculatively? Any export not used anywhere?
5. **Zod Boundaries**: Any `unknown` input reaching the DB without parsing? Load `zod-validation` skill.
6. **Drizzle patterns**: Raw SQL strings? Missing `eq()` from `drizzle-orm`? Load `drizzle-orm` skill.

## Phase 4: Structured Feedback

### 1. Verification Status (Pass / Fail)
### 2. FP / Immutability Adherence
### 3. YAGNI / KISS Assessment
### 4. Suggested Refactors (with code blocks)
