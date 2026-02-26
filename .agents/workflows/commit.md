---
description: "Safe commit procedure ensuring typecheck, lint, format and tests pass before committing."
---

# Workflow: Safe Commit (/commit)

## Step 1: Pre-Commit Validation

Run all checks sequentially. If any fail, fix first — do not commit.

```bash
npm run typecheck
npm run lint
npm run format
npm run test
```

## Step 2: Intent Verification

1. Review what files changed.
2. If the diff includes files unrelated to the stated objective, ask for confirmation before staging.

## Step 3: Conventional Commit

Generate a conventional commit message: `<type>(<scope>): <description>`

Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

Valid scopes: `schema`, `crud`, `errors`, `taskStore`, `debateStore`, `index`, `tests`, `agents`, `config`.

## Step 4: Execute

```bash
git add .
git commit -m "your generated message"
```
