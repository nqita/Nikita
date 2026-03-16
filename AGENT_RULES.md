# Agent Rules

These rules apply to AI agents working inside the NQITA repository.

Read `PROJECT_CONTEXT.md` before making architectural changes.

## Primary Rule

Treat NQITA as a persistent companion and interface system.

Do not reinterpret it as a general orchestration harness or a catch-all AI backend.

## Scope Discipline

Changes in this repository should strengthen one or more of the following:

- user-facing AI interaction
- environment-aware assistant behavior
- assistant memory and context handling
- widget, extension, chat, or app-based companion surfaces

## Ecosystem Boundary Rules

Do not move responsibilities into NQITA just because users interact with it often.

Examples:

- orchestration infrastructure belongs more naturally to `Autiladus`
- shared auth and billing belong more naturally to `WokAPI`
- editorial/news behavior belongs more naturally to `WokHei`
- creator tooling belongs more naturally to `WokStudio`

## Working Principle

Independent product first, ecosystem integration second.
