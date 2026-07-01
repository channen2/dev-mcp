# AGENTS.md

## Commit conventions

Always use [Conventional Commits](https://www.conventionalcommits.org/) for every commit in this repo.

Format:

```
<type>(<scope>): <short imperative summary>

<optional body explaining why, not what>
```

- `<type>` — one of `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `perf`, `build`, `ci`. Use `feat`/`fix` for anything user- or tool-behavior-visible; `chore`/`refactor`/`docs`/`test` otherwise.
- `<scope>` — optional, lowercase, names the affected area (e.g. `github`, `jira`, `slack`, `tools`).
- Summary line — imperative mood ("add", not "added"/"adds"), no trailing period, under ~70 characters.
- Body — only when the *why* isn't obvious from the diff; skip it for trivial changes.
- Breaking changes: add `!` after the type/scope (`feat(github)!: ...`) and a `BREAKING CHANGE:` line in the body.

Keep commits atomic and clean:

- One logical change per commit — don't bundle unrelated fixes/features.
- No WIP, "fix typo", or other noise commits — squash/amend locally before the change lands, unless the user explicitly asks otherwise.
- Never commit unless explicitly asked to.
