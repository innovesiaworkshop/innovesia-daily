import { useSyncExternalStore } from 'react'

// Tracks whether the on-screen keyboard is open, shared across the app via a single
// visualViewport listener. On iOS the layout viewport stays full height when the keyboard
// opens, but the *visual* viewport shrinks — so a noticeable gap between window.innerHeight
// and visualViewport.height means the keyboard is up. Components read this to hide the
// floating bottom nav / pinned action bars so they don't pile onto the focused input.
const KEYBOARD_THRESHOLD = 150

let keyboardOpen = false
const listeners = new Set<() => void>()

function compute(): boolean {
  const vv = window.visualViewport
  if (!vv) return false
  return window.innerHeight - vv.height > KEYBOARD_THRESHOLD
}

function update() {
  const next = compute()
  if (next !== keyboardOpen) {
    keyboardOpen = next
    listeners.forEach((l) => l())
  }
}

if (typeof window !== 'undefined' && window.visualViewport) {
  window.visualViewport.addEventListener('resize', update)
  window.visualViewport.addEventListener('scroll', update)
}

export function useKeyboardOpen(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => keyboardOpen,
    () => false,
  )
}
