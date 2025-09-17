# Runbook: Keyboard Reordering UX

- Space/Enter: lift/drop current item
- Arrow keys: move while lifting (or rove focus when not lifting)
- Escape: cancel and restore original order

Announce changes through aria-live output; verify in tests: `a11y-reorder.*.test.tsx`.
