import { Transition } from 'framer-motion'

export const easings = {
  inOut: [0.22, 1, 0.36, 1] as [number, number, number, number],
  out: [0.16, 1, 0.3, 1] as [number, number, number, number],
}

export const durations = {
  xs: 0.2,
  sm: 0.35,
  md: 0.55,
  lg: 0.8,
}

export const transitions = {
  fast: (delay = 0): Transition => ({ duration: durations.sm, ease: easings.out, delay }),
  base: (delay = 0): Transition => ({ duration: durations.md, ease: easings.inOut, delay }),
}

export const viewportOnce = { once: true, margin: '-10% 0px -10% 0px' }
