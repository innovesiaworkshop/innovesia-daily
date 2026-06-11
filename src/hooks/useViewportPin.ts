import { useEffect } from 'react'

// Pins the app shell to the *visual* viewport height via the `--app-height` CSS var.
// On iOS Safari the `interactive-widget=resizes-content` viewport hint is ignored, so the
// layout viewport stays full height when the keyboard opens and the browser scrolls the
// page to reveal the focused field (the "jump up"). Driving `#root`'s height from
// visualViewport.height instead makes the shell shrink to sit above the keyboard, so the
// header stays put and nothing jumps. On Chromium the value tracks the (already resized)
// layout viewport, so this is consistent there too.
export function useViewportPin() {
  useEffect(() => {
    const vv = window.visualViewport
    const update = () => {
      const h = vv?.height ?? window.innerHeight
      document.documentElement.style.setProperty('--app-height', `${h}px`)
    }
    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
}
