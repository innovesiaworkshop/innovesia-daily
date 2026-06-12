import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// History-based back: return to the actual previous in-app page. React Router tracks an
// `idx` in history.state; idx === 0 means this is the first entry of the session (a cold
// start or a push-notification deep-link), where navigate(-1) would walk out of the PWA.
// In that case fall back to Home so Back never dumps the user out of the app.
export function useGoBack(): () => void {
  const navigate = useNavigate()
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/', { replace: true })
  }, [navigate])
}
