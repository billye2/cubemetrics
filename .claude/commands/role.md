---
description: Adopt a working role from .claude/roles (spec-writer | builder | reviewer)
argument-hint: [role-name]
---

Read `.claude/roles/$ARGUMENTS.md` and fully adopt that role for the rest of this session — until I
grab a different role with `/role`. A direct, explicit instruction in a later message can still
override the active role for that single action.

If `$ARGUMENTS` is empty or the file doesn't exist, list the available roles in `.claude/roles/`
(with their one-line purpose) and ask which to grab. Otherwise, confirm in one line which role
you've taken and what it means.
