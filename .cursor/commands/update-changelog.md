# Update Changelog

Create a new changelog entry following the existing pattern in the `/changelog/` directory.

## Process

1. **Determine folder name:**
   - Use today's date in format `YYYY-MM-DD` (e.g., `2026-01-23`)
   - Check if a folder with today's date already exists in `changelog/`
   - If it exists, append `-2`, `-3`, etc. (e.g., `2026-01-23-2`)
   - Create the folder at `changelog/<folder-name>/`

2. **Analyze git changes automatically:**
   - Run `git status --short` to get list of changed files
   - Run `git diff --stat` to see change statistics
   - Run `git diff --name-status` to categorize files (M=modified, A=added, D=deleted)
   - Read key changed files to understand what was modified:
     - Read new migration files to understand database changes
     - Read modified API routes to understand endpoint changes
     - Read modified components to understand UI changes
     - Read modified data layer files to understand data access changes
   - Analyze the changes to determine:
     - Type of change (`feat:`, `fix:`, `refactor:`, `perf:`, `docs:`, etc.)
     - Brief title/description summarizing the changes
     - Overview paragraph explaining what was changed and why
     - Grouped sections of changes (e.g., "Database:", "API Routes:", "Performance:")
     - List of all files changed (new and modified, excluding deleted migrations that were consolidated)

3. **Create `commit-message.txt`:**
   - Format: `<type>: <title>` (determined from analysis)
   - Follow with grouped sections, each with bullet points
   - Group changes logically (Database, API Routes, Components, Performance, etc.)
   - End with "Files changed (N):" section
   - List new files first, then modified files
   - Exclude deleted migration files that were consolidated into baseline
   - Use the same tone and style as existing entries (see `changelog/2026-01-22/commit-message.txt`)

4. **Create `files-changed.md`:**
   - Start with `# Files Changed - <Title>`
   - Include an "Overview" section with the overview paragraph
   - Create detailed sections explaining what was changed and why
   - Include code examples where relevant (like in `changelog/2026-01-19/files-changed.md`)
   - End with "All Modified Files" section listing new and modified files
   - Use the same detailed, technical style as existing entries

## Style Guidelines

- Keep it casual but technically competent (no AI watermarks, no hype words)
- Use bullet points for lists
- Group related changes together
- Explain the "why" behind changes, not just the "what"
- Include code examples when showing before/after patterns
- Match the tone and structure of existing changelog entries

## Reference Examples

- `changelog/2026-01-22/commit-message.txt` - Simple, grouped format
- `changelog/2026-01-22/files-changed.md` - Detailed explanation format
- `changelog/2026-01-19/files-changed.md` - Problem/solution format with code examples
- `changelog/2026-01-19-2/files-changed.md` - Comprehensive feature documentation format

## Analysis Guidelines

When analyzing git changes:

- **Migration consolidation**: If old migrations were deleted and consolidated into baseline, note this as a cleanup/refactor
- **Performance improvements**: Look for RPC functions, query optimizations, reduced API calls
- **Database changes**: Read migration files to understand schema changes, new functions, indexes
- **API changes**: Read route files to see if endpoints were refactored, optimized, or changed behavior
- **Data layer changes**: Check if data fetching functions were simplified or optimized
- **Component changes**: Note if UI components were updated, refactored, or had behavior changes
- **Type inference**: Use file paths and change patterns to determine change type:
  - `feat:` - New features, new migrations with new functionality
  - `fix:` - Bug fixes, corrections
  - `refactor:` - Code restructuring, migration consolidation, cleanup
  - `perf:` - Performance optimizations, query reductions, RPC functions
  - `docs:` - Documentation updates only

## Important Notes

- Do NOT modify `CHANGELOG.md` unless explicitly asked
- Create both files in the new date folder automatically
- Ensure the folder name follows the date pattern with suffixes if needed
- Generate the changelog entry completely automatically - do not ask the user for information
- If changes are unclear after analysis, make reasonable inferences based on file contents and git diff
