import { useAuth } from '@/hooks/useAuth'
import { DELEGATE_TARGET, isAssistant } from '@/config/access'

// Which person a new agenda is filed for. 'self' = the signed-in user (default).
export type ForTarget = 'self' | 'bagus'

// Assistant-only "file on behalf of" support. Non-assistants get isAssistant=false and the
// "For:" toggle stays hidden, so they always add for themselves.
export function useDelegate(): { isAssistant: boolean; target: typeof DELEGATE_TARGET } {
  const { session } = useAuth()
  return { isAssistant: isAssistant(session?.user.email), target: DELEGATE_TARGET }
}
