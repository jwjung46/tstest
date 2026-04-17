# AGENTS.md

This file is intentionally minimal.

Before making changes in this repository, read these documents first:

1. `docs/progress-memory.md`
2. `docs/modular-architecture-guidelines.md`

## Required behavior

- Use `docs/progress-memory.md` to understand the current project state and current phase.
- Use `docs/modular-architecture-guidelines.md` as the main implementation and architecture rulebook.
- Stay within the current phase unless the user explicitly asks to move to the next phase.
- If a requested change would conflict with the architecture document, do not silently ignore the conflict. Surface it clearly.
- Prefer implementation that can remain in the real product over throwaway temporary structure.

## Priority order

If guidance overlaps, apply it in this order:

1. direct user instruction
2. `AGENTS.md`
3. `docs/progress-memory.md`
4. `docs/modular-architecture-guidelines.md`

## If the docs are missing or outdated

- If one of the referenced docs is missing, say so explicitly.
- If the docs appear outdated compared with the codebase, call that out before making large structural changes.
