---
event: "pre-commit"
description: "Required validations before committing code."
---

# Hook: Pre-Commit Validation

Before committing or telling the user code is finished, run:

```bash
npm run typecheck
npm run lint
npm run format
```

If any fail, fix first — do not notify the user about standard errors you can resolve.
