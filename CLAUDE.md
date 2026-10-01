# CLAUDE.md

Project conventions for Claude Code sessions. Architecture conventions will be
added here when the foundation is implemented (see
`docs/superpowers/specs/2026-10-01-study-platform-foundation-design.md`).

## Git rules

- **Never run git commands that change history, branches, or the remote.** This
  includes `git commit`, `git push`, `git reset`, `git rebase`, `git merge`,
  `git checkout`/`git switch` to other branches, `git branch`, `git stash`,
  `git tag`, and `git cherry-pick`. The user handles all commits themselves.
- Read-only git commands are fine: `git status`, `git diff`, `git log`, `git show`,
  `git blame`.
- `git add` is also off limits unless the user explicitly asks for it.
