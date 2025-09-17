# Accessible keyboard reordering

- Roving tabindex: Arrows move focus between items when not lifting.
- Space/Enter to lift/drop; Arrow keys to move while lifting; Escape to cancel.
- Announcements via aria-live polite output.

Implemented in `src/components/a11y/RovingReorder.tsx` and integrated into admin exports UI.
