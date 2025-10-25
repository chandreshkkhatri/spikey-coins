# Claude AI Assistant Guidelines

## Git Commit Policy

**CRITICAL**: Only commit changes when the task/fix has been **completed AND tested successfully**.

### When to Commit

✅ **DO commit when**:
- The feature/fix is fully implemented
- The code has been tested and verified to work
- All linter errors have been resolved
- The user has confirmed the changes work as expected
- The task is complete and ready for deployment

❌ **DO NOT commit when**:
- The implementation is incomplete
- The code hasn't been tested yet
- There are known issues or errors
- You're making incremental changes that aren't ready
- The user hasn't had a chance to verify the changes

### Testing Before Commit

Before committing, ensure:
1. **Code compiles/builds** without errors
2. **Linter passes** - No new linting errors introduced
3. **Functionality verified** - The fix/feature works as intended
4. **User confirmation** - Wait for user feedback if testing is needed

### Example Workflow

```bash
# ❌ WRONG - Committing before testing
git add file.ts
git commit -m "fix: update logic"  # Don't do this yet!

# ✅ CORRECT - Test first, then commit
# 1. Make changes
# 2. Test the changes (run script, check output, verify functionality)
# 3. User confirms it works
# 4. THEN commit:
git add file.ts
git commit -m "fix: update logic to handle edge case"
```

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
