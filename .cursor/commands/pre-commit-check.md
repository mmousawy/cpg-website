# Pre-Commit Check

Run all checks to ensure code is ready for commit: linting, type checking, and tests.

## Process

1. **Run ESLint:**
   - Execute `npm run lint` to check code style and patterns
   - Warnings are allowed, but errors will block the commit
   - If errors are found, fix them before proceeding

2. **Run TypeScript type checking:**
   - Execute `npm run typecheck:clean` to run type checking with cleared cache
   - This ensures no stale type information causes false positives
   - All type errors must be fixed before committing

3. **Run unit tests:**
   - Execute `npm run test:run` to run all unit/integration tests
   - All tests must pass before committing
   - If tests fail, fix the issues or update tests as needed

## Alternative: Use Combined Command

You can also run all checks at once using:
```bash
npm run check
```

This runs all three checks in sequence and stops on the first failure.

## Important Notes

- All checks must pass before committing code
- ESLint warnings are allowed, but errors block commits
- TypeScript type errors must be resolved
- Test failures must be fixed or tests updated appropriately
- The `typecheck:clean` command clears the TypeScript incremental cache to ensure fresh type checking
