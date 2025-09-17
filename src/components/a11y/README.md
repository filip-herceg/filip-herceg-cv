Accessible Roving Reorder

- Roving tabindex: Only one button is tabbable at a time; arrow keys change the active index when not grabbed.
- Lift/Move/Drop: Space/Enter toggles lifted state; while lifted, Arrow keys move the item; Escape cancels and restores original order.
- Live region: Screen readers receive polite announcements for lift, move, drop, cancel.
- Semantics: ul/li/button used for compatibility and a11y linters; no deprecated aria attributes.

Usage

<RovingReorder
  items={items}
  onReorder={setItems}
  getId={(it,i)=>it.id}
  getLabel={(it,i)=>it.label}
  renderItem={(it,i,grabbed)=> (<div>...</div>)}
/>
