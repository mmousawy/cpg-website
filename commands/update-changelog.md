# Update Changelog

Create a new changelog entry following the existing pattern in the `/changelog/` directory.

## Process

1. **Determine folder name:**
   - Use today's date in format `YYYY-MM-DD` (e.g., `2026-01-23`)
   - Check if a folder with today's date already exists in `changelog/`
   - If it exists, append `-2`, `-3`, etc. (e.g., `2026-01-23-2`)
   - Create the folder at `changelog/<folder-name>/`

2. **Gather information from user:**
   - Ask for a brief title/description of the changes
   - Ask for the type of change: `feat:`, `fix:`, `refactor:`, `docs:`, etc.
   - Ask for an overview paragraph describing what was changed and why
   - Ask for grouped sections of changes (e.g., "Database:", "UI Components:", "API Routes:")
   - Ask for the list of files changed (new and modified)

3. **Create `commit-message.txt`:**
   - Format: `<type>: <title>`
   - Follow with grouped sections, each with bullet points
   - End with "Files changed (N):" section
   - List new files first, then modified files
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

## Important Notes

- Do NOT modify `CHANGELOG.md` unless explicitly asked
- Create both files in the new date folder
- Ensure the folder name follows the date pattern with suffixes if needed
- Ask clarifying questions if the user's input is ambiguous
