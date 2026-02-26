---
description: "Test-Driven Development workflow for the sqlite3-crud-fp facade."
---

# Workflow: Test-Driven Development (/tdd)

## Phase 1: Red (Failing Test)

1. Do not write implementation code.
2. Load the `vitest-testing` skill.
3. Write a failing test in `tests/` covering the feature's happy path and at least one error path.
4. Run `npm run test` to verify it fails as expected.

## Phase 2: Green (Minimal Implementation)

1. Write the minimum TypeScript to make the test pass. Adhere to YAGNI.
2. All outputs must be `ReadonlyDeep<T>`. All errors via `errAsync`. No `throw`.
3. Run `npm run test`. Iterate until green.

## Phase 3: Refactor

1. Run `npm run typecheck` and `npm run lint`.
2. Review against `typescript-idioms` skill: `const`-only, no `let`, explicit returns.

## Phase 4: Output

Show final test coverage to the user.
