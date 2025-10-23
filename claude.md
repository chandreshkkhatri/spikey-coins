# Claude AI Assistant Guidelines

## Git Commit Messages

**IMPORTANT**: When creating git commits, do NOT include the Claude Code signature or co-authorship attribution in commit messages.

❌ **Do NOT include**:
```
🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

✅ **Instead, write clean, concise commit messages**:
```
fix: resolve race condition in database connection initialization
```

## Commit Message Format

Follow conventional commits format:
- `feat:` - New features
- `fix:` - Bug fixes
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `test:` - Test additions or modifications
- `chore:` - Maintenance tasks

Keep commit messages:
- Concise and descriptive
- Written in imperative mood (e.g., "fix bug" not "fixed bug")
- Under 72 characters for the subject line
- Without attribution signatures
