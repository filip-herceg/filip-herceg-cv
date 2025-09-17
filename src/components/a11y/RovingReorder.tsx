"use client"
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface RovingReorderProps<T> {
  items: readonly T[]
  onReorder: (next: T[]) => void
  getId: (item: T, index: number) => string
  getLabel: (item: T, index: number) => string
  renderItem: (item: T, index: number, grabbed: boolean) => React.ReactNode
  ariaLabel?: string
  className?: string
}

// Accessible keyboard reordering: roving tabindex + Space to lift, arrows to move, Enter/Space to drop, Esc to cancel.
// Announces updates via an aria-live region.
export function RovingReorder<T>({ items, onReorder, getId, getLabel, renderItem, ariaLabel = 'Reorder list', className }: Readonly<RovingReorderProps<T>>) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [grabbedIndex, setGrabbedIndex] = useState<number | null>(null)
  const [original, setOriginal] = useState<readonly T[] | null>(null)
  const [announce, setAnnounce] = useState('')
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    // Clamp activeIndex when list length changes
    setActiveIndex((prev) => (items.length ? Math.min(prev, items.length - 1) : 0))
  }, [items.length])

  const lift = useCallback((index: number) => {
    setGrabbedIndex(index)
    setOriginal(items.slice())
    const label = getLabel(items[index], index)
    setAnnounce(`${label} lifted. Position ${index + 1} of ${items.length}. Use arrow keys to move, Enter to drop, Escape to cancel.`)
  }, [items, getLabel])

  const drop = useCallback((index: number) => {
    if (grabbedIndex === null) return
    const label = getLabel(items[index], index)
    setAnnounce(`${label} dropped at position ${index + 1} of ${items.length}.`)
    setGrabbedIndex(null)
    setOriginal(null)
  }, [grabbedIndex, items, getLabel])

  const cancel = useCallback(() => {
    if (grabbedIndex === null) return
    const orig = original
    setGrabbedIndex(null)
    setOriginal(null)
    if (orig) {
      // restore
  onReorder(orig.slice())
      setAnnounce('Reorder cancelled.')
    }
  }, [grabbedIndex, original, onReorder])

  const move = useCallback((from: number, dir: -1 | 1) => {
    const to = from + dir
    if (to < 0 || to >= items.length) return from
  const next = items.slice()
  const [it] = next.splice(from, 1)
  next.splice(to, 0, it)
    onReorder(next)
    const label = getLabel(it, to)
    setAnnounce(`${label} moved to position ${to + 1} of ${items.length}.`)
    return to
  }, [items, onReorder, getLabel])

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    // Only handle keydown that originates on the roving button itself (not bubbled from inner controls)
    if (e.currentTarget !== e.target) return
    // Ignore common form fields
    const target = e.target as HTMLElement
    const tag = target.tagName.toLowerCase()
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return

    if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
      e.preventDefault()
      if (grabbedIndex === null) lift(index)
      else drop(index)
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault(); cancel(); return
    }
    if (grabbedIndex !== null) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const nextIndex = move(index, -1)
        setActiveIndex(nextIndex)
        focusIndex(nextIndex)
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        const nextIndex = move(index, +1)
        setActiveIndex(nextIndex)
        focusIndex(nextIndex)
        return
      }
    } else {
      // Roving focus only when not grabbed
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const next = Math.max(0, index - 1)
        setActiveIndex(next)
        focusIndex(next)
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        const next = Math.min(items.length - 1, index + 1)
        setActiveIndex(next)
        focusIndex(next)
        return
      }
    }
  }, [grabbedIndex, lift, drop, cancel, move, items.length])
  
  function focusIndex(i: number) {
    itemRefs.current[i]?.focus()
  }

  const listId = useMemo(() => `roving-${Math.random().toString(36).slice(2)}`, [])

  return (
    <div className={className}>
      <ul aria-label={ariaLabel} aria-describedby={`${listId}-hint`}>
        {items.map((item, i) => {
          const grabbed = grabbedIndex === i
          const isTabbable = i === activeIndex
          const id = getId(item, i)
          return (
            <li key={id} className="list-none">
              <button
                type="button"
                ref={(el) => { itemRefs.current[i] = el }}
                onFocus={() => setActiveIndex(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                tabIndex={isTabbable ? 0 : -1}
                aria-describedby={`${listId}-hint`}
                aria-pressed={grabbed || undefined}
                aria-label={`${getLabel(item, i)}${grabbed ? ' (lifting)' : ''}`}
                className="w-full text-left focus:outline focus:outline-2 focus:outline-sky-500 rounded"
                data-testid="roving-item"
              >
                {renderItem(item, i, grabbed)}
              </button>
            </li>
          )
        })}
      </ul>
      <p id={`${listId}-hint`} className="sr-only">Use Space or Enter to lift/drop, arrow keys to move, and Escape to cancel.</p>
      <output aria-live="polite" aria-atomic="true" className="sr-only" data-testid="roving-live">{announce}</output>
    </div>
  )
}

export default RovingReorder
