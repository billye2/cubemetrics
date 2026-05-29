# Roles

Switchable working roles for this repo. A role is opt-in — it is **not** loaded automatically
(that's deliberate; it stays out of `CLAUDE.md` so it never fights you). You grab one when you
want it, and it holds for the session until you grab another.

## How to grab a role

```
/role spec-writer
/role builder
/role reviewer
```

The `/role` command (`.claude/commands/role.md`) reads the matching file in this folder and has
the assistant adopt it for the rest of the session. Grab a different one anytime to switch; a
direct explicit instruction can still override the active role for a single action.

## Available roles

| Role | Use it when you want… |
|------|------------------------|
| [spec-writer](spec-writer.md) | research, plans, and specs written to `docs/` — no code, no git. **(default mental mode for this repo)** |
| [builder](builder.md) | the next task from `docs/app-plans/` implemented, verified, and shipped — commits/pushes to `master` (auto-deploys) and applies migrations once tests + build are green. |
| [reviewer](reviewer.md) | a critical read / punch-list of a diff or spec — no edits. |

## Adding a role

Drop a new `<name>.md` in this folder following the same shape (Purpose / You DO / You DON'T /
Hand-off), then grab it with `/role <name>`. No other wiring needed.
