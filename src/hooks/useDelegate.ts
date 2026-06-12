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

// Edit permission (UI gate): you can act as the PIC if it's your own task, OR you're a
// delegate and the task belongs to your delegate target. RLS already permits the write.
export function useCanActAsPic(picId?: string | null): boolean {
  const { profile, session } = useAuth()
  if (!profile || !picId) return false
  return profile.id === picId || (isAssistant(session?.user.email) && picId === DELEGATE_TARGET.id)
}
